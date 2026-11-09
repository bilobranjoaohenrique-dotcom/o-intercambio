import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { InteractionTarget } from '../game/types';
import { PARENT_ANCHORS } from '../game/kitchenLayout';
import { ParentPart, type V3, type BodyRing } from './parentsGeometry';
import { parentMaterials, type ParentMaterials } from './parentsMaterials';
import { createCarParentPose } from './parentsCarPose';
import { createAirportParentPose } from './parentAirportPose';
import { CAR_PARENT_ANCHORS, type ParentsLocation } from '../game/parentsDeparture';
import { AIRPORT_PARENTS } from '../game/airportLayout';
import { loadImportedFather } from './importedFather';
type ImportedFather = Awaited<ReturnType<typeof loadImportedFather>>;

type Actor = {
  root: TransformNode; posture: TransformNode; head: TransformNode;
  arms: TransformNode[]; meshes: Mesh[]; speaker: string; phase: number; lookYaw: number; lookPitch: number;
  jaw: TransformNode; mouth: TransformNode; brows: TransformNode[]; corners: TransformNode[];
  pot?: TransformNode; stream?: TransformNode; mouthOpen: number; smile: number; gesture: number; serving: number;
  speaking: boolean; expression: 'neutral' | 'attention' | 'warm' | 'concern';
  kitchenPose: TransformNode; carPose: TransformNode; airportPose: TransformNode;
  kitchenArms: TransformNode[]; carArms: TransformNode[]; airportArms: TransformNode[];
  kitchenHeadY: number; carHeadY: number; airportHeadY: number; blinkLids: TransformNode[]; blink: number;
  disposeAirport(): void;
  importedModel?: ImportedFather; importError?: string;
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
  if (mother) {
    part.loft('pé visível na sandália', [
      { x, y: .035, z: z + .025, width: width * .96, front: .117, back: .078 },
      { x, y: .061, z: z + .012, width: width * .86, front: .105, back: .066 },
      { x, y: .086, z, width: ankle, front: .040, back: .046 },
    ], m.skin, 12);
    for (const zz of [z + .045, z + .087]) part.tube('tira de couro da sandália', [
      { x: x - width * .95, y: .043, z: zz, width: .008, depth: .008 },
      { x: x - width * .35, y: .076, z: zz - .005, width: .008, depth: .008 },
      { x: x + width * .35, y: .076, z: zz - .005, width: .008, depth: .008 },
      { x: x + width * .95, y: .043, z: zz, width: .008, depth: .008 },
    ], m.leather, 6);
    return;
  }
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

function arm(parent: TransformNode, mother: boolean, side: number, m: ParentMaterials) {
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
  const meshes = part.build();
  let pot: TransformNode | undefined, stream: TransformNode | undefined;
  if (mother && side < 0) {
    // The handle meets the existing left palm. The pot rises with the forearm
    // and tips toward the cup positioned on the table by the kitchen layout.
    pot = new TransformNode('mãe · bule de café na mão', parent.getScene());
    pot.parent = node; pot.position.set(w.x - .06, w.y, w.z + .10);
    const jug = new ParentPart(pot);
    jug.loft('bule de alumínio com base e bojo', [
      { y: -.035, width: .032, front: .032 }, { y: -.025, width: .050, front: .050 },
      { y: .045, width: .052, front: .052 }, { y: .068, width: .034, front: .034 },
      { y: .075, width: .035, front: .035 },
    ], m.steel, 12);
    jug.loft('tampa do bule', [{ y: .075, width: .039, front: .039 }, { y: .084, width: .028, front: .028 }], m.steel, 12);
    jug.loft('puxador da tampa', [{ y: .083, width: .012, front: .012 }, { y: .098, width: .009, front: .009 }], m.sole, 8);
    jug.tube('alça vazada segurada pela mãe', [
      { x: .04, y: .055, z: 0, width: .009 }, { x: .083, y: .045, z: 0, width: .009 },
      { x: .088, y: -.005, z: 0, width: .009 }, { x: .045, y: -.025, z: 0, width: .009 },
    ], m.sole, 7);
    jug.tube('bico do bule', [
      { x: 0, y: .02, z: .04, width: .017 }, { x: 0, y: .05, z: .081, width: .012 },
      { x: 0, y: .078, z: .105, width: .008 },
    ], m.steel, 9);
    meshes.push(...jug.build());
    stream = new TransformNode('mãe · fio de café sobre a xícara', parent.getScene());
    stream.parent = pot; stream.position.set(0, .078, .105);
    const coffee = new ParentPart(stream);
    coffee.tube('fio fino de café', [{ x: 0, y: 0, z: 0, width: .0025 }, { x: 0, y: -.13, z: 0, width: .002 }], m.coffee, 6);
    const streamMeshes = coffee.build(); stream.setEnabled(false);
    meshes.push(...streamMeshes);
  }
  return { node, meshes, pot, stream };
}

function hair(part: ParentPart, mother: boolean, m: ParentMaterials) {
  const hairMaterial = mother ? m.hair : m.fatherHair;
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], sides = 20, rows = 6;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * Math.PI * 2, front = Math.cos(a);
      const blend = Math.max(0, Math.min(1, (front + .12) / .65));
      const smooth = blend * blend * (3 - 2 * blend);
      const frontHairline = mother ? .232 + Math.sin(a * 2 + .35) * .009 : .225 + Math.abs(Math.sin(a)) * .025;
      const backHairline = mother ? -.055 + Math.min(front, 0) * .015 : .121 + Math.min(front, 0) * .031;
      const bottom = backHairline + (frontHairline - backHairline) * smooth;
      // The lower rear hairline makes these rows cross the wider part of the
      // cranium. Keep the shell outside it when viewed from the rear bench.
      const radius = [1, 1.035, 1.04, .99, .98, mother ? .92 : .82, .10][row];
      const curl = mother ? Math.sin(a * 11 + t * 3.2) * .0042 * (1 - t * .5) : Math.sin(a * 3 + t) * .0015;
      const width = (mother ? .113 : .109) * radius + curl;
      const depth = (front > 0 ? .091 : mother ? .118 : .109) * radius + curl + (mother && front < 0 ? .012 * (1 - t) : 0);
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
  part.geometry(mother ? 'cabelo ondulado com silhueta e nuca' : 'cabelo curto penteado com entradas', positions, indices, hairMaterial, uvs);
  if (mother) {
    for (const side of [-1, 1]) for (let j = 0; j < 7; j++) {
      const y = -.045 + j * .038, shoulderTip = Math.max(0, Math.min(1, -y / .045));
      part.tube('mecha curva na lateral', [
        { x: side * (.106 + shoulderTip * .015), y: y + .03, z: .039 + shoulderTip * .030, width: .013, depth: .008 },
        { x: side * (.122 + shoulderTip * .025), y: y + .018, z: .050 + shoulderTip * .045, width: .012, depth: .009 },
        { x: side * (.118 + shoulderTip * .043), y: y - .002, z: .052 + shoulderTip * .060, width: .011, depth: .009 },
        { x: side * (.106 + shoulderTip * .064), y: y - .010, z: .040 + shoulderTip * .085, width: .006, depth: .006 },
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
    for (const side of [-1, 1]) for (let j = 0; j < 5; j++) part.tube('fio grisalho visível na têmpora', [
      { x: side * (.099 + j * .0016), y: .225 - j * .006, z: .037 - j * .009, width: .0012, depth: .0012 },
      { x: side * (.111 + j * .0005), y: .182 - j * .003, z: .024 - j * .007, width: .0010, depth: .0010 },
      { x: side * .108, y: .156 - j * .001, z: .016 - j * .006, width: .0007, depth: .0007 },
    ], m.hairGrey, 5);
  }
}

function head(parent: TransformNode, mother: boolean, m: ParentMaterials) {
  const node = new TransformNode((mother ? 'mãe' : 'pai') + ' · cabeça e expressão', parent.getScene());
  node.parent = parent; node.position.set(0, mother ? 1.372 : 1.183, mother ? .018 : .014);
  const p = new ParentPart(node);
  const shape: BodyRing[] = [
    { y: 0, width: mother ? .045 : .052, front: .059, back: .052, z: .003 },
    { y: .026, width: mother ? .074 : .082, front: .074, back: .068, z: .002, flatten: .8 },
    { y: .066, width: mother ? .089 : .096, front: .080, back: .084, flatten: .65 },
    { y: .116, width: mother ? .097 : .102, front: .084, back: .096, flatten: .55 },
    { y: .170, width: .098, front: .083, back: .103, flatten: .6 },
    { y: .214, width: .092, front: .076, back: .100, flatten: .75 },
    { y: .250, width: .077, front: .060, back: .080 },
    { y: .274, width: .034, front: .030, back: .038 },
    { y: .279, width: .003, front: .004, back: .004 },
  ];
  const faceMaterial = mother ? m.motherFace : m.fatherFace;
  p.loft('rosto com maçãs têmporas e crânio', shape.slice(2), faceMaterial, 20, .5,
    { min: 0, max: .279 }, { bottom: false, top: true });
  // Split the existing anatomical chin at its own hinge. Its original atlas
  // coordinates remain continuous with the cranium, including at closed rest.
  const jaw = new TransformNode((mother ? 'mãe' : 'pai') + ' · mandíbula articulada', parent.getScene());
  jaw.parent = node; jaw.position.set(0, .066, -.015);
  const lower = new ParentPart(jaw);
  lower.loft('queixo e mandíbula móveis', shape.slice(0, 3).map(r => ({ ...r, y: r.y - .066, z: (r.z ?? 0) + .015 })),
    faceMaterial, 20, .5, { min: -.066, max: .213 }, { bottom: true, top: false });
  lower.polygon('lábio inferior móvel', [
    { x: -.029, y: -.013, z: .089 }, { x: 0, y: -.0147, z: .100 }, { x: .029, y: -.013, z: .089 },
    { x: .012, y: -.0194, z: .097 }, { x: -.012, y: -.0194, z: .097 },
  ], m.lowerLip);
  const mouth = new TransformNode((mother ? 'mãe' : 'pai') + ' · abertura da boca', parent.getScene());
  mouth.parent = node; mouth.position.set(0, .0515, .087);
  const interior = new ParentPart(mouth);
  interior.oval('cavidade da boca', { x: 0, y: 0, z: 0 }, .0235, .007, m.mouthInside, .0005, 12);
  mouth.scaling.y = .025;
  const brows: TransformNode[] = [], corners: TransformNode[] = [], blinkLids: TransformNode[] = [], facialMeshes: Mesh[] = [];
  // Keep the adult eye dimensions. Advance the complete assembly out of the
  // cheek plane so the skin does not hide the inner sclera at rendered angles.
  const eyeForward = .004;
  const ocular = (point: V3): V3 => ({ ...point, z: point.z + eyeForward });
  for (const side of [-1, 1]) {
    p.loft('orelha com lóbulo', [
      { y: .074, x: side * .103, z: -.003, width: .006, front: .012, back: .009 },
      { y: .09, x: side * .109, z: -.005, width: .012, front: .021, back: .013 },
      { y: .136, x: side * .110, z: -.006, width: .013, front: .024, back: .014 },
      { y: .167, x: side * .104, z: -.007, width: .008, front: .016, back: .01 },
      { y: .174, x: side * .102, z: -.007, width: .002, front: .005, back: .004 },
    ], m.skin, 10);
    p.oval('concha da orelha', { x: side * .110, y: .126, z: .016 }, .0055, .023, m.skinShade, .002, 8);
    if (mother) p.oval('brinco pequeno de uso diário', { x: side * .109, y: .077, z: .022 }, .0036, .0051, m.steel, .0018, 10);
    const x = side * .043;
    p.oval('encaixe suave do olho', ocular({ x, y: .145, z: .075 }), .0195, .0100, m.skinShade, .003);
    p.oval('olho em amêndoa', ocular({ x, y: .145, z: .078 }), .0167, .0067, m.eyeWhite, .003);
    p.oval('íris adulta', ocular({ x, y: .145, z: .0823 }), .0074, .0064, m.iris, .0010, 12);
    p.oval('pupila', ocular({ x, y: .145, z: .0840 }), .0035, .0041, m.pupil, .0004, 10);
    p.oval('reflexo discreto no olho', ocular({ x: x - .0016, y: .1468, z: .0848 }), .0009, .0011, m.eyeWhite, .0002, 6);
    const lid = new TransformNode((mother ? 'mãe' : 'pai') + ' · piscar ' + side, parent.getScene());
    lid.parent = node; lid.position.set(x, .145, .086 + eyeForward); lid.scaling.y = .001; lid.setEnabled(false); blinkLids.push(lid);
    const eyelid = new ParentPart(lid);
    eyelid.oval('pálpebras fechando suavemente', { x: 0, y: 0, z: 0 }, .0186, .0092, m.skin, .001, 12);
    facialMeshes.push(...eyelid.build());
    p.polygon('pálpebra superior', [
      { x: x - .019, y: .145, z: .077 }, { x: x - .010, y: .153, z: .079 },
      { x: x + .009, y: .153, z: .079 }, { x: x + .019, y: .146, z: .076 },
      { x: x + .012, y: .156, z: .077 }, { x: x - .011, y: .156, z: .077 },
    ].map(ocular), m.skinShade);
    p.polygon('linha fina de cílios superiores', [
      { x: x - .016, y: .1465, z: .0825 }, { x: x - .007, y: .1512, z: .083 },
      { x: x + .008, y: .151, z: .083 }, { x: x + .016, y: .1465, z: .082 },
      { x: x + .007, y: .1497, z: .0832 }, { x: x - .007, y: .1499, z: .0832 },
    ].map(ocular), m.pupil);
    const brow = new TransformNode((mother ? 'mãe' : 'pai') + ' · sobrancelha ' + side, parent.getScene());
    brow.parent = node; brow.position.set(x, .176, .074); brows.push(brow);
    const eyebrow = new ParentPart(brow);
    eyebrow.polygon('sobrancelha expressiva com arco discreto', [
      { x: x - .021, y: .176, z: .074 }, { x: x - .005, y: .183, z: .082 },
      { x: x + .015, y: .180, z: .077 }, { x: x + .021, y: .176, z: .073 },
      { x: x + .013, y: .175, z: .078 }, { x: x - .006, y: .178, z: .084 },
      { x: x - .021, y: .173, z: .075 },
    ].map(point => ({ x: point.x - x, y: point.y - .176, z: point.z - .074 })), m.hair);
    facialMeshes.push(...eyebrow.build());
    p.polygon('dobra sutil abaixo do olho', [
      { x: x - .017, y: .132, z: .077 }, { x: x + .013, y: .132, z: .076 },
      { x: x + .014, y: .1308, z: .076 }, { x: x - .015, y: .1305, z: .077 },
    ].map(ocular), m.skinShade);
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
  for (const side of [-1, 1]) {
    const corner = new TransformNode((mother ? 'mãe' : 'pai') + ' · canto do sorriso ' + side, parent.getScene());
    corner.parent = node; corner.position.set(side * .0265, .053, .0755); corners.push(corner);
    const lip = new ParentPart(corner);
    lip.oval('canto discreto do sorriso', { x: 0, y: 0, z: 0 }, .0035, .0016, m.upperLip, .0003, 8);
    facialMeshes.push(...lip.build());
  }
  if (!mother) p.polygon('bigode aparado com divisão central', [
    { x: -.034, y: .070, z: .079 }, { x: -.027, y: .082, z: .088 }, { x: -.009, y: .085, z: .095 },
    { x: 0, y: .079, z: .098 }, { x: .010, y: .085, z: .095 }, { x: .028, y: .080, z: .088 },
    { x: .034, y: .069, z: .079 }, { x: .017, y: .068, z: .090 }, { x: 0, y: .071, z: .096 },
    { x: -.017, y: .068, z: .090 },
  ], m.hair);
  hair(p, mother, m);
  return { node, jaw, mouth, brows, corners, blinkLids, meshes: [...p.build(), ...lower.build(), ...interior.build(), ...facialMeshes] };
}

function body(parent: TransformNode, mother: boolean, m: ParentMaterials): Mesh[] {
  const p = new ParentPart(parent);
  if (mother) {
    for (const side of [-1, 1]) {
      p.loft('perna de calça marrom com joelho e barra', [
        { x: side * .095, y: .093, width: .042, front: .049, back: .046 },
        { x: side * .095, y: .28, width: .050, front: .060, back: .054 },
        { x: side * .095, y: .52, width: .058, front: .069, back: .065 },
        { x: side * .095, y: .76, width: .078, front: .084, back: .085 },
        { x: side * .095, y: .94, width: .089, front: .096, back: .090 },
      ], m.skirt, 12);
      shoe(p, side * .095, side > 0 ? .014 : -.006, m, true);
    }
    p.loft('quadril e cós da calça marrom', [
      { y: .86, width: .184, front: .119, back: .126 },
      { y: .94, width: .178, front: .119, back: .123 },
      { y: 1.005, width: .159, front: .112, back: .113 },
    ], m.skirt, 20);
    p.loft('blusa com cintura busto e ombros', [
      { y: .985, width: .163, front: .114, back: .116 },
      { y: 1.055, width: .165, front: .12, back: .115 },
      { y: 1.16, width: .18, front: .132, back: .11, z: .014 },
      { y: 1.265, width: .194, front: .115, back: .10, z: .024 },
      { y: 1.315, width: .171, front: .087, back: .09, z: .017 },
    ], m.floral, 16);
    const apronRows = [{ y: 1.026, width: .15, front: .126 }, { y: .87, width: .175, front: .139 },
      { y: .65, width: .20, front: .151 }, { y: .405, width: .216, front: .164 }];
    const cloth: number[] = [], clothUV: number[] = [], clothIndices: number[] = [];
    for (const [row, band] of apronRows.entries()) for (let i = 0; i <= 8; i++) {
      const u = i / 4 - 1;
      cloth.push(band.width * u, band.y, band.front * Math.sqrt(1 - (u * .85) ** 2) + .008);
      clothUV.push(i / 8, 1 - row / 3);
    }
    for (let row = 0; row < 3; row++) for (let i = 0; i < 8; i++) {
      const a = row * 9 + i; clothIndices.push(a, a + 1, a + 9, a + 1, a + 10, a + 9);
    }
    p.geometry('avental claro de tecido curvo e barra bordada', cloth, clothIndices, m.apron, clothUV);
    // Follow the existing blouse's elliptical rings. A flat bib cut through
    // the centre of the chest; this cloth stays 6mm in front of that surface.
    const bibBands = [
      { y: 1.255, width: .115, bodyWidth: .19267, front: .11662, z: .02305 },
      { y: 1.16, width: .13, bodyWidth: .18, front: .132, z: .014 },
      { y: 1.025, width: .15, bodyWidth: .16414, front: .11743, z: 0 },
    ];
    const bib: number[] = [], bibUV: number[] = [], bibIndices: number[] = [];
    for (const [row, band] of bibBands.entries()) for (let i = 0; i <= 8; i++) {
      const x = band.width * (i / 4 - 1);
      bib.push(x, band.y, band.z + band.front * Math.sqrt(1 - (x / band.bodyWidth) ** 2) + .006);
      bibUV.push(i / 8, 1 - row / 2);
    }
    for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) {
      const a = row * 9 + i; bibIndices.push(a, a + 1, a + 9, a + 1, a + 10, a + 9);
    }
    p.geometry('peitilho curvo do avental sobre a blusa', bib, bibIndices, m.apron, bibUV);
    for (const side of [-1, 1]) p.polygon('alça do avental sobre o ombro', [
      { x: side * .085, y: 1.318, z: .087 }, { x: side * .112, y: 1.318, z: .087 },
      { x: side * .111, y: 1.20, z: .14 }, { x: side * .085, y: 1.20, z: .14 },
    ], m.apron);
    p.loft('faixa do avental amarrada à cintura', [
      { y: .998, width: .169, front: .122, back: .123 },
      { y: 1.025, width: .169, front: .122, back: .123 },
    ], m.apron, 16);
    p.polygon('bolso aplicado no avental', [
      { x: -.068, y: .76, z: .171 }, { x: .068, y: .76, z: .171 },
      { x: .059, y: .64, z: .172 }, { x: -.059, y: .64, z: .172 },
    ], m.apron);
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
    p.loft('cinto simples na cintura', [{ y: .69, width: .173, front: .130, back: .128 },
      { y: .718, width: .173, front: .130, back: .128 }], m.sole, 16);
    p.polygon('fivela discreta do cinto', [{ x: -.026, y: .691, z: .132 }, { x: .026, y: .691, z: .132 },
      { x: .026, y: .718, z: .132 }, { x: -.026, y: .718, z: .132 }], m.steel);
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
    { x: .007, y: mother ? 1.015 : .915, z: .133 }, { x: -.007, y: mother ? 1.015 : .915, z: .133 },
  ], m.collar);
  for (let i = 0; i < (mother ? 4 : 3); i++) {
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
  let location: ParentsLocation = 'kitchen', farewellAmount = 0;
  let disposed = false, lastTime = 0;
  let fatherReady: Promise<void> = Promise.resolve();
  for (const [key, mother] of [['mother', true], ['father', false]] as const) {
    const anchor = PARENT_ANCHORS[key], root = new TransformNode(mother ? 'MÃE · personagem humano' : 'PAI · personagem humano', scene);
    root.parent = parent; root.position.set(anchor.position.x, anchor.position.y, anchor.position.z); root.rotation.y = anchor.yaw;
    const posture = new TransformNode((mother ? 'mãe' : 'pai') + ' · postura', scene); posture.parent = root;
    if (!mother) {
      // Keep the established actor root and quest anchors, replacing only its
      // renderer. No procedural father body is built beside the imported GLB.
      const control = (name: string) => { const node = new TransformNode('pai · ' + name, scene); node.parent = posture; return node; };
      const actor: Actor = { root, posture, head: control('controle de cabeça'), jaw: control('controle de fala'), mouth: control('controle de boca'),
        arms: [], meshes: [], speaker: 'PAI', phase: 2.2, lookYaw: 0, lookPitch: 0,
        brows: [], corners: [], kitchenPose: control('controle de cozinha'), carPose: control('controle do carro'), airportPose: control('controle do aeroporto'),
        kitchenArms: [], carArms: [], airportArms: [], kitchenHeadY: 1.183, carHeadY: 1.043, airportHeadY: 1.478,
        mouthOpen: 0, smile: 0, gesture: 0, serving: 0, speaking: false, expression: 'neutral', blinkLids: [], blink: 0, disposeAirport() {} };
      actors.push(actor);
      fatherReady = loadImportedFather(scene, root).then(model => {
        if (disposed) { model.dispose(); return; }
        actor.importedModel = model; actor.head = model.head;
        actor.meshes.push(...model.meshes); meshes.push(...model.meshes); shadowCasters.push(...model.shadowCasters);
        for (const mesh of model.meshes) { mesh.metadata = { ...mesh.metadata, role: 'father', anatomicalModel: true, importedFather: true }; mesh.isPickable = location === 'kitchen'; }
        model.setLocation(location);model.animate(lastTime, false, 0, 0, 0, 0, 0);
      }).catch(error => { actor.importError = String(error?.message ?? error); throw new Error('Não foi possível carregar o modelo do pai: ' + actor.importError); });
      continue;
    }
    const kitchenPose = new TransformNode((mother ? 'mãe' : 'pai') + ' · pose de cozinha', scene); kitchenPose.parent = posture;
    const torsoMeshes = body(kitchenPose, mother, m), face = head(posture, mother, m);
    const left = arm(kitchenPose, mother, -1, m), right = arm(kitchenPose, mother, 1, m);
    const car = createCarParentPose(posture, mother, m); car.node.setEnabled(false);
    const airport = createAirportParentPose(posture, mother, m); airport.node.setEnabled(false);
    const actorMeshes = [...torsoMeshes, ...face.meshes, ...left.meshes, ...right.meshes, ...car.meshes, ...airport.meshes];
    for (const mesh of actorMeshes) mesh.metadata = { ...mesh.metadata, role: key, anatomicalModel: true };
    actors.push({ root, posture, head: face.node, jaw: face.jaw, mouth: face.mouth, brows: face.brows, corners: face.corners,
      arms: [left.node, right.node], pot: left.pot, stream: left.stream, meshes: actorMeshes,
      kitchenPose, carPose: car.node, airportPose: airport.node,
      kitchenArms: [left.node, right.node], carArms: car.arms, airportArms: airport.arms,
      kitchenHeadY: face.node.position.y, carHeadY: car.headY, airportHeadY: airport.headY,
      disposeAirport: airport.dispose, blinkLids: face.blinkLids, blink: 0,
      speaker: mother ? 'MÃE' : 'PAI', phase: mother ? .7 : 2.2, lookYaw: 0, lookPitch: 0,
      mouthOpen: 0, smile: 0, gesture: 0, serving: 0, speaking: false, expression: 'neutral' });
    meshes.push(...actorMeshes);
  }
  const target: InteractionTarget = { id: 'parents', meshes, label: () => 'Conversar com seus pais', execute: () => undefined };
  const tiny = new Set([m.eyeWhite, m.iris, m.pupil, m.upperLip, m.lowerLip, m.mouthInside, m.coffee, m.skinLight, m.seam, m.steel]);
  const shadowCasters = meshes.filter(mesh => !tiny.has(mesh.material as typeof m.skin));
  function setLocation(next: ParentsLocation) {
    if (disposed || next === location) return;
    location = next; farewellAmount = 0;
    for (const actor of actors) {
      const key = actor.speaker === 'MÃE' ? 'mother' : 'father';
      const anchor = next === 'airport' ? AIRPORT_PARENTS[key] : next === 'car' ? CAR_PARENT_ANCHORS[key] : PARENT_ANCHORS[key];
      actor.root.position.set(anchor.position.x, anchor.position.y, anchor.position.z);
      actor.root.rotation.set(0, anchor.yaw, 0);
      if (actor.speaker === 'PAI') {
        actor.importedModel?.setLocation(next);actor.lookYaw = actor.lookPitch = actor.mouthOpen = actor.gesture = 0;
        actor.speaking = false;for (const mesh of actor.meshes) mesh.isPickable = next === 'kitchen';
        continue;
      }
      actor.kitchenPose.setEnabled(next === 'kitchen'); actor.carPose.setEnabled(next === 'car'); actor.airportPose.setEnabled(next === 'airport');
      actor.arms = next === 'airport' ? actor.airportArms : next === 'car' ? actor.carArms : actor.kitchenArms;
      actor.head.position.y = next === 'airport' ? actor.airportHeadY : next === 'car' ? actor.carHeadY : actor.kitchenHeadY;
      actor.posture.rotation.set(0, 0, 0); actor.posture.scaling.setAll(1); actor.head.rotation.set(0, 0, 0);
      actor.lookYaw = actor.lookPitch = actor.mouthOpen = actor.gesture = actor.serving = 0;
      actor.speaking = false; actor.jaw.rotation.x = 0; actor.mouth.scaling.y = .025;
      actor.stream?.setEnabled(false);
      for (const mesh of actor.meshes) mesh.isPickable = next === 'kitchen';
    }
  }
  return {
    meshes, shadowCasters, target, setLocation, ready: fatherReady,
    // The two character roots keep their identities and world transforms when
    // the home set is disabled and the airport set becomes active.
    setParent(next: TransformNode) { if (!disposed) for (const actor of actors) actor.root.setParent(next); },
    farewell(amount: number) { farewellAmount = Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0; },
    get location() { return location; },
    animate(time: number, speaker?: string, observer?: V3, text = '') {
      if (disposed || !Number.isFinite(time)) return;
      const dt = Math.max(0, Math.min(.1, time - lastTime)); lastTime = time;
      const smoothing = 1 - Math.exp(-4 * dt);
      for (const actor of actors) {
        const inCar = location === 'car', inAirport = location === 'airport';
        const talking = !inCar && speaker === actor.speaker, t = time + actor.phase;
        actor.speaking = talking;
        const mother = actor.speaker === 'MÃE';
        const concern = mother && talking && (/viag|cuidado|mala|longe|escola/i.test(text) || inAirport && /saudade|chegar/i.test(text));
        const affection = talking && /filh|am[oa]|orgulh|saudad|bom dia|querid|café/i.test(text);
        actor.expression = concern ? 'concern' : affection ? 'warm' : speaker ? 'attention' : 'neutral';
        const desiredSmile = inCar ? .20 : affection && !concern ? .75 : speaker ? .22 : inAirport ? .24 : .08;
        actor.smile += (desiredSmile - actor.smile) * smoothing;
        // A bounded, irregular syllable rhythm follows only the active text
        // speaker. Closing is immediate on a hand-off, with no shared lip sync.
        actor.mouthOpen = talking ? Math.max(0, Math.sin(t * 12.4) * .50 + Math.sin(t * 19.1 + .6) * .24 + .17) : 0;
        actor.jaw.rotation.x = actor.mouthOpen * .105;
        actor.mouth.scaling.y = .025 + actor.mouthOpen * .82;
        actor.mouth.position.y = .0515 - actor.mouthOpen * .0028;
        actor.gesture += ((talking ? .5 + Math.sin(t * .73) * .28 + Math.sin(t * .31) * .15 : 0) - actor.gesture) * smoothing;
        const cycle = ((time % 14) + 14) % 14;
        const ease = (v: number) => { const a = Math.max(0, Math.min(1, v)); return a * a * (3 - 2 * a); };
        const pour = location !== 'kitchen' || !mother || talking ? 0 : cycle < 3.5 ? ease((cycle - 2) / 1.5) : cycle < 5.2 ? 1 : 1 - ease((cycle - 5.2) / 1.5);
        actor.serving += (pour - actor.serving) * smoothing;
        let targetYaw = 0, targetPitch = 0;
        if ((!inCar || mother && Math.sin(t * .27) > -.15) && observer && [observer.x, observer.y, observer.z].every(Number.isFinite)) {
          const dx = observer.x - actor.root.position.x, dz = observer.z - actor.root.position.z;
          const distance = Math.hypot(dx, dz);
          if (distance < 4 && distance > .15) {
            const delta = Math.atan2(dx, dz) - actor.root.rotation.y;
            const limit = inCar ? (mother ? 1.0 : .35) : .68;
            targetYaw = Math.max(-limit, Math.min(limit, Math.atan2(Math.sin(delta), Math.cos(delta))));
            const eyeY = (actor.importedModel ? actor.head.getAbsolutePosition().y : actor.head.position.y) + .145;
            targetPitch = Math.max(-.18, Math.min(.14, -Math.atan2(observer.y - eyeY, distance)));
          }
        }
        actor.lookYaw += (targetYaw - actor.lookYaw) * smoothing;
        actor.lookPitch += (targetPitch - actor.lookPitch) * smoothing;
        actor.posture.scaling.y = 1 + Math.sin(t * .89) * .0014;
        actor.posture.rotation.z = Math.sin(t * .55) * .0025 + (inAirport ? mother ? -.018 : .006 : 0);
        actor.posture.rotation.x = Math.sin(t * .43) * .0018 - (inAirport ? farewellAmount * .025 : 0);
        if (inAirport) {
          const anchor = AIRPORT_PARENTS[mother ? 'mother' : 'father'];
          const approach = farewellAmount * (mother ? .14 : .015);
          actor.root.position.set(anchor.position.x + Math.sin(anchor.yaw) * approach, anchor.position.y,
            anchor.position.z + Math.cos(anchor.yaw) * approach);
        }
        if (actor.importedModel) {
          actor.importedModel.animate(time, talking, actor.mouthOpen, actor.smile, actor.lookYaw, actor.lookPitch, inAirport ? farewellAmount : 0);
          continue;
        }
        actor.head.rotation.y = actor.lookYaw + Math.sin(t * .39) * .018 + (speaker && !talking ? actor.speaker === 'MÃE' ? -.035 : .035 : 0);
        actor.head.rotation.x = actor.lookPitch + Math.sin(t * (talking ? 1.9 : .64)) * (talking ? .017 : .006);
        actor.head.rotation.z = Math.sin(t * .49) * .008 + (concern ? -.012 : 0);
        const blinkPhase = ((time + actor.phase) % (mother ? 5.3 : 6.1));
        actor.blink = blinkPhase < .22 ? Math.sin(blinkPhase / .22 * Math.PI) ** 2 : 0;
        for (const lid of actor.blinkLids) { lid.setEnabled(actor.blink > .015); lid.scaling.y = Math.max(.001, actor.blink); }
        for (const [i, brow] of actor.brows.entries()) {
          const side = i === 0 ? -1 : 1;
          brow.position.y = .176 + (speaker ? .0015 : 0) + (concern ? .002 : 0);
          brow.rotation.z = concern ? -side * .065 : side * actor.smile * .018;
        }
        for (const corner of actor.corners) corner.position.y = .053 + actor.smile * .0022;
        for (let i = 0; i < actor.arms.length; i++) {
          const sign = i === 0 ? -1 : 1;
          if (inAirport) {
            const lift = mother ? .035 : i === 0 ? .10 : .025;
            actor.arms[i].rotation.x = -.012 - actor.gesture * lift - farewellAmount * (mother ? .07 : i === 0 ? .22 : .08);
            actor.arms[i].rotation.z = sign * (Math.sin(t * .63 + i) * .003 + actor.gesture * .020);
            continue;
          }
          actor.arms[i].rotation.z = sign * (Math.sin(t * .63 + i) * (inCar ? .001 : .003) + actor.gesture * .024);
          // Forearms lift away from the tabletop. Positive downward swings
          // would push the resting wrist through the existing80cm table.
          actor.arms[i].rotation.x = (inCar ? Math.sin(t * .44 + i) * .001 : -.008) - actor.gesture * (.025 + .012 * Math.sin(t * .91 + i));
          if (location === 'kitchen' && mother && i === 0) actor.arms[i].rotation.x -= actor.serving * .192;
        }
        if (actor.pot) actor.pot.rotation.x = actor.serving * .45;
        if (actor.stream) {
          actor.stream.setEnabled(actor.serving > .94 && !talking);
          actor.stream.rotation.x = -(actor.arms[0].rotation.x + (actor.pot?.rotation.x ?? 0) + actor.posture.rotation.x);
          actor.stream.rotation.z = -(actor.arms[0].rotation.z + actor.posture.rotation.z);
        }
      }
    },
    get diagnostics() {
      return actors.map(actor => {
        const headRotation = actor.head.rotationQuaternion?.toEulerAngles() ?? actor.head.rotation;
        return { actorId: actor.root.uniqueId, headId: actor.head.uniqueId, speaker: actor.speaker, meshes: actor.meshes.length,
        vertices: actor.meshes.reduce((n, mesh) => n + mesh.getTotalVertices(), 0),
        triangles: actor.meshes.reduce((n, mesh) => n + mesh.getTotalIndices() / 3, 0),
        position: { x: actor.root.position.x, y: actor.root.position.y, z: actor.root.position.z },
        yaw: actor.root.rotation.y, seated: location === 'car' || location === 'kitchen' && actor.speaker === 'PAI', speaking: actor.speaking,
        location, visible: actor.root.isEnabled(), apron: actor.speaker === 'MÃE' && location === 'kitchen', blink: actor.blink,
        cardigan: actor.speaker === 'MÃE' && location === 'airport', parentSet: actor.root.parent?.name,
        farewell: location === 'airport' ? farewellAmount : 0,
        mouthOpen: actor.mouthOpen, jawAngle: actor.jaw.rotation.x, expression: actor.expression,
        smile: actor.smile, gesture: actor.gesture, serving: actor.serving, hasCoffeePot: Boolean(actor.pot) && location === 'kitchen',
        posture: { x: actor.posture.rotation.x, z: actor.posture.rotation.z },
        head: { x: headRotation.x, y: headRotation.y, z: headRotation.z },
        arms: actor.arms.map(arm => ({ x: arm.rotation.x, z: arm.rotation.z })),
        jawPosition: { x: actor.jaw.position.x, y: actor.jaw.position.y, z: actor.jaw.position.z },
        importedModel: actor.speaker === 'PAI' ? {
          ...(actor.importedModel?.diagnostics ?? { source: '/models/pai_intercambio.glb', loaded: false, error: actor.importError ?? null }),
          importedVisibleMeshes: actor.meshes.filter(mesh => mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0).length,
          litMeshes: actor.meshes.filter(mesh => mesh.isEnabled() && mesh.lightSources.some(light => light.isEnabled())).length,
          proceduralVisibleMeshes: 0,
        } : null,
        coffeeFlow: actor.stream?.isEnabled() ?? false };
      });
    },
    dispose() { if (disposed) return; disposed = true; for (const actor of actors) { actor.importedModel?.dispose();actor.root.dispose(false, false); actor.disposeAirport(); } m.dispose(); },
  };
}
