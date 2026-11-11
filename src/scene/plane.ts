import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Light } from '@babylonjs/core/Lights/light';
import type { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/loaders/glTF';
import type { InteractionTarget } from '../game/types';
import { PLANE_MODEL, PLANE_CAMERA, PLANE_SEAT, PLANE_WINDOW } from '../game/planeLayout';

/** The supplied Blender cabin, including its original wing and exterior,
 * stays in one local set. The existing first-person flight sequence owns input. */
export function buildPlane(scene: Scene, parent: TransformNode) {
  const oldLights = [...scene.lights], root = new TransformNode('avião · cabine GLB enviada', scene);
  root.parent = parent;
  const modelRoot = new TransformNode('avião · orientação do arquivo', scene);
  modelRoot.parent = root;
  modelRoot.position.set(PLANE_MODEL.position.x, PLANE_MODEL.position.y, PLANE_MODEL.position.z);
  modelRoot.rotation.y = PLANE_MODEL.yaw;
  const meshes: AbstractMesh[] = [], importedMeshes: AbstractMesh[] = [], embeddedLights: Light[] = [];
  const cloudTextures = new Map<Texture, { u: number; v: number }>();
  const proxyMaterial = new StandardMaterial('avião · interação da janela', scene);
  proxyMaterial.disableLighting = true;
  const windowProxy = MeshBuilder.CreateBox('avião · olhar pela janela', { width: .035, height: .46, depth: .285 }, scene);
  windowProxy.parent = root;
  windowProxy.position.set(PLANE_WINDOW.target.x, PLANE_WINDOW.target.y, PLANE_WINDOW.target.z);
  windowProxy.material = proxyMaterial; windowProxy.visibility = .001; windowProxy.isPickable = true;
  windowProxy.metadata = { interactionId: 'plane-window', castShadow: false };
  meshes.push(windowProxy);
  const targets: InteractionTarget[] = [{ id: 'plane-window', meshes: [windowProxy], label: () => 'Olhar pela janela', execute: () => undefined }];
  const ambient = new HemisphericLight('avião · ambiente suave da cabine', Vector3.Up(), scene);
  ambient.diffuse.set(.83, .85, .94); ambient.groundColor.set(.27, .25, .30); ambient.intensity = .64;
  ambient.includedOnlyMeshes = meshes; ambient.setEnabled(false);
  let container: AssetContainer | null = null, active = false, disposed = false, loaded = false, error: string | null = null;
  let materialCount = 0, textureCount = 0, cloudLayers = 0, wing = false, elapsed = 0, cloudOffset = 0;
  let savedCamera: { camera: Camera; fov: number; minZ: number; maxZ: number } | null = null;
  const hiddenOutsideMeshes: AbstractMesh[] = [];
  function restoreOutsideMeshes() {
    for (const mesh of hiddenOutsideMeshes) if (!mesh.isDisposed()) mesh.setEnabled(true);
    hiddenOutsideMeshes.length = 0;
  }
  function restoreCamera() {
    if (!savedCamera) return;
    savedCamera.camera.fov = savedCamera.fov; savedCamera.camera.minZ = savedCamera.minZ; savedCamera.camera.maxZ = savedCamera.maxZ;
    savedCamera = null;
  }
  const ready = LoadAssetContainerAsync(PLANE_MODEL.source, scene, {
    pluginExtension: '.glb', pluginOptions: { gltf: { animationStartMode: 0 } },
  }).then(value => {
    if (disposed) { value.dispose(); return; }
    container = value;
    const nodes = [...value.transformNodes, ...value.meshes], imported = new Set<TransformNode>(nodes);
    for (const node of nodes) if (!node.parent || !imported.has(node.parent as TransformNode)) node.parent = modelRoot;
    const cloudNames = new Set<string>();
    for (const mesh of value.meshes) {
      mesh.isPickable = false; mesh.receiveShadows = true;
      mesh.metadata = { ...mesh.metadata, importedPlane: true, source: PLANE_MODEL.source };
      if (mesh.getTotalVertices() <= 0) continue;
      importedMeshes.push(mesh); mesh.computeWorldMatrix(true);
      if (/^airplane_exterior_cloud_layer_\d+/.test(mesh.name)) cloudNames.add(mesh.name.replace(/_primitive\d+$/, ''));
      if (/^wing_(port|starboard)/.test(mesh.name)) wing = true;
    }
    cloudLayers = cloudNames.size;
    meshes.push(...importedMeshes);
    materialCount = value.materials.length; textureCount = value.textures.length;
    for (const material of value.materials) {
      if ('maxSimultaneousLights' in material) material.maxSimultaneousLights = 4;
      // Both cloud images and their alpha remain aligned while UVs drift.
      // The authored sky, glass and other cabin materials stay untouched.
      if (material.name === 'lower_cloud_layer') for (const texture of material.getActiveTextures())
        if (texture instanceof Texture && texture.wrapU === Texture.WRAP_ADDRESSMODE && texture.wrapV === Texture.WRAP_ADDRESSMODE &&
          !cloudTextures.has(texture)) cloudTextures.set(texture, { u: texture.uOffset, v: texture.vOffset });
    }
    for (const animation of value.animationGroups) animation.stop(true);
    value.addAllToScene();
    for (const light of oldLights) light.excludedMeshes.push(...meshes);
    const points: Light[] = [], suns: Light[] = [];
    for (const light of value.lights) {
      const directional = light.getTypeID() === Light.LIGHTTYPEID_DIRECTIONALLIGHT;
      light.intensity /= directional ? 683 : 1800;
      if (!directional) light.range = Math.min(light.range, 26);
      light.includedOnlyMeshes = [windowProxy]; light.setEnabled(active); embeddedLights.push(light);
      (directional ? suns : points).push(light);
    }
    for (const mesh of importedMeshes) {
      const center = mesh.getBoundingInfo().boundingBox.centerWorld;
      const nearest = [...points].sort((a, b) =>
        Vector3.DistanceSquared(center, (a as PointLight).getAbsolutePosition()) -
        Vector3.DistanceSquared(center, (b as PointLight).getAbsolutePosition())).slice(0, Math.max(0, 3 - suns.length));
      for (const light of [...suns, ...nearest]) light.includedOnlyMeshes.push(mesh);
    }
    ambient.includedOnlyMeshes = meshes; loaded = true;
  }).catch(reason => { error = String(reason?.message ?? reason); throw reason; });
  return {
    meshes, targets, ready,
    setActive(value: boolean) {
      if (value && !active && scene.activeCamera) {
        const camera = scene.activeCamera;
        savedCamera = { camera, fov: camera.fov, minZ: camera.minZ, maxZ: camera.maxZ };
        camera.fov = PLANE_CAMERA.fov; camera.minZ = PLANE_CAMERA.minZ; camera.maxZ = PLANE_CAMERA.maxZ;
        // The original home's scenery predates chapter roots. The long-range
        // flight panorama must not reveal it beyond the aircraft window.
        for (const mesh of scene.meshes) if (mesh.isEnabled() && !mesh.isDescendantOf(parent)) {
          hiddenOutsideMeshes.push(mesh); mesh.setEnabled(false);
        }
      } else if (!value && active) { restoreCamera(); restoreOutsideMeshes(); }
      active = value; root.setEnabled(value);
      for (const light of [ambient, ...embeddedLights]) light.setEnabled(value);
    },
    animate(time: number) {
      if (!active || !loaded || disposed) return;
      elapsed = time; cloudOffset = (Math.max(0, time) * .003) % 1;
      for (const [texture, base] of cloudTextures) { texture.uOffset = base.u + cloudOffset; texture.vOffset = base.v + time * .0006; }
    },
    get diagnostics() { return { active, ready: loaded && !error, loaded, error, source: PLANE_MODEL.source,
      seat: PLANE_SEAT, window: PLANE_WINDOW.target, screenOn: false,
      wing, cloudLayers, cloudTextures: cloudTextures.size, cloudOffset, elapsed,
      parents: 0, protagonistBodyMeshes: 0, knees: 0,
      meshes: importedMeshes.length, materials: materialCount, textures: textureCount,
      lights: embeddedLights.length + 1, embeddedLights: embeddedLights.length,
      camera: scene.activeCamera ? { fov: scene.activeCamera.fov, minZ: scene.activeCamera.minZ, maxZ: scene.activeCamera.maxZ } : null,
      cameraOverrideActive: savedCamera !== null, outsideMeshesHidden: hiddenOutsideMeshes.length,
      foreignMeshesVisible: active ? scene.meshes.filter(mesh => mesh.getTotalVertices() > 0 &&
        mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0 && !mesh.isDescendantOf(parent)).length : null,
      reflectionPasses: 0 }; },
    dispose() {
      if (disposed) return; disposed = true; restoreCamera(); restoreOutsideMeshes();
      for (const light of oldLights) light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      container?.dispose(); ambient.dispose(); windowProxy.dispose(); proxyMaterial.dispose(); root.dispose(false, false);
    },
  };
}
