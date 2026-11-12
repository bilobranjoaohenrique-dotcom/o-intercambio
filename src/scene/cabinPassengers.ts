import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import '@babylonjs/loaders/glTF';

/** position is the character root in world metres, after the seating offset. */
export type CabinSeat = {
  id: string;
  sourceId?: string;
  row: number;
  position: { x: number; y: number; z: number };
  scale?: number;
};

const SOURCE = '/models/passageiros_intercambio.glb';
const plain = (v: Vector3) => ({ x: v.x, y: v.y, z: v.z });
type Passenger = {
  id: string; seatId: string; row: number; root: TransformNode; scale: number;
  clip: AnimationGroup; meshes: Mesh[];
  bounds: { space: 'world-at-seat-rest'; min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number } };
};

/** One losslessly shared asset retains all thirty appearances and rigs. Its
 * supplied seated pose is applied once; no locomotion or per-frame rig update
 * is needed for these background passengers. The cabin owns their lighting. */
export async function loadCabinPassengers(scene: Scene, parent: TransformNode, seats: readonly CabinSeat[]) {
  const ids = seats.map(seat => seat.sourceId ?? seat.id);
  if (new Set(ids).size !== ids.length) throw Error('Um passageiro foi atribuído a mais de um assento.');
  for (const seat of seats) {
    if (![seat.position.x, seat.position.y, seat.position.z, seat.scale ?? 1].every(Number.isFinite) || (seat.scale ?? 1) <= 0)
      throw Error('Posição ou escala inválida no assento: ' + seat.id);
  }
  const container = await LoadAssetContainerAsync(SOURCE, scene, {
    pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } },
  });
  if (parent.isDisposed() || scene.isDisposed) {
    container.dispose(); throw Error('A cabine foi encerrada durante o carregamento dos passageiros.');
  }
  const adapter = new TransformNode('avião · passageiros do pacote', scene);
  adapter.parent = parent;
  const passengers: Passenger[] = [], meshes: AbstractMesh[] = [];
  let disposed = false;
  try {
    const nodes = [...container.transformNodes, ...container.meshes], imported = new Set<TransformNode>(nodes);
    // Keep the glTF handedness conversion and every mesh/armature together.
    for (const node of nodes) if (!node.parent || !imported.has(node.parent as TransformNode)) node.parent = adapter;
    const roots = new Map(container.transformNodes.filter(node => /^passageiro_\d{2}$/.test(node.name)).map(node => [node.name, node]));
    for (const root of roots.values()) root.setEnabled(false);
    for (const group of container.animationGroups) group.stop(true);
    for (const material of container.materials) if ('maxSimultaneousLights' in material) material.maxSimultaneousLights = 4;
    container.addAllToScene();

    for (const seat of seats) {
      const id = seat.sourceId ?? seat.id, root = roots.get(id);
      const clip = container.animationGroups.find(group => group.name === id + '::Pose_Sentado_Cabine');
      const body = container.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh &&
        mesh.getTotalVertices() > 0 && mesh.name.startsWith(id + '::'));
      if (!root || !clip || body.length < 2) throw Error('Passageiro ou pose sentada ausente: ' + id);
      const scale = seat.scale ?? 1;
      root.scaling.setAll(scale); root.setEnabled(true);
      root.computeWorldMatrix(true);
      // The loader mirrors source X. Absolute placement handles that conversion
      // rather than moving the skinned body away from its shared rig root.
      root.setAbsolutePosition(new Vector3(seat.position.x, seat.position.y, seat.position.z));
      clip.start(false, 1, clip.from, clip.to); clip.pause(); clip.goToFrame(clip.from);
      for (const node of nodes) if (node === root || node.isDescendantOf(root)) node.computeWorldMatrix(true);
      for (const mesh of body) mesh.skeleton?.prepare(true);
      const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const mesh of body) {
        mesh.isPickable = false; mesh.receiveShadows = true;
        mesh.metadata = { ...mesh.metadata, passengerId: id, cabinSeatId: seat.id, source: SOURCE, castShadow: true };
        // Refresh the posed bounds once, then allow ordinary frustum culling.
        mesh.refreshBoundingInfo(true, true); mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        min.minimizeInPlace(box.minimumWorld); max.maximizeInPlace(box.maximumWorld);
        meshes.push(mesh);
      }
      passengers.push({ id, seatId: seat.id, row: seat.row, root, scale, clip, meshes: body,
        bounds: { space: 'world-at-seat-rest', min: plain(min), max: plain(max) } });
    }
    return {
      meshes, materials: container.materials,
      animate(time: number) {
        if (disposed || !Number.isFinite(time)) return;
        // Sub-millimetre torso-height variation avoids thirty skeleton updates.
        // Translation, seat contact and all authored joint poses remain fixed.
        for (let index = 0; index < passengers.length; index++) {
          const passenger = passengers[index];
          passenger.root.scaling.y = passenger.scale * (1 + Math.sin(time * .8 + index * 1.71) * .0006);
        }
      },
      get diagnostics() { return { source: SOURCE, ready: true, loaded: true, error: null, count: passengers.length,
        posedCount: passengers.length, staticSeatedPoses: true,
        runningRigAnimations: passengers.filter(passenger => passenger.clip.isPlaying).length,
        visibleCount: passengers.filter(passenger => passenger.meshes.some(mesh =>
          mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0)).length,
        meshes: meshes.length, materials: container.materials.length, textures: container.textures.length,
        skins: container.skeletons.length,
        vertices: meshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0),
        triangles: meshes.reduce((sum, mesh) => sum + (mesh.getTotalIndices() / 3), 0),
        seats: passengers.map(passenger => ({ id: passenger.id, seatId: passenger.seatId, row: passenger.row,
          root: plain(passenger.root.getAbsolutePosition()), scale: passenger.scale, clip: passenger.clip.name,
          bounds: passenger.bounds, footMinY: passenger.bounds.min.y, headTopY: passenger.bounds.max.y })),
      }; },
      dispose() {
        if (disposed) return; disposed = true;
        for (const passenger of passengers) passenger.clip.stop(true);
        container.dispose(); adapter.dispose(false, false);
      },
    };
  } catch (error) {
    container.dispose(); adapter.dispose(false, false); throw error;
  }
}
