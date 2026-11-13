/** Asset review only: never imported by the game, quests or production camera. */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';

const query = new URLSearchParams(location.search);
const variant = query.get('variant') === 'original' ? 'original' : 'remaster';
const source = variant === 'original' ? '/models/backups/westbridge-original.glb' : '/models/westbridge.glb';
const canvas = document.querySelector<HTMLCanvasElement>('#review')!;
const status = document.querySelector<HTMLOutputElement>('#status')!;
if (query.has('capture')) document.body.classList.add('capture');
const engine = new Engine(canvas, false, { preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance' });
engine.setHardwareScalingLevel(1);
const scene = new Scene(engine);
// Fixed neutral outdoor rig for both assets, separate from every game scene.
scene.clearColor = new Color4(.64, .68, .66, 1);
scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogColor = new Color3(.64, .68, .66);
scene.fogStart = 55; scene.fogEnd = 175;
const ambient = new HemisphericLight('revisão · ambiente', new Vector3(0, 1, 0), scene);
ambient.diffuse = new Color3(.91, .94, 1); ambient.groundColor = new Color3(.38, .36, .31); ambient.intensity = .95;
const sun = new DirectionalLight('revisão · manhã', new Vector3(.65, -.78, .32).normalize(), scene);
sun.diffuse = new Color3(1, .91, .78); sun.intensity = .85;
const sourcePoint = ([x, y, z]: readonly number[]) => new Vector3(-x, y, z);
const views = [
  { id: 'rua', label: 'Rua principal', position: [-20, 1.7, -.9], target: [-60, 1.7, -.9], fov: .94 },
  { id: 'casa', label: 'Casa da família anfitriã', position: [21, 1.8, 1.2], target: [21, 3.3, -14.2], fov: .94 },
  { id: 'esquina', label: 'Esquina e calçadas', position: [-26, 2.1, 4], target: [-37, .9, -7], fov: .98 },
  { id: 'jardim', label: 'Vegetação e cercas', position: [9.5, 1.75, -5.0], target: [18.5, 2.2, -11], fov: .94 },
  { id: 'bairro', label: 'Vista geral', position: [57, 29, 35], target: [-2, 1, -1], fov: .95 },
] as const;
const camera = new FreeCamera('revisão · câmera fixa', sourcePoint(views[0].position), scene);
camera.minZ = .08; camera.maxZ = 400; scene.activeCamera = camera;
const selector = document.querySelector<HTMLSelectElement>('#view')!;
for (const view of views) selector.add(new Option(view.label, view.id));
let activeView: string = views[0].id, frames = 0, ready = false, error: string | null = null;
let asset: Awaited<ReturnType<typeof LoadAssetContainerAsync>> | null = null;
const intervals: number[] = [], renderTimes: number[] = [];
let lastFrame = 0;
function setView(id: string) {
  const view = views.find(value => value.id === id);
  if (!view) throw Error('Ângulo de revisão desconhecido: ' + id);
  activeView = id; camera.position.copyFrom(sourcePoint(view.position)); camera.setTarget(sourcePoint(view.target));
  camera.fov = view.fov; selector.value = id; intervals.length = 0; renderTimes.length = 0; lastFrame = 0;
}
selector.addEventListener('change', () => setView(selector.value));
const variantSelector = document.querySelector<HTMLSelectElement>('#variant')!;
variantSelector.value = variant;
variantSelector.addEventListener('change', () => {
  query.set('variant', variantSelector.value); query.set('view', activeView); location.search = query.toString();
});
setView(query.get('view') ?? views[0].id);
const vector = (v: Vector3) => ({ x: v.x, y: v.y, z: v.z });
const stats = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { samples: values.length, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    p95: sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] : 0 };
};
let bounds: { min: ReturnType<typeof vector>; max: ReturnType<typeof vector> } | null = null;
const review = {
  setView, resetMetrics() { intervals.length = 0; renderTimes.length = 0; lastFrame = 0; },
  get diagnostics() {
    return { source, variant, ready, error, frames, view: activeView, views,
      camera: { position: vector(camera.position), target: vector(camera.getTarget()), fov: camera.fov, minZ: camera.minZ, maxZ: camera.maxZ },
      reviewLighting: { ambient: ambient.intensity, sun: sun.intensity, fogStart: scene.fogStart, fogEnd: scene.fogEnd },
      meshes: asset?.meshes.filter(mesh => mesh.getTotalVertices() > 0).length ?? 0,
      vertices: asset?.meshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0) ?? 0,
      triangles: asset?.meshes.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0) ?? 0,
      transformNodes: asset?.transformNodes.length ?? 0,
      bounds, materials: asset?.materials.map(material => ({ name: material.name, alpha: material.alpha,
        backFaceCulling: material.backFaceCulling, transparencyMode: material.transparencyMode })) ?? [],
      textures: asset?.textures.map(texture => ({ name: texture.name, ready: texture.isReady(), size: texture.getSize(),
        hasAlpha: texture.hasAlpha, coordinatesIndex: texture.coordinatesIndex })) ?? [],
      activeMeshes: scene.getActiveMeshes().length,
      metrics: { frameIntervalMs: stats(intervals), renderCpuMs: stats(renderTimes), internal: { width: engine.getRenderWidth(), height: engine.getRenderHeight() } },
      webgl: engine.webGLVersion, renderer: engine.getGlInfo(),
    };
  },
};
(window as Window & { __WESTBRIDGE__?: typeof review }).__WESTBRIDGE__ = review;
engine.runRenderLoop(() => {
  const now = performance.now();
  if (ready && lastFrame) intervals.push(now - lastFrame);
  const start = performance.now(); scene.render(); const end = performance.now();
  if (ready) renderTimes.push(end - start);
  lastFrame = now; frames++;
  if (intervals.length > 120) intervals.shift(); if (renderTimes.length > 120) renderTimes.shift();
});
window.addEventListener('resize', () => engine.resize());
try {
  asset = await LoadAssetContainerAsync(source, scene, { pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } } });
  asset.addAllToScene();
  for (const group of asset.animationGroups) group.stop(true);
  await scene.whenReadyAsync();
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of asset.meshes) if (mesh.getTotalVertices()) {
    mesh.computeWorldMatrix(true); const box = mesh.getBoundingInfo().boundingBox;
    min.minimizeInPlace(box.minimumWorld); max.maximizeInPlace(box.maximumWorld);
  }
  bounds = { min: vector(min), max: vector(max) };
  ready = true; status.textContent = `${variant === 'original' ? 'Original' : 'Remasterização'} · GLB carregado · revisão independente do jogo`;
} catch (cause) { error = String(cause); status.textContent = error; console.error(cause); }
