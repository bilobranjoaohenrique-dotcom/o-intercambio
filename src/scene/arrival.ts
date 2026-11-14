import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import type { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { Light } from '@babylonjs/core/Lights/light';
import '@babylonjs/loaders/glTF';
import type { InteractionTarget } from '../game/types';
import { ARRIVAL_MODEL, ARRIVAL_HOST, ARRIVAL_POSTER } from '../game/arrivalLayout';
import { createArrivalVehicleHosts, type HostVehicleSeats } from './arrivalVehicleHosts';

/** The supplied arrivals interior owns its scenery, hosts and six passengers.
 * Keep their authored metre scale, materials, rigs and seated poses together. */
export function buildArrival(scene: Scene, parent: TransformNode) {
  const oldLights = [...scene.lights], root = new TransformNode('chegada · cenário GLB enviado', scene);
  root.parent = parent;
  const modelRoot = new TransformNode('chegada · orientação do arquivo', scene);
  modelRoot.parent = root;
  modelRoot.position.set(ARRIVAL_MODEL.position.x, ARRIVAL_MODEL.position.y, ARRIVAL_MODEL.position.z);
  modelRoot.rotation.y = ARRIVAL_MODEL.yaw;
  const meshes: AbstractMesh[] = [], importedMeshes: AbstractMesh[] = [], selectedClips: AnimationGroup[] = [];
  const embeddedLights: Light[] = [], hostBodies: AbstractMesh[] = [];
  const hostIds = new Set<string>();
  let container: AssetContainer | null = null, active = false, disposed = false, loaded = false, error: string | null = null;
  let materialCount = 0, textureCount = 0, npcCount = 0;
  let vehicleHosts: ReturnType<typeof createArrivalVehicleHosts> | null = null;
  const proxyMaterial = new StandardMaterial('chegada · áreas de interação invisíveis', scene);
  proxyMaterial.disableLighting = true;
  function proxy(id: string, width: number, height: number, depth: number, point: { x: number; y: number; z: number }) {
    const mesh = MeshBuilder.CreateBox('chegada · interação ' + id, { width, height, depth }, scene);
    mesh.parent = root; mesh.position.set(point.x, point.y, point.z);
    mesh.material = proxyMaterial; mesh.visibility = .001; mesh.isPickable = true;
    mesh.metadata = { interactionId: id, castShadow: false };
    meshes.push(mesh); return mesh;
  }
  const host = proxy('host', .95, 1.70, .35, ARRIVAL_HOST);
  const poster = proxy('poster', 1.70, .90, .10, ARRIVAL_POSTER);
  const hostTargets: AbstractMesh[] = [host];
  const targets: InteractionTarget[] = [
    { id: 'host', meshes: hostTargets, label: () => 'Conversar com a família anfitriã', execute: () => undefined },
    { id: 'poster', meshes: [poster], label: () => 'Examinar cartaz', execute: () => undefined },
  ];
  const ambient = new HemisphericLight('chegada · claridade do terminal', new Vector3(0, 1, -.2), scene);
  ambient.diffuse.set(.87, .90, 1); ambient.groundColor.set(.26, .25, .29); ambient.intensity = .64;
  ambient.includedOnlyMeshes = meshes; ambient.setEnabled(false);

  const ready = LoadAssetContainerAsync(ARRIVAL_MODEL.source, scene, {
    pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } },
  }).then(value => {
    if (disposed) { value.dispose(); return; }
    container = value;
    const nodes = [...value.transformNodes, ...value.meshes], imported = new Set<TransformNode>(nodes);
    // Preserve the loader's handedness root and the separate skinned-mesh and
    // armature roots. Reparenting each body individually would break the rig.
    for (const node of nodes) if (!node.parent || !imported.has(node.parent as TransformNode)) node.parent = modelRoot;
    for (const mesh of value.meshes) {
      mesh.isPickable = false; mesh.receiveShadows = true;
      mesh.metadata = { ...mesh.metadata, importedArrival: true, source: ARRIVAL_MODEL.source };
      if (mesh.skeleton) mesh.alwaysSelectAsActiveMesh = true;
      if (mesh.getTotalVertices() <= 0) continue;
      importedMeshes.push(mesh);
      if (/^(daniel|helen)__/i.test(mesh.name)) {
        hostIds.add(mesh.name.split('__')[0].toLowerCase());
        mesh.isPickable = true; hostBodies.push(mesh); hostTargets.push(mesh);
      }
    }
    if (hostIds.size !== 2) throw Error('Os modelos da família anfitriã não foram localizados na chegada.');
    meshes.push(...importedMeshes);
    materialCount = value.materials.length; textureCount = value.textures.length;
    for (const material of value.materials) if ('maxSimultaneousLights' in material) material.maxSimultaneousLights = 4;
    for (const group of value.animationGroups) group.stop(true);
    const npcIds = [...new Set(value.animationGroups.map(group => group.name.split('__')[0]))];
    for (const id of npcIds) {
      const clipName = id + (id.startsWith('npc_sentado_') ? '__Seated_Idle' : '__Idle');
      const group = value.animationGroups.find(candidate => candidate.name === clipName);
      if (!group) throw Error('Pose inicial ausente na chegada: ' + clipName);
      group.start(false, 1, group.from, group.to); group.pause(); group.goToFrame(group.from);
      selectedClips.push(group);
    }
    npcCount = npcIds.length;
    value.addAllToScene();
    for (const mesh of importedMeshes) {
      mesh.computeWorldMatrix(true);
      if (mesh.skeleton) mesh.refreshBoundingInfo(true, true);
    }
    for (const light of oldLights) light.excludedMeshes.push(...meshes);
    // Local photometric adaptation matches the other imported terminal. Each
    // mesh sees only three source lamps plus ambient; other scenes are excluded.
    for (const light of value.lights) {
      light.intensity = Math.min(18, light.intensity / 1800);
      light.range = Math.min(light.range, 22);
      light.includedOnlyMeshes = [host]; light.setEnabled(active); embeddedLights.push(light);
    }
    for (const mesh of importedMeshes) {
      const center = mesh.getBoundingInfo().boundingBox.centerWorld;
      const closest = [...embeddedLights].sort((a, b) =>
        Vector3.DistanceSquared(center, (a as PointLight).getAbsolutePosition()) -
        Vector3.DistanceSquared(center, (b as PointLight).getAbsolutePosition())).slice(0, 3);
      for (const light of closest) light.includedOnlyMeshes.push(mesh);
    }
    ambient.includedOnlyMeshes = meshes;
    vehicleHosts = createArrivalVehicleHosts(scene, value); loaded = true;
  }).catch(reason => {
    error = String(reason?.message ?? reason); throw reason;
  });

  return {
    meshes, targets, ready,
    setHostVehicleSeats(seats: HostVehicleSeats | null) {
      if (!vehicleHosts) { if (seats) throw Error('A família anfitriã ainda não terminou de carregar.'); return; }
      vehicleHosts.setSeats(seats);
    },
    get vehicleHostMeshes() { return vehicleHosts?.meshes ?? []; },
    get vehicleHostDiagnostics() { return vehicleHosts?.diagnostics ?? { count: 0, seated: 0, ids: [], location: 'terminal' }; },
    animateVehicleHosts(time: number) { vehicleHosts?.animate(time); },
    setActive(value: boolean) {
      active = value; root.setEnabled(value);
      for (const light of [ambient, ...embeddedLights]) light.setEnabled(value);
    },
    animate(time: number) {
      if (!active || !loaded || disposed) return;
      for (const group of selectedClips) {
        const span = group.to - group.from, fps = group.targetedAnimations[0]?.animation.framePerSecond ?? 30;
        group.goToFrame(span > 0 ? group.from + ((Math.max(0, time) * fps) % span) : group.from);
      }
    },
    get diagnostics() { return { active, ready: loaded && !error, loaded, error, source: ARRIVAL_MODEL.source,
      npcs: npcCount, hosts: hostIds.size, passengers: Math.max(0, npcCount - hostIds.size),
      meshes: importedMeshes.length, materials: materialCount, textures: textureCount,
      lights: embeddedLights.length + 1, embeddedLights: embeddedLights.length,
      animationsActive: selectedClips.length, clipNames: selectedClips.map(group => group.name),
      animationClock: 'game-time', protagonistMeshes: 0 }; },
    dispose() {
      if (disposed) return; disposed = true;
      vehicleHosts?.dispose();
      for (const light of oldLights) light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      for (const group of selectedClips) group.stop(true);
      container?.dispose(); ambient.dispose();
      host.dispose(); poster.dispose(); proxyMaterial.dispose(); root.dispose(false, false);
    },
  };
}
