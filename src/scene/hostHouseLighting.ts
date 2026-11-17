import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Material } from '@babylonjs/core/Materials/material';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Light } from '@babylonjs/core/Lights/light';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { hhPoint, HOST_HOUSE_ORIGIN_X } from '../game/hostHouseLayout';

export type HostHouseLightMode = 'day' | 'night';
type Bounds = readonly [number, number, number, number, number, number];
type Room = 'living' | 'dining' | 'kitchen' | 'utility' | 'utilityEntry' | 'powder' | 'garage' | 'hall' | 'stairs' |
  'player' | 'hosts' | 'guest' | 'bathroom' | 'upperHall';

// Bounds are measured in the supplied house's source metres: X, Y, Z (Y up).
// Room and floor masks keep an upstairs lamp from illuminating downstairs.
const ROOMS: Record<Room, Bounds> = {
  living: [48.1, 53.0, .37, 3.56, 38.0, 43.0],
  dining: [48.1, 53.0, .37, 3.56, 31.0, 35.8],
  kitchen: [53.0, 58.0, .37, 3.56, 31.0, 35.8],
  utility: [53.0, 55.7, .37, 3.56, 38.0, 43.0],
  utilityEntry: [55.7, 58.0, .37, 3.56, 38.0, 40.04],
  powder: [55.7, 58.0, .37, 3.56, 40.04, 43.0],
  garage: [48.7, 58.0, .12, 4.27, 24.1, 30.9],
  hall: [48.1, 53.0, .37, 3.56, 35.7, 38.2],
  stairs: [52.7, 58.0, .37, 7.02, 36.8, 38.2],
  player: [48.1, 53.0, 3.82, 7.02, 38.0, 43.0],
  hosts: [53.0, 58.0, 3.82, 7.02, 38.0, 43.0],
  guest: [48.1, 53.0, 3.82, 7.02, 31.0, 35.8],
  bathroom: [53.0, 58.0, 3.82, 7.02, 31.0, 35.8],
  upperHall: [48.1, 58.0, 3.82, 7.02, 35.7, 38.2],
};
const point = (x: number, y: number, z: number) => {
  const p = hhPoint(x, y, z); return new Vector3(p.x, p.y, p.z);
};
function meshBounds(mesh: AbstractMesh): Bounds {
  mesh.computeWorldMatrix(true);
  const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
  return [HOST_HOUSE_ORIGIN_X - max.x, HOST_HOUSE_ORIGIN_X - min.x, min.y, max.y, min.z, max.z];
}
function overlaps(a: Bounds, b: Bounds, pad = .07) {
  return a[1] >= b[0] - pad && a[0] <= b[1] + pad && a[3] >= b[2] - pad &&
    a[2] <= b[3] + pad && a[5] >= b[4] - pad && a[4] <= b[5] + pad;
}

interface LocalLight {
  light: PointLight | SpotLight;
  rooms: Room[];
  day: number;
  night: number;
  dayColor: Color3;
  nightColor: Color3;
  window: boolean;
}

/** Static room lighting for the streamed interior. All light membership and
 * cloned backdrop materials belong to this house; no outside state is changed.
 * Shadows are cached once, rather than rendering the furnished house each frame.
 */
export function createHostHouseLighting(scene: Scene, options: {
  meshes: readonly AbstractMesh[];
  embeddedLights: readonly Light[];
}) {
  // Real Westbridge view clones have their own outdoor lighting. Keeping them
  // out of this set also protects them if a caller passes a combined mesh list.
  const meshes = options.meshes.filter(mesh => mesh.metadata?.hostHouseExterior !== true);
  const native = [...options.embeddedLights];
  const locals: LocalLight[] = [];
  const created: Light[] = [];
  const generators: ShadowGenerator[] = [];
  const foreign = new Set<Light>();
  const ownMaterials: Material[] = [];
  const fixtures = new Map<PBRMaterial | StandardMaterial, { color: Color3; bulb: boolean }>();
  const backdrop: { mesh: AbstractMesh; original: Material; clone: Material; color: Color3; emission: Color3 }[] = [];
  let mode: HostHouseLightMode = 'day', active = false, disposed = false;

  const ambient = new HemisphericLight('Daniel e Helen · luz difusa dos cômodos', new Vector3(0, 1, 0), scene);
  ambient.includedOnlyMeshes = meshes; ambient.setEnabled(false); created.push(ambient);

  function add(light: PointLight | SpotLight, rooms: Room[], day: number, night: number,
    dayColor = new Color3(1, .81, .59), nightColor = new Color3(1, .71, .43), window = false) {
    light.setEnabled(false); light.specular.set(.3, .28, .24);
    locals.push({ light, rooms, day, night, dayColor, nightColor, window });
  }
  function practical(name: string, rooms: Room[], x: number, y: number, z: number, day: number, night: number, range: number) {
    const light = new PointLight('Daniel e Helen · ' + name, point(x, y, z), scene);
    light.range = range; light.falloffType = Light.FALLOFF_GLTF; created.push(light);
    add(light, rooms, day, night); return light;
  }
  function alignFixture(light: PointLight, x: number, y: number, z: number) {
    const world = point(x, y, z);
    if (light.parent) {
      light.parent.computeWorldMatrix(true);
      light.position.copyFrom(Vector3.TransformCoordinates(world, light.parent.getWorldMatrix().clone().invert()));
    } else light.position.copyFrom(world);
    light.computeTransformedInformation();
  }

  // Reuse the source fixtures, including the bedside lamps which were disabled
  // in the old daytime-only integration. Their local transforms are untouched.
  for (const light of native) {
    if (!(light instanceof PointLight)) { light.setEnabled(false); continue; }
    if (light.parent) light.parent.computeWorldMatrix(true);
    light.computeTransformedInformation();
    const power = light.intensity;
    if (/^Day_janela_quarto/.test(light.name))
      add(light, ['player'], power * .75, power * .035, new Color3(.9, .93, 1), new Color3(.46, .59, .83), true);
    else if (/^Day_janela_sala/.test(light.name))
      add(light, ['living'], power * .8, power * .035, new Color3(.95, .96, 1), new Color3(.46, .59, .83), true);
    else if (/^Night_abajur_quarto/.test(light.name)) {
      alignFixture(light, 48.89, 4.83, 40.10);
      add(light, ['player'], power * .35, power * 3.0);
    }
    else if (/^Night_abajur_sala/.test(light.name)) add(light, ['living'], power * .4, power * 3.0);
    else if (/^Night_corredor/.test(light.name)) {
      alignFixture(light, 55.5, 6.60, 36.25);
      add(light, ['upperHall', 'stairs'], power * 1.0, power * 3.5);
    }
    else if (/^Night_anfitrioes/.test(light.name)) {
      alignFixture(light, 53.447, 4.83, 40.25);
      add(light, ['hosts'], power * .45, power * 3.0);
    }
    else if (/^Always_jantar/.test(light.name)) {
      alignFixture(light, 50.1, 2.59, 33.35);
      add(light, ['dining'], power * 2.3, power * 3.0);
    }
    else if (/^Always_cozinha/.test(light.name)) add(light, ['kitchen'], power * 2.1, power * 2.7);
    else if (/^Always_banheiro/.test(light.name)) {
      alignFixture(light, 55.6, 6.55, 33.45);
      add(light, ['bathroom'], power * 2.1, power * 2.5);
    }
    else light.setEnabled(false);
  }

  // Fixtures in rooms without an embedded source light. They coincide with
  // ceiling/desk positions and do not introduce any new gameplay interaction.
  practical('plafon da entrada', ['hall', 'stairs'], 49, 3.16, 37, 3.0, 4.3, 4.6);
  practical('luz da área de serviço', ['utility', 'utilityEntry'], 54.65, 3.15, 40.8, 3.8, 4.5, 4.3);
  practical('plafon do lavabo', ['powder'], 56.8, 3.15, 41.5, 2.5, 3.6, 3.0);
  practical('garagem · lâmpada de teto', ['garage'], 54, 3.66, 27.4, 5.0, 6.5, 6.5);
  practical('quarto de hóspedes · abajur', ['guest'], 52.35, 4.83, 34.47, 1.1, 3.6, 4.0);
  practical('quarto dos anfitriões · abajur direito', ['hosts'], 55.54, 4.83, 40.25, .7, 2.6, 3.4);
  practical('corredor superior · entrada', ['upperHall'], 50.5, 6.55, 36.3, 1.4, 2.8, 4.6);
  practical('luz sob o exaustor', ['kitchen'], 55.65, 1.87, 31.48, .38, .65, 1.7);
  practical('luz da bancada da pia', ['kitchen'], 54.35, 1.87, 31.60, .35, .55, 1.7);
  practical('arandela do espelho do banheiro', ['bathroom'], 55.70, 6.08, 31.29, 1.2, 1.65, 3.2);
  practical('arandela do espelho do lavabo', ['powder'], 57.48, 2.27, 42.75, .65, .95, 2.6);

  function windowLight(name: string, rooms: Room[], position: Vector3, target: Vector3,
    day: number, size: number) {
    const light = new SpotLight('Daniel e Helen · sol pela ' + name, position,
      target.subtract(position).normalize(), 1.18, 1.35, scene);
    light.falloffType = Light.FALLOFF_GLTF; light.range = 8.0;
    light.shadowMinZ = .10; light.shadowMaxZ = 8.2; created.push(light);
    add(light, rooms, day, .36, new Color3(1, .85, .64), new Color3(.42, .57, .85), true);
    const shadows = new ShadowGenerator(size, light);
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
    shadows.bias = .0013; shadows.normalBias = .022;
    shadows.darkness = .16; shadows.transparencyShadow = true;
    const casters = meshes.filter(mesh => {
      if (!mesh.getTotalVertices() || /WindowView_|proxy|interação|saída para Westbridge/i.test(mesh.name)) return false;
      // Glazing and the original opaque decorative rear-window cards transmit
      // light. Keep their frames, mullions, blind slats and cloth as casters.
      if (/^back_window_|(?:^|[_ .-])(?:glass|glazing|pane)(?:[_ .-]|$)/i.test(mesh.name) ||
        /glass|glazing|windowglow|windowday|windownight|HH_window_pane/i.test(mesh.material?.name ?? '')) return false;
      const bounds = meshBounds(mesh);
      // A wall or lintel borders the window and must cast; glass and curtain
      // transparency are respected by the source material alpha.
      return rooms.some(room => overlaps(bounds, ROOMS[room], .18));
    });
    for (const mesh of casters) shadows.addShadowCaster(mesh, false);
    const map = shadows.getShadowMap();
    if (map) map.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    generators.push(shadows);
  }
  windowLight('janela da sala', ['living'], point(47.52, 2.75, 40.82), point(51.6, .55, 41.2), 18, 768);
  windowLight('janela do estudante', ['player'], point(47.52, 6.20, 40.82), point(51.6, 4.0, 41.2), 18, 768);
  // The kitchen's real rear opening now transmits daylight. Put the soft
  // window source outside the opening, clear of the retained frame and glazing.
  windowLight('janela da cozinha', ['kitchen'], point(58.55, 2.7, 33.0), point(54.7, .65, 33.8), 12, 512);

  // Night changes are confined to the decorative street seen through the
  // supplied windows. Shared interior materials retain their original colors.
  const backdropClones = new Map<Material, Material>();
  for (const mesh of meshes) {
    if (!/^WindowView_/.test(mesh.name) || !mesh.material) continue;
    const original = mesh.material;
    if (!(original instanceof PBRMaterial) && !(original instanceof StandardMaterial)) continue;
    let clone = backdropClones.get(original);
    if (!clone) {
      clone = original.clone(original.name + ' · vista exterior da casa') ?? undefined;
      if (!clone) continue;
      backdropClones.set(original, clone); ownMaterials.push(clone);
    }
    const color = original instanceof PBRMaterial ? original.albedoColor.clone() : original.diffuseColor.clone();
    backdrop.push({ mesh, original, clone, color, emission: original.emissiveColor.clone() });
    mesh.material = clone;
  }

  const own = new Set<Light>([ambient, ...locals.map(item => item.light), ...native]);
  for (const light of scene.lights) if (!own.has(light)) {
    foreign.add(light);
    const previous = new Set(light.excludedMeshes);
    light.excludedMeshes = [...light.excludedMeshes, ...meshes.filter(mesh => !previous.has(mesh))];
  }
  for (const mesh of meshes) {
    if (!/WindowView_|proxy|interação|saída para Westbridge/i.test(mesh.name)) mesh.receiveShadows = true;
    const material = mesh.material;
    if (material && 'maxSimultaneousLights' in material) material.maxSimultaneousLights = 4;
    if (material && /^HH_(?:bulb|shade)/i.test(material.name) &&
      (material instanceof PBRMaterial || material instanceof StandardMaterial))
      fixtures.set(material, { color: material.emissiveColor.clone(), bulb: /^HH_bulb/i.test(material.name) });
  }

  function apply() {
    if (disposed) return;
    // A later lazy-loaded neighbourhood may introduce lights after this house.
    // Re-establish membership on entry without changing any outside intensity.
    for (const light of scene.lights) if (!own.has(light)) {
      foreign.add(light);
      const excluded = new Set(light.excludedMeshes);
      light.excludedMeshes.push(...meshes.filter(mesh => !excluded.has(mesh)));
    }
    ambient.intensity = mode === 'day' ? .36 : .25;
    if (mode === 'day') {
      ambient.diffuse.set(1, .96, .87); ambient.groundColor.set(.32, .27, .20);
    } else {
      ambient.diffuse.set(.61, .67, .82); ambient.groundColor.set(.24, .21, .18);
    }
    ambient.setEnabled(active);
    for (const item of locals) {
      item.light.includedOnlyMeshes = [];
      item.light.intensity = mode === 'day' ? item.day : item.night;
      item.light.diffuse.copyFrom(mode === 'day' ? item.dayColor : item.nightColor);
    }
    for (const mesh of meshes) {
      if (!mesh.getTotalVertices() || /^WindowView_/.test(mesh.name)) continue;
      const bounds = meshBounds(mesh), center = mesh.getBoundingInfo().boundingBox.centerWorld;
      const eligible = locals.filter(item => item.rooms.some(room => overlaps(bounds, ROOMS[room])));
      eligible.sort((a, b) => {
        const score = (item: LocalLight) => Vector3.DistanceSquared(center, item.light.getAbsolutePosition()) /
          Math.max(1, item.light.range) - (mode === 'day' && item.light instanceof SpotLight ? 8 : 0);
        return score(a) - score(b);
      });
      // Hemisphere plus these three gives a fixed four-light shader budget.
      for (const item of eligible.slice(0, 3)) item.light.includedOnlyMeshes.push(mesh);
    }
    for (const item of locals) item.light.setEnabled(active && item.light.includedOnlyMeshes.length > 0);
    for (const item of backdrop) {
      const color = mode === 'day' ? item.color : item.color.multiply(new Color3(.20, .24, .36));
      const emission = mode === 'day' ? item.emission : item.emission.multiply(new Color3(.12, .16, .28));
      if (item.clone instanceof PBRMaterial) { item.clone.albedoColor.copyFrom(color); item.clone.emissiveColor.copyFrom(emission); }
      if (item.clone instanceof StandardMaterial) { item.clone.diffuseColor.copyFrom(color); item.clone.emissiveColor.copyFrom(emission); }
    }
    for (const [material, fixture] of fixtures) {
      const power = mode === 'day' ? (fixture.bulb ? .22 : .07) : (fixture.bulb ? .60 : .21);
      material.emissiveColor.copyFrom(fixture.color.add(new Color3(1, .65, .34)).scale(power));
    }
    if (active) for (const shadows of generators) shadows.getShadowMap()?.resetRefreshCounter();
  }
  apply();

  return {
    setActive(value: boolean) { if (active === value || disposed) return; active = value; apply(); },
    setMode(value: HostHouseLightMode) { if (mode === value || disposed) return; mode = value; apply(); },
    refreshShadows() { if (active) for (const shadows of generators) shadows.getShadowMap()?.resetRefreshCounter(); },
    get diagnostics() {
      return { active, mode, maxLightsPerMesh: 4, roomAndFloorMasks: true,
        ambientIntensity: ambient.intensity,
        activeLights: locals.filter(item => item.light.isEnabled()).map(item => item.light.name),
        embeddedLights: native.length, addedLights: created.length,
        cachedShadowMaps: generators.map(shadows => ({ size: shadows.getShadowMap()?.getSize().width,
          refreshRate: shadows.getShadowMap()?.refreshRate, casters: shadows.getShadowMap()?.renderList?.length ?? 0 })),
        backdropMaterials: ownMaterials.length, glowingFixtureMaterials: fixtures.size };
    },
    dispose() {
      if (disposed) return; active = false; disposed = true;
      const ownedMeshes = new Set(meshes);
      for (const light of foreign) light.excludedMeshes = light.excludedMeshes.filter(mesh => !ownedMeshes.has(mesh));
      for (const item of backdrop) if (!item.mesh.isDisposed()) item.mesh.material = item.original;
      for (const shadows of generators) shadows.dispose();
      for (const light of created) light.dispose();
      for (const material of ownMaterials) material.dispose(false, false);
      for (const light of native) light.setEnabled(false);
    },
  };
}
