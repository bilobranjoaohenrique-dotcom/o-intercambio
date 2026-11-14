import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';

export type HostVehicleSeats = { daniel: TransformNode; helen: TransformNode };
type HostId = keyof HostVehicleSeats;
type Pose = { node: TransformNode; parent: TransformNode['parent']; position: Vector3;
  rotation: Vector3; quaternion: Quaternion | null; scaling: Vector3 };
const IDS: readonly HostId[] = ['daniel', 'helen'];
const save = (node: TransformNode): Pose => ({ node, parent: node.parent, position: node.position.clone(),
  rotation: node.rotation.clone(), quaternion: node.rotationQuaternion?.clone() ?? null, scaling: node.scaling.clone() });
function restore(pose: Pose) {
  pose.node.parent = pose.parent; pose.node.position.copyFrom(pose.position); pose.node.rotation.copyFrom(pose.rotation);
  pose.node.rotationQuaternion = pose.quaternion?.clone() ?? null; pose.node.scaling.copyFrom(pose.scaling);
}
const point = (p: Vector3) => ({ x: p.x, y: p.y, z: p.z });

/** Transfers the existing two actors, including the separately exported skin
 * roots, into a moving vehicle. No body, rig, material or texture is cloned.
 * Helen has no authored sitting clip: only compatible local joint rotations
 * are retargeted from Daniel, keeping her own bone lengths and proportions. */
export function createArrivalVehicleHosts(scene: Scene, container: AssetContainer) {
  const nodes = [...container.transformNodes, ...container.meshes];
  const actors = IDS.map(id => {
    const rig = container.transformNodes.find(node => node.name === id + '_host');
    const bodies = container.meshes.filter(mesh => mesh.getTotalVertices() > 0 && mesh.name.startsWith(id + '__'));
    if (!rig || !bodies.length) throw Error('Ator da família anfitriã ausente: ' + id);
    const prefixNodes = nodes.filter(node => node.name.startsWith(id + '__'));
    const actorNodes = new Set<TransformNode>([rig, ...prefixNodes]);
    const roots = [...actorNodes].filter(node => !node.parent || !actorNodes.has(node.parent as TransformNode));
    const bones = new Map(prefixNodes.filter(node => !node.name.includes('_Body')).map(node => [node.name.slice(id.length + 2), node]));
    return { id, rig, bodies, roots, nodes: [...actorNodes], bones };
  });
  const seatedCandidate = container.animationGroups.find(group => group.name === 'daniel__Seated_Idle');
  if (!seatedCandidate) throw Error('A pose sentada de Daniel não está disponível.');
  const seated: AnimationGroup = seatedCandidate;
  const clips = container.animationGroups.filter(group => IDS.some(id => group.name.startsWith(id + '__')));
  let assigned: HostVehicleSeats | null = null, snapshots: Pose[] = [], disposed = false;
  let clipStates: { clip: typeof seated; started: boolean; playing: boolean; frame: number }[] = [];
  let picks: { mesh: AbstractMesh; pickable: boolean }[] = [];
  let adapters: TransformNode[] = [];

  function refresh() {
    for (const actor of actors) {
      for (const node of actor.nodes) node.computeWorldMatrix(true);
      for (const mesh of actor.bodies) { mesh.skeleton?.prepare(true); mesh.computeWorldMatrix(true); mesh.refreshBoundingInfo(true, true); }
    }
  }
  function release() {
    if (!assigned) return;
    for (const clip of clips) clip.stop(true);
    for (const pose of snapshots) restore(pose);
    for (const state of clipStates) if (state.started) {
      state.clip.start(false, 1, state.clip.from, state.clip.to); state.clip.pause(); state.clip.goToFrame(state.frame);
      if (state.playing) state.clip.play();
    }
    for (const { mesh, pickable } of picks) mesh.isPickable = pickable;
    assigned = null; snapshots = []; clipStates = []; picks = [];
    for (const adapter of adapters) adapter.dispose(false, false);
    adapters = []; refresh();
  }
  function setSeats(seats: HostVehicleSeats | null) {
    if (disposed) return;
    if (seats && assigned?.daniel === seats.daniel && assigned.helen === seats.helen) return;
    release();
    if (!seats) return;
    for (const id of IDS) if (seats[id].isDisposed()) throw Error('Assento da família anfitriã foi descartado.');
    snapshots = actors.flatMap(actor => actor.nodes.map(save));
    clipStates = clips.map(clip => ({ clip, started: clip.isStarted, playing: clip.isPlaying, frame: clip.getCurrentFrame() }));
    picks = actors.flatMap(actor => actor.bodies.map(mesh => ({ mesh, pickable: mesh.isPickable })));
    const standing = new Map(snapshots.map(pose => [pose.node, pose]));
    assigned = seats;
    try {
      for (const clip of clips) clip.stop(true);
      seated.start(false, 1, seated.from, seated.to); seated.pause(); seated.goToFrame(seated.from);
      const daniel = actors[0], helen = actors[1];
      for (const [name, destination] of helen.bones) {
        const source = daniel.bones.get(name), sourceRest = source && standing.get(source), targetRest = standing.get(destination);
        if (!source?.rotationQuaternion || !sourceRest || !targetRest) continue;
        const sourceBase = sourceRest.quaternion ?? Quaternion.FromEulerVector(sourceRest.rotation);
        const targetBase = targetRest.quaternion ?? Quaternion.FromEulerVector(targetRest.rotation);
        const delta = sourceBase.conjugate().multiply(source.rotationQuaternion);
        destination.rotationQuaternion = targetBase.multiply(delta).normalize();
      }
      const sourceHip = daniel.bones.get('Hips')!, destinationHip = helen.bones.get('Hips')!;
      const sourceRestHip = standing.get(sourceHip)!.position, targetRestHip = standing.get(destinationHip)!.position;
      const ratio = targetRestHip.y / sourceRestHip.y;
      destinationHip.position.copyFrom(targetRestHip.add(sourceHip.position.subtract(sourceRestHip).scale(ratio)));

      for (const actor of actors) {
        const conversion = new TransformNode('Westbridge · ' + actor.id + ' · conversão original do GLB', scene);
        conversion.parent = seats[actor.id];
        // Preserve the original loader's X reflection for body and rig together.
        // The host marker's terminal translation/heading is intentionally local
        // to the terminal and becomes identity at the vehicle's seat anchor.
        const importedParent = standing.get(actor.rig)!.parent as TransformNode;
        conversion.rotationQuaternion = importedParent.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(importedParent.rotation);
        conversion.scaling.copyFrom(importedParent.scaling);
        for (const node of actor.roots) node.parent = conversion;
        actor.rig.position.setAll(0); actor.rig.rotation.setAll(0); actor.rig.rotationQuaternion = Quaternion.Identity();
        for (const mesh of actor.bodies) mesh.isPickable = false;
        adapters.push(conversion);
      }
      refresh();
    } catch (cause) { release(); throw cause; }
  }
  return {
    setSeats,
    get active() { return assigned !== null; },
    get meshes() { return actors.flatMap(actor => actor.bodies); },
    animate(time: number) {
      if (!assigned || disposed || !Number.isFinite(time)) return;
      // The static seated rigs stay paused; only sub-millimetre breathing is
      // added under the same game-time clock as the rest of the scene.
      for (const [index, adapter] of adapters.entries()) adapter.scaling.y = 1 + Math.sin(time * .75 + index * 1.4) * .0005;
    },
    get diagnostics() {
      return { count: actors.length, seated: assigned ? actors.length : 0, ids: actors.map(actor => actor.id + '_host'),
        location: assigned ? 'vehicle' : 'terminal', sameImportedActors: true,
        pose: assigned ? { daniel: 'daniel__Seated_Idle', helen: 'compatible-joint seated retarget; own bone lengths' } : null,
        hosts: actors.map(actor => {
          const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
          for (const mesh of actor.bodies) { mesh.computeWorldMatrix(true); const box = mesh.getBoundingInfo().boundingBox;
            min.minimizeInPlace(box.minimumWorld); max.maximizeInPlace(box.maximumWorld); }
          return { id: actor.id, meshes: actor.bodies.length, bounds: { min: point(min), max: point(max) } };
        }) };
    },
    dispose() { if (disposed) return; release(); disposed = true; },
  };
}
