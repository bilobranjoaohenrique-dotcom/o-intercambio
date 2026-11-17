import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Light } from '@babylonjs/core/Lights/light';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Frustum } from '@babylonjs/core/Maths/math.frustum';
import { HOST_HOUSE_EXTERIOR_FRAME, westbridgeToHostHouse, hostHouseToWestbridge,
  westbridgeDirectionToHostHouse, hostHouseCameraToWestbridge } from '../game/hostHouseExteriorFrame';
import { WB_HOST_ID, WB_HOST_DOOR, WB_MAILBOX, WB_PARKED_CAR } from '../game/westbridgeLayout';
import { hhPoint } from '../game/hostHouseLayout';
import type { HostHouseLightMode } from './hostHouseLighting';
import { paintWestbridgeSky, type WestbridgeTime } from './westbridgeLighting';
import { selectHostHouseExteriorPortals, hostHouseExteriorBoundsVisible,
  type ExteriorAperture, type ExteriorBounds, type ExteriorPortalSelection } from '../game/hostHouseExteriorPortals';

export interface HostHouseWestbridgeSource {
  meshes: readonly AbstractMesh[];
  sky: AbstractMesh;
  windows: readonly { material: Material; day: Color3; host: boolean }[];
  timeOfDay: WestbridgeTime;
  source: string;
  originX: number;
  houseScale: unknown;
}

const HOST_SHELL = /^(Cream|Gold|PaintRed|SidingBlue|Stone|StoneDark|WindowGlow|Wood)(\.|$)/;
const TEXTURE_SLOTS = ['diffuseTexture', 'albedoTexture', 'baseWeightTexture', 'baseDiffuseRoughnessTexture',
  'ambientTexture', 'opacityTexture', 'reflectionTexture', 'emissiveTexture', 'specularTexture', 'reflectivityTexture',
  'metallicTexture', 'metallicReflectanceTexture', 'reflectanceTexture', 'microSurfaceTexture', 'bumpTexture',
  'lightmapTexture', 'refractionTexture', 'environmentBRDFTexture'] as const;

/** Host-family nodes also contain the real garden, fence, tree and mailbox.
 * Remove only their architecture; omitting their whole parent erases the yard. */
export function isWestbridgeHostShell(mesh: AbstractMesh): boolean {
  const prefix = WB_HOST_ID + ' · ';
  return mesh.name.startsWith(prefix) && HOST_SHELL.test(mesh.name.slice(prefix.length));
}

/** Actual runtime Westbridge meshes, rigidly mapped to the separate interior.
 * Mesh clones share the corrected original geometry and textures. Materials,
 * sky pixels and lighting belong to this view, so indoor night mode cannot
 * change the original neighbourhood's materials or its saved lighting state. */
export function createHostHouseWestbridgeView(scene: Scene, options: {
  parent: TransformNode;
  source: HostHouseWestbridgeSource;
  apertures?: readonly AbstractMesh[];
  radius?: number;
}) {
  const { source } = options, radius = options.radius ?? 120;
  const root = new TransformNode('Daniel e Helen · Westbridge real pelas janelas', scene);
  root.parent = options.parent; root.setEnabled(false);
  const meshes: Mesh[] = [], materials = new Map<Material, Material>(), foreignLights = new Set<Light>();
  const omitted: { name: string; reason: string }[] = [];
  const links: { source: Mesh; clone: Mesh; sourceMatrix: Matrix }[] = [];
  const animatedEmission: { material: PBRMaterial | StandardMaterial; day: Color3; night: Color3 }[] = [];
  const { exteriorAnchor: anchor } = HOST_HOUSE_EXTERIOR_FRAME;
  const mappedOrigin = westbridgeToHostHouse({ x: 0, y: 0, z: 0 });
  const frameMatrix = Matrix.Compose(Vector3.One(), Quaternion.FromEulerAngles(0, Math.PI / 2, 0),
    new Vector3(mappedOrigin.x, mappedOrigin.y, mappedOrigin.z));
  root.computeWorldMatrix(true);
  const inverseParent = root.getWorldMatrix().clone().invert();
  let active = false, disposed = false, mode: HostHouseLightMode = 'day';
  let skyMaterial: StandardMaterial | null = null, skyTexture: DynamicTexture | null = null;

  function cloneMaterial(original: Material | null): Material | null {
    if (!original) return null;
    const found = materials.get(original); if (found) return found;
    const clone = original.clone(original.name + ' · janela real de Westbridge');
    if (!clone) throw Error('Material de Westbridge não pôde ser isolado: ' + original.name);
    materials.set(original, clone);
    // Babylon's Material.clone also clones textures; DynamicTexture.clone
    // creates an empty canvas. Rebind the actual textures for every native
    // Standard/PBR slot, keeping the original painted props intact and shared.
    const generatedTextures = clone.getActiveTextures();
    const originalSlots = original as unknown as Record<string, unknown>;
    const cloneSlots = clone as unknown as Record<string, unknown>;
    for (const slot of TEXTURE_SLOTS) if (slot in originalSlots) cloneSlots[slot] = originalSlots[slot];
    const retainedTextures = new Set([...original.getActiveTextures(), ...clone.getActiveTextures()]);
    for (const texture of generatedTextures) if (!retainedTextures.has(texture) && !texture.isRenderTarget) texture.dispose();
    if (original instanceof MultiMaterial && clone instanceof MultiMaterial)
      clone.subMaterials = original.subMaterials.map(material => cloneMaterial(material));
    if ('maxSimultaneousLights' in clone) clone.maxSimultaneousLights = 2;
    const window = source.windows.find(window => window.material === original);
    if (clone instanceof PBRMaterial || clone instanceof StandardMaterial) {
      if (window) animatedEmission.push({ material: clone, day: window.day.clone(), night: new Color3(.09, .061, .032) });
      if (original.name === 'Westbridge · globo leitoso da varanda')
        animatedEmission.push({ material: clone, day: new Color3(.34, .23, .11), night: new Color3(.82, .51, .23) });
    }
    return clone;
  }

  for (const candidate of source.meshes) {
    if (!candidate.getTotalVertices() || candidate.isDisposed() || candidate.metadata?.westbridgeProxy) continue;
    if (isWestbridgeHostShell(candidate)) { omitted.push({ name: candidate.name, reason: 'own-host-shell' }); continue; }
    candidate.computeWorldMatrix(true);
    const box = candidate.getBoundingInfo().boundingBox;
    const dx = Math.max(box.minimumWorld.x - anchor.x, 0, anchor.x - box.maximumWorld.x);
    const dz = Math.max(box.minimumWorld.z - anchor.z, 0, anchor.z - box.maximumWorld.z);
    if (candidate !== source.sky && dx * dx + dz * dz > radius * radius) {
      omitted.push({ name: candidate.name, reason: 'outside-view-radius' }); continue;
    }
    if (!(candidate instanceof Mesh) || candidate.skeleton) {
      omitted.push({ name: candidate.name, reason: 'non-static-mesh' }); continue;
    }
    const sourceMatrix = candidate.getWorldMatrix().clone();
    const clone = candidate.clone('Daniel e Helen · vista real · ' + candidate.name, {
      parent: root, doNotCloneChildren: true, clonePhysicsImpostor: false, cloneThinInstances: true,
    });
    // Babylon 8's options overload retains the source parent despite parent in
    // the options object. Assign explicitly before applying the measured frame.
    clone.parent = root;
    clone.material = cloneMaterial(candidate.material);
    const mapped = sourceMatrix.multiply(frameMatrix).multiply(inverseParent);
    clone.rotationQuaternion = Quaternion.Identity();
    mapped.decompose(clone.scaling, clone.rotationQuaternion, clone.position);
    clone.isPickable = false; clone.receiveShadows = false; clone.setEnabled(true);
    clone.metadata = { ...candidate.metadata, source: source.source, hostHouseExterior: true,
      hostHouseExteriorSourceId: candidate.uniqueId, hostHouseExteriorSourceName: candidate.name,
      castShadow: false, sharedWestbridgeGeometry: true };
    clone.computeWorldMatrix(true); clone.freezeWorldMatrix();
    meshes.push(clone); links.push({ source: candidate, clone, sourceMatrix });
    if (candidate === source.sky && clone.material instanceof StandardMaterial) {
      skyMaterial = clone.material;
      if (skyMaterial.diffuseTexture instanceof DynamicTexture) {
        skyTexture = skyMaterial.diffuseTexture.clone();
        skyTexture.name = 'Daniel e Helen · cópia do céu real de Westbridge';
        skyMaterial.diffuseTexture = skyTexture;
      }
    }
  }

  const ambient = new HemisphericLight('Daniel e Helen · céu externo de Westbridge', new Vector3(0, 1, 0), scene);
  const direction = westbridgeDirectionToHostHouse({ x: -.60, y: -.40, z: -.50 });
  const sun = new DirectionalLight('Daniel e Helen · sol externo de Westbridge', new Vector3(direction.x, direction.y, direction.z).normalize(), scene);
  const sunPosition = westbridgeToHostHouse({ x: 535, y: 42, z: 40 });
  sun.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
  for (const light of [ambient, sun]) { light.includedOnlyMeshes = meshes; light.setEnabled(false); }

  const apertures: ExteriorAperture[] = [];
  for (const pane of options.apertures ?? []) {
    const extras = pane.metadata?.gltf?.extras ?? pane.metadata ?? {};
    if (extras.hostHouseWindowGlass !== true && !/^REN_HH_window_.*_glass$/.test(pane.name)) continue;
    pane.computeWorldMatrix(true);
    const box = pane.getBoundingInfo().boundingBox, center = box.centerWorld;
    // Native panes are .055m smaller per side than the wall apertures. Include
    // that reveal plus a .03m margin so a grazing view never loses an edge.
    const minY = box.minimumWorld.y - .085, maxY = box.maximumWorld.y + .085;
    const minZ = box.minimumWorld.z - .085, maxZ = box.maximumWorld.z + .085;
    apertures.push({ id: extras.hostHouseWindow ?? pane.name,
      center: { x: center.x, y: center.y, z: center.z },
      outward: { x: center.x > 747 ? 1 : -1, y: 0, z: 0 },
      corners: [{ x: center.x, y: minY, z: minZ }, { x: center.x, y: maxY, z: minZ },
        { x: center.x, y: maxY, z: maxZ }, { x: center.x, y: minY, z: maxZ }],
      bounds: { min: { x: center.x - .02, y: minY, z: minZ }, max: { x: center.x + .02, y: maxY, z: maxZ } },
    });
  }
  const interiorBounds: ExteriorBounds = { min: { x: 741.9, y: .2, z: 30.9 }, max: { x: 752.1, y: 7.2, z: 43.1 } };
  const portalMeshes = meshes.map(mesh => {
    const box = mesh.getBoundingInfo().boundingBox;
    return { mesh, mask: mesh.layerMask, sky: mesh.metadata?.westbridgeSky === true,
      bounds: { min: box.minimumWorld.clone(), max: box.maximumWorld.clone() } };
  });
  let portalSelection: ExteriorPortalSelection | null = null, mainPassVisible = meshes.length;
  let mainPassEvaluations = 0, mainPassCamera: string | null = null;
  function restoreMainPassMasks() {
    for (const entry of portalMeshes) entry.mesh.layerMask = entry.mask;
    mainPassVisible = meshes.length; portalSelection = null;
  }
  const beforeActiveMeshes = scene.onBeforeActiveMeshesEvaluationObservable.add(() => {
    if (!active || disposed || !scene.activeCamera) return;
    mainPassEvaluations++; mainPassCamera = scene.activeCamera.name;
    portalSelection = selectHostHouseExteriorPortals(scene.activeCamera.globalPosition,
      Frustum.GetPlanes(scene.getTransformMatrix()), apertures, interiorBounds);
    mainPassVisible = 0;
    for (const entry of portalMeshes) {
      const visible = hostHouseExteriorBoundsVisible(entry.bounds, portalSelection, entry.sky);
      // Main-camera layer masks leave visibility/enabled state untouched.
      // Explicit mirror lists ignore layer masks and retain reflected windows.
      entry.mesh.layerMask = visible ? entry.mask : 0;
      if (visible) mainPassVisible++;
    }
  });

  function isolateLights() {
    for (const light of scene.lights) if (light !== ambient && light !== sun) {
      const excluded = new Set(light.excludedMeshes);
      for (const mesh of meshes) excluded.add(mesh);
      light.excludedMeshes = [...excluded]; foreignLights.add(light);
    }
  }

  function paintSky() {
    if (!skyTexture) return;
    paintWestbridgeSky(skyTexture, mode === 'day' ? 'afternoon' : 'night');
  }

  function applyMode() {
    const night = mode === 'night';
    ambient.intensity = night ? .30 : .88;
    ambient.diffuse.set(night ? .59 : .96, night ? .68 : .94, night ? .86 : .87);
    ambient.groundColor.set(night ? .13 : .58, night ? .16 : .53, night ? .23 : .45);
    sun.intensity = night ? .065 : 1.30; sun.diffuse.set(1, night ? .82 : .85, night ? .66 : .68);
    for (const emission of animatedEmission) emission.material.emissiveColor.copyFrom(night ? emission.night : emission.day);
    paintSky();
  }
  isolateLights(); applyMode();

  return {
    root, meshes, mapCameraPose: hostHouseCameraToWestbridge,
    setActive(value: boolean) {
      if (disposed || active === value) return;
      active = value; if (active) isolateLights(); root.setEnabled(active);
      if (!active) restoreMainPassMasks();
      ambient.setEnabled(active); sun.setEnabled(active);
    },
    setMode(value: HostHouseLightMode) { if (mode !== value) { mode = value; applyMode(); } },
    get diagnostics() {
      const sourceName = (name: string) => meshes.some(mesh => mesh.metadata?.hostHouseExteriorSourceName === name);
      const windowAnchors = [
        { name: 'living-front', x: 48.06, y: 2, z: 41 },
        { name: 'guest-front', x: 48.06, y: 5.45, z: 33 },
        { name: 'upper-hall-front', x: 48.06, y: 5.45, z: 37 },
        { name: 'player-front', x: 48.06, y: 5.45, z: 41 },
        { name: 'kitchen-rear', x: 58, y: 1.95, z: 33 },
        { name: 'powder-rear', x: 58, y: 1.95, z: 41 },
        { name: 'bathroom-rear', x: 58, y: 5.4, z: 33 },
        { name: 'hosts-rear', x: 58, y: 5.4, z: 41 },
      ].map(window => {
        const interior = hhPoint(window.x, window.y, window.z), exterior = hostHouseToWestbridge(interior);
        return { name: window.name, interior, exterior, exteriorSource: { x: source.originX - exterior.x, y: exterior.y, z: exterior.z } };
      });
      const camera = scene.activeCamera;
      return { active, mode, source: source.source, actualRuntimeWestbridge: true,
        sourceAlreadyHouseScaled: true, sourceGeometryShared: links.every(link => link.source.geometry === link.clone.geometry),
        sourceMaterialsIsolated: [...materials].every(([original, clone]) => original !== clone),
        sourceTexturesSharedExceptSky: [...materials].every(([original, clone]) => {
          const sourceTextures = new Set(original.getActiveTextures());
          return clone.getActiveTextures().every(texture => texture === skyTexture || sourceTextures.has(texture));
        }), skyCloned: !!skyMaterial, skyTextureIsolated: !!skyTexture,
        viewRadius: radius, frustumCulling: true, staticWorldMatrices: true,
        mainPassPortalCulling: { apertures: apertures.length, visibleMeshes: mainPassVisible,
          rejectedMeshes: meshes.length - mainPassVisible, visibleApertures: portalSelection?.visibleApertures ?? [],
          fallback: portalSelection?.fallback ?? true, reason: portalSelection?.reason ?? 'inactive',
          pass: 'main-camera', camera: mainPassCamera, evaluations: mainPassEvaluations, eligibleBeforeFrustum: true,
          masksOnly: true, mirrorsUseIndependentLists: true },
        meshes: meshes.length, materials: materials.size, localLights: 2,
        vertices: meshes.reduce((total, mesh) => total + mesh.getTotalVertices(), 0),
        triangles: meshes.reduce((total, mesh) => total + mesh.getTotalIndices() / 3, 0),
        thinInstances: meshes.reduce((total, mesh) => total + mesh.thinInstanceCount, 0),
        frame: HOST_HOUSE_EXTERIOR_FRAME,
        windowAnchors,
        cameraCorrespondence: camera ? hostHouseCameraToWestbridge(camera.globalPosition, camera.getForwardRay().direction) : null,
        mapping: 'HH.x=752+WB.z+12.665; HH.y=WB.y-0.010416225; HH.z=516.9435-WB.x',
        worldScale: 1, arrangementPreserved: true, ownHostShellMeshesOmitted: omitted.filter(mesh => mesh.reason === 'own-host-shell').length,
        hostGardenRetained: ['Mown lawn', 'Weathered cedar', 'Painted fence', 'props.001'].every(name => sourceName(WB_HOST_ID + ' · ' + name)),
        floorplanDifference: { interiorWidth: 12, interiorDepth: 10, exteriorMainWidth: 7.695, exteriorMainDepth: 6.2787,
          rearWindowExteriorSourceZ: hostHouseToWestbridge({ x: 742, y: .39, z: 37 }).z,
          rearWallExteriorSourceZ: -18.9544, rearDepthDifference: 3.7106 },
        correspondence: { door: { exterior: WB_HOST_DOOR, interior: westbridgeToHostHouse(WB_HOST_DOOR) },
          mailbox: { exterior: WB_MAILBOX, interior: westbridgeToHostHouse(WB_MAILBOX) },
          parkedCar: { exterior: WB_PARKED_CAR, interior: westbridgeToHostHouse(WB_PARKED_CAR) } },
        clones: links.map(link => ({ source: link.source.name, sourceId: link.source.uniqueId, cloneId: link.clone.uniqueId,
          sharedGeometry: link.source.geometry === link.clone.geometry, sourceThinInstances: link.source.thinInstanceCount,
          clonedThinInstances: link.clone.thinInstanceCount,
          sourceBounds: { min: link.source.getBoundingInfo().boundingBox.minimumWorld.asArray(), max: link.source.getBoundingInfo().boundingBox.maximumWorld.asArray() },
          interiorBounds: { min: link.clone.getBoundingInfo().boundingBox.minimumWorld.asArray(), max: link.clone.getBoundingInfo().boundingBox.maximumWorld.asArray() } })), omitted,
      };
    },
    dispose() {
      if (disposed) return; disposed = true;
      scene.onBeforeActiveMeshesEvaluationObservable.remove(beforeActiveMeshes); restoreMainPassMasks();
      ambient.dispose(); sun.dispose();
      const own = new Set<AbstractMesh>(meshes);
      for (const light of foreignLights) if (!light.isDisposed()) light.excludedMeshes = light.excludedMeshes.filter(mesh => !own.has(mesh));
      root.dispose(false, false);
      for (const material of new Set(materials.values())) material.dispose(false, false);
      skyTexture?.dispose();
    },
  };
}
