import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import type { InteractionTarget } from '../game/types';
import { FAMILY_CAR } from '../game/garageLayout';

const SOURCE = '/models/carro_intercambio.glb';
const AUTHORED_SIZE = { width: 1.946080207824707, height: 1.5662199258804321, length: 4.250219821929932 };
const SCALE = FAMILY_CAR.length / AUTHORED_SIZE.length;
const point = (value: Vector3) => ({ x: value.x, y: value.y, z: value.z });

/** One supplied exterior model, fitted uniformly into the existing parking
 * footprint. Loading is shared by rendering, picking, lighting and readiness. */
export function buildFamilyCar(scene: Scene, parent: TransformNode) {
  const root = new TransformNode('garagem · carro da família GLB', scene);
  root.parent = parent;
  root.position.set(FAMILY_CAR.x, FAMILY_CAR.y, FAMILY_CAR.z);
  root.rotation.y = FAMILY_CAR.yaw; root.scaling.setAll(SCALE);
  const meshes: AbstractMesh[] = [], shadowCasters: Mesh[] = [];
  const target: InteractionTarget = { id: 'family-car', meshes,
    label: () => 'Ir para o aeroporto', execute: () => undefined };
  let container: AssetContainer | null = null, disposed = false, loaded = false, error: string | null = null;
  let materialCount = 0, textureCount = 0;
  let bounds: { min: ReturnType<typeof point>; max: ReturnType<typeof point> } = { min: { x: FAMILY_CAR.x, y: 0, z: FAMILY_CAR.z },
    max: { x: FAMILY_CAR.x, y: 0, z: FAMILY_CAR.z } };

  const ready = LoadAssetContainerAsync(SOURCE, scene, {
    pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } },
  }).then(asset => {
    if (disposed) { asset.dispose(); return; }
    container = asset;
    const nodes = [...asset.transformNodes, ...asset.meshes];
    const imported = new Set<TransformNode>(nodes);
    // Keep the glTF loader's own handedness transform and the original UVs.
    for (const node of nodes)
      if (!node.parent || !imported.has(node.parent as TransformNode)) node.parent = root;
    const bodies = asset.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
    if (!bodies.length) throw Error('O GLB do carro não contém uma malha visível.');
    for (const mesh of bodies) {
      mesh.isPickable = true; mesh.receiveShadows = true;
      mesh.metadata = { ...mesh.metadata, familyCar: true, importedCar: true,
        interactionId: 'family-car', source: SOURCE, castShadow: true };
    }
    asset.addAllToScene();
    meshes.push(...bodies); shadowCasters.push(...bodies);
    const materials = new Set(bodies.map(mesh => mesh.material).filter(material => !!material));
    materialCount = materials.size;
    textureCount = new Set([...materials].flatMap(material => material!.getActiveTextures())).size;
    const low = new Vector3(Infinity, Infinity, Infinity), high = new Vector3(-Infinity, -Infinity, -Infinity);
    root.computeWorldMatrix(true);
    for (const mesh of bodies) {
      mesh.computeWorldMatrix(true); mesh.refreshBoundingInfo();
      low.minimizeInPlace(mesh.getBoundingInfo().boundingBox.minimumWorld);
      high.maximizeInPlace(mesh.getBoundingInfo().boundingBox.maximumWorld);
    }
    bounds = { min: point(low), max: point(high) }; loaded = true;
  }).catch(reason => {
    error = String(reason?.message ?? reason);
    container?.dispose(); root.dispose(false, false);
    throw new Error('Não foi possível carregar o carro da família: ' + error);
  });

  return {
    meshes, target, shadowCasters, ready,
    get diagnostics() { return { model: 'carro-intercambio-glb', source: SOURCE, loaded, error,
      meshes: meshes.length, vertices: meshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0),
      triangles: meshes.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0),
      materials: materialCount, textures: textureCount,
      position: point(root.position), yaw: root.rotation.y, scale: SCALE,
      width: AUTHORED_SIZE.width * SCALE, length: FAMILY_CAR.length, height: AUTHORED_SIZE.height * SCALE,
      bounds, originalMaterials: true, interiorRequired: false }; },
    dispose() {
      if (disposed) return; disposed = true;
      container?.dispose(); root.dispose(false, false);
    },
  };
}
