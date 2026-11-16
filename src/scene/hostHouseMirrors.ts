import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MirrorTexture } from '@babylonjs/core/Materials/Textures/mirrorTexture';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HOST_HOUSE_ORIGIN_X } from '../game/hostHouseLayout';

type Bounds = readonly [number, number, number, number, number, number];
interface MirrorSpec { name: string; room: Bounds; normalZ: 1 | -1 }
const SPECS: readonly MirrorSpec[] = [
  { name: 'REN_service_bath_mirror', room: [53, 58, 3.82, 7.02, 31.0, 35.87], normalZ: 1 },
  { name: 'REN_service_powder_mirror', room: [55.65, 58, .37, 3.56, 39.97, 43.0], normalZ: -1 },
  { name: 'REN_Hosts_dresser_mirror', room: [53, 58, 3.82, 7.02, 38.13, 43.0], normalZ: -1 },
];

/** Gate the engine's render-target scheduling, while retaining its normal
 * RENDER_ONCE cache. Off-screen/out-of-room mirrors do not submit a room pass.
 */
class RoomMirrorTexture extends MirrorTexture {
  permitted = false;
  override _shouldRender() { return this.permitted && super._shouldRender(); }
}
function bounds(mesh: AbstractMesh): Bounds {
  mesh.computeWorldMatrix(true);
  const box = mesh.getBoundingInfo().boundingBox;
  return [HOST_HOUSE_ORIGIN_X - box.maximumWorld.x, HOST_HOUSE_ORIGIN_X - box.minimumWorld.x,
    box.minimumWorld.y, box.maximumWorld.y, box.minimumWorld.z, box.maximumWorld.z];
}
function overlaps(a: Bounds, b: Bounds) {
  return a[1] >= b[0] && a[0] <= b[1] && a[3] >= b[2] && a[2] <= b[3] && a[5] >= b[4] && a[4] <= b[5];
}
function inside(position: Vector3, room: Bounds) {
  const sourceX = HOST_HOUSE_ORIGIN_X - position.x;
  return sourceX >= room[0] && sourceX <= room[1] && position.y >= room[2] && position.y <= room[3] &&
    position.z >= room[4] && position.z <= room[5];
}

/** Three small, planar reflections, owned exclusively by the host-house set.
 * Camera motion refreshes only the visible mirror in its own room. A stationary
 * view reuses its texture, with no reflection probes or full-scene cube passes.
 */
export function createHostHouseMirrors(scene: Scene, options: { meshes: readonly AbstractMesh[] }) {
  const surfaces = new Set(options.meshes.filter(mesh => SPECS.some(spec => mesh.name === spec.name)));
  const entries = SPECS.flatMap(spec => {
    const mesh = options.meshes.find(candidate => candidate.name === spec.name && candidate.getTotalVertices() > 0);
    if (!mesh) return [];
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    const center = box.centerWorld.clone();
    // Use the actual front face rather than assuming the Blender box's center.
    const planeZ = spec.normalZ === 1 ? box.maximumWorld.z + .0004 : box.minimumWorld.z - .0004;
    const texture = new RoomMirrorTexture(spec.name + ' · reflexo 256', 256, scene, false,
      undefined, Texture.BILINEAR_SAMPLINGMODE);
    texture.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    texture.level = .91; texture.samples = 1; texture.clearColor = new Color4(.065, .067, .068, 1);
    // Reflection is unchanged by negating a plane. For clipping, Babylon must
    // retain the room/camera side of the glass (negative signed distance).
    texture.mirrorPlane = new Plane(0, 0, -spec.normalZ, spec.normalZ * planeZ);
    texture.renderList = options.meshes.filter(candidate => {
      if (!candidate.getTotalVertices() || surfaces.has(candidate) ||
        /WindowView_|proxy|interação|saída para Westbridge/i.test(candidate.name)) return false;
      return overlaps(bounds(candidate), spec.room);
    });
    const material = new StandardMaterial(spec.name + ' · prata do espelho', scene);
    material.diffuseColor = new Color3(.035, .039, .041);
    material.specularColor = new Color3(.22, .23, .24); material.specularPower = 96;
    material.reflectionTexture = texture; material.backFaceCulling = false;
    material.maxSimultaneousLights = 4;
    const original: Material | null = mesh.material; mesh.material = material;
    let renders = 0;
    texture.onAfterRenderObservable.add(() => { renders++; });
    return [{ spec, mesh, center, planeZ, texture, material, original,
      lastPosition: null as Vector3 | null, lastDirection: null as Vector3 | null, renders: () => renders }];
  });
  let active = false, disposed = false;
  let environment = '';
  const rotationThreshold = Math.cos(Math.PI / 180);
  const forwardAxis = new Vector3(0, 0, scene.useRightHandedSystem ? -1 : 1);
  const beforeRender = scene.onBeforeRenderObservable.add(() => {
    const camera = scene.activeCamera;
    if (!active || !camera || disposed) { for (const entry of entries) entry.texture.permitted = false; return; }
    const position = camera.globalPosition;
    const direction = camera.getDirection(forwardAxis).normalize();
    // A day/night preview changes the house's clear color/exposure. Its mirror
    // must reflect that lighting even when the comparison camera stays fixed.
    const p = scene.imageProcessingConfiguration, c = scene.clearColor;
    const nextEnvironment = `${c.r},${c.g},${c.b},${p.exposure},${p.contrast}`;
    if (nextEnvironment !== environment) {
      environment = nextEnvironment;
      for (const entry of entries) entry.lastPosition = null;
    }
    for (const entry of entries) {
      const toMirror = entry.center.subtract(position);
      const onFront = (position.z - entry.planeZ) * entry.spec.normalZ > .035;
      const facing = Vector3.Dot(direction, toMirror.normalize()) > .08;
      entry.texture.permitted = inside(position, entry.spec.room) && onFront && facing && camera.isInFrustum(entry.mesh);
      if (!entry.texture.permitted) continue;
      const moved = !entry.lastPosition || Vector3.DistanceSquared(position, entry.lastPosition) > .03 ** 2;
      const turned = !entry.lastDirection || Vector3.Dot(direction, entry.lastDirection) < rotationThreshold;
      if (moved || turned) {
        entry.texture.resetRefreshCounter();
        entry.lastPosition = position.clone(); entry.lastDirection = direction.clone();
      }
    }
  });
  return {
    setActive(value: boolean) {
      if (disposed || active === value) return;
      active = value;
      for (const entry of entries) {
        entry.texture.permitted = false;
        if (value) entry.lastPosition = null;
      }
    },
    get diagnostics() {
      return { active, textureSize: 256, cached: true, roomsOnly: true,
        mirrors: entries.map(entry => ({ name: entry.spec.name, planeZ: entry.planeZ,
          normalZ: entry.spec.normalZ, roomMeshes: entry.texture.renderList?.length ?? 0,
          updating: entry.texture.permitted, renders: entry.renders() })),
        missing: SPECS.filter(spec => !entries.some(entry => entry.spec === spec)).map(spec => spec.name) };
    },
    dispose() {
      if (disposed) return; active = false; disposed = true;
      scene.onBeforeRenderObservable.remove(beforeRender);
      for (const entry of entries) {
        entry.texture.permitted = false;
        if (!entry.mesh.isDisposed()) entry.mesh.material = entry.original;
        entry.material.reflectionTexture = null; entry.material.dispose(false, false); entry.texture.dispose();
      }
    },
  };
}
