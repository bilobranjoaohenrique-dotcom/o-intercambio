import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Light } from '@babylonjs/core/Lights/light';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import '@babylonjs/loaders/glTF';
import type { InteractionTarget } from '../game/types';
import { hhPoint, HOST_HOUSE_SOURCE, HOST_HOUSE_ORIGIN_X, HOST_HOUSE_NODE_ADJUSTMENTS,
  HOST_HOUSE_EXIT, HOST_HOUSE_EXIT_SIZE } from '../game/hostHouseLayout';

/** The supplied furnished house is streamed on demand. The original texture,
 * topology and metre scale remain intact; only the blocking wardrobe moves. */
export function buildHostHouse(scene: Scene) {
  const root = new TransformNode('Daniel e Helen · interior fornecido', scene); root.setEnabled(false);
  const modelRoot = new TransformNode('Daniel e Helen · origem do GLB', scene);
  modelRoot.parent = root; modelRoot.position.x = HOST_HOUSE_ORIGIN_X;
  const meshes: AbstractMesh[] = [], importedMeshes: AbstractMesh[] = [], portalMeshes: AbstractMesh[] = [];
  const foreignLights = new Set<Light>(), hiddenForeign: AbstractMesh[] = [];
  const embeddedLights: Light[] = [];
  const approvedAdjustments: { name: string; sourceZDelta: number }[] = [];
  let container: AssetContainer | null = null, loading: Promise<void> | null = null;
  let active = false, loaded = false, disposed = false, error: string | null = null;
  const proxyMaterial = new StandardMaterial('Daniel e Helen · interação invisível da saída', scene);
  proxyMaterial.disableLighting = true;
  const exit = MeshBuilder.CreateBox('Daniel e Helen · saída para Westbridge', {
    width: HOST_HOUSE_EXIT_SIZE[0], height: HOST_HOUSE_EXIT_SIZE[1], depth: HOST_HOUSE_EXIT_SIZE[2],
  }, scene);
  exit.parent = root; exit.position.set(HOST_HOUSE_EXIT.x, HOST_HOUSE_EXIT.y, HOST_HOUSE_EXIT.z);
  exit.material = proxyMaterial; exit.visibility = .001; exit.isPickable = true;
  exit.metadata = { castShadow: false, hostHouseProxy: true }; meshes.push(exit);
  const exitMeshes: AbstractMesh[] = [exit];
  const targets: InteractionTarget[] = [{ id: 'host-house-exit', meshes: exitMeshes,
    label: () => 'Sair para Westbridge', execute: () => undefined }];
  const ambient = new HemisphericLight('Daniel e Helen · claridade interna', new Vector3(0, 1, 0), scene);
  ambient.intensity = .62; ambient.diffuse.set(.96, .94, .88); ambient.groundColor.set(.33, .31, .28);
  ambient.setEnabled(false);
  let saved: { fogMode: number; fogColor: Color3; fogStart: number; fogEnd: number; fogDensity: number;
    clearColor: Color4; exposure: number; contrast: number; toneMappingEnabled: boolean; toneMappingType: number;
    camera: typeof scene.activeCamera; maxZ: number } | null = null;

  function bindLights() {
    const own = new Set<Light>([ambient, ...embeddedLights]);
    for (const light of scene.lights) if (!own.has(light)) {
      foreignLights.add(light);
      light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      light.excludedMeshes.push(...meshes);
    }
    ambient.includedOnlyMeshes = [...meshes];
    for (const light of embeddedLights) light.includedOnlyMeshes = [];
    const dayLights = embeddedLights.filter(light => /^(Day_|Always_)/.test(light.name));
    for (const light of dayLights) {
      if (light.parent) light.parent.computeWorldMatrix(true);
      if (light instanceof PointLight) light.computeTransformedInformation();
    }
    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      const center = mesh.getBoundingInfo().boundingBox.centerWorld;
      const closest = [...dayLights].sort((a, b) => {
        const ap = a instanceof PointLight ? a.getAbsolutePosition() : Vector3.Zero();
        const bp = b instanceof PointLight ? b.getAbsolutePosition() : Vector3.Zero();
        return Vector3.DistanceSquared(center, ap) - Vector3.DistanceSquared(center, bp);
      }).slice(0, 3);
      for (const light of closest) light.includedOnlyMeshes.push(mesh);
    }
    ambient.setEnabled(active);
    for (const light of embeddedLights) light.setEnabled(active && /^(Day_|Always_)/.test(light.name));
  }
  function makePortalBacking(asset: AssetContainer) {
    const wood = asset.materials.find(material => material.name === 'WoodDark') ?? asset.materials.find(material => /WoodDark/.test(material.name));
    const metal = asset.materials.find(material => material.name === 'Metal');
    if (!wood || !metal) throw Error('Os materiais nativos da porta da casa não foram localizados.');
    function part(name: string, size: [number, number, number], x: number, y: number, z: number, material: Material) {
      const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
      const point = hhPoint(x, y, z); mesh.position.set(point.x, point.y, point.z);
      mesh.parent = root; mesh.material = material; mesh.isPickable = true;
      mesh.metadata = { castShadow: false, hostHousePortalBacking: true };
      meshes.push(mesh); portalMeshes.push(mesh); exitMeshes.push(mesh); return mesh;
    }
    // The source has a real opening but no entry leaf. The closed back of the
    // portal uses source wood/metal, hiding the isolated exterior beyond it.
    part('Daniel e Helen · folha da porta de saída', [.055, 1.985, 1.65], 48.015, 1.3825, 37, wood);
    for (const z of [36.59, 37.41]) for (const y of [.99, 1.78])
      part('Daniel e Helen · painel da porta de saída', [.018, .63, .57], 48.052, y, z, wood);
    part('Daniel e Helen · maçaneta da porta de saída', [.095, .06, .16], 48.10, 1.34, 37.55, metal);
  }
  function setActive(value: boolean) {
    if (disposed || active === value) return;
    if (value) {
      const p = scene.imageProcessingConfiguration;
      saved = { fogMode: scene.fogMode, fogColor: scene.fogColor.clone(), fogStart: scene.fogStart,
        fogEnd: scene.fogEnd, fogDensity: scene.fogDensity, clearColor: scene.clearColor.clone(),
        exposure: p.exposure, contrast: p.contrast, toneMappingEnabled: p.toneMappingEnabled, toneMappingType: p.toneMappingType,
        camera: scene.activeCamera, maxZ: scene.activeCamera?.maxZ ?? 95 };
      for (const mesh of scene.meshes) if (mesh.isEnabled() && !mesh.isDescendantOf(root)) {
        hiddenForeign.push(mesh); mesh.setEnabled(false);
      }
      active = true; root.setEnabled(true);
      // WindowView contains the supplied street geometry but no sky dome.
      // Match Westbridge's afternoon background through the native windows.
      scene.fogMode = 0; scene.clearColor = new Color4(.69, .70, .65, 1);
      p.exposure = 1.02; p.contrast = 1.02; p.toneMappingEnabled = true;
      p.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
      if (scene.activeCamera) scene.activeCamera.maxZ = 180;
      bindLights();
    } else {
      active = false; root.setEnabled(false); ambient.setEnabled(false);
      for (const light of embeddedLights) light.setEnabled(false);
      if (saved) {
        scene.fogMode = saved.fogMode; scene.fogColor = saved.fogColor; scene.fogStart = saved.fogStart;
        scene.fogEnd = saved.fogEnd; scene.fogDensity = saved.fogDensity; scene.clearColor = saved.clearColor;
        Object.assign(scene.imageProcessingConfiguration, { exposure: saved.exposure, contrast: saved.contrast,
          toneMappingEnabled: saved.toneMappingEnabled, toneMappingType: saved.toneMappingType });
        if (saved.camera) saved.camera.maxZ = saved.maxZ;
        saved = null;
      }
      for (const mesh of hiddenForeign) if (!mesh.isDisposed()) mesh.setEnabled(true);
      hiddenForeign.length = 0;
    }
  }
  function ensureReady(): Promise<void> {
    if (disposed) return Promise.reject(Error('O interior da casa já foi encerrado.'));
    if (loading) return loading;
    loading = LoadAssetContainerAsync(HOST_HOUSE_SOURCE, scene, {
      pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } },
    }).then(asset => {
      if (disposed) { asset.dispose(); return; }
      container = asset; asset.addAllToScene();
      const nodes = [...asset.transformNodes, ...asset.meshes], all = new Set<TransformNode>(nodes);
      for (const node of nodes) if (!node.parent || !all.has(node.parent as TransformNode)) node.parent = modelRoot;
      for (const adjustment of HOST_HOUSE_NODE_ADJUSTMENTS) {
        const node = nodes.find(candidate => candidate.name === adjustment.nodeName);
        if (!node) throw Error('Componente do armário junto à passagem não localizado: ' + adjustment.nodeName);
        node.position.x += adjustment.sourceDelta.x; node.position.y += adjustment.sourceDelta.y; node.position.z += adjustment.sourceDelta.z;
        approvedAdjustments.push({ name: node.name, sourceZDelta: adjustment.sourceDelta.z });
      }
      for (const node of nodes) node.computeWorldMatrix(true);
      for (const mesh of asset.meshes) {
        if (!mesh.getTotalVertices()) continue;
        mesh.isPickable = true; mesh.receiveShadows = false;
        mesh.metadata = { ...mesh.metadata, source: HOST_HOUSE_SOURCE, importedHostHouse: true };
        importedMeshes.push(mesh);
      }
      meshes.push(...importedMeshes);
      for (const material of asset.materials) if ('maxSimultaneousLights' in material) material.maxSimultaneousLights = 4;
      for (const clip of asset.animationGroups) clip.stop(true);
      for (const light of asset.lights) { light.setEnabled(false); embeddedLights.push(light); }
      makePortalBacking(asset); bindLights(); loaded = true;
    }).catch(reason => { error = String(reason?.message ?? reason); throw Error('Não foi possível carregar a casa de Daniel e Helen: ' + error); });
    return loading;
  }
  return {
    root, meshes, targets, ensureReady, setActive,
    get diagnostics() { return { active, loaded, ready: loaded && !error, loading: !!loading && !loaded, error,
      source: HOST_HOUSE_SOURCE, origin: { x: HOST_HOUSE_ORIGIN_X, y: 0, z: 0 },
      sourceAssetUnmodified: true, sourceGeometryPreserved: true, sourceNodeTransformsPreserved: false,
      approvedAdjustments, sourceMaterialsPreserved: true, sourceUVsPreserved: true,
      meshes: importedMeshes.length, portalMeshes: portalMeshes.length, materials: container?.materials.length ?? 0,
      textures: container?.textures.length ?? 0, allTexturesReady: container?.textures.every(texture => texture.isReady()) ?? false,
      lights: embeddedLights.length + 1, embeddedLights: embeddedLights.length,
      activeEmbeddedLights: embeddedLights.filter(light => light.isEnabled()).map(light => light.name),
      animationGroups: container?.animationGroups.length ?? 0,
      runningAnimations: container?.animationGroups.filter(clip => clip.isPlaying).length ?? 0,
      camera: { fov: scene.activeCamera?.fov ?? null, minZ: scene.activeCamera?.minZ ?? null, maxZ: scene.activeCamera?.maxZ ?? null },
      npcs: 0, foreignMeshesHidden: hiddenForeign.length,
      foreignMeshesVisible: active ? scene.meshes.filter(mesh => mesh.getTotalVertices() > 0 && mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0 && !mesh.isDescendantOf(root)).length : null,
      exit: { position: HOST_HOUSE_EXIT, size: HOST_HOUSE_EXIT_SIZE },
    }; },
    dispose() {
      if (disposed) return; setActive(false); disposed = true;
      for (const light of foreignLights) light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      container?.dispose(); ambient.dispose(); proxyMaterial.dispose(); root.dispose(false, false);
    },
  };
}
