import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { ParentPart, type V3, type BodyRing } from './parentsGeometry';
import type { ParentMaterials } from './parentsMaterials';

const between = (a: V3, b: V3, t: number): V3 => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
});
const relative = (point: V3, origin: V3): V3 => ({ x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z });

/** A removable travel garment. The approved floral cloth and all facial
 * materials remain the same objects used at home and in the car. */
function travelKnit(parent: TransformNode) {
  const scene = parent.getScene(), material = new StandardMaterial('mãe · cardigã vinho de viagem', scene);
  material.diffuseColor.set(.43, .235, .265); material.specularColor.set(.025, .022, .022);
  let texture: DynamicTexture | undefined;
  if (typeof document !== 'undefined') {
    texture = new DynamicTexture('cardigã · trama original 128px', { width: 128, height: 128 }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    const c = texture.getContext(); c.fillStyle = '#70414a'; c.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 3) {
      c.fillStyle = y % 2 ? 'rgba(222,164,155,.08)' : 'rgba(40,24,32,.10)'; c.fillRect(0, y, 128, 1);
      for (let x = y % 2; x < 128; x += 4) {
        c.fillStyle = 'rgba(225,175,161,.075)'; c.fillRect(x, y, 1, 2);
        c.fillStyle = 'rgba(31,23,28,.075)'; c.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    texture.update(true); material.diffuseTexture = texture; material.diffuseColor.set(1, 1, 1);
  }
  return { material, dispose() { material.dispose(false, false); texture?.dispose(); } };
}

function shoes(part: ParentPart, side: number, mother: boolean, m: ParentMaterials) {
  const x = side * (mother ? .095 : .112), z = side > 0 ? .009 : -.010, width = mother ? .047 : .054;
  part.loft('calçado aprovado · sola e salto discretos', [
    { x, y: .015, z: z + .035, width: width * .84, front: .12, back: .083 },
    { x, y: .036, z: z + .035, width, front: .126, back: .086 },
  ], m.sole, 12);
  part.loft(mother ? 'sandália · pé aparente' : 'sapato · cabedal costurado', [
    { x, y: .036, z: z + .025, width: width * .97, front: .117, back: .078 },
    { x, y: .068, z: z + .012, width: width * .90, front: .105, back: .067 },
    { x, y: .095, z, width: mother ? .040 : .050, front: .041, back: .048 },
  ], mother ? m.skin : m.leather, 12);
  if (mother) for (const offset of [.045, .087]) part.tube('sandália · tira de couro', [
    { x: x - width * .95, y: .043, z: z + offset, width: .008, depth: .008 },
    { x, y: .076, z: z + offset - .005, width: .008, depth: .008 },
    { x: x + width * .95, y: .043, z: z + offset, width: .008, depth: .008 },
  ], m.leather, 6);
}

function hand(part: ParentPart, elbow: V3, wrist: V3, side: number, m: ParentMaterials) {
  const length = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y, wrist.z - elbow.z);
  const direction = { x: (wrist.x - elbow.x) / length, y: (wrist.y - elbow.y) / length, z: (wrist.z - elbow.z) / length };
  const along = (distance: number, across = 0): V3 => ({
    x: wrist.x + direction.x * distance + across,
    y: wrist.y + direction.y * distance, z: wrist.z + direction.z * distance,
  });
  part.tube('mão adulta · palma relaxada', [
    { ...wrist, width: .022, depth: .013 }, { ...along(.030), width: .029, depth: .015 },
    { ...along(.056), width: .026, depth: .012 },
  ], m.skin, 8);
  for (let finger = 0; finger < 4; finger++) {
    const across = (finger - 1.5) * .014, reach = [.030, .043, .041, .029][finger];
    const tip = along(.057 + reach, across);
    part.tube('mão adulta · dedo em gesto contido ' + finger, [
      { ...along(.050, across), width: .0068, depth: .007 },
      { ...along(.057 + reach * .55, across), width: .0060, depth: .0065 },
      { ...tip, y: tip.y - .007, z: tip.z - .004, width: .0048, depth: .005 },
    ], m.skin, 6);
  }
  part.tube('mão adulta · polegar em oposição', [
    { ...along(.012, side * .025), width: .010 },
    { ...along(.038, side * .040), width: .008 },
    { ...along(.057, side * .034), width: .0055 },
  ], m.skin, 7);
}

function standingArm(parent: TransformNode, side: number, mother: boolean, m: ParentMaterials, knit?: StandardMaterial) {
  const shoulder = { x: side * (mother ? .193 : .212), y: mother ? 1.300 : 1.440, z: .014 };
  const elbow = mother ? { x: side * .244, y: 1.035, z: .110 } : { x: side * .283, y: 1.150, z: .088 };
  const wrist = mother ? { x: side * .035, y: 1.157, z: .224 }
    : side < 0 ? { x: -.171, y: 1.052, z: .325 } : { x: .212, y: .985, z: .145 };
  const node = new TransformNode((mother ? 'mãe' : 'pai') + ' · braço na despedida ' + side, parent.getScene());
  node.parent = parent; node.position.set(shoulder.x, shoulder.y, shoulder.z);
  const p = new ParentPart(node), origin = { x: 0, y: 0, z: 0 }, e = relative(elbow, shoulder), w = relative(wrist, shoulder);
  if (mother && knit) {
    p.tube('cardigã · manga comprida com cotovelo e punho', [
      { ...origin, width: .062, depth: .057 }, { ...between(origin, e, .52), width: .057, depth: .053 },
      { ...e, width: .044, depth: .043 }, { ...between(e, w, .52), width: .038, depth: .036 },
      { ...w, width: .027, depth: .027 },
    ], knit, 10);
    p.tube('cardigã · punho canelado', [{ ...between(e, w, .88), width: .029, depth: .029 },
      { ...w, width: .028, depth: .028 }], knit, 10);
  } else {
    const sleeve = between(origin, e, .61);
    p.tube('polo aprovada · manga curta', [
      { ...origin, width: .071, depth: .065 }, { ...between(origin, sleeve, .46), width: .070, depth: .062 },
      { ...sleeve, width: .052, depth: .050 },
    ], m.shirt, 10);
    p.tube('polo aprovada · barra da manga', [{ ...between(origin, sleeve, .93), width: .053, depth: .051 },
      { ...sleeve, width: .053, depth: .051 }], m.collar, 10);
    p.tube('braço adulto · cotovelo e antebraço', [
      { ...between(origin, e, .59), width: .045, depth: .044 }, { ...e, width: .039, depth: .039 },
      { ...between(e, w, .52), width: .035, depth: .032 }, { ...w, width: .025, depth: .024 },
    ], m.skin, 9);
  }
  hand(p, e, w, side, m);
  if (side < 0) {
    const center = between(e, w, .89);
    p.tube('relógio aprovado · pulseira no pulso', [{ ...between(e, w, .83), width: .029, depth: .029 },
      { ...between(e, w, .94), width: .029, depth: .029 }], m.sole, 9);
    p.loft('relógio aprovado · caixa metálica', [
      { x: center.x, y: center.y + .025, z: center.z, width: .017, front: .019, back: .019 },
      { x: center.x, y: center.y + .032, z: center.z, width: .016, front: .018, back: .018 },
    ], m.steel, 8);
  }
  return { node, meshes: p.build() };
}

function cardigan(part: ParentPart, knit: StandardMaterial) {
  const rings = [
    { y: .920, width: .183, front: .127, back: .132, z: 0, opening: .56 },
    { y: 1.025, width: .181, front: .134, back: .131, z: 0, opening: .51 },
    { y: 1.160, width: .194, front: .146, back: .124, z: .014, opening: .47 },
    { y: 1.265, width: .209, front: .129, back: .114, z: .024, opening: .42 },
    { y: 1.324, width: .177, front: .101, back: .103, z: .017, opening: .43 },
  ];
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], sides = 20;
  for (let row = 0; row < rings.length; row++) {
    const ring = rings[row];
    for (let i = 0; i <= sides; i++) {
      const a = ring.opening + (Math.PI * 2 - ring.opening * 2) * i / sides, front = Math.cos(a);
      positions.push(Math.sin(a) * ring.width, ring.y, ring.z + front * (front > 0 ? ring.front : ring.back));
      uvs.push(i / sides * 2, (ring.y - rings[0].y) * 3);
    }
  }
  for (let row = 0; row < rings.length - 1; row++) for (let i = 0; i < sides; i++) {
    const a = row * (sides + 1) + i, b = a + 1, c = a + sides + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  part.geometry('cardigã aberto · costas laterais e duas frentes', positions, indices, knit, uvs);
  for (const side of [-1, 1]) part.tube('cardigã · vista frontal de tricô', rings.map(ring => ({
    x: side * Math.sin(ring.opening) * ring.width,
    y: ring.y, z: ring.z + Math.cos(ring.opening) * ring.front + .002, width: .007, depth: .006,
  })), knit, 7);
}

/** Standing travel pose for each existing parent. Their one shared anatomical
 * head is supplied by createParents; no extra identity or portrait is created. */
export function createAirportParentPose(parent: TransformNode, mother: boolean, m: ParentMaterials) {
  const node = new TransformNode((mother ? 'mãe' : 'pai') + ' · postura no aeroporto', parent.getScene());
  node.parent = parent;
  const p = new ParentPart(node), knit = mother ? travelKnit(node) : undefined;
  const trousers = mother ? m.skirt : m.trousers;
  for (const side of [-1, 1]) {
    p.loft('calça aprovada · perna em pé com joelho e barra', [
      { x: side * (mother ? .095 : .112), y: .093, width: mother ? .042 : .047, front: .049, back: .046 },
      { x: side * (mother ? .095 : .112), y: .28, width: mother ? .050 : .054, front: .060, back: .054 },
      { x: side * (mother ? .095 : .112), y: .52, width: mother ? .058 : .065, front: .069, back: .065 },
      { x: side * .095, y: .76, width: mother ? .078 : .086, front: .084, back: .085 },
      { x: side * .095, y: mother ? .94 : .975, width: mother ? .089 : .094, front: .096, back: .090 },
    ], trousers, 12);
    shoes(p, side, mother, m);
  }
  p.loft('calça aprovada · quadril e cós', [
    { y: .86, width: mother ? .184 : .180, front: .119, back: .126 },
    { y: .94, width: mother ? .178 : .178, front: .119, back: .123 },
    { y: mother ? 1.005 : 1.020, width: mother ? .159 : .164, front: .112, back: .113 },
  ], trousers, 16);
  const chest: BodyRing[] = mother ? [
    { y: .985, width: .163, front: .114, back: .116 }, { y: 1.055, width: .165, front: .120, back: .115 },
    { y: 1.160, width: .180, front: .132, back: .110, z: .014 },
    { y: 1.265, width: .194, front: .115, back: .100, z: .024 },
    { y: 1.315, width: .171, front: .087, back: .090, z: .017 },
  ] : [
    { y: .979, width: .171, front: .126, back: .123 }, { y: 1.075, width: .178, front: .137, back: .129 },
    { y: 1.225, width: .200, front: .143, back: .123, z: .008 },
    { y: 1.370, width: .218, front: .125, back: .116, z: .010 },
    { y: 1.445, width: .195, front: .088, back: .101 },
  ];
  p.loft('roupa aprovada · tórax e ombros na pose em pé', chest, mother ? m.floral : m.shirt, 16);
  if (knit) cardigan(p, knit.material);
  if (!mother) {
    p.loft('cinto aprovado · cintura em pé', [{ y: .985, width: .173, front: .130, back: .128 },
      { y: 1.013, width: .173, front: .130, back: .128 }], m.sole, 16);
    p.polygon('cinto aprovado · fivela', [{ x: -.026, y: .986, z: .132 }, { x: .026, y: .986, z: .132 },
      { x: .026, y: 1.013, z: .132 }, { x: -.026, y: 1.013, z: .132 }], m.steel);
  }
  const neckY = mother ? 1.300 : 1.435, neckTop = mother ? 1.418 : 1.518, top = mother ? 1.312 : 1.440;
  p.loft('pescoço aprovado · base e tendões', [
    { y: neckY, width: .059, front: .052, back: .050, z: .004 },
    { y: neckY + .05, width: .047, front: .047, back: .046, z: .009 },
    { y: neckTop, width: .049, front: .047, back: .047, z: .012 },
  ], m.skin, 12);
  for (const side of [-1, 1]) p.polygon('gola aprovada · tecido dobrado', [
    { x: side * .048, y: top + .013, z: .051 }, { x: side * .112, y: top - .024, z: .092 },
    { x: side * .065, y: top - .119, z: .136 }, { x: side * .010, y: top - .058, z: .116 },
  ], m.collar);
  p.polygon('roupa aprovada · prega frontal', [
    { x: -.007, y: top - .068, z: .145 }, { x: .007, y: top - .068, z: .145 },
    { x: .007, y: mother ? 1.015 : 1.210, z: .133 }, { x: -.007, y: mother ? 1.015 : 1.210, z: .133 },
  ], m.collar);
  for (let i = 0; i < (mother ? 4 : 3); i++) p.oval('roupa aprovada · botão',
    { x: .002, y: top - .105 - i * (mother ? .056 : .064), z: .148 }, .0035, .0035, m.seam, .001, 8);
  const left = standingArm(node, -1, mother, m, knit?.material), right = standingArm(node, 1, mother, m, knit?.material);
  const meshes: Mesh[] = [...p.build(), ...left.meshes, ...right.meshes];
  return { node, meshes, arms: [left.node, right.node], headY: mother ? 1.372 : 1.478,
    dispose() { knit?.dispose(); } };
}
