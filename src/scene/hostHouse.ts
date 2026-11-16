import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Light } from '@babylonjs/core/Lights/light';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/loaders/glTF';
import type { InteractionTarget } from '../game/types';
import { applyHostHouseEnvelope } from './hostHouseEnvelope';
import { hhPoint, HOST_HOUSE_SOURCE, HOST_HOUSE_ORIGIN_X, HOST_HOUSE_EXIT, HOST_HOUSE_EXIT_SIZE,
  HOST_HOUSE_GEOMETRY_ADJUSTMENTS, adjustHostHouseSourceX } from '../game/hostHouseLayout';

/** A01 shares the neighbourhood's coordinates and exterior root. Its own lights
 * do not replace Westbridge's sky, camera, visibility or global scene state. */
export function buildHostHouse(scene: Scene) {
  const root = new TransformNode('Daniel e Helen · interior A01', scene); root.setEnabled(false);
  const modelRoot = new TransformNode('Daniel e Helen · origem A01 preservada', scene);
  modelRoot.parent = root; modelRoot.position.x = HOST_HOUSE_ORIGIN_X;
  const meshes: AbstractMesh[] = [], importedMeshes: AbstractMesh[] = [], omittedPlaceholders: string[] = [];
  const adjustableGarageNames = new Set<string>(HOST_HOUSE_GEOMETRY_ADJUSTMENTS.names);
  const foreignLights = new Set<Light>();
  const geometryAdjustments: { name: string; sourceXDelta: number; vertices: number }[] = [];
  let container: AssetContainer | null = null, loading: Promise<void> | null = null;
  let envelope: ReturnType<typeof applyHostHouseEnvelope> | null = null;
  let active = false, loaded = false, disposed = false, error: string | null = null;

  // The existing exterior owns the door leaf. This early proxy joins the
  // existing interaction registry without creating a second portal.
  const proxyMaterial = new StandardMaterial('Daniel e Helen · referência da porta', scene);
  proxyMaterial.disableLighting = true;
  const exit = MeshBuilder.CreateBox('Daniel e Helen · porta principal A01', {
    width: HOST_HOUSE_EXIT_SIZE[0], height: HOST_HOUSE_EXIT_SIZE[1], depth: HOST_HOUSE_EXIT_SIZE[2],
  }, scene);
  exit.parent = root; exit.position.set(HOST_HOUSE_EXIT.x, HOST_HOUSE_EXIT.y, HOST_HOUSE_EXIT.z);
  exit.material = proxyMaterial; exit.visibility = .001; exit.isPickable = true;
  exit.metadata = { castShadow: false, hostHouseProxy: true }; meshes.push(exit);
  const targets: InteractionTarget[] = [{ id: 'host-house-exit', meshes: [exit],
    label: () => 'Abrir/fechar porta', execute: () => undefined }];

  const ambient = new HemisphericLight('Daniel e Helen · claridade interna A01', new Vector3(0, 1, 0), scene);
  ambient.parent = root; ambient.intensity = .58;
  ambient.diffuse.set(1, .96, .88); ambient.groundColor.set(.39, .36, .31); ambient.setEnabled(false);
  const lamps: { light: PointLight; floor: 'ground' | 'upper' }[] = [];
  // Positions are local to the supplied plan root, below its native ceilings
  // (2.90 / 5.62 m and 2.67 m in the garage).
  for (const [name, x, y, z, floor, intensity] of [
    ['sala', 1.45, 2.68, -1.65, 'ground', 2.0],
    ['jantar', 1.45, 2.68, -4.85, 'ground', 1.8],
    ['hall e escada', 3.3, 2.68, -2.65, 'ground', 1.8],
    ['cozinha', 5.9, 2.68, -5.05, 'ground', 2.2],
    ['garagem', 9.45, 2.45, -3.05, 'ground', 1.8],
    ['hall superior', 3.4, 5.4, -2.65, 'upper', 1.8],
    ['quarto dos anfitriões', 1.6, 5.4, -4.25, 'upper', 1.8],
    ['quarto do protagonista', 6.05, 5.4, -3.2, 'upper', 1.8],
    ['banheiro', 6.0, 5.4, -1.05, 'upper', 1.8],
  ] as const) {
    const point = hhPoint(15.38 + x, y, -12.68 + z);
    const light = new PointLight('Daniel e Helen · luz ' + name, new Vector3(point.x, point.y, point.z), scene);
    light.parent = root; light.diffuse.set(1, .86, .70); light.specular.set(.8, .72, .62);
    light.intensity = intensity; light.range = 5.5; light.setEnabled(false);
    lamps.push({ light, floor });
  }
  function isUpperMesh(mesh: AbstractMesh) {
    for (let node: typeof mesh.parent = mesh; node; node = node.parent)
      if (node.name === 'PAV_01_SUPERIOR') return true;
    return false;
  }
  function bindLights() {
    const own = new Set<Light>([ambient, ...lamps.map(lamp => lamp.light)]);
    for (const light of scene.lights) if (!own.has(light)) {
      foreignLights.add(light);
      light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      light.excludedMeshes.push(...meshes);
    }
    ambient.includedOnlyMeshes = [...meshes];
    for (const { light } of lamps) { light.includedOnlyMeshes = []; light.computeTransformedInformation(); }
    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      const center = mesh.getBoundingInfo().boundingBox.centerWorld;
      const floor = isUpperMesh(mesh) ? 'upper' : 'ground';
      const closest = lamps.filter(lamp => lamp.floor === floor).sort((a, b) =>
        Vector3.DistanceSquared(center, a.light.getAbsolutePosition()) -
        Vector3.DistanceSquared(center, b.light.getAbsolutePosition())).slice(0, 3);
      for (const { light } of closest) light.includedOnlyMeshes.push(mesh);
    }
    ambient.setEnabled(active);
    for (const { light } of lamps) light.setEnabled(active);
  }
  function fitGarage(mesh: AbstractMesh) {
    if (!adjustableGarageNames.has(mesh.name)) return;
    if (!(mesh instanceof Mesh)) throw Error('Peça da garagem sem geometria editável: ' + mesh.name);
    const source = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!source) return;
    const positions = new Float32Array(source);
    const world = mesh.computeWorldMatrix(true).clone(), inverse = world.clone().invert();
    let changed = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const point = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), world);
      const sourceX = HOST_HOUSE_ORIGIN_X - point.x;
      const adjustedX = adjustHostHouseSourceX(mesh.name, sourceX);
      if (Math.abs(adjustedX - sourceX) < 1e-8) continue;
      point.x = HOST_HOUSE_ORIGIN_X - adjustedX;
      const local = Vector3.TransformCoordinates(point, inverse);
      positions[i] = local.x; positions[i + 1] = local.y; positions[i + 2] = local.z; changed++;
    }
    if (!changed) return;
    // Axis-aligned pieces only shorten their right edge. Keep source normals,
    // UVs, indices and node transforms intact.
    mesh.makeGeometryUnique(); mesh.setVerticesData(VertexBuffer.PositionKind, positions, true);
    mesh.refreshBoundingInfo(); mesh.computeWorldMatrix(true);
    geometryAdjustments.push({ name: mesh.name, sourceXDelta: HOST_HOUSE_GEOMETRY_ADJUSTMENTS.deltaX, vertices: changed });
  }
  function setActive(value: boolean) {
    if (disposed || active === value) return;
    active = value; root.setEnabled(value); bindLights();
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
      for (const node of nodes) node.computeWorldMatrix(true);
      for (const mesh of asset.meshes) {
        if (!mesh.getTotalVertices()) continue;
        // The package identifies this blockout as a parking-space check. Keep
        // the approved family car outside instead of displaying a second car.
        if (/^Carro_compacto_/.test(mesh.name)) {
          mesh.setEnabled(false); mesh.isPickable = false; omittedPlaceholders.push(mesh.name); continue;
        }
        fitGarage(mesh);
        mesh.isPickable = true; mesh.receiveShadows = false;
        mesh.metadata = { ...mesh.metadata, source: HOST_HOUSE_SOURCE, importedHostHouse: true };
        importedMeshes.push(mesh);
      }
      // The exterior owns the visible blue facade; retain only the native
      // inner wall skin and reveals of the fitted A01 boxes.
      envelope=applyHostHouseEnvelope(importedMeshes,HOST_HOUSE_ORIGIN_X);
      meshes.push(...importedMeshes);
      for (const material of asset.materials) if ('maxSimultaneousLights' in material) material.maxSimultaneousLights = 4;
      for (const clip of asset.animationGroups) clip.stop(true);
      bindLights(); loaded = true;
    }).catch(reason => {
      error = String(reason?.message ?? reason);
      throw Error('Não foi possível carregar a casa de Daniel e Helen: ' + error);
    });
    return loading;
  }
  return {
    root, meshes, targets, ensureReady, setActive,
    get diagnostics() {
      // The exterior is intentionally visible through the supplied windows.
      const neighbourhood = root.parent ?? root;
      return { active, loaded, ready: loaded && !error, loading: !!loading && !loaded, error,
        source: HOST_HOUSE_SOURCE, origin: { x: HOST_HOUSE_ORIGIN_X, y: 0, z: 0 }, sharedExterior: true,
        sourceAssetUnmodified: true, sourceGeometryPreserved: geometryAdjustments.length === 0,
        sourceNodeTransformsPreserved: true, sourceTopologyPreserved: !envelope?.changedMeshes, envelope,
        geometryAdjustments, approvedAdjustments: geometryAdjustments,
        sourceMaterialsPreserved: true, sourceUVsPreserved: true,
        meshes: importedMeshes.length, portalMeshes: 0, placeholderOmitted: omittedPlaceholders.length > 0,
        omittedPlaceholderMeshes: [...omittedPlaceholders], materials: container?.materials.length ?? 0,
        textures: container?.textures.length ?? 0, allTexturesReady: container?.textures.every(texture => texture.isReady()) ?? false,
        lights: lamps.length + 1, embeddedLights: container?.lights.length ?? 0, activeEmbeddedLights: [],
        localLights: lamps.filter(({ light }) => light.isEnabled()).map(({ light }) => light.name),
        animationGroups: container?.animationGroups.length ?? 0,
        runningAnimations: container?.animationGroups.filter(clip => clip.isPlaying).length ?? 0,
        camera: { fov: scene.activeCamera?.fov ?? null, minZ: scene.activeCamera?.minZ ?? null, maxZ: scene.activeCamera?.maxZ ?? null },
        npcs: 0, foreignMeshesHidden: 0,
        foreignMeshesVisible: active ? scene.meshes.filter(mesh => mesh.getTotalVertices() > 0 && mesh.isEnabled() &&
          mesh.isVisible && mesh.visibility > 0 && !mesh.isDescendantOf(neighbourhood)).length : null,
        exit: { position: HOST_HOUSE_EXIT, size: HOST_HOUSE_EXIT_SIZE },
      };
    },
    dispose() {
      if (disposed) return; setActive(false); disposed = true;
      for (const light of foreignLights) if (!light.isDisposed())
        light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      container?.dispose(); ambient.dispose(); for (const { light } of lamps) light.dispose();
      proxyMaterial.dispose(); root.dispose(false, false);
    },
  };
}
