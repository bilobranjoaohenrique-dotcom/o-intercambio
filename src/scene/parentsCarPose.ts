import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { ParentPart, type V3 } from './parentsGeometry';
import type { ParentMaterials } from './parentsMaterials';

const between = (a: V3, b: V3, t: number): V3 => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
});
const relative = (p: V3, origin: V3): V3 => ({ x: p.x - origin.x, y: p.y - origin.y, z: p.z - origin.z });

function seatedFoot(part: ParentPart, x: number, z: number, mother: boolean, m: ParentMaterials) {
  const width = mother ? .045 : .053;
  part.loft(mother ? 'sandália · solado fino' : 'sapato · sola de borracha', [
    { x, y: .367, z, width: width * .92, front: .13, back: .065 },
    { x, y: .384, z, width, front: .135, back: .069 },
  ], m.sole, 10);
  part.loft(mother ? 'sandália · pé e dedos aparentes' : 'sapato · cabedal de couro', [
    { x, y: .385, z, width: width * .95, front: .13, back: .064 },
    { x, y: .413, z: z - .008, width: width * .90, front: .114, back: .054 },
    { x, y: .440, z: z - .035, width: .036, front: .051, back: .042 },
    { x, y: .465, z: z - .039, width: .033, front: .034, back: .033 },
  ], mother ? m.skin : m.leather, 10);
  if (mother) {
    for (const [offset, y] of [[.065, .418], [-.014, .440]])
      part.tube('sandália · tira sobre o peito do pé', [
        { x: x - .041, y: y - .018, z: z + offset, width: .008, depth: .012 },
        { x, y, z: z + offset, width: .008, depth: .012 },
        { x: x + .041, y: y - .018, z: z + offset, width: .008, depth: .012 },
      ], m.leather, 6);
  } else {
    for (let i = 0; i < 3; i++) part.tube('sapato · costura discreta', [
      { x: x - .026, y: .426 + i * .007, z: z + .035 - i * .022, width: .002 },
      { x: x + .026, y: .426 + i * .007, z: z + .035 - i * .022, width: .002 },
    ], m.seam, 5);
  }
}

function restingHand(part: ParentPart, wrist: V3, side: number, mother: boolean, m: ParentMaterials) {
  const palmEnd = { x: wrist.x, y: wrist.y - .006, z: wrist.z + .040 };
  part.tube('mão · palma com volume', [
    { ...wrist, width: .023, depth: .014 },
    { ...between(wrist, palmEnd, .65), width: .030, depth: .015 },
    { ...palmEnd, width: .027, depth: .012 },
  ], m.skin, 8);
  for (let i = 0; i < 4; i++) {
    const offset = (i - 1.5) * .014, length = [.034, .046, .044, .033][i];
    part.tube(mother ? 'mão · dedos relaxados sobre o colo' : 'mão · dedos curvos perto do aro', [
      { x: wrist.x + offset, y: palmEnd.y, z: palmEnd.z - .003, width: .0068, depth: .007 },
      { x: wrist.x + offset, y: palmEnd.y - .010, z: palmEnd.z + length * .54, width: .0060, depth: .0065 },
      { x: wrist.x + offset * .96, y: palmEnd.y - (mother ? .016 : .031), z: palmEnd.z + length * .81, width: .0047, depth: .005 },
    ], m.skin, 6);
  }
  part.tube('mão · polegar em oposição', [
    { x: wrist.x - side * .024, y: wrist.y, z: wrist.z + .013, width: .010 },
    { x: wrist.x - side * .042, y: wrist.y - .011, z: wrist.z + .038, width: .008 },
    { x: wrist.x - side * .032, y: wrist.y - .024, z: wrist.z + .056, width: .0058 },
  ], m.skin, 7);
}

function carArm(parent: TransformNode, mother: boolean, side: number, m: ParentMaterials) {
  const shoulder = { x: side * (mother ? .177 : .193), y: mother ? .973 : .986, z: .008 };
  const elbow = mother ? { x: side * .207, y: .786, z: .103 } : { x: side * .218, y: .835, z: .245 };
  const wrist = mother ? { x: side * .084, y: .706, z: .286 } : { x: side * .120, y: 1.015, z: .500 };
  const node = new TransformNode((mother ? 'mãe' : 'pai') + ' · braço sentado no carro ' + side, parent.getScene());
  node.parent = parent; node.position.set(shoulder.x, shoulder.y, shoulder.z);
  const p = new ParentPart(node), origin = { x: 0, y: 0, z: 0 };
  const e = relative(elbow, shoulder), w = relative(wrist, shoulder), sleeve = between(origin, e, .58);
  p.tube('manga curta com caimento sentado', [
    { ...origin, width: mother ? .056 : .064, depth: mother ? .052 : .060 },
    { ...between(origin, sleeve, .55), width: mother ? .058 : .066, depth: mother ? .051 : .057 },
    { ...sleeve, width: .046, depth: .044 },
  ], mother ? m.floral : m.shirt, 10);
  p.tube('barra da manga', [{ ...between(origin, sleeve, .93), width: .047, depth: .045 },
    { ...sleeve, width: .047, depth: .045 }], mother ? m.floral : m.collar, 10);
  p.tube('braço cotovelo e antebraço sentado', [
    { ...between(origin, e, .58), width: mother ? .039 : .043, depth: .039 },
    { ...e, width: mother ? .033 : .038, depth: .035 },
    { ...between(e, w, .55), width: mother ? .029 : .034, depth: .029 },
    { ...w, width: .023, depth: .023 },
  ], m.skin, 9);
  restingHand(p, w, side, mother, m);
  if (side < 0) {
    const center = between(e, w, .88);
    p.tube('relógio · pulseira ajustada ao pulso', [
      { ...between(e, w, .83), width: .027, depth: .027 },
      { ...between(e, w, .93), width: .027, depth: .027 },
    ], m.sole, 8);
    p.loft('relógio · caixa metálica', [
      { x: center.x, y: center.y + .022, z: center.z, width: .017, front: .019, back: .019 },
      { x: center.x, y: center.y + .029, z: center.z, width: .016, front: .018, back: .018 },
    ], m.steel, 8);
  }
  return { node, meshes: p.build() };
}

/** Seat-local articulated bodies. The caller reuses each parent's one head,
 * identity and material set; these are not extra NPCs or a vehicle controller. */
export function createCarParentPose(parent: TransformNode, mother: boolean, m: ParentMaterials) {
  const node = new TransformNode((mother ? 'mãe' : 'pai') + ' · postura dentro do carro', parent.getScene());
  node.parent = parent;
  const p = new ParentPart(node), trousers = mother ? m.skirt : m.trousers;
  for (const side of [-1, 1]) {
    p.tube('calça sentada · coxa joelho e perna', [
      { x: side * .092, y: .623, z: -.002, width: mother ? .074 : .082, depth: .070 },
      { x: side * .112, y: .587, z: .187, width: mother ? .068 : .075, depth: .067 },
      { x: side * .121, y: .535, z: .364, width: mother ? .057 : .064, depth: .058 },
      { x: side * .123, y: .485, z: .590, width: mother ? .043 : .049, depth: .045 },
      { x: side * .124, y: .458, z: .795, width: .032, depth: .034 },
    ], trousers, 10);
    seatedFoot(p, side * .124, .835, mother, m);
  }
  p.loft('quadril e cintura da calça sentada', [
    { y: .557, width: mother ? .150 : .163, front: .102, back: .086 },
    { y: .620, width: mother ? .165 : .171, front: .119, back: .090 },
    { y: .675, width: mother ? .150 : .157, front: .111, back: .089 },
  ], trousers, 14);
  p.loft('blusa com caimento natural sobre a cintura', [
    { y: .660, width: mother ? .153 : .162, front: .115, back: .092 },
    { y: .741, width: mother ? .161 : .175, front: .123, back: .095 },
    { y: .848, width: mother ? .174 : .192, front: .126, back: .097, z: .009 },
    { y: .950, width: mother ? .184 : .207, front: .109, back: .091, z: .011 },
    { y: .997, width: mother ? .158 : .177, front: .075, back: .075, z: .009 },
  ], mother ? m.floral : m.shirt, 16);
  if (!mother) {
    p.loft('cinto de couro e passadores', [{ y: .649, width: .164, front: .117, back: .094 },
      { y: .675, width: .164, front: .117, back: .094 }], m.sole, 14);
    p.polygon('fivela do cinto', [{ x: -.023, y: .650, z: .120 }, { x: .023, y: .650, z: .120 },
      { x: .023, y: .676, z: .120 }, { x: -.023, y: .676, z: .120 }], m.steel);
  }
  p.loft('pescoço apoiado no tórax', [
    { y: .985, width: .052, front: .046, back: .043, z: .011 },
    { y: 1.030, width: .043, front: .041, back: .040, z: .016 },
    { y: 1.065, width: .043, front: .041, back: .040, z: .016 },
  ], m.skin, 12);
  for (const side of [-1, 1]) p.polygon('gola dobrada da roupa de viagem', [
    { x: side * .043, y: 1.004, z: .058 }, { x: side * .105, y: .981, z: .085 },
    { x: side * .061, y: .913, z: .132 }, { x: side * .010, y: .966, z: .111 },
  ], mother ? m.floral : m.collar);
  for (let i = 0; i < (mother ? 4 : 3); i++)
    p.oval('botão da roupa', { x: .002, y: .925 - i * .052, z: .135 }, .0035, .0035, m.seam, .001, 8);
  const left = carArm(node, mother, -1, m), right = carArm(node, mother, 1, m);
  const meshes: Mesh[] = [...p.build(), ...left.meshes, ...right.meshes];
  return { node, meshes, arms: [left.node, right.node], headY: 1.030 };
}
