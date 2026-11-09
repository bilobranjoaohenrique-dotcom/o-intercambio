import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { MorphTarget } from '@babylonjs/core/Morph/morphTarget';
import '@babylonjs/loaders/glTF';

type Location = 'kitchen' | 'car' | 'airport';
type RestPose = { node: TransformNode; position: Vector3; rotation: Quaternion; scaling: Vector3 };
type Bounds = { space: 'parent-local'; min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number }; size: { x: number; y: number; z: number } };

const SOURCE = '/models/pai_intercambio.glb';
const SCALE = 1.778 / (1.7961 - .006);
const HEIGHT_OFFSET: Record<Location, number> = { kitchen: .031, car: .565 - .5972 * SCALE, airport: -.006 * SCALE };
const CLIPS = ['Idle_Breathe', 'Walk_InPlace', 'Sit_Down', 'Seated_Idle', 'Talk_Gesture', 'Talk_Seated', 'Look_Nod'] as const;
const plain = (point: Vector3) => ({ x: point.x, y: point.y, z: point.z });
const clamp = (value: number, min = 0, max = 1) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;

/** The supplied character stays intact: original GLB materials, embedded
 * images, rig, shape keys and clips. Only the rig pose is adapted to the two
 * existing seats; neither vertex buffers nor bone lengths are rewritten. */
export async function loadImportedFather(scene: Scene, parent: TransformNode) {
  const container = await LoadAssetContainerAsync(SOURCE, scene, {
    pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } },
  });
  const adapter = new TransformNode('PAI · modelo GLB original', scene);
  adapter.parent = parent; adapter.scaling.setAll(SCALE); adapter.setEnabled(false);
  try {
    const nodes = [...container.transformNodes, ...container.meshes];
    const imported = new Set<TransformNode>(nodes);
    // Babylon's glTF AUTO root already applies Yπ and Z reflection. Together
    // they preserve the file's +Z facing direction; an extra yaw would reverse it.
    for (const node of nodes) if (!node.parent || !imported.has(node.parent as TransformNode)) node.parent = adapter;
    const meshes = container.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
    const joints = new Map<string, TransformNode>();
    for (const node of container.transformNodes) joints.set(node.name.replace(/^mixamorig\d*:/i, ''), node);
    const headNode = joints.get('Head');
    if (!headNode || !meshes.length) throw Error('O arquivo não contém a cabeça ou as malhas esperadas do pai.');
    const head: TransformNode = headNode;
    const groups = new Map<string, AnimationGroup>();
    for (const group of container.animationGroups) { group.stop(true); groups.set(group.name, group); }
    for (const name of CLIPS) if (!groups.has(name)) throw Error('Animação ausente no modelo do pai: ' + name);
    const rest: RestPose[] = container.transformNodes.map(node => ({ node, position: node.position.clone(),
      rotation: node.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(node.rotation), scaling: node.scaling.clone() }));
    const restByNode = new Map(rest.map(pose => [pose.node, pose]));
    const jawTargets: MorphTarget[] = [], smileTargets: MorphTarget[] = [], morphNames: string[] = [];
    for (const mesh of meshes) {
      mesh.isPickable = false; mesh.receiveShadows = true; mesh.alwaysSelectAsActiveMesh = true;
      mesh.metadata = { ...mesh.metadata, character: true, role: 'father', importedFather: true, source: SOURCE, castShadow: true };
      const manager = mesh.morphTargetManager;
      if (!manager) continue;
      // Keep the morph shader shape stable while speech opens/closes the mouth.
      manager.numMaxInfluencers = Math.max(2, manager.numTargets);
      for (let index = 0; index < manager.numTargets; index++) {
        const target = manager.getTarget(index); target.influence = 0;
        morphNames.push(mesh.name + ':' + target.name);
        if (/jawopen/i.test(target.name)) jawTargets.push(target);
        if (/smile/i.test(target.name)) smileTargets.push(target);
      }
    }
    if (!jawTargets.length || !smileTargets.length) throw Error('O modelo do pai não contém os morphs de boca e sorriso.');
    container.addAllToScene();
    let location: Location = 'kitchen', animation = 'Seated_Idle', group: AnimationGroup | null = null;
    let clipStarted = 0, lastTime = 0, frame = 0, disposed = false, lastBoundsTick = -Infinity;
    let currentJaw = 0, currentSmile = 0;
    let bounds: Bounds = { space: 'parent-local', min: plain(Vector3.Zero()), max: plain(Vector3.Zero()), size: plain(Vector3.Zero()) };

    function restoreRig() {
      for (const pose of rest) {
        pose.node.position.copyFrom(pose.position); pose.node.scaling.copyFrom(pose.scaling);
        pose.node.rotationQuaternion ??= Quaternion.Identity(); pose.node.rotationQuaternion.copyFrom(pose.rotation);
      }
    }
    function select(name: string, time: number) {
      if (group && animation === name) return;
      group?.stop(true); animation = name; clipStarted = time;
      group = groups.get(name)!;
      // A paused group is sampled explicitly below. Scene render time cannot
      // advance the character while the game's clock or pause menu is stopped.
      group.start(false, 1, group.from, group.to); group.pause();
    }
    function evaluate(time: number) {
      if (!group) return;
      restoreRig();
      const fps = group.targetedAnimations[0]?.animation.framePerSecond ?? 60;
      const span = Math.max(.001, group.to - group.from);
      frame = group.from + Math.max(0, time - clipStarted) * fps % span;
      group.goToFrame(frame);
    }
    function invertSeatDelta(name: string) {
      const node = joints.get(name), pose = node && restByNode.get(node);
      if (!node?.rotationQuaternion || !pose) return;
      const delta = pose.rotation.conjugate().multiply(node.rotationQuaternion).normalize();
      node.rotationQuaternion.copyFrom(pose.rotation.multiply(delta.conjugate()).normalize());
    }
    function worldPosition(node: TransformNode) {
      node.computeWorldMatrix(true); return node.getAbsolutePosition().clone();
    }
    function turnToward(node: TransformNode, child: TransformNode, goal: Vector3) {
      if (!node.parent || !node.rotationQuaternion) return;
      const origin = worldPosition(node), current = worldPosition(child).subtract(origin);
      const inverseParent = Matrix.Invert((node.parent as TransformNode).computeWorldMatrix(true));
      const from = Vector3.TransformNormal(current, inverseParent).normalize();
      const to = Vector3.TransformNormal(goal.subtract(origin), inverseParent).normalize();
      if (from.lengthSquared() < .5 || to.lengthSquared() < .5) return;
      const delta = Quaternion.FromUnitVectorsToRef(from, to, Quaternion.Identity());
      node.rotationQuaternion.copyFrom(delta.multiply(node.rotationQuaternion).normalize());
      node.computeWorldMatrix(true);
    }
    function fitLimb(start: TransformNode | undefined, middle: TransformNode | undefined, end: TransformNode | undefined,
      target: Vector3, pole: Vector3, preserveEndRotation: boolean) {
      if (!start?.rotationQuaternion || !middle?.rotationQuaternion || !end?.rotationQuaternion) return;
      const originalChain = start.rotationQuaternion.multiply(middle.rotationQuaternion).multiply(end.rotationQuaternion);
      const a = worldPosition(start), b = worldPosition(middle), c = worldPosition(end);
      const first = Vector3.Distance(a, b), second = Vector3.Distance(b, c);
      const direction = target.subtract(a), actualDistance = direction.length();
      if (first < .01 || second < .01 || actualDistance < .01) return;
      direction.scaleInPlace(1 / actualDistance);
      const distance = Math.max(Math.abs(first - second) + .002, Math.min(first + second - .002, actualDistance));
      const along = (first * first - second * second + distance * distance) / (2 * distance);
      const height = Math.sqrt(Math.max(0, first * first - along * along));
      const bend = pole.subtract(a);
      bend.subtractInPlace(direction.scale(Vector3.Dot(bend, direction)));
      if (bend.lengthSquared() < .00001) return;
      bend.normalize();
      const elbow = a.add(direction.scale(along)).add(bend.scale(height));
      turnToward(start, middle, elbow);
      turnToward(middle, end, a.add(direction.scale(distance)));
      if (preserveEndRotation) {
        const changedChain = start.rotationQuaternion.multiply(middle.rotationQuaternion);
        end.rotationQuaternion.copyFrom(changedChain.conjugate().multiply(originalChain).normalize());
      }
    }
    function seatedFit() {
      for (const side of ['Left', 'Right']) {
        // These two authored seated clips bend toward -Z although the face is
        // +Z. Reverse their local animated delta relative to the untouched bind.
        for (const part of ['UpLeg', 'Leg', 'Arm', 'ForeArm']) invertSeatDelta(side + part);
      }
      parent.computeWorldMatrix(true); adapter.computeWorldMatrix(true);
      const parentMatrix = parent.getWorldMatrix(), inverseParent = Matrix.Invert(parentMatrix);
      const inWorld = (x: number, y: number, z: number) => Vector3.TransformCoordinates(new Vector3(x, y, z), parentMatrix);
      for (const name of ['Left', 'Right']) {
        const arm = joints.get(name + 'Arm'), forearm = joints.get(name + 'ForeArm'), hand = joints.get(name + 'Hand');
        if (arm) {
          const side = Math.sign(Vector3.TransformCoordinates(worldPosition(arm), inverseParent).x) || 1;
          fitLimb(arm, forearm, hand,
            location === 'car' ? inWorld(side * .12, .965, .43) : inWorld(side * .18, .835, .34),
            inWorld(side * .37, location === 'car' ? .76 : .83, .12), true);
        }
        if (location === 'car') {
          const leg = joints.get(name + 'UpLeg');
          if (leg) {
            const side = Math.sign(Vector3.TransformCoordinates(worldPosition(leg), inverseParent).x) || 1;
            fitLimb(leg, joints.get(name + 'Leg'), joints.get(name + 'Foot'),
              inWorld(side * .12, .43, .76), inWorld(side * .13, .91, .39), true);
          }
        }
      }
    }
    function updateBounds(time: number, force = false) {
      const tick = Math.floor(time * 2);
      if (!force && tick === lastBoundsTick) return;
      lastBoundsTick = tick;
      for (const skeleton of container.skeletons) skeleton.prepare(true);
      const inverseParent = Matrix.Invert(parent.computeWorldMatrix(true));
      const low = new Vector3(Infinity, Infinity, Infinity), high = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const mesh of meshes) {
        mesh.computeWorldMatrix(true); mesh.refreshBoundingInfo(true, true);
        for (const point of mesh.getBoundingInfo().boundingBox.vectorsWorld) {
          const local = Vector3.TransformCoordinates(point, inverseParent);
          low.minimizeInPlace(local); high.maximizeInPlace(local);
        }
      }
      bounds = { space: 'parent-local', min: plain(low), max: plain(high), size: plain(high.subtract(low)) };
    }
    function apply(time: number, speaking: boolean, mouthOpen: number, smile: number, lookYaw: number, lookPitch: number, farewell: number) {
      evaluate(time);
      if (location !== 'airport') seatedFit();
      const nod = location === 'airport' ? clamp(farewell) * .045 : 0;
      // The loader's X reflection reverses yaw, while pitch retains its sign.
      const look = Quaternion.FromEulerAngles(clamp(lookPitch, -.20, .20) + nod, -clamp(lookYaw, -.65, .65), 0);
      head.rotationQuaternion ??= Quaternion.Identity();
      head.rotationQuaternion.multiplyInPlace(look);
      currentJaw = speaking && location !== 'car' ? clamp(mouthOpen, 0, .85) : 0;
      currentSmile = speaking && location !== 'car' ? clamp(smile, 0, .75) : 0;
      for (const target of jawTargets) target.influence = currentJaw;
      for (const target of smileTargets) target.influence = currentSmile;
      for (const skeleton of container.skeletons) skeleton.prepare(true);
      updateBounds(time);
    }
    function setLocation(next: Location) {
      if (disposed) return;
      location = next; adapter.position.y = HEIGHT_OFFSET[next]; lastBoundsTick = -Infinity;
      group?.stop(true); group = null;
      select(next === 'airport' ? 'Idle_Breathe' : 'Seated_Idle', lastTime);
      apply(lastTime, false, 0, .16, 0, 0, 0); updateBounds(lastTime, true);
    }
    setLocation('kitchen'); adapter.setEnabled(true);
    const materials = new Set(meshes.map(mesh => mesh.material).filter(material => !!material));
    const textures = new Set([...materials].flatMap(material => material!.getActiveTextures()));
    return { meshes, shadowCasters: meshes.filter(mesh => !/boca|olho/i.test(mesh.name)), head,
      setLocation,
      animate(time: number, speaking: boolean, mouthOpen: number, smile: number, lookYaw: number, lookPitch: number, farewell = 0) {
        if (disposed || !Number.isFinite(time)) return;
        lastTime = time;
        const clip = location === 'car' ? 'Seated_Idle' : location === 'kitchen' ? speaking ? 'Talk_Seated' : 'Seated_Idle'
          : speaking ? 'Talk_Gesture' : farewell > .01 ? 'Look_Nod' : 'Idle_Breathe';
        select(clip, time); apply(time, speaking, mouthOpen, smile, lookYaw, lookPitch, farewell);
      },
      get diagnostics() { return { source: SOURCE, loaded: true, error: null, pose: location,
        animation, frame, deterministicClock: true, clips: [...groups.keys()], materialCount: materials.size,
        textureCount: textures.size, morphs: morphNames, morphWeights: { JawOpen: currentJaw, Smile: currentSmile },
        bounds, scale: SCALE, offsetY: adapter.position.y,
        headId: head.uniqueId, meshes: meshes.length,
        loaderRoot: container.meshes.find(mesh => mesh.name === '__root__')?.rotationQuaternion?.asArray(),
      }; },
      dispose() {
        if (disposed) return; disposed = true;
        for (const animation of groups.values()) animation.stop(true);
        container.dispose(); adapter.dispose(false, false);
      },
    };
  } catch (error) {
    container.dispose(); adapter.dispose(false, false); throw error;
  }
}
