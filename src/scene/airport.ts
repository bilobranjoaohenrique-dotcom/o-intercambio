import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { Light } from '@babylonjs/core/Lights/light';
import '@babylonjs/loaders/glTF';
import type { InteractionTarget } from '../game/types';
import { AIRPORT_MODEL, AIRPORT_GATE, AIRPORT_FLIGHT_BOARD, AIRPORT_PARENTS } from '../game/airportLayout';

/** The supplied Brazilian terminal replaces the former procedural lounge.
 * Authored scenery and NPC rigs share one wrapper, preserving their hierarchy. */
export function buildAirport(scene: Scene, parent: TransformNode) {
  const oldLights = [...scene.lights], root = new TransformNode('aeroporto · cenário GLB enviado', scene);
  root.parent = parent;
  const modelRoot = new TransformNode('aeroporto · orientação e piso do arquivo', scene);
  modelRoot.parent = root;
  modelRoot.position.copyFromFloats(AIRPORT_MODEL.position.x, AIRPORT_MODEL.position.y, AIRPORT_MODEL.position.z);
  modelRoot.rotation.y = AIRPORT_MODEL.yaw;
  const meshes: AbstractMesh[] = [], importedMeshes: AbstractMesh[] = [], selectedClips: AnimationGroup[] = [];
  const supplementalMeshes: AbstractMesh[] = [];
  const embeddedLights: Light[] = [];
  const proxyMaterial = new StandardMaterial('aeroporto · áreas de interação invisíveis', scene);
  proxyMaterial.disableLighting = true;
  let container: AssetContainer | null = null, active = false, disposed = false, loaded = false, error: string | null = null;
  let parentMeshes: readonly AbstractMesh[] = [], materialCount = 0, textureCount = 0, npcCount = 0;

  function proxy(id: string, width: number, height: number, depth: number, point: { x: number; y: number; z: number }) {
    const mesh = MeshBuilder.CreateBox('aeroporto · interação ' + id, { width, height, depth }, scene);
    mesh.parent = root; mesh.position.copyFromFloats(point.x, point.y, point.z);
    mesh.material = proxyMaterial; mesh.visibility = .001; mesh.isPickable = true;
    mesh.metadata = { interactionId: id, castShadow: false };
    meshes.push(mesh); return mesh;
  }
  const gate = proxy('gate', 1.5, 2.15, .06, AIRPORT_GATE);
  const flightBoard = proxy('flightBoard', .06, 1.12, 1.9, AIRPORT_FLIGHT_BOARD);
  const targets: InteractionTarget[] = [
    { id: 'gate', meshes: [gate], label: () => 'Embarcar', execute: () => undefined },
    { id: 'flightBoard', meshes: [flightBoard], label: () => 'Consultar painel de partidas', execute: () => undefined },
  ];
  // The model's apron has no sky enclosure. A single low-resolution backdrop
  // closes that view without changing scene clear colour or global lighting.
  const skyTexture = new DynamicTexture('aeroporto · horizonte distante', { width: 128, height: 256 }, scene, false, Texture.NEAREST_SAMPLINGMODE);
  const skyContext = skyTexture.getContext() as unknown as CanvasRenderingContext2D;
  const skyGradient = skyContext.createLinearGradient(0, 0, 0, 256);
  skyGradient.addColorStop(0, '#101726'); skyGradient.addColorStop(.52, '#28334a');
  skyGradient.addColorStop(.76, '#5b5260'); skyGradient.addColorStop(.82, '#7c6562'); skyGradient.addColorStop(1, '#222838');
  skyContext.fillStyle = skyGradient; skyContext.fillRect(0, 0, 128, 256);
  // A dim irregular skyline stays below eye level; it is background only.
  for (let x = 0; x < 128; x += 4) {
    const height = 2 + (x * 17 % 7);
    skyContext.fillStyle = '#292d3a'; skyContext.fillRect(x, 213 - height, 4, 256);
    if (x % 12 === 0) { skyContext.fillStyle = '#9b805c'; skyContext.fillRect(x + 1, 211, 1, 1); }
  }
  skyTexture.update(true); skyTexture.anisotropicFilteringLevel = 1;
  const skyMaterial = new StandardMaterial('aeroporto · céu local sem luz adicional', scene);
  skyMaterial.diffuseTexture = skyTexture; skyMaterial.emissiveTexture = skyTexture;
  skyMaterial.emissiveColor.set(1, 1, 1); skyMaterial.disableLighting = true;
  const backdrop = MeshBuilder.CreatePlane('aeroporto · fundo externo distante', { width: 70, height: 24 }, scene);
  backdrop.parent = root; backdrop.position.set(30, 8, 45); backdrop.material = skyMaterial; backdrop.isPickable = false;
  supplementalMeshes.push(backdrop); meshes.push(backdrop);
  const ambient = new HemisphericLight('aeroporto · ambiente do terminal', new Vector3(0, 1, -.2), scene);
  ambient.diffuse.set(.85, .88, 1); ambient.groundColor.set(.26, .25, .29); ambient.intensity = .64;
  const key = new PointLight('aeroporto · luz suave dos pais', new Vector3(
    (AIRPORT_PARENTS.father.position.x + AIRPORT_PARENTS.mother.position.x) / 2 + .85, 3.2,
    (AIRPORT_PARENTS.father.position.z + AIRPORT_PARENTS.mother.position.z) / 2), scene);
  key.diffuse.set(1, .88, .74); key.intensity = .78; key.range = 7;
  ambient.setEnabled(false); key.setEnabled(false);
  const refreshParentLights = () => {
    ambient.includedOnlyMeshes = [...meshes, ...parentMeshes]; key.includedOnlyMeshes = [...parentMeshes];
    // An empty includedOnlyMeshes list means all meshes in Babylon.
    if (!parentMeshes.length) key.includedOnlyMeshes = [gate];
  };
  refreshParentLights();

  const ready = LoadAssetContainerAsync(AIRPORT_MODEL.source, scene, {
    pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } },
  }).then(value => {
    if (disposed) { value.dispose(); return; }
    container = value;
    const nodes = [...value.transformNodes, ...value.meshes], imported = new Set<TransformNode>(nodes);
    // The loader's handedness root is intentionally retained. Meshes and their
    // armatures are separate source roots, so only reparent true roots once.
    for (const node of nodes) if (!node.parent || !imported.has(node.parent as TransformNode)) node.parent = modelRoot;
    // Remove only the boarding desk and its separate display, keeping the gate signage.
    for (const name of ['boarding_counter', 'Monitor do balcão', 'Monitor do balcão • moldura']) {
      const part = nodes.find(node => node.name === name);
      if (!part) throw Error('Parte do balcão não localizada: ' + name);
      part.setEnabled(false);
    }
    for (const mesh of value.meshes) {
      mesh.isPickable = false; mesh.receiveShadows = true;
      mesh.metadata = { ...mesh.metadata, importedAirport: true, source: AIRPORT_MODEL.source };
      if (mesh.skeleton) mesh.alwaysSelectAsActiveMesh = true;
      if (mesh.getTotalVertices() > 0) importedMeshes.push(mesh);
    }
    meshes.push(...importedMeshes);
    materialCount = value.materials.length; textureCount = value.textures.length;
    for (const material of value.materials) if ('maxSimultaneousLights' in material) material.maxSimultaneousLights = 4;
    for (const group of value.animationGroups) group.stop(true);
    const npcIds = [...new Set(value.animationGroups.map(group => group.name.split('__')[0]))];
    for (const id of npcIds) {
      const clipName = id + (id.startsWith('npc_sentado_') ? '__Pose_Sentado' : '__Idle');
      const group = value.animationGroups.find(candidate => candidate.name === clipName);
      if (!group) throw Error('Pose inicial ausente no aeroporto: ' + clipName);
      group.start(false, 1, group.from, group.to); group.pause(); group.goToFrame(group.from);
      selectedClips.push(group);
    }
    npcCount = npcIds.length;
    value.addAllToScene();
    // The check-in asset was authored open on its entrance-facing wall. Close
    // only that frontage, matching its existing paint; the side connector stays open.
    const frontageMaterial = value.materials.find(material => material.name === 'Pintura bege envelhecida') ??
      value.materials.find(material => /walls_white|Pintura bege/i.test(material.name));
    if (!frontageMaterial) throw Error('O acabamento claro do saguão não foi localizado.');
    const frontage = MeshBuilder.CreateBox('aeroporto · fechamento da fachada do check-in', { width: .12, height: 5.48, depth: 15.7 }, scene);
    frontage.parent = root; frontage.position.set(34.56, 2.74, 0); frontage.material = frontageMaterial;
    frontage.isPickable = false; frontage.receiveShadows = true;
    supplementalMeshes.push(frontage); meshes.push(frontage);
    // One freestanding sign encroaches on the lounge aisle in the supplied
    // file. Slide only that prop along the aisle, retaining the full scene.
    const aisleSign = value.transformNodes.find(node => node.name === 'sign');
    if (!aisleSign) throw Error('A placa solta do corredor do aeroporto não foi localizada.');
    aisleSign.computeWorldMatrix(true);
    aisleSign.setAbsolutePosition(aisleSign.getAbsolutePosition().add(new Vector3(0, 0, -1.8)));
    for (const mesh of [...importedMeshes, frontage]) {
      mesh.computeWorldMatrix(true);
      if (mesh.skeleton) mesh.refreshBoundingInfo(true, true);
    }
    for (const light of oldLights) light.excludedMeshes.push(...meshes);
    // Imported Blender photometric powers are adapted locally to this game's
    // exposure. Each mesh sees only its three closest source lamps plus fill.
    // This avoids a 14-light shader and keeps the house lighting isolated.
    for (const light of value.lights) {
      light.intensity = Math.min(18, light.intensity / 1800);
      light.range = Math.min(light.range, 22);
      light.includedOnlyMeshes = [gate]; light.setEnabled(active); embeddedLights.push(light);
    }
    for (const mesh of [...importedMeshes, frontage]) {
      const center = mesh.getBoundingInfo().boundingBox.centerWorld;
      const closest = [...embeddedLights].sort((a, b) =>
        Vector3.DistanceSquared(center, (a as PointLight).getAbsolutePosition()) -
        Vector3.DistanceSquared(center, (b as PointLight).getAbsolutePosition())).slice(0, 3);
      for (const light of closest) light.includedOnlyMeshes.push(mesh);
    }
    refreshParentLights(); loaded = true;
  }).catch(reason => {
    error = String(reason?.message ?? reason); throw reason;
  });

  return {
    meshes, targets, ready,
    setParentMeshes(value: readonly AbstractMesh[]) { parentMeshes = value; refreshParentLights(); },
    setActive(value: boolean) {
      active = value; root.setEnabled(value);
      for (const light of [ambient, key, ...embeddedLights]) light.setEnabled(value);
    },
    animate(time: number) {
      if (!active || !loaded || disposed) return;
      for (const group of selectedClips) {
        const span = group.to - group.from, fps = group.targetedAnimations[0]?.animation.framePerSecond ?? 30;
        const frame = group.name.endsWith('__Pose_Sentado') || span <= 0 ? group.from :
          group.from + ((Math.max(0, time) * fps) % span);
        group.goToFrame(frame);
      }
    },
    get diagnostics() { return { active, ready: loaded && !error, loaded, error, source: AIRPORT_MODEL.source,
      gate: 24, flight: 'AA980', destination: 'Nova York (JFK)', country: 'Brasil', passengers: npcCount,
      meshes: importedMeshes.length, materials: materialCount, textures: textureCount,
      supplementalMeshes: supplementalMeshes.length, checkInFrontageClosed: loaded, localSkyBackdrop: true,
      lights: embeddedLights.length + 2, embeddedLights: embeddedLights.length,
      animationsActive: selectedClips.length, clipNames: selectedClips.map(group => group.name),
      aisleAdjustment: { node: 'sign', worldOffset: { x: 0, y: 0, z: -1.8 } },
      animationClock: 'game-time', protagonistMeshes: 0, reflectionPasses: 0 }; },
    dispose() {
      if (disposed) return; disposed = true;
      for (const light of oldLights) light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      for (const group of selectedClips) group.stop(true);
      container?.dispose(); ambient.dispose(); key.dispose();
      for (const mesh of supplementalMeshes) mesh.dispose(false, false);
      skyMaterial.dispose(false, false); skyTexture.dispose();
      gate.dispose(); flightBoard.dispose(); proxyMaterial.dispose(); root.dispose(false, false);
    },
  };
}
