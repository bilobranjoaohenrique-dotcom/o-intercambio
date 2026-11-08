import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { InteractionTarget } from '../game/types';
import { FAMILY_CAR } from '../game/garageLayout';
import { HomeGeometry } from './props';

type Point = { x: number; y: number; z: number };

/** Original unbranded early-2000s hatchback. Its silhouette, open glazed cabin,
 * wheel arches and seats are actual geometry; no reference image is pasted on. */
export function buildFamilyCar(scene: Scene, parent: TransformNode) {
  const root = new TransformNode('garagem · carro da família', scene); root.parent = parent;
  const g = new HomeGeometry(scene), materials: StandardMaterial[] = [], textures: DynamicTexture[] = [];
  const targetId = 'family-car';
  let seed = 200313;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function surface(name: string, colour: string, pattern?: (c: CanvasRenderingContext2D, n: number) => void, size = 128) {
    const m = new StandardMaterial('carro · ' + name, scene); m.diffuseColor = Color3.FromHexString(colour);
    m.specularColor.set(.12, .115, .10); m.specularPower = 38;
    if (pattern && typeof document !== 'undefined') {
      const t = new DynamicTexture('carro · textura original ' + name, { width: size, height: size }, scene, false, Texture.NEAREST_SAMPLINGMODE);
      const c = t.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = colour; c.fillRect(0, 0, size, size); pattern(c, size); t.update(true);
      m.diffuseTexture = t; m.diffuseColor.set(1, 1, 1); textures.push(t);
    }
    materials.push(m); return m;
  }
  const grain = (c: CanvasRenderingContext2D, n: number) => {
    for (let i = 0; i < n * n / 3; i++) {
      c.fillStyle = random() > .5 ? 'rgba(234,222,194,.045)' : 'rgba(50,44,36,.045)';
      c.fillRect(Math.floor(random() * n), Math.floor(random() * n), 1, 1);
    }
  };
  const paint = surface('pintura bege metálica envelhecida', '#938b7d', (c, n) => {
    grain(c, n);
    const grime = c.createLinearGradient(0, 0, 0, n); grime.addColorStop(0, 'rgba(235,227,201,.03)');
    grime.addColorStop(.70, 'rgba(70,61,45,0)'); grime.addColorStop(1, 'rgba(65,57,42,.16)');
    c.fillStyle = grime; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 25; i++) { c.fillStyle = 'rgba(217,206,179,.09)'; c.fillRect(random() * n, random() * n, 2 + random() * 6, 1); }
  });
  paint.specularColor.set(.22, .21, .18); paint.specularPower = 70;
  const trim = surface('borracha dos para-choques e frisos', '#383b37', grain); trim.specularColor.set(.035, .035, .03);
  const tyre = surface('pneu com sulcos', '#292c29', (c, n) => {
    grain(c, n); for (let x = 0; x < n; x += 10) { c.fillStyle = 'rgba(8,10,9,.28)'; c.fillRect(x, 0, 2, n); }
    for (let y = 0; y < n; y += 15) { c.strokeStyle = 'rgba(12,14,12,.35)'; c.beginPath(); c.moveTo(0, y); c.lineTo(n, y + 18); c.stroke(); }
  }); tyre.specularColor.set(.015, .015, .012);
  const rim = surface('calotas de aço escovado', '#aaa99d', grain); rim.specularColor.set(.26, .25, .23);
  const upholstery = surface('tecido cinza dos bancos', '#605f53', (c, n) => {
    grain(c, n); for (let x = 0; x < n; x += 3) { c.fillStyle = 'rgba(217,211,188,.07)'; c.fillRect(x, 0, 1, n); }
    for (let y = 0; y < n; y += 3) { c.fillStyle = 'rgba(18,24,20,.09)'; c.fillRect(0, y, n, 1); }
  }); upholstery.specularColor.set(.025, .023, .02);
  const dash = surface('plástico fosco do interior', '#3d403a', grain); dash.specularColor.set(.035, .035, .03);
  const glass = surface('vidros levemente fumê', '#708184'); glass.alpha = .24; glass.backFaceCulling = false;
  glass.twoSidedLighting = true; glass.specularColor.set(.34, .36, .34); glass.specularPower = 90;
  const red = surface('lente vermelha das lanternas', '#8e3228', (c, n) => {
    for (let y = 0; y < n; y += 5) for (let x = 0; x < n; x += 6) { c.fillStyle = 'rgba(231,153,91,.16)'; c.fillRect(x + 1, y + 1, 3, 2); }
  }); red.specularColor.set(.22, .12, .09);
  const amber = surface('setas âmbar', '#aa6d30', grain);
  const headlight = surface('faróis de vidro canelado', '#d4cbb1', (c, n) => {
    for (let x = 0; x < n; x += 5) { c.fillStyle = 'rgba(77,83,77,.13)'; c.fillRect(x, 0, 1, n); }
  }); headlight.specularColor.set(.35, .35, .30);
  const plate = surface('placa cinza de época', '#b8b7a8', (c, n) => {
    grain(c, n); c.strokeStyle = '#5c6057'; c.lineWidth = 2; c.strokeRect(1, 1, n - 2, n - 2);
    c.fillStyle = '#333a35'; c.textAlign = 'center'; c.font = 'bold 10px monospace'; c.fillText('SP · VILA NOVA', n / 2, 22);
    c.font = 'bold 24px monospace'; c.fillText('BRC-2003', n / 2, 78);
  });
  function box(name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial) {
    return g.box(name, w, h, d, x, y, z, m, targetId);
  }
  function rod(name: string, a: Point, b: Point, radius: number, m: StandardMaterial) {
    return g.rod(name, a, b, radius, m, targetId);
  }
  function polygon(name: string, points: Point[], m: StandardMaterial) {
    const mesh = new Mesh('carro · ' + name, scene), positions = points.flatMap(p => [p.x, p.y, p.z]), indices: number[] = [], normals: number[] = [];
    for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals;
    data.uvs = points.flatMap(p => [p.x / 1.6 + .5, (p.y - .25) / 1.25]);
    data.applyToMesh(mesh); m.backFaceCulling = false; m.twoSidedLighting = true;
    return g.add(mesh, m, targetId, m !== glass);
  }
  // A bevelled body with real arch clearances. The top remains open under the
  // glazed cabin, so the windows reveal seats rather than an opaque body lid.
  const sections = [-1.86, -1.68, -1.49, -1.36, -1.23, -1.10, -.97, -.82, .80, .97, 1.10, 1.23, 1.36, 1.49, 1.68, 1.86];
  const positions: number[] = [], indices: number[] = [], uv: number[] = [];
  const bodyWidth = (z: number) => Math.abs(z) > 1.68 ? .69 : Math.abs(z) > 1.49 ? .76 : .795;
  const topY = (z: number) => z > .97 ? .83 - (z - .97) * .22 : z < -1.49 ? .83 + (z + 1.49) * .30 : .83;
  for (const z of sections) {
    const w = bodyWidth(z), top = topY(z), axleDistance = Math.min(Math.abs(z - 1.15), Math.abs(z + 1.15));
    const low = axleDistance < .34 ? .29 + Math.sqrt(.34 ** 2 - axleDistance ** 2) : .30;
    const ring = [[-w * .91, low], [w * .91, low], [w, low + .035], [w, top - .055],
      [w * .96, top], [-w * .96, top], [-w, top - .055], [-w, low + .035]];
    for (const [x, y] of ring) { positions.push(x, y, z); uv.push((z + 1.9) / 3.8, (y - .28) / .56); }
  }
  for (let row = 0; row < sections.length - 1; row++) for (let edge = 0; edge < 8; edge++) {
    if (edge === 4 && sections[row] >= -1.49 && sections[row + 1] <= .97) continue;
    const a = row * 8 + edge, b = row * 8 + (edge + 1) % 8, c = a + 8, d = b + 8;
    indices.push(a, c, b, b, c, d);
  }
  for (const row of [0, sections.length - 1]) for (let edge = 1; edge < 7; edge++)
    indices.push(row * 8, row * 8 + edge, row * 8 + edge + 1);
  const body = new Mesh('carro · carroceria com para-lamas recortados', scene), bodyNormals: number[] = [];
  VertexData.ComputeNormals(positions, indices, bodyNormals);
  const bodyData = new VertexData(); bodyData.positions = positions; bodyData.indices = indices; bodyData.normals = bodyNormals; bodyData.uvs = uv;
  bodyData.applyToMesh(body); g.add(body, paint, targetId);
  box('assoalho interno', 1.28, .045, 2.60, 0, .34, -.20, dash);

  // Four independent tyres, restrained steel hubcaps and painted arch lips.
  for (const side of [-1, 1]) for (const axle of [-1.15, 1.15]) {
    const wheel = g.cylinder('pneu de doze faces', .17, .57, .57, side * .75, .285, axle, tyre, targetId, 12); wheel.rotation.z = Math.PI / 2;
    const hub = g.cylinder('calota de aço', .014, .31, .31, side * .842, .285, axle, rim, targetId, 12); hub.rotation.z = Math.PI / 2;
    const centre = g.cylinder('centro da calota', .018, .10, .10, side * .852, .285, axle, trim, targetId, 10); centre.rotation.z = Math.PI / 2;
    for (let bolt = 0; bolt < 4; bolt++) {
      const a = bolt * Math.PI / 2;
      const screw = g.cylinder('parafuso da roda', .016, .022, .022, side * .858, .285 + Math.sin(a) * .068, axle + Math.cos(a) * .068, rim, targetId, 6); screw.rotation.z = Math.PI / 2;
    }
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI, b = (i + 1) / 10 * Math.PI;
      rod('contorno do para-lama', { x: side * .799, y: .29 + Math.sin(a) * .34, z: axle + Math.cos(a) * .34 },
        { x: side * .799, y: .29 + Math.sin(b) * .34, z: axle + Math.cos(b) * .34 }, .012, trim);
    }
  }
  for (const side of [-1, 1]) {
    box('friso de proteção das portas', .019, .035, 2.75, side * .798, .53, -.05, trim);
    for (const z of [-1.44, -.28, .92]) rod('junta vertical da porta', { x: side * .800, y: .38, z }, { x: side * .800, y: .795, z }, .003, trim);
    for (const z of [-.61, .48]) box('maçaneta preta', .029, .037, .14, side * .808, .76, z, trim);
    box('retrovisor externo', .09, .11, .17, side * .815, .965, .79, trim);
    const mirror = g.plane('espelho do retrovisor', .11, .073, side * .862, .973, .79, rim, side > 0 ? Math.PI / 2 : -Math.PI / 2, targetId); mirror.isPickable = true;
    for (const [a, b] of [
      [{ x: side * .76, y: .82, z: .95 }, { x: side * .63, y: 1.36, z: .48 }],
      [{ x: side * .76, y: .83, z: -.29 }, { x: side * .65, y: 1.39, z: -.29 }],
      [{ x: side * .75, y: .84, z: -1.51 }, { x: side * .63, y: 1.36, z: -.96 }],
      [{ x: side * .63, y: 1.36, z: -.96 }, { x: side * .63, y: 1.36, z: .48 }],
    ] as const) rod('coluna estrutural da cabine', a, b, .029, paint);
    polygon('vidro lateral da porta dianteira', [
      { x: side * .637, y: 1.337, z: .455 }, { x: side * .741, y: .856, z: .892 },
      { x: side * .748, y: .856, z: -.245 }, { x: side * .65, y: 1.345, z: -.245 },
    ], glass);
    polygon('vidro lateral traseiro', [
      { x: side * .65, y: 1.345, z: -.345 }, { x: side * .748, y: .856, z: -.345 },
      { x: side * .733, y: .865, z: -1.44 }, { x: side * .634, y: 1.333, z: -.945 },
    ], glass);
    rod('borracha inferior dos vidros', { x: side * .758, y: .84, z: -1.46 }, { x: side * .758, y: .84, z: .91 }, .011, trim);
  }
  polygon('para-brisa dianteiro', [{ x: -.619, y: 1.352, z: .495 }, { x: .619, y: 1.352, z: .495 },
    { x: .739, y: .846, z: .956 }, { x: -.739, y: .846, z: .956 }], glass);
  polygon('vidro inclinado da tampa traseira', [{ x: -.619, y: 1.352, z: -.971 }, { x: .619, y: 1.352, z: -.971 },
    { x: .734, y: .864, z: -1.519 }, { x: -.734, y: .864, z: -1.519 }], glass);
  polygon('teto com bordas chanfradas', [{ x: -.59, y: 1.378, z: -.985 }, { x: -.65, y: 1.43, z: -.78 },
    { x: -.63, y: 1.43, z: .34 }, { x: -.586, y: 1.378, z: .505 },
    { x: .586, y: 1.378, z: .505 }, { x: .63, y: 1.43, z: .34 },
    { x: .65, y: 1.43, z: -.78 }, { x: .59, y: 1.378, z: -.985 }], paint);
  for (const side of [-1, 1]) {
    rod('limpador dianteiro', { x: side * .33, y: .856, z: .963 }, { x: side * .20, y: 1.005, z: .831 }, .009, trim);
  }
  rod('limpador traseiro', { x: .02, y: .91, z: -1.48 }, { x: .37, y: .984, z: -1.39 }, .009, trim);

  // Seats and dashboard are readable through every window, without fake flat
  // interior portraits. Seat backs tilt slightly, with separate head restraints.
  for (const x of [-.365, .365]) {
    box('assento dianteiro', .47, .13, .46, x, .50, .14, upholstery);
    const back = box('encosto dianteiro', .46, .52, .12, x, .82, -.10, upholstery); back.rotation.x = -.12;
    box('apoio de cabeça dianteiro', .29, .16, .105, x, 1.13, -.145, upholstery);
    for (const railX of [x - .12, x + .12]) rod('haste do encosto de cabeça', { x: railX, y: 1.03, z: -.13 }, { x: railX, y: 1.10, z: -.145 }, .007, rim);
  }
  box('banco traseiro', 1.25, .14, .43, 0, .50, -.91, upholstery);
  const rearBack = box('encosto do banco traseiro', 1.25, .51, .12, 0, .81, -1.16, upholstery); rearBack.rotation.x = -.10;
  for (const x of [-.38, .38]) box('apoio traseiro', .27, .15, .10, x, 1.12, -1.21, upholstery);
  box('painel de instrumentos', 1.36, .20, .31, 0, .795, .82, dash);
  box('quadro dos mostradores', .34, .11, .02, -.365, .88, .648, trim);
  for (const x of [-.45, -.29]) { const dial = g.cylinder('mostrador analógico', .006, .075, .075, x, .89, .632, rim, targetId, 12); dial.rotation.x = Math.PI / 2; }
  const steering = MeshBuilder.CreateTorus('volante de três raios', { diameter: .30, thickness: .025, tessellation: 12 }, scene);
  steering.position.set(-.365, .98, .63); steering.rotation.x = 1.15; g.add(steering, trim, targetId);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3, dx = Math.cos(a) * .125, d = Math.sin(a) * .125;
    rod('raio do volante', { x: -.365, y: .98, z: .63 }, { x: -.365 + dx, y: .98 - d * Math.sin(1.15), z: .63 + d * Math.cos(1.15) }, .013, trim);
  }
  rod('alavanca do câmbio', { x: 0, y: .39, z: .44 }, { x: 0, y: .64, z: .43 }, .012, trim);
  g.sphere('manopla do câmbio', .059, .052, .059, 0, .65, .43, trim, targetId);
  for (const side of [-1, 1]) box('forro interno da porta', .035, .36, 1.85, side * .714, .60, -.20, dash);

  // Restrained period details: broad bumpers, non-emissive lamps and a grey
  // Brazilian-style plate, without a modern Mercosur stripe or real branding.
  for (const end of [-1, 1]) {
    box('para-choque de plástico', 1.49, .15, .12, 0, .36, end * 1.84, trim);
    box('moldura da placa', .48, .145, .018, 0, .45, end * 1.884, trim);
    g.plane('placa BRC-2003', .435, .118, 0, .45, end * 1.896, plate, end > 0 ? Math.PI : 0, targetId);
    for (const side of [-1, 1]) {
      box(end > 0 ? 'farol dianteiro' : 'lanterna traseira', end > 0 ? .35 : .24, end > 0 ? .145 : .245, .026,
        side * (end > 0 ? .53 : .638), end > 0 ? .60 : .694, end * 1.863, end > 0 ? headlight : red);
      box('seta lateral da lanterna', .11, .075, .029, side * .68, end > 0 ? .58 : .75, end * 1.865, amber);
    }
  }
  box('grade discreta dianteira', .50, .09, .035, 0, .60, 1.868, trim);
  for (const y of [.579, .609]) box('filete da grade', .45, .007, .038, 0, y, 1.869, rim);
  rod('antena de teto', { x: .37, y: 1.424, z: -.64 }, { x: .37, y: 1.45, z: -.70 }, .004, trim);

  g.merge();
  const meshes: AbstractMesh[] = g.targets.get(targetId) ?? [];
  root.position.set(FAMILY_CAR.x, FAMILY_CAR.y, FAMILY_CAR.z); root.rotation.y = FAMILY_CAR.yaw;
  for (const mesh of meshes) { mesh.parent = root; mesh.metadata = { ...mesh.metadata, familyCar: true }; }
  root.computeWorldMatrix(true); for (const mesh of meshes) mesh.computeWorldMatrix(true);
  const target: InteractionTarget = { id: targetId, meshes, label: () => 'Entrar no carro', execute: () => undefined };
  const shadowCasters = meshes.filter(mesh => mesh.material !== glass);
  let disposed = false;
  return {
    meshes, target, shadowCasters,
    get diagnostics() { return { model: 'hatch-familiar-2000-original', wheels: 4, doors: 4, seats: 5, steeringWheel: true,
      meshes: meshes.length, vertices: meshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0),
      position: { x: root.position.x, y: root.position.y, z: root.position.z }, yaw: root.rotation.y,
      width: FAMILY_CAR.width, length: FAMILY_CAR.length, height: FAMILY_CAR.height }; },
    dispose() { if (disposed) return; disposed = true; root.dispose(false, false); for (const m of materials) m.dispose(false, false); for (const t of textures) t.dispose(); },
  };
}
