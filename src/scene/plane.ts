import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { InteractionTarget } from '../game/types';
import { PLANE, PLANE_SEAT, PLANE_WINDOW } from '../game/planeLayout';
import { HomeGeometry } from './props';

type P = { x: number; y: number; z: number };
/** A seated, compact 2+2 cabin. The main oval is a real opening in the curved
 * wall; wing geometry and slowly drifting cloud layers sit outside it. */
export function buildPlane(scene: Scene, parent: TransformNode) {
  const oldLights = [...scene.lights], root = new TransformNode('avião · cabine junto à janela', scene); root.parent = parent;
  const g = new HomeGeometry(scene), b = g.box.bind(g), rod = g.rod.bind(g), materials: StandardMaterial[] = [], textures: DynamicTexture[] = [];
  let seed = 10742;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function surface(name: string, colour: string, draw?: (ctx: CanvasRenderingContext2D, n: number) => void, n = 128) {
    const m = new StandardMaterial('avião · ' + name, scene); m.diffuseColor = Color3.FromHexString(colour);
    m.specularColor.set(.06, .06, .065); m.specularPower = 22;
    if (draw && typeof document !== 'undefined') {
      const t = new DynamicTexture('avião · textura original ' + name, { width: n, height: n }, scene, false, Texture.NEAREST_SAMPLINGMODE);
      const ctx = t.getContext() as unknown as CanvasRenderingContext2D; ctx.fillStyle = colour; ctx.fillRect(0, 0, n, n); draw(ctx, n); t.update(true);
      t.anisotropicFilteringLevel = 1; t.wrapU = t.wrapV = Texture.WRAP_ADDRESSMODE; m.diffuseTexture = t; m.diffuseColor.set(1, 1, 1); textures.push(t);
    }
    materials.push(m); return m;
  }
  function grain(ctx: CanvasRenderingContext2D, n: number, strength = .1) {
    for (let i = 0; i < n * n / 2; i++) { ctx.fillStyle = random() > .5 ? `rgba(237,225,202,${random() * strength})` : `rgba(28,29,45,${random() * strength})`; ctx.fillRect(random() * n, random() * n, 1, 1); }
  }
  const polymer = surface('painéis de polímero envelhecido', '#bcb4a5', (ctx, n) => {
    grain(ctx, n, .07); ctx.fillStyle = 'rgba(96,83,68,.05)'; for (let i = 0; i < 22; i++) ctx.fillRect(random() * n, random() * n, 2 + random() * 4, 1);
  }, 256); polymer.backFaceCulling = false; polymer.twoSidedLighting = true;
  const trim = surface('moldura marfim acetinada', '#d2c7b0', (ctx, n) => grain(ctx, n, .04)); trim.specularColor.set(.16, .14, .11); trim.backFaceCulling = false;
  const plastic = surface('plástico cinza dos bancos', '#777b80', (ctx, n) => grain(ctx, n, .08));
  const darkPlastic = surface('ferragens e plástico escuro', '#353b46', (ctx, n) => grain(ctx, n, .07));
  const cloth = surface('tecido azul de classe econômica', '#303f59', (ctx, n) => {
    grain(ctx, n, .19); for (let y = 0; y < n; y += 8) for (let x = 0; x < n; x += 9) {
      ctx.fillStyle = (x + y) % 3 ? '#485570' : '#657082'; ctx.fillRect(x + (y % 16 ? 3 : 0), y, 1, 3);
    }
    for (let y = 1; y < n; y += 2) { ctx.fillStyle = 'rgba(14,22,39,.12)'; ctx.fillRect(0, y, n, 1); }
  }, 256);
  const pocket = surface('malha elástica do bolso', '#323b4d', (ctx, n) => {
    grain(ctx, n); ctx.strokeStyle = '#647080'; ctx.lineWidth = 1;
    for (let i = -n; i < n * 2; i += 10) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + n, n); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - n, n); ctx.stroke(); }
  });
  const carpet = surface('carpete do corredor', '#44424a', (ctx, n) => { grain(ctx, n, .3); for (let x = 0; x < n; x += 16) { ctx.fillStyle = 'rgba(123,105,84,.12)'; ctx.fillRect(x, 0, 2, n); } });
  const metal = surface('metal dos braços e trilhos', '#96979a'); metal.specularColor.set(.27, .26, .25);
  const screen = surface('tela desligada', '#111820', (ctx, n) => {
    const fill = ctx.createLinearGradient(0, 0, n, n); fill.addColorStop(0, '#263344'); fill.addColorStop(.45, '#111923'); fill.addColorStop(1, '#17202a'); ctx.fillStyle = fill; ctx.fillRect(0, 0, n, n); grain(ctx, n, .025);
  }); screen.specularColor.set(.22, .25, .29); screen.specularPower = 45;
  const lamp = surface('luzes âmbar da cabine', '#f5d8a2'); lamp.disableLighting = true; lamp.emissiveColor.set(.82, .58, .28);
  const paper = surface('revista de viagem no bolso', '#c5c1b2', (ctx, n) => {
    ctx.fillStyle = '#34425c'; ctx.fillRect(0, 0, n, 33); ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#eee5d4'; ctx.fillText('DESTINOS', 7, 23);
    const sky = ctx.createLinearGradient(0, 37, 0, 90); sky.addColorStop(0, '#7e90a9'); sky.addColorStop(.6, '#dc9979'); sky.addColorStop(1, '#efd7a0'); ctx.fillStyle = sky; ctx.fillRect(8, 39, n - 16, 52);
    ctx.fillStyle = '#6f7c87'; ctx.beginPath(); ctx.moveTo(8, 89); ctx.lineTo(40, 65); ctx.lineTo(62, 80); ctx.lineTo(95, 58); ctx.lineTo(120, 89); ctx.fill();
    ctx.fillStyle = '#4d525c'; ctx.fillRect(9, 102, 76, 3); ctx.fillRect(9, 111, 101, 2); grain(ctx, n, .035);
  });
  const jeans = surface('jeans discreto dos joelhos', '#394958', (ctx, n) => { grain(ctx, n, .23); for (let i = -n; i < n * 2; i += 4) { ctx.strokeStyle = 'rgba(147,160,166,.11)'; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + n, n); ctx.stroke(); } });

  function geometry(name: string, positions: number[], indices: number[], uvs: number[], mat: StandardMaterial, target?: string) {
    const mesh = new Mesh('avião · ' + name, scene), vd = new VertexData(), normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals); vd.positions = positions; vd.indices = indices; vd.normals = normals; vd.uvs = uvs; vd.applyToMesh(mesh);
    return g.add(mesh, mat, target);
  }
  function patch(name: string, cols: number, rows: number, point: (u: number, v: number) => P, mat: StandardMaterial) {
    const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) { const u = col / cols, v = row / rows, p = point(u, v); positions.push(p.x, p.y, p.z); uvs.push(p.z * 1.1, p.y * 1.1); }
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) { const a = row * (cols + 1) + col, c = a + cols + 1; indices.push(a, c, a + 1, a + 1, c, c + 1); }
    return geometry(name, positions, indices, uvs, mat);
  }
  function rounded(name: string, w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial, r = .035) {
    const positions: number[] = [], indices: number[] = [], uvs: number[] = [], loop: [number, number][] = [];
    const radius = Math.min(r, w / 2, h / 2);
    for (const [cx, cy, start] of [[w / 2 - radius, h / 2 - radius, 0], [-w / 2 + radius, h / 2 - radius, Math.PI / 2], [-w / 2 + radius, -h / 2 + radius, Math.PI], [w / 2 - radius, -h / 2 + radius, Math.PI * 1.5]])
      for (let i = 0; i <= 3; i++) { const a = start + i / 3 * Math.PI / 2; loop.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]); }
    const count = loop.length;
    for (const dz of [-d / 2, d / 2]) for (const [xx, yy] of loop) { positions.push(x + xx, y + yy, z + dz + yy * .055); uvs.push(xx / w + .5, yy / h + .5); }
    for (let i = 0; i < count; i++) { const next = (i + 1) % count; indices.push(i, next, i + count, next, next + count, i + count); }
    for (let i = 1; i < count - 1; i++) { indices.push(0, i + 1, i); indices.push(count, count + i, count + i + 1); }
    // Babylon's left-handed winding is opposite the XY extrusion convention.
    for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    // Separate cap normals from the rim: shared normals create a diagonal
    // lighting wedge across otherwise flat screen/tray surfaces.
    return geometry(name, positions, indices, uvs, mat).convertToFlatShadedMesh();
  }

  b('piso compacto da cabine', 4.44, .12, PLANE.maxZ - PLANE.minZ, 58, -.06, (PLANE.minZ + PLANE.maxZ) / 2, carpet);
  b('corredor lateral entre os pares', .88, .012, 7.8, 57.97, .007, .75, carpet);
  for (const x of [57.53, 58.41]) b('faixa discreta de segurança no piso', .018, .008, 7.8, x, .015, .75, metal);
  const windowCenters = [-1.07, .75, 2.57, 4.05], windowY = 1.30, ry = .285, rz = .285, ovalWidth = rz / .215;
  const wallX = (side: number, y: number) => 58 + side * (2.22 - .20 * (y - .95) ** 2);
  const glass = surface('vidro limpo das janelas', '#adc2ce'); glass.alpha = .045; glass.backFaceCulling = false; glass.specularColor.set(.24, .27, .29);
  for (const side of [-1, 1]) {
    // Upper/lower continuous strips plus exact rectangular-to-oval patches
    // surround each aperture. No invisible solid plane covers the window.
    const low = windowY - .39, high = windowY + .39;
    for (const [y0, y1] of [[0, low], [high, 2.30]]) patch('parede curva ' + side, 12, 5, (u, v) => {
      const y = y0 + (y1 - y0) * v; return { x: wallX(side, y), y, z: PLANE.minZ + (PLANE.maxZ - PLANE.minZ) * u };
    }, polymer);
    let from: number = PLANE.minZ;
    for (const centerZ of windowCenters) {
      const left = centerZ - .39, right = centerZ + .39;
      patch('painel entre janelas ' + side, 2, 5, (u, v) => { const y = low + (high - low) * v; return { x: wallX(side, y), y, z: from + (left - from) * u }; }, polymer);
      const positions: number[] = [], indices: number[] = [], uvs: number[] = [], steps = 32;
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i <= steps; i++) {
        const a = i / steps * Math.PI * 2, sy = Math.cos(a), sz = Math.sin(a), square = Math.max(Math.abs(sy), Math.abs(sz));
        const y = windowY + sy * (ring ? .39 / square : ry), z = centerZ + sz * (ring ? .39 / square : rz);
        positions.push(wallX(side, y), y, z); uvs.push(z, y);
      }
      for (let i = 0; i < steps; i++) { const next = i + 1, outer = i + steps + 1; indices.push(i, outer, next, next, outer, outer + 1); }
      geometry('parede com abertura oval real', positions, indices, uvs, polymer);
      // The moulding has a flush outside, convex lip and a deep recessed inner edge.
      const ringPositions: number[] = [], ringIndices: number[] = [], ringUvs: number[] = [];
      const profiles = [{ y: .356, z: .278 * ovalWidth, protrude: .007 }, { y: .326, z: .248 * ovalWidth, protrude: .070 }, { y: ry, z: rz, protrude: .026 }, { y: ry * .98, z: rz * .98, protrude: -.075 }];
      for (let ring = 0; ring < profiles.length; ring++) for (let i = 0; i <= steps; i++) {
        const a = i / steps * Math.PI * 2, p = profiles[ring], y = windowY + Math.cos(a) * p.y, z = centerZ + Math.sin(a) * p.z;
        ringPositions.push(wallX(side, y) - side * p.protrude, y, z); ringUvs.push(i / steps, ring / 3);
      }
      for (let ring = 0; ring < profiles.length - 1; ring++) for (let i = 0; i < steps; i++) { const a = ring * (steps + 1) + i, c = a + steps + 1; ringIndices.push(a, c, a + 1, a + 1, c, c + 1); }
      geometry('aro oval tridimensional em relevo', ringPositions, ringIndices, ringUvs, trim);
      const glassPositions = [wallX(side, windowY) + side * .079, windowY, centerZ], glassIndices: number[] = [], glassUvs = [.5, .5];
      for (let i = 0; i <= steps; i++) { const a = i / steps * Math.PI * 2; glassPositions.push(wallX(side, windowY) + side * .079, windowY + Math.cos(a) * ry * .975, centerZ + Math.sin(a) * rz * .975); glassUvs.push(.5 + Math.sin(a) * .5, .5 + Math.cos(a) * .5); if (i < steps) glassIndices.push(0, i + 1, i + 2); }
      const primary = side === -1 && centerZ === windowCenters[0];
      const pane = geometry('vidro oval com vista exterior', glassPositions, glassIndices, glassUvs, glass, primary ? 'plane-window' : undefined);
      pane.isPickable = primary;
      b('puxador da persiana recolhida', .035, .022, .10, wallX(side, 1.63) - side * .055, 1.63, centerZ, plastic);
      from = right;
    }
    patch('painel final da fuselagem ' + side, 2, 5, (u, v) => { const y = low + (high - low) * v; return { x: wallX(side, y), y, z: from + (PLANE.maxZ - from) * u }; }, polymer);
    for (const z of [-2.4, -.6, 1.2, 3.0, 4.6]) {
      b('junta vertical discreta da cabine', .008, .70, .012, wallX(side, .5) - side * .004, .40, z, plastic);
      b('bagageiro · caixa curva', .72, .38, 1.64, side < 0 ? 56.23 : 59.77, 2.06, z, polymer).rotation.z = side * -.12;
      b('bagageiro · porta e friso de fechamento', .025, .28, 1.51, side < 0 ? 56.59 : 59.41, 2.02, z, trim).rotation.z = side * -.12;
      b('bagageiro · fecho', .045, .024, .13, side < 0 ? 56.64 : 59.36, 1.93, z, plastic);
    }
  }
  patch('forro arqueado central', 8, 6, (u, v) => { const x = 56.144 + u * 3.712; return { x, y: 2.48 - .18 * ((x - 58) / 1.856) ** 2, z: PLANE.minZ + v * (PLANE.maxZ - PLANE.minZ) }; }, polymer);
  for (const x of [56.82, 59.18]) b('iluminação indireta âmbar junto ao forro', .055, .045, 7.8, x, 2.30, .75, lamp);
  for (const z of [-2.2, -.5, 1.2, 2.9, 4.4]) {
    rounded('luminária central de cabine', .34, .075, .54, 58, 2.43, z, trim);
    b('difusor aceso da luminária', .25, .018, .38, 58, 2.384, z, lamp);
    for (const side of [-1, 1]) for (const x of [58 + side * 1.26, 58 + side * 1.55]) {
      g.sphere('saída de ar circular', .045, .025, .045, x, 2.32, z, darkPlastic);
      g.sphere('pequena luz de leitura', .025, .012, .025, x, 2.318, z + .07, lamp);
    }
  }
  b('divisória dianteira da seção visível', 4.44, 2.48, .08, 58, 1.24, 4.62, polymer);
  rounded('painel discreto à frente da cabine', 1.0, .35, .03, 58, 1.65, 4.565, plastic);
  b('faixa âmbar da divisória', 1.20, .018, .015, 58, 2.15, 4.56, lamp);

  function seat(x: number, z: number, hero = false) {
    const lowered = x === 57.25 && z === -1.14;
    const top = hero ? 1.28 : lowered ? 1.08 : 1.19, height = top - .44;
    const screenY = lowered ? .967 : 1.015, trayY = lowered ? .737 : .783, hingeY = lowered ? .625 : .653;
    rounded('assento · carcaça com contorno arredondado', .55, height, .14, x, .44 + height / 2, z, plastic, .06);
    rounded('assento · tecido traseiro acolchoado', .50, height - .07, .055, x, .44 + height / 2, z - .085, cloth, .055);
    rounded('assento · apoio de cabeça acolchoado', .44, .15, .17, x, top - .065, z + .015, cloth, .05);
    rounded('assento · almofada', .50, .12, .50, x, .46, z + .25, cloth, .045);
    for (const side of [-1, 1]) {
      rod('assento · apoio metálico', { x: x + side * .20, y: .07, z: z + .10 }, { x: x + side * .20, y: .43, z: z + .12 }, .019, metal);
      rounded('assento · braço moldado', .065, .06, .49, x + side * .282, .65, z + .22, darkPlastic, .025);
      rod('assento · haste do braço', { x: x + side * .28, y: .48, z: z + .17 }, { x: x + side * .28, y: .65, z: z + .17 }, .013, metal);
    }
    rounded('tela · moldura pequena integrada', .32, lowered ? .18 : .205, .028, x, screenY, z - .123, darkPlastic, .016);
    rounded('tela · display desligado sem entretenimento', .274, lowered ? .14 : .158, .006, x, screenY + .002, z - .142, screen, .008);
    b('tela · botão físico apagado', .028, .008, .006, x + .115, screenY - .09, z - .143, plastic);
    rounded('bandeja dobrável fechada', .414, lowered ? .20 : .239, .028, x, trayY, z - .139, plastic, .026);
    b('bandeja · trava central', .040, .028, .018, x, lowered ? .851 : .916, z - .160, metal);
    for (const side of [-1, 1]) rod('bandeja · dobradiça inferior', { x: x + side * .15 - .021, y: hingeY, z: z - .153 }, { x: x + side * .15 + .021, y: hingeY, z: z - .153 }, .008, metal);
    rounded('bolso inferior com malha de tecido', .414, .135, .035, x, .543, z - .130, pocket, .025);
    g.plane('revista guardada no bolso', .195, .16, x - .045, .600, z - .140, paper);
    rod('bolso · borda elástica costurada', { x: x - .19, y: .612, z: z - .153 }, { x: x + .19, y: .612, z: z - .153 }, .004, darkPlastic);
  }
  const rowZ = [-2.12, -1.14, -.16, .82, 1.80, 2.78, 3.76];
  for (const z of rowZ) for (const x of [56.4, 57.25, 58.88, 59.54]) seat(x, z, z === -1.14 && x === 56.4);
  // Only the two knees/thighs exist, fixed to the original seated position.
  for (const side of [-1, 1]) {
    rod('protagonista · coxa discreta de jeans', { x: PLANE_SEAT.position.x + side * .11, y: .52, z: -1.94 }, { x: PLANE_SEAT.position.x + side * .135, y: .70, z: -1.48 }, .090, jeans);
    g.sphere('protagonista · joelho de jeans na base do quadro', .185, .18, .24, PLANE_SEAT.position.x + side * .135, .735, -1.47, jeans);
  }

  // A few original background silhouettes, neither parent identity is used.
  const skin = surface('pele dos passageiros', '#af8d73', (ctx, n) => grain(ctx, n, .1));
  const hair = surface('cabelo dos passageiros', '#38332f', (ctx, n) => grain(ctx, n, .16));
  const coat = surface('casaco de passageiro', '#6a6462', (ctx, n) => grain(ctx, n, .2));
  const shirt = surface('camisa de passageiro', '#7e8a93', (ctx, n) => grain(ctx, n, .14));
  const sleepers: TransformNode[] = [], passengerMeshes: AbstractMesh[] = [];
  for (const [i, x, z, reading] of [[0, 59.54, -.08, true], [1, 58.88, 1.86, false], [2, 57.25, 2.84, false], [3, 56.4, 3.82, false]] as const) {
    const node = new TransformNode('avião · passageiro de fundo ' + i, scene); node.parent = root; node.position.set(x, 0, z); if (!reading) sleepers.push(node);
    const p = new HomeGeometry(scene), pb = p.box.bind(p), pr = p.rod.bind(p);
    p.sphere('passageiro · tronco vestido', .34, .45, .23, 0, .90, .15, reading ? shirt : coat);
    p.sphere('passageiro · cabeça', .23, .29, .22, 0, 1.29, .15, skin);
    p.sphere('passageiro · cabelo', .24, .15, .23, 0, 1.39, .13, hair);
    for (const side of [-1, 1]) {
      pr('passageiro · braço relaxado', { x: side * .17, y: 1.03, z: .17 }, { x: side * .19, y: .76, z: .40 }, .043, reading ? shirt : coat);
      p.sphere('passageiro · mão', .07, .09, .065, side * .19, .75, .42, skin);
      pr('passageiro · calça', { x: side * .08, y: .51, z: .17 }, { x: side * .08, y: .36, z: .58 }, .058, darkPlastic);
    }
    if (reading) { const magazine = p.plane('passageiro lendo uma revista', .24, .22, 0, .82, .44, paper); magazine.rotation.x = .48; }
    else pb('passageiro · almofada de viagem', .25, .065, .14, 0, 1.19, .23, cloth);
    const pieces = p.merge(); for (const mesh of pieces) { mesh.parent = node; mesh.isPickable = false; passengerMeshes.push(mesh); }
  }

  // Actual wing surface outside the left fuselage. The swept-back tip is
  // visible when leaning toward the window; its middle crosses the main view.
  const wingMaterial = surface('alumínio da asa ao pôr do sol', '#c8beb1', (ctx, n) => { grain(ctx, n, .07); ctx.strokeStyle = 'rgba(66,66,73,.35)'; for (const y of [19, 67, 106]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(n, y + 9); ctx.stroke(); } }); wingMaterial.backFaceCulling = false; wingMaterial.twoSidedLighting = true;
  wingMaterial.specularColor.set(.25, .20, .16);
    const wing = geometry('asa externa com volume e painéis', [55.9, .30, 7.0, 50.4, 1.55, 5.0, 50.0, 1.641, 4.0, 55.9, .30, 0, 55.9, .245, 7.0, 50.4, 1.495, 5.0, 50.0, 1.586, 4.0, 55.9, .245, 0],
    [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0],
    [1, 1, 0, .8, 0, 0, 1, 0, 1, 1, 0, .8, 0, 0, 1, 0], wingMaterial); wing.convertToFlatShadedMesh(); wing.isPickable = false;
  const wingletMat = surface('winglet azul escuro da companhia', '#3f4f73', (ctx, n) => grain(ctx, n, .1)); wingletMat.backFaceCulling = false;
  geometry('winglet levantado na ponta da asa', [50.42, 1.55, 5.01, 50.00, 1.641, 4.0, 49.83, 2.38, 3.9, 50.10, 2.36, 4.75], [0, 1, 2, 0, 2, 3], [0, 0, 1, 0, 1, 1, 0, 1], wingletMat).isPickable = false;
  for (const z of [.85, 1.2, 1.55]) rod('asa · junta discreta do flap', { x: 55.25, y: .458, z }, { x: 52.30, y: 1.132, z: z + 2.0 }, .005, plastic).isPickable = false;

  const sky = surface('céu rosado e alaranjado', '#eab486', (ctx, n) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, n); gradient.addColorStop(0, '#627799'); gradient.addColorStop(.36, '#b09aa8'); gradient.addColorStop(.59, '#e9a394'); gradient.addColorStop(.73, '#f3c18b'); gradient.addColorStop(1, '#d8c4ac'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, n, n);
    ctx.fillStyle = 'rgba(255,223,160,.85)'; ctx.beginPath(); ctx.arc(n * .62, n * .65, n * .055, 0, Math.PI * 2); ctx.fill(); grain(ctx, n, .025);
  }, 256); sky.disableLighting = true; sky.emissiveTexture = sky.diffuseTexture; sky.emissiveColor.set(1, 1, 1); sky.backFaceCulling = false;
  g.plane('horizonte exterior contínuo', 110, 110, 35, 1.0, 4, sky, Math.PI / 2).isPickable = false;
  g.plane('horizonte exterior além do outro lado da cabine', 110, 110, 81, 1.0, 4, sky, -Math.PI / 2).isPickable = false;
  const cloudMaterials: StandardMaterial[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const m = surface('nuvens iluminadas camada ' + layer, '#fff2df', (ctx, n) => {
      ctx.clearRect(0, 0, n, n);
      for (let i = 0; i < 36; i++) {
        const x = random() * n, y = random() * n, r = 13 + random() * 36;
        const gradient = ctx.createRadialGradient(x, y, 1, x, y, r); gradient.addColorStop(0, layer % 2 ? 'rgba(247,214,197,.92)' : 'rgba(255,237,212,.93)'); gradient.addColorStop(.55, 'rgba(232,215,214,.70)'); gradient.addColorStop(1, 'rgba(193,188,208,0)'); ctx.fillStyle = gradient; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, 256);
    m.diffuseTexture!.hasAlpha = true; m.useAlphaFromDiffuseTexture = true; m.alpha = .83 - layer * .10;
    m.disableLighting = true; m.emissiveTexture = m.diffuseTexture; m.emissiveColor.set(.85, .76, .77); m.backFaceCulling = false; cloudMaterials.push(m);
    const mesh = g.plane('camada tridimensional de nuvens abaixo da asa', 27 + layer * 10, 36 + layer * 8, 43 - layer * 4, -.5 - layer * 1.6, 5, m);
    mesh.rotation.x = Math.PI / 2; mesh.isPickable = false; const tex = m.diffuseTexture as Texture | null; if (tex) { tex.uScale = 3; tex.vScale = 3; }
  }
  const roomMeshes = g.merge();
  for (const mesh of roomMeshes) { mesh.parent = root; mesh.name = 'avião · ' + mesh.name; }
  for (const list of g.targets.values()) for (const mesh of list) mesh.parent = root;
  const meshes: AbstractMesh[] = [...roomMeshes, ...passengerMeshes, ...[...g.targets.values()].flat()];
  for (const light of oldLights) light.excludedMeshes.push(...meshes);
  const ambient = new HemisphericLight('avião · luz ambiente da cabine', Vector3.Up(), scene); ambient.diffuse.set(.83, .83, .91); ambient.groundColor.set(.29, .27, .30); ambient.intensity = .67;
  const warm = new PointLight('avião · iluminação interna âmbar', new Vector3(58, 2.2, -.4), scene); warm.diffuse.set(1, .76, .45); warm.intensity = .56; warm.range = 8;
  const sunset = new PointLight('avião · luz do pôr do sol pela janela', new Vector3(54.5, 1.55, -.8), scene); sunset.diffuse.set(1, .60, .38); sunset.intensity = .76; sunset.range = 8;
  const lights = [ambient, warm, sunset]; for (const light of lights) { light.includedOnlyMeshes = [...meshes]; light.setEnabled(false); }
  const targets: InteractionTarget[] = [{ id: 'plane-window', meshes: g.targets.get('plane-window') ?? [], label: () => 'Olhar pela janela', execute: () => undefined }];
  let active = false, elapsed = 0, disposed = false, cloudOffset = 0;
  return {
    meshes, targets,
    setActive(value: boolean) { active = value; for (const light of lights) light.setEnabled(value); },
    animate(time: number) {
      if (!active) return; elapsed = time; cloudOffset = (time * .003) % 1;
      for (let i = 0; i < cloudMaterials.length; i++) { const tex = cloudMaterials[i].diffuseTexture as Texture | null; if (tex) { tex.uOffset = cloudOffset * (1 + i * .35); tex.vOffset = time * .0006 * (i + 1); } }
      for (let i = 0; i < sleepers.length; i++) { sleepers[i].rotation.z = Math.sin(time * .44 + i) * .012; sleepers[i].scaling.y = 1 + Math.sin(time * .80 + i) * .002; }
    },
    get diagnostics() { return { active, ready: true, seat: PLANE_SEAT, window: PLANE_WINDOW.target,
      screenOn: false, curvedWall: true, realOvalAperture: true, wing: true, winglet: true,
      cloudLayers: 3, cloudOffset, elapsed, passengers: 4, parents: 0, protagonistBodyMeshes: 0, knees: 2,
      seatRows: rowZ.length, configuration: '2+2', meshes: meshes.length, textures: textures.length, reflectionPasses: 0 }; },
    dispose() { if (disposed) return; disposed = true; for (const light of lights) light.dispose(); for (const mesh of meshes) mesh.dispose(false, false); for (const node of sleepers) node.dispose(false, false); root.dispose(false, false); for (const m of materials) m.dispose(false, false); for (const t of textures) t.dispose(); },
  };
}
