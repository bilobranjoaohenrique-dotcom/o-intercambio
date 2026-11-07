import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { InteractionTarget } from '../game/types';
import { PARENT_ANCHORS } from '../game/kitchenLayout';
import { ParentPart, type V3, type BodyRing } from './parentsGeometry';
import { parentMaterials, type ParentMaterials } from './parentsMaterials';

type Actor = {
  root: TransformNode; posture: TransformNode; head: TransformNode;
  arms: TransformNode[]; meshes: Mesh[]; speaker: string; phase: number; lookYaw: number; lookPitch: number;
};
const mixPoint = (a: V3, b: V3, t: number): V3 => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
});
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

function shoe(part: ParentPart, x: number, z: number, m: ParentMaterials, mother: boolean) {
  const width = mother ? .047 : .054, ankle = mother ? .04 : .05;
  // Curved upper, flat outsole, raised heel and an actual tapered toe profile.
  const soleRings = [
    { x, y: .015, z: z + .035, width: width * .84, front: .12, back: .083 },
    { x, y: .036, z: z + .035, width, front: .126, back: .086 },
  ];
  part.loft('sola recortada do sapato', soleRings, m.sole, 12);
  part.loft('cabedal costurado do sapato', [
    { x, y: .035, z: z + .028, width, front: .12, back: .082 },
    { x, y: .068, z: z + .015, width: width * .94, front: .106, back: .078 },
    { x, y: .093, z, width: width * .78, front: .044, back: .062 },
    { x, y: .10, z: z - .006, width: ankle, front: .036, back: .044 },
  ], m.leather, 12);
}

function hands(part: ParentPart, wrist: V3, side: number, m: ParentMaterials, cupGrip: boolean) {
  const scale = cupGrip ? 1.06 : .95;
  part.tube('palma com metacarpos', [
    { ...wrist, width: .023 * scale, depth: .012 },
    { x: wrist.x, y: wrist.y - .002, z: wrist.z + .037, width: .032 * scale, depth: .014 },
    { x: wrist.x, y: wrist.y - .009, z: wrist.z + .067, width: .026 * scale, depth: .010 },
  ], m.skin, 8);
  for (let i = 0; i < 4; i++) {
    const offset = (i - 1.5) * .015, length = [.035, .05, .048, .034][i] * scale;
    part.tube('dedo articulado ' + (i + 1), [
      { x: wrist.x + offset, y: wrist.y - .008, z: wrist.z + .059, width: .0071, depth: .008 },
      { x: wrist.x + offset * 1.08, y: wrist.y - .012, z: wrist.z + .071 + length * .48, width: .0062, depth: .0065 },
      { x: wrist.x + offset * 1.04, y: wrist.y - (cupGrip ? .039 : .022), z: wrist.z + .068 + length, width: .0048, depth: .0048 },
    ], m.skin, 6);
  }
  part.tube('polegar em oposição', [
    { x: wrist.x + side * .025, y: wrist.y - .001, z: wrist.z + .024, width: .010, depth: .010 },
    { x: wrist.x + side * .043, y: wrist.y - .011, z: wrist.z + .042, width: .008, depth: .008 },
    { x: wrist.x + side * .038, y: wrist.y - .026, z: wrist.z + .063, width: .0057, depth: .0057 },
  ], m.skin, 7);
}

function arm(parent: TransformNode, mother: boolean, side: number, m: ParentMaterials): { node: TransformNode; meshes: Mesh[] } {
  const shoulder = { x: side * (mother ? .19 : .205), y: mother ? 1.30 : 1.145, z: .012 };
  const inner = mother && side < 0, grip = !mother && side > 0;
  const elbow: V3 = mother
    ? { x: side * .255, y: 1.035, z: inner ? .14 : .035 }
    : { x: side * .315, y: grip ? .93 : .88, z: .27 };
  const wrist: V3 = mother
    ? { x: side * (inner ? .25 : .24), y: inner ? .842 : .82, z: inner ? .28 : .075 }
    : { x: side * .21, y: grip ? .90 : .838, z: .51 };
  const node = new TransformNode((mother ? 'mãe' : 'pai') + ' · ombro ' + side, parent.getScene());
  node.parent = parent; node.position.set(shoulder.x, shoulder.y, shoulder.z);
  const part = new ParentPart(node), origin = { x: 0, y: 0, z: 0 }, e = sub(elbow, shoulder), w = sub(wrist, shoulder);
  const sleeveEnd = mixPoint(origin, e, mother ? .69 : .62);
  part.tube('manga de algodão com volume', [
    { ...origin, width: mother ? .058 : .071, depth: mother ? .061 : .065 },
    { ...mixPoint(origin, e, .32), width: mother ? .061 : .068, depth: mother ? .054 : .060 },
    { ...sleeveEnd, width: mother ? .050 : .052, depth: mother ? .046 : .050 },
  ], mother ? m.floral : m.shirt, 10);
  part.tube('barra dobrada da manga', [
    { ...mixPoint(origin, sleeveEnd, .93), width: mother ? .051 : .053, depth: mother ? .047 : .051 },
    { ...sleeveEnd, width: mother ? .051 : .053, depth: mother ? .047 : .051 },
  ], m.collar, 10);
  part.tube('braço cotovelo e antebraço', [
    { ...mixPoint(origin, e, .63), width: mother ? .041 : .046, depth: mother ? .041 : .046 },
    { ...e, width: mother ? .036 : .042, depth: mother ? .037 : .041 },
    { ...mixPoint(e, w, .5), width: mother ? .033 : .038, depth: mother ? .029 : .033 },
    { ...w, width: mother ? .024 : .027, depth: .023 },
  ], m.skin, 9);
  hands(part, w, side, m, grip);
  if (!mother && side < 0) {
    const watch = mixPoint(e, w, .88);
    part.tube('pulseira do relógio', [
      { ...mixPoint(e, w, .82), width: .030, depth: .028 },
      { ...mixPoint(e, w, .91), width: .030, depth: .028 },
    ], m.sole, 10);
    part.solid('caixa do relógio de pulso', [
      { x: watch.x - .018, y: watch.y + .025, z: watch.z - .018 },
      { x: watch.x + .018, y: watch.y + .025, z: watch.z - .018 },
      { x: watch.x + .018, y: watch.y + .025, z: watch.z + .018 },
      { x: watch.x - .018, y: watch.y + .025, z: watch.z + .018 },
      { x: watch.x - .015, y: watch.y + .034, z: watch.z - .015 },
      { x: watch.x + .015, y: watch.y + .034, z: watch.z - .015 },
      { x: watch.x + .015, y: watch.y + .034, z: watch.z + .015 },
      { x: watch.x - .015, y: watch.y + .034, z: watch.z + .015 },
    ], [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]], m.steel);
  }
  return { node, meshes: part.build() };
}

function hair(part: ParentPart, mother: boolean, m: ParentMaterials) {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], sides = 20, rows = 6;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * Math.PI * 2, front = Math.cos(a);
      const blend = Math.max(0, Math.min(1, (front + .12) / .65));
      const smooth = blend * blend * (3 - 2 * blend);
      const frontHairline = mother ? .232 + Math.sin(a * 2 + .35) * .009 : .225 + Math.abs(Math.sin(a)) * .025;
      const backHairline = mother ? .022 + Math.min(front, 0) * .042 : .121 + Math.min(front, 0) * .031;
      const bottom = backHairline + (frontHairline - backHairline) * smooth;
      const radius = [1, 1.035, 1.04, .99, .85, .59, .10][row];
      const curl = mother ? Math.sin(a * 11 + t * 3.2) * .0042 * (1 - t * .5) : Math.sin(a * 3 + t) * .0015;
      const width = (mother ? .113 : .109) * radius + curl;
      const depth = (front > 0 ? .091 : mother ? .118 : .109) * radius + curl;
      positions.push(Math.sin(a) * width, bottom + (.297 - bottom) * t, front * depth - .002);
      uvs.push(i / sides, t);
    }
  }
  for (let row = 0; row < rows; row++) for (let i = 0; i < sides; i++) {
    const a = row * (sides + 1) + i, b = a + 1, c = a + sides + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const top = positions.length / 3; positions.push(0, .300, -.002); uvs.push(.5, 1);
  for (let i = 0; i < sides; i++) indices.push(top, rows * (sides + 1) + i + 1, rows * (sides + 1) + i);
  part.geometry(mother ? 'cabelo ondulado com silhueta e nuca' : 'cabelo curto penteado com entradas', positions, indices, m.hair, uvs);
  if (mother) {
    for (const side of [-1, 1]) for (let j = 0; j < 5; j++) {
      const y = .025 + j * .039;
      part.tube('mecha curva na lateral', [
        { x: side * .106, y: y + .03, z: .039, width: .013, depth: .008 },
        { x: side * .122, y: y + .018, z: .050, width: .012, depth: .009 },
        { x: side * .118, y: y - .002, z: .052, width: .011, depth: .009 },
        { x: side * .106, y: y - .010, z: .040, width: .006, depth: .006 },
      ], m.hair, 7);
    }
    part.tube('risca lateral discreta da mãe', [
      { x: .031, y: .238, z: .084, width: .0015, depth: .0015 },
      { x: .036, y: .277, z: .049, width: .0015, depth: .0015 },
      { x: .023, y: .296, z: .004, width: .001, depth: .001 },
    ], m.skinShade, 5);
    for (let j = 0; j < 3; j++) {
      const x = -.07 + j * .033;
      part.tube('onda lateral com a testa exposta', [
        { x: x + .01, y: .277, z: .050, width: .013, depth: .007 },
        { x, y: .263, z: .082, width: .014, depth: .009 },
        { x: x - .014, y: .240 + j * .004, z: .092, width: .009, depth: .006 },
      ], m.hair, 8);
    }
  } else {
    part.tube('risca natural do cabelo', [
      { x: -.029, y: .239, z: .082, width: .0021, depth: .0021 },
      { x: -.031, y: .265, z: .059, width: .0018, depth: .0018 },
      { x: -.027, y: .292, z: .009, width: .0012, depth: .0012 },
    ], m.skinShade, 5);
    for (let j = 0; j < 4; j++) {
      const x = -.008 + j * .018;
      part.tube('mecha penteada na frente', [
        { x: x - .012, y: .277, z: .042, width: .010, depth: .005 },
        { x: x + .016, y: .264, z: .079, width: .010, depth: .005 },
        { x: x + .021, y: .243 + j * .001, z: .089, width: .005, depth: .004 },
      ], m.hair, 7);
    }
    for (const side of [-1, 1]) part.polygon('costeleta', [
      { x: side * .101, y: .168, z: .025 }, { x: side * .110, y: .164, z: .021 },
      { x: side * .109, y: .113, z: .018 }, { x: side * .100, y: .121, z: .030 },
    ], m.hair);
  }
}

function head(parent: TransformNode, mother: boolean, m: ParentMaterials): { node: TransformNode; meshes: Mesh[] } {
  const node = new TransformNode((mother ? 'mãe' : 'pai') + ' · cabeça e expressão', parent.getScene());
  node.parent = parent; node.position.set(0, mother ? 1.372 : 1.183, mother ? .018 : .014);
  const p = new ParentPart(node);
  const shape: BodyRing[] = [
    { y: 0, width: .041, front: .059, back: .052, z: .003 },
    { y: .026, width: mother ? .073 : .078, front: .072, back: .068, z: .002, flatten: .8 },
    { y: .066, width: mother ? .087 : .094, front: .078, back: .084, flatten: .65 },
    { y: .116, width: mother ? .097 : .102, front: .084, back: .096, flatten: .55 },
    { y: .170, width: .098, front: .083, back: .103, flatten: .6 },
    { y: .214, width: .092, front: .076, back: .100, flatten: .75 },
    { y: .250, width: .077, front: .060, back: .080 },
    { y: .274, width: .034, front: .030, back: .038 },
    { y: .279, width: .003, front: .004, back: .004 },
  ];
  p.loft('rosto com mandíbula maçãs têmporas e crânio', shape, mother ? m.motherFace : m.fatherFace, 20, .5);
  for (const side of [-1, 1]) {
    p.loft('orelha com lóbulo', [
      { y: .074, x: side * .103, z: -.003, width: .006, front: .012, back: .009 },
      { y: .09, x: side * .109, z: -.005, width: .012, front: .021, back: .013 },
      { y: .136, x: side * .110, z: -.006, width: .013, front: .024, back: .014 },
      { y: .167, x: side * .104, z: -.007, width: .008, front: .016, back: .01 },
      { y: .174, x: side * .102, z: -.007, width: .002, front: .005, back: .004 },
    ], m.skin, 10);
    p.oval('concha da orelha', { x: side * .110, y: .126, z: .016 }, .0055, .023, m.skinShade, .002, 8);
    const x = side * .043;
    p.oval('encaixe suave do olho', { x, y: .145, z: .075 }, .0195, .0100, m.skinShade, .003);
    p.oval('olho em amêndoa', { x, y: .145, z: .078 }, .0167, .0067, m.eyeWhite, .003);
    p.oval('íris adulta', { x, y: .145, z: .0823 }, .0074, .0064, m.iris, .0010, 12);
    p.oval('pupila', { x, y: .145, z: .0840 }, .0035, .0041, m.pupil, .0004, 10);
    p.oval('reflexo discreto no olho', { x: x - .0016, y: .1468, z: .0848 }, .0009, .0011, m.eyeWhite, .0002, 6);
    p.polygon('pálpebra superior', [
      { x: x - .019, y: .145, z: .077 }, { x: x - .010, y: .153, z: .079 },
      { x: x + .009, y: .153, z: .079 }, { x: x + .019, y: .146, z: .076 },
      { x: x + .012, y: .156, z: .077 }, { x: x - .011, y: .156, z: .077 },
    ], m.skinShade);
    p.polygon('linha fina de cílios superiores', [
      { x: x - .016, y: .1465, z: .0825 }, { x: x - .007, y: .1512, z: .083 },
      { x: x + .008, y: .151, z: .083 }, { x: x + .016, y: .1465, z: .082 },
      { x: x + .007, y: .1497, z: .0832 }, { x: x - .007, y: .1499, z: .0832 },
    ], m.pupil);
    p.polygon('sobrancelha com arco discreto', [
      { x: x - .021, y: .176, z: .074 }, { x: x - .005, y: .183, z: .082 },
      { x: x + .015, y: .180, z: .077 }, { x: x + .021, y: .176, z: .073 },
      { x: x + .013, y: .175, z: .078 }, { x: x - .006, y: .178, z: .084 },
      { x: x - .021, y: .173, z: .075 },
    ], m.hair);
    p.polygon('dobra sutil abaixo do olho', [
      { x: x - .017, y: .132, z: .077 }, { x: x + .013, y: .132, z: .076 },
      { x: x + .014, y: .1308, z: .076 }, { x: x - .015, y: .1305, z: .077 },
    ], m.skinShade);
  }
  // A closed anatomical nose, including bridge, tip, alae and underside.
  const tip = mother ? .120 : .129;
  p.solid('nariz modelado com ponte ponta e asas', [
    { x: -.010, y: .171, z: .082 }, { x: .010, y: .171, z: .082 },
    { x: -.018, y: .100, z: .095 }, { x: .018, y: .100, z: .095 },
    { x: -.010, y: .115, z: tip }, { x: .010, y: .115, z: tip },
    { x: -.012, y: .094, z: .105 }, { x: .012, y: .094, z: .105 },
    { x: 0, y: .092, z: .112 },
  ], [[0, 1, 5, 4], [0, 4, 6, 2], [1, 3, 7, 5], [4, 5, 8], [4, 8, 6],
    [5, 7, 8], [6, 8, 7], [2, 6, 7, 3], [0, 2, 3, 1]], m.skin);
  for (const side of [-1, 1]) p.oval('narina pequena', { x: side * .0115, y: .098, z: .108 }, .0044, .0019, m.skinShade, .0005, 8);
  p.polygon('lábio superior calmo', [
    { x: -.030, y: .054, z: .073 }, { x: -.011, y: .057, z: .082 }, { x: 0, y: .0555, z: .084 },
    { x: .011, y: .057, z: .082 }, { x: .030, y: .054, z: .073 }, { x: 0, y: .0515, z: .085 },
  ], m.upperLip);
  p.polygon('lábio inferior', [
    { x: -.029, y: .053, z: .074 }, { x: 0, y: .0513, z: .085 }, { x: .029, y: .053, z: .074 },
    { x: .012, y: .0466, z: .082 }, { x: -.012, y: .0466, z: .082 },
  ], m.lowerLip);
  if (!mother) p.polygon('bigode aparado com divisão central', [
    { x: -.034, y: .070, z: .079 }, { x: -.027, y: .082, z: .088 }, { x: -.009, y: .085, z: .095 },
    { x: 0, y: .079, z: .098 }, { x: .010, y: .085, z: .095 }, { x: .028, y: .080, z: .088 },
    { x: .034, y: .069, z: .079 }, { x: .017, y: .068, z: .090 }, { x: 0, y: .071, z: .096 },
    { x: -.017, y: .068, z: .090 },
  ], m.hair);
  hair(p, mother, m);
  return { node, meshes: p.build() };
}

function body(parent: TransformNode, mother: boolean, m: ParentMaterials): Mesh[] {
  const p = new ParentPart(parent);
  if (mother) {
    for (const side of [-1, 1]) {
      p.loft('perna abaixo da saia', [
        { x: side * .095, y: .077, width: .025, front: .034, back: .034 },
        { x: side * .095, y: .17, width: .031, front: .036, back: .036 },
        { x: side * .095, y: .32, width: .040, front: .044, back: .043 },
        { x: side * .095, y: .38, width: .041, front: .046, back: .042 },
      ], m.skin, 10);
      shoe(p, side * .095, side > 0 ? .014 : -.006, m, true);
    }
    p.loft('saia com quadril pregas e barra', [
      { y: .32, width: .237, front: .15, back: .15, pleat: .035 },
      { y: .43, width: .242, front: .157, back: .155, pleat: .025 },
      { y: .65, width: .218, front: .146, back: .15, pleat: .025 },
      { y: .87, width: .185, front: .125, back: .132, pleat: .01 },
      { y: 1.005, width: .159, front: .112, back: .113 },
    ], m.skirt, 20);
    p.loft('blusa com cintura busto e ombros', [
      { y: .985, width: .163, front: .114, back: .116 },
      { y: 1.055, width: .165, front: .12, back: .115 },
      { y: 1.16, width: .18, front: .132, back: .11, z: .014 },
      { y: 1.265, width: .194, front: .115, back: .10, z: .024 },
      { y: 1.315, width: .171, front: .087, back: .09, z: .017 },
    ], m.floral, 16);
  } else {
    for (const side of [-1, 1]) {
      p.tube('perna da calça sentada com joelho', [
        { x: side * .105, y: .55, z: -.035, width: .094, depth: .091 },
        { x: side * .135, y: .505, z: .20, width: .083, depth: .078 },
        { x: side * .14, y: .47, z: .36, width: .071, depth: .067 },
        { x: side * .14, y: .29, z: .39, width: .059, depth: .057 },
        { x: side * .14, y: .095, z: .405, width: .043, depth: .044 },
      ], m.trousers, 12);
      shoe(p, side * .14, .41, m, false);
    }
    p.loft('quadril da calça e cintura sentada', [
      { y: .46, width: .17, front: .13, back: .13 },
      { y: .56, width: .178, front: .143, back: .127 },
      { y: .70, width: .164, front: .12, back: .113 },
      { y: .725, width: .164, front: .12, back: .113 },
    ], m.trousers, 12);
    p.loft('camisa com tórax e ombros adultos', [
      { y: .684, width: .171, front: .126, back: .123 },
      { y: .78, width: .178, front: .137, back: .129 },
      { y: .93, width: .200, front: .143, back: .123, z: .008 },
      { y: 1.075, width: .218, front: .125, back: .116, z: .010 },
      { y: 1.15, width: .195, front: .088, back: .101 },
    ], m.shirt, 16);
  }
  const neckY = mother ? 1.30 : 1.14, neckTop = mother ? 1.418 : 1.223;
  p.loft('pescoço com base e tendões', [
    { y: neckY, width: .059, front: .052, back: .050, z: .004 },
    { y: neckY + .05, width: .047, front: .047, back: .046, z: .009 },
    { y: neckTop, width: .049, front: .047, back: .047, z: .012 },
  ], m.skin, 12);
  const top = mother ? 1.312 : 1.145;
  for (const side of [-1, 1]) p.polygon('gola dobrada da camisa', [
    { x: side * .048, y: top + .013, z: .051 },
    { x: side * .112, y: top - .024, z: .092 },
    { x: side * .065, y: top - .119, z: .136 },
    { x: side * .010, y: top - .058, z: .116 },
  ], m.collar);
  p.polygon('prega frontal de botões', [
    { x: -.007, y: top - .068, z: mother ? .144 : .145 }, { x: .007, y: top - .068, z: mother ? .144 : .145 },
    { x: .007, y: mother ? 1.015 : .71, z: .133 }, { x: -.007, y: mother ? 1.015 : .71, z: .133 },
  ], m.collar);
  for (let i = 0; i < (mother ? 4 : 6); i++) {
    const y = top - .105 - i * (mother ? .056 : .064);
    p.oval('botão da camisa', { x: .002, y, z: mother ? .146 : .148 }, .0035, .0035, m.seam, .001, 8);
  }
  if (!mother) p.polygon('bolso costurado no peito', [
    { x: -.095, y: 1.025, z: .131 }, { x: -.175, y: 1.025, z: .101 },
    { x: -.17, y: .937, z: .118 }, { x: -.135, y: .922, z: .139 }, { x: -.097, y: .938, z: .145 },
  ], m.collar);
  return p.build();
}

/** Human low-poly parents for the established kitchen. Their assembled bodies
 * stay physically anchored; only small posture/head/arm reactions are animated.
 * Speech remains entirely in the existing text dialogue system. */
export function createParents(scene: Scene, parent: TransformNode) {
  const m = parentMaterials(scene), actors: Actor[] = [], meshes: Mesh[] = [];
  for (const [key, mother] of [['mother', true], ['father', false]] as const) {
    const anchor = PARENT_ANCHORS[key], root = new TransformNode(mother ? 'MÃE · personagem humano' : 'PAI · personagem humano', scene);
    root.parent = parent; root.position.set(anchor.position.x, anchor.position.y, anchor.position.z); root.rotation.y = anchor.yaw;
    const posture = new TransformNode((mother ? 'mãe' : 'pai') + ' · postura', scene); posture.parent = root;
    const torsoMeshes = body(posture, mother, m), face = head(posture, mother, m);
    const left = arm(posture, mother, -1, m), right = arm(posture, mother, 1, m);
    const actorMeshes = [...torsoMeshes, ...face.meshes, ...left.meshes, ...right.meshes];
    for (const mesh of actorMeshes) mesh.metadata = { ...mesh.metadata, role: key, anatomicalModel: true };
    actors.push({ root, posture, head: face.node, arms: [left.node, right.node], meshes: actorMeshes, speaker: mother ? 'MÃE' : 'PAI', phase: mother ? .7 : 2.2, lookYaw: 0, lookPitch: 0 });
    meshes.push(...actorMeshes);
  }
  const target: InteractionTarget = { id: 'parents', meshes, label: () => 'Conversar com seus pais', execute: () => undefined };
  const tiny = new Set([m.eyeWhite, m.iris, m.pupil, m.upperLip, m.lowerLip, m.skinLight, m.seam, m.steel]);
  const shadowCasters = meshes.filter(mesh => !tiny.has(mesh.material as typeof m.skin));
  let disposed = false, lastTime = 0;
  return {
    meshes, shadowCasters, target,
    animate(time: number, speaker?: string, observer?: V3) {
      if (disposed || !Number.isFinite(time)) return;
      const dt = Math.max(0, Math.min(.1, time - lastTime)); lastTime = time;
      const smoothing = 1 - Math.exp(-4 * dt);
      for (const actor of actors) {
        const talking = speaker === actor.speaker, t = time + actor.phase;
        let targetYaw = 0, targetPitch = 0;
        if (observer && [observer.x, observer.y, observer.z].every(Number.isFinite)) {
          const dx = observer.x - actor.root.position.x, dz = observer.z - actor.root.position.z;
          const distance = Math.hypot(dx, dz);
          if (distance < 4 && distance > .15) {
            const delta = Math.atan2(dx, dz) - actor.root.rotation.y;
            targetYaw = Math.max(-.68, Math.min(.68, Math.atan2(Math.sin(delta), Math.cos(delta))));
            const eyeY = actor.head.position.y + .145;
            targetPitch = Math.max(-.18, Math.min(.14, -Math.atan2(observer.y - eyeY, distance)));
          }
        }
        actor.lookYaw += (targetYaw - actor.lookYaw) * smoothing;
        actor.lookPitch += (targetPitch - actor.lookPitch) * smoothing;
        actor.posture.rotation.z = Math.sin(t * .55) * .0025;
        actor.posture.rotation.x = Math.sin(t * .43) * .0018;
        actor.head.rotation.y = actor.lookYaw + Math.sin(t * .39) * .018 + (speaker && !talking ? actor.speaker === 'MÃE' ? -.035 : .035 : 0);
        actor.head.rotation.x = actor.lookPitch + Math.sin(t * (talking ? 1.9 : .64)) * (talking ? .017 : .006);
        actor.head.rotation.z = Math.sin(t * .49) * .008;
        for (let i = 0; i < actor.arms.length; i++) {
          const sign = i === 0 ? -1 : 1, gesture = talking ? Math.sin(t * 1.5 + i * .7) * .010 : Math.sin(t * .7 + i) * .003;
          actor.arms[i].rotation.z = sign * gesture;
          actor.arms[i].rotation.x = talking ? Math.sin(t * 1.2 + i) * .006 : 0;
        }
      }
    },
    get diagnostics() {
      return actors.map(actor => ({ speaker: actor.speaker, meshes: actor.meshes.length,
        vertices: actor.meshes.reduce((n, mesh) => n + mesh.getTotalVertices(), 0),
        triangles: actor.meshes.reduce((n, mesh) => n + mesh.getTotalIndices() / 3, 0),
        position: { x: actor.root.position.x, y: actor.root.position.y, z: actor.root.position.z },
        yaw: actor.root.rotation.y }));
    },
    dispose() { if (disposed) return; disposed = true; for (const actor of actors) actor.root.dispose(false, false); m.dispose(); },
  };
}
