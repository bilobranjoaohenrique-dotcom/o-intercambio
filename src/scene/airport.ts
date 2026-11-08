import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { InteractionTarget } from '../game/types';
import { AIRPORT, AIRPORT_GATE } from '../game/airportLayout';
import { HomeGeometry } from './props';

/** Original, compact Brazilian departure lounge. The glass apron is scenery,
 * and the only playable extension is the short Gate 24 boarding passage. */
export function buildAirport(scene: Scene, parent: TransformNode) {
  const oldLights = [...scene.lights], root = new TransformNode('aeroporto brasileiro · portão 24', scene);
  root.parent = parent;
  const materials: StandardMaterial[] = [], textures: DynamicTexture[] = [];
  const g = new HomeGeometry(scene), b = g.box.bind(g), rod = g.rod.bind(g), c = g.cylinder.bind(g);
  let seed = 79024;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function material(name: string, colour: string, draw?: (ctx: CanvasRenderingContext2D, n: number) => void, size = 128) {
    const m = new StandardMaterial('aeroporto · ' + name, scene);
    m.diffuseColor = Color3.FromHexString(colour); m.specularColor.set(.08, .08, .09); m.specularPower = 30;
    if (draw && typeof document !== 'undefined') {
      const texture = new DynamicTexture('aeroporto · textura original ' + name, { width: size, height: size }, scene, false, Texture.NEAREST_SAMPLINGMODE);
      const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
      ctx.fillStyle = colour; ctx.fillRect(0, 0, size, size); draw(ctx, size); texture.update(true);
      texture.anisotropicFilteringLevel = 1; texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
      m.diffuseTexture = texture; m.diffuseColor.set(1, 1, 1); textures.push(texture);
    }
    materials.push(m); return m;
  }
  function noise(ctx: CanvasRenderingContext2D, n: number, amount = .10) {
    for (let i = 0; i < n * n / 2; i++) {
      ctx.fillStyle = random() > .5 ? `rgba(235,225,209,${random() * amount})` : `rgba(28,29,43,${random() * amount})`;
      ctx.fillRect(Math.floor(random() * n), Math.floor(random() * n), 1 + Math.floor(random() * 2), 1);
    }
  }
  const floor = material('granilite polido cinza bege', '#8f8d91', (ctx, n) => {
    noise(ctx, n, .16);
    for (let i = 0; i < 1350; i++) { ctx.fillStyle = i % 2 ? 'rgba(50,51,66,.16)' : 'rgba(205,198,184,.22)'; ctx.fillRect(random() * n, random() * n, 1, 2); }
    ctx.fillStyle = 'rgba(37,37,43,.43)'; ctx.fillRect(0, 0, n, 1); ctx.fillRect(0, 0, 1, n);
  }, 256); floor.specularColor.set(.36, .33, .32); floor.specularPower = 62;
  const wall = material('revestimento mineral claro', '#a8a29a', (ctx, n) => {
    noise(ctx, n, .12); ctx.fillStyle = 'rgba(43,43,47,.15)'; ctx.fillRect(0, 0, 1, n); ctx.fillRect(0, 0, n, 1);
  });
  const ceiling = material('placas acústicas envelhecidas', '#827d77', (ctx, n) => {
    noise(ctx, n, .18); ctx.fillStyle = 'rgba(30,29,35,.45)'; ctx.fillRect(0, 0, n, 2); ctx.fillRect(0, 0, 2, n);
    ctx.fillStyle = 'rgba(213,202,178,.18)'; ctx.fillRect(3, 3, n - 5, 1);
  });
  const steel = material('aço escovado e gasto', '#9c9b96', (ctx, n) => {
    noise(ctx, n, .09); for (let y = 0; y < n; y += 3) { ctx.fillStyle = 'rgba(230,226,214,.08)'; ctx.fillRect(0, y, n, 1); }
  }); steel.specularColor.set(.34, .34, .33); steel.specularPower = 50;
  const frame = material('caixilhos e ferragens', '#34343a', (ctx, n) => noise(ctx, n, .1));
  const seat = material('assentos perfurados do terminal', '#54565e', (ctx, n) => {
    noise(ctx, n); for (let y = 4; y < n; y += 8) for (let x = 4; x < n; x += 8) { ctx.fillStyle = '#36373e'; ctx.fillRect(x, y, 2, 2); }
  });
  const navy = material('pintura azul da companhia', '#292d59', (ctx, n) => noise(ctx, n, .14));
  const belt = material('fitas de fila azul marinho', '#242441', (ctx, n) => noise(ctx, n, .08));
  const cream = material('pintura marfim do avião', '#b9b6ac', (ctx, n) => noise(ctx, n, .14));
  const wine = material('detalhes vinho da companhia', '#783b46', (ctx, n) => noise(ctx, n, .1));
  const rubber = material('borracha dos pneus', '#171b24', (ctx, n) => noise(ctx, n, .15));
  const lamp = material('fluorescentes acesas', '#ffeed4'); lamp.emissiveColor.set(1, .84, .62); lamp.disableLighting = true;
  const runwayLamp = material('balizamento âmbar', '#ffd27b'); runwayLamp.emissiveColor.set(1, .60, .15); runwayLamp.disableLighting = true;
  const blueLamp = material('balizamento azul', '#577bc3'); blueLamp.emissiveColor.set(.25, .42, .85); blueLamp.disableLighting = true;
  const glass = material('vidro noturno levemente azulado', '#6f7c94'); glass.alpha = .075; glass.backFaceCulling = false; glass.specularColor.set(.20, .22, .28);
  const reflection = material('reflexos suaves no piso', '#d4c3a8'); reflection.alpha = .075; reflection.emissiveColor.set(.28, .24, .20); reflection.disableLighting = true;
  function mapped(mesh: Mesh, period: number) {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!, normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
    mesh.computeWorldMatrix(true); const matrix = mesh.getWorldMatrix(), uvs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const p = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), matrix);
      const n = Vector3.TransformNormal(new Vector3(normals[i], normals[i + 1], normals[i + 2]), matrix);
      uvs.push((Math.abs(n.x) > .5 ? p.z : p.x) / period, (Math.abs(n.y) > .5 ? p.z : p.y) / period);
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uvs); return mesh;
  }
  const board = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial, period = .6) =>
    mapped(b(name, w, h, d, x, y, z, m), period);

  board('piso polido do saguão', 12, .12, 12, 30, -.06, 0, floor, .6);
  board('teto modular do terminal', 12.2, .14, 12.2, 30, AIRPORT.ceiling + .07, 0, ceiling, .6);
  for (const x of [23.94, 36.06]) board('parede lateral do saguão', .12, AIRPORT.ceiling, 12.1, x, AIRPORT.ceiling / 2, 0, wall, .9);
  board('parede atrás do jogador', 12.2, AIRPORT.ceiling, .12, 30, AIRPORT.ceiling / 2, -6.06, wall, .9);
  for (const x of [24.03, 35.97]) board('rodapé escuro', .04, .10, 12, x, .05, 0, frame);
  for (const x of [24.25, 31.95, 35.77]) {
    board('pilar retangular revestido', .31, AIRPORT.ceiling, .48, x, AIRPORT.ceiling / 2, 5.66, wall, .6);
    b('pilar · base de aço', .33, .11, .50, x, .055, 5.66, steel);
  }
  for (const z of [-3.8, .15, 4.0]) for (const x of [26, 30, 34]) {
    b('luminária · caixa embutida', .52, .045, 1.32, x, 3.765, z, frame);
    b('luminária · difusor fluorescente', .43, .018, 1.20, x, 3.735, z, lamp);
    for (const zz of [z - .40, z, z + .40]) b('luminária · nervura do difusor', .46, .015, .012, x, 3.721, zz, steel);
  }
  // Subtle authored light patches cost no additional scene reflection pass.
  for (const z of [-2.4, .6, 3.7]) for (const x of [26, 30, 34])
    b('reflexo difuso da luminária no granilite', .40, .003, .95, x + .18, .003, z, reflection);

  // Continuous glazed apron behind the family; Gate 24 occupies the right bay.
  for (const x of [24.4, 26.25, 28.15, 30.05, 31.82]) b('caixilho vertical da fachada', .07, 3.72, .10, x, 1.86, 5.86, frame);
  for (const y of [.12, 1.22, 2.38, 3.70]) b('caixilho horizontal da fachada', 7.6, .065, .10, 28.15, y, 5.86, frame);
  g.plane('vidraça para o pátio de aeronaves', 7.48, 3.50, 28.12, 1.88, 5.88, glass);
  board('mureta sob a janela', 7.70, .11, .20, 28.10, .055, 5.86, wall);

  // Only the visible apron and a generic parked passenger jet are modelled.
  const night = material('céu noturno do pátio', '#171c2c', (ctx, n) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, n); gradient.addColorStop(0, '#101321'); gradient.addColorStop(.65, '#1d2333'); gradient.addColorStop(1, '#454044');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, n, n); noise(ctx, n, .025);
    for (let i = 0; i < 35; i++) { ctx.fillStyle = i % 2 ? '#bd8b46' : '#7c827c'; ctx.fillRect(random() * n, n * .78 + random() * n * .17, 1, 1); }
  }, 256); night.disableLighting = true; night.emissiveTexture = night.diffuseTexture; night.emissiveColor.set(1, 1, 1);
  g.plane('paisagem noturna além da pista', 42, 13, 30, 4.7, 20, night);
  const apron = material('asfalto escuro do pátio', '#30333b', (ctx, n) => noise(ctx, n, .17));
  board('pátio externo decorativo', 32, .08, 15, 28, -.12, 12, apron, 2);
  for (const x of [22, 26, 30, 34, 38]) {
    c('poste distante de balizamento', 3.8, .06, .08, x, 1.9, 15, frame, undefined, 6);
    b('luz distante do pátio', .10, .10, .10, x, 3.78, 15, runwayLamp);
  }
  for (let i = 0; i < 14; i++) b('luz baixa azul no pátio', .035, .045, .035, 22 + i * 1.05, .025, 12.2, blueLamp);
  const fuselage = c('avião · fuselagem low-poly', 6.9, .88, 1.02, 27, 1.47, 9.55, cream, undefined, 12);
  fuselage.rotation.z = Math.PI / 2;
  g.sphere('avião · nariz arredondado', .95, .83, .87, 23.63, 1.47, 9.55, cream);
  g.sphere('avião · cauda afilada', 1.50, .57, .64, 30.48, 1.49, 9.55, cream);
  b('avião · faixa azul da fuselagem', 6.30, .13, .012, 26.85, 1.48, 9.027, navy);
  for (let i = 0; i < 20; i++) b('avião · janela iluminada da cabine', .105, .13, .014, 24.30 + i * .265, 1.74, 9.075, lamp);
  for (const x of [23.41, 23.60]) b('avião · vidro da cabine de comando', .17, .16, .02, x, 1.73, 9.15, frame).rotation.z = -.1;
  const wing = b('avião · asa próxima', 2.15, .075, 3.10, 27.3, 1.23, 8.12, cream); wing.rotation.y = -.32;
  const engine = c('avião · turbina próxima', 1.12, .55, .58, 26.35, .97, 7.69, cream, undefined, 10); engine.rotation.z = Math.PI / 2;
  const engineIntake = c('avião · tomada escura da turbina', .02, .39, .39, 25.78, .97, 7.69, frame, undefined, 10); engineIntake.rotation.z = Math.PI / 2;
  const fin = b('avião · estabilizador vertical', 1.12, 1.66, .12, 30.3, 2.36, 9.55, navy); fin.rotation.z = -.29;
  b('avião · faixa vinho no estabilizador', .72, .16, .13, 30.35, 2.49, 9.55, wine).rotation.z = -.29;
  for (const x of [24.7, 28.6]) {
    rod('avião · trem de pouso', { x, y: .22, z: 9.3 }, { x, y: 1.05, z: 9.3 }, .035, steel);
    const wheel = c('avião · roda', .15, .40, .40, x, .20, 9.3, rubber, undefined, 10); wheel.rotation.x = Math.PI / 2;
  }

  // Three banks of original perforated steel seats, with individual arm rests.
  for (const z of [-.05, 2.15, 4.15]) {
    b('banco · travessa inferior', 3.37, .08, .12, 26.65, .31, z, steel);
    for (const x of [25.27, 28.03]) {
      rod('banco · pé inclinado', { x, y: .04, z: z - .31 }, { x, y: .43, z: z + .07 }, .033, steel);
      rod('banco · apoio traseiro', { x, y: .04, z: z + .31 }, { x, y: .43, z: z - .07 }, .033, steel);
    }
    for (let i = 0; i < 4; i++) {
      const x = 25.36 + i * .86;
      board('banco · assento perfurado', .72, .07, .57, x, .47, z, seat, .30);
      const back = board('banco · encosto perfurado', .72, .60, .055, x, .79, z + .27, seat, .30); back.rotation.x = .12;
      for (const dx of [-.39, .39]) {
        rod('banco · apoio do braço', { x: x + dx, y: .49, z: z + .15 }, { x: x + dx, y: .70, z: z + .15 }, .018, steel);
        rod('banco · braço polido', { x: x + dx, y: .70, z: z - .20 }, { x: x + dx, y: .70, z: z + .17 }, .018, steel);
      }
    }
  }
  // Gate frame, short brightly lit boarding passage and service desk.
  for (const x of [32.78, 35.03]) board('portão 24 · montante revestido', .18, 2.66, .35, x, 1.33, 4.75, steel);
  board('portão 24 · verga', 2.43, .18, .35, 33.905, 2.59, 4.75, steel);
  board('corredor de embarque · parede esquerda', .10, 2.55, 1.04, 32.84, 1.275, 5.30, wall);
  board('corredor de embarque · parede direita', .10, 2.55, 1.04, 34.98, 1.275, 5.30, wall);
  board('corredor de embarque · teto', 2.2, .10, 1.1, 33.91, 2.60, 5.30, ceiling);
  b('corredor de embarque · luz do teto', .28, .025, .70, 33.91, 2.54, 5.30, lamp);
  board('corredor de embarque · fundo preparado', 2.1, 2.55, .08, 33.91, 1.275, 5.88, wall);
  for (const x of [32.85, 34.95]) for (const z of [1.30, 2.45, 3.62]) {
    c('fila · base de aço', .035, .25, .25, x, .0175, z, steel, undefined, 12);
    c('fila · separador cromado', .93, .045, .055, x, .50, z, steel, undefined, 8);
    b('fila · cabeçote', .10, .075, .10, x, .97, z, frame);
  }
  for (const x of [32.85, 34.95]) for (const z of [1.875, 3.035]) b('fila · fita azul tensionada', .022, .085, 1.15, x, .93, z, belt);
  board('balcão de atendimento · base', 1.20, 1.08, .82, 35.2, .54, 3.50, wall);
  b('balcão de atendimento · tampo preto', 1.31, .08, .91, 35.2, 1.12, 3.50, frame);
  b('balcão de atendimento · painel azul', .70, .68, .015, 35.2, .60, 3.078, navy);
  b('balcão · monitor de atendimento', .49, .35, .065, 35.16, 1.42, 3.65, frame).rotation.x = -.10;
  b('balcão · pé do monitor', .15, .23, .10, 35.16, 1.22, 3.68, steel);
  b('balcão · teclado de atendimento', .42, .025, .15, 35.2, 1.175, 3.35, frame);

  function sign(name: string, width: number, height: number, x: number, y: number, z: number,
    paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, target?: string) {
    const texture = new DynamicTexture('aeroporto · placa legível ' + name, { width: 512, height: 256 }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.scale(2 / 3, 1);
    ctx.fillStyle = '#25274d'; ctx.fillRect(0, 0, 768, 256); paint(ctx, 768, 256);
    ctx.strokeStyle = '#72738a'; ctx.lineWidth = 5; ctx.strokeRect(4, 4, 760, 248); texture.update(true); textures.push(texture);
    const m = material('sinalização ' + name, '#ffffff'); m.diffuseTexture = texture; m.emissiveTexture = texture; m.emissiveColor.set(.66, .66, .70); m.disableLighting = true;
    b(name + ' · caixa de metal', width + .08, height + .08, .10, x, y, z + .055, frame);
    return g.plane(name, width, height, x, y, z - .008, m, 0, target);
  }
  function airplaneIcon(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, colour: string) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = colour;
    ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(5, -22); ctx.lineTo(5, -5); ctx.lineTo(26, 10); ctx.lineTo(26, 17); ctx.lineTo(5, 8); ctx.lineTo(5, 24); ctx.lineTo(12, 29); ctx.lineTo(12, 33); ctx.lineTo(0, 28); ctx.lineTo(-12, 33); ctx.lineTo(-12, 29); ctx.lineTo(-5, 24); ctx.lineTo(-5, 8); ctx.lineTo(-26, 17); ctx.lineTo(-26, 10); ctx.lineTo(-5, -5); ctx.lineTo(-5, -22); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  sign('painel de partidas internacionais', 4.45, 1.31, 26.85, 3.03, 2.80, ctx => {
    ctx.fillStyle = '#e1b94c'; ctx.fillRect(18, 15, 80, 66); airplaneIcon(ctx, 58, 47, .78, '#222744');
    ctx.fillStyle = '#ece9e0'; ctx.font = 'bold 36px monospace'; ctx.fillText('Partidas Internacionais', 113, 61);
    ctx.fillStyle = '#9396b0'; ctx.fillRect(14, 93, 740, 3);
    ctx.font = '26px monospace'; ctx.fillStyle = '#c9c9d5'; ctx.fillText('Voo', 25, 133); ctx.fillText('Destino', 165, 133); ctx.fillText('Status', 594, 133);
    ctx.fillStyle = '#172344'; ctx.fillRect(15, 150, 738, 78);
    ctx.font = 'bold 29px monospace'; ctx.fillStyle = '#e1e0e4'; ctx.fillText('AA980', 25, 198); ctx.fillText('Nova York (JFK)', 165, 198);
    ctx.fillStyle = '#78af43'; ctx.font = 'bold 28px monospace'; ctx.fillText('EMBARQUE', 594, 198);
  }, 'flightBoard');
  for (const x of [25.0, 28.7]) rod('painel de partidas · haste suspensa', { x, y: 3.75, z: 2.85 }, { x, y: 3.64, z: 2.85 }, .018, steel);
  sign('placa Portão Gate 24', 3.20, .92, 33.90, 3.07, 4.53, ctx => {
    airplaneIcon(ctx, 67, 122, 1.25, '#d9d9df');
    ctx.fillStyle = '#dedde8'; ctx.font = 'bold 54px monospace'; ctx.fillText('Portão /', 130, 98); ctx.font = '42px monospace'; ctx.fillText('Gate', 133, 156);
    ctx.font = 'bold 174px monospace'; ctx.fillText('24', 510, 202);
  });
  sign('logotipo discreto do balcão', .54, .47, 35.2, .61, 3.06, ctx => airplaneIcon(ctx, 384, 128, 3.2, '#c9cbd4'));
  sign('display do portão', .34, .15, 33.90, 2.42, 4.54, ctx => { ctx.fillStyle = '#a3c7c5'; ctx.font = 'bold 69px monospace'; ctx.fillText('24', 330, 155); });
  // A real trigger occupies the open doorway instead of a solid totem.
  const gate = b('portão 24 · área de embarque', 1.76, 2.15, .06, AIRPORT_GATE.x, AIRPORT_GATE.y, AIRPORT_GATE.z, glass, 'gate');
  gate.visibility = .025;

  // Background passengers stay small and understated; no separate AI system.
  const skin = material('pele dos passageiros de fundo', '#b28d70', (ctx, n) => noise(ctx, n, .11));
  const passengerHair = material('cabelo dos passageiros de fundo', '#34302e', (ctx, n) => noise(ctx, n, .13));
  const passengerCoat = material('casaco dos passageiros', '#46546a', (ctx, n) => noise(ctx, n, .16));
  const passengerShirt = material('roupa bege dos passageiros', '#afa491', (ctx, n) => noise(ctx, n, .14));
  const suitcase = material('malas de viagem usadas', '#564346', (ctx, n) => { noise(ctx, n, .16); for (let x = 8; x < n; x += 18) { ctx.fillStyle = 'rgba(25,23,31,.3)'; ctx.fillRect(x, 0, 2, n); } });
  function passenger(builder: HomeGeometry, x: number, z: number, sitting: boolean, coat: StandardMaterial) {
    const bb = builder.box.bind(builder), rr = builder.rod.bind(builder), cc = builder.cylinder.bind(builder), ss = builder.sphere.bind(builder);
    const hip = sitting ? .53 : .81, chest = sitting ? .91 : 1.16, headY = sitting ? 1.33 : 1.63;
    for (const side of [-1, 1]) {
      rr('passageiro · perna da calça', { x: x + side * .085, y: hip, z }, { x: x + side * .085, y: sitting ? .37 : .17, z: z - (sitting ? .32 : .015) }, .055, frame);
      if (sitting) rr('passageiro · canela', { x: x + side * .085, y: .39, z: z - .31 }, { x: x + side * .085, y: .12, z: z - .30 }, .044, frame);
      bb('passageiro · sapato', .13, .09, .24, x + side * .085, .065, z - (sitting ? .36 : .05), rubber);
      rr('passageiro · braço relaxado', { x: x + side * .19, y: chest + .15, z }, { x: x + side * .21, y: sitting ? .65 : .85, z: z - .08 }, .049, coat);
      ss('passageiro · mão', .07, .10, .065, x + side * .21, sitting ? .64 : .83, z - .08, skin);
    }
    bb('passageiro · tronco vestido', .36, .48, .23, x, chest, z, coat);
    cc('passageiro · pescoço', .11, .09, .11, x, headY - .15, z, skin, undefined, 7);
    ss('passageiro · cabeça proporcional', .23, .29, .22, x, headY, z, skin);
    ss('passageiro · cabelo simples', .24, .15, .23, x, headY + .10, z + .02, passengerHair);
    ss('passageiro · nariz', .045, .055, .06, x, headY - .01, z - .119, skin);
    for (const side of [-1, 1]) bb('passageiro · olho discreto', .014, .013, .008, x + side * .044, headY + .025, z - .115, frame);
  }
  for (const [x, z, sitting, coat] of [
    [25.36, -.05, true, passengerCoat], [27.08, 2.15, true, passengerShirt],
    [25.36, 4.15, true, passengerCoat], [35.2, 4.08, false, navy],
    [32.10, 2.7, false, passengerShirt],
  ] as const) passenger(g, x, z, sitting, coat);
  for (const [x, z] of [[27.50, 1.9], [32.40, 2.63]]) {
    board('bagagem de fundo · mala compacta', .32, .49, .20, x, .265, z, suitcase, .3);
    for (const xx of [x - .10, x + .10]) c('bagagem · rodinha', .045, .065, .065, xx, .04, z, rubber, undefined, 7);
    for (const xx of [x - .08, x + .08]) rod('bagagem · haste telescópica', { x: xx, y: .47, z }, { x: xx, y: .78, z }, .009, steel);
    rod('bagagem · alça', { x: x - .08, y: .78, z }, { x: x + .08, y: .78, z }, .013, frame);
  }
  const roomMeshes = g.merge();
  for (const mesh of roomMeshes) { mesh.parent = root; mesh.name = 'aeroporto · ' + mesh.name; }
  const walkerRoot = new TransformNode('aeroporto · passageiro em trajeto curto', scene); walkerRoot.parent = root;
  const walkerBuilder = new HomeGeometry(scene); passenger(walkerBuilder, 0, 0, false, passengerCoat);
  const walkerMeshes = walkerBuilder.merge(); for (const mesh of walkerMeshes) mesh.parent = walkerRoot;
  walkerRoot.position.set(29.25, 0, 4.35);
  const meshes: AbstractMesh[] = [...roomMeshes, ...walkerMeshes, ...[...g.targets.values()].flat()];
  for (const list of g.targets.values()) for (const mesh of list) { mesh.parent = root; mesh.isPickable = true; }
  const targets: InteractionTarget[] = [
    { id: 'gate', meshes: g.targets.get('gate') ?? [], label: () => 'Embarcar', execute: () => undefined },
    { id: 'flightBoard', meshes: g.targets.get('flightBoard') ?? [], label: () => 'Consultar painel de partidas', execute: () => undefined },
  ];
  for (const light of oldLights) light.excludedMeshes.push(...meshes);
  const ambient = new HemisphericLight('aeroporto · iluminação ambiente fria', new Vector3(0, 1, -.2), scene);
  ambient.diffuse.set(.72, .77, .95); ambient.groundColor.set(.28, .26, .32); ambient.intensity = .50;
  const key = new PointLight('aeroporto · fluorescentes sobre a família', new Vector3(29.8, 3.20, -3.8), scene);
  key.diffuse.set(1, .86, .68); key.intensity = 1.0; key.range = 13;
  const fill = new PointLight('aeroporto · claridade do portão', new Vector3(33.9, 2.6, 4.1), scene);
  fill.diffuse.set(.78, .84, 1); fill.intensity = .57; fill.range = 10;
  const lights = [ambient, key, fill];
  let parentMeshes: readonly AbstractMesh[] = [], active = false, disposed = false;
  const refreshLightLists = () => { for (const light of lights) light.includedOnlyMeshes = [...meshes, ...parentMeshes]; };
  refreshLightLists(); for (const light of lights) light.setEnabled(false);
  return {
    meshes, targets,
    setParentMeshes(value: readonly AbstractMesh[]) { parentMeshes = value; refreshLightLists(); },
    setActive(value: boolean) { active = value; for (const light of lights) light.setEnabled(value); },
    animate(time: number) {
      if (!active) return;
      const phase = time * .20, along = (Math.sin(phase) + 1) * .5;
      walkerRoot.position.x = 28.95 + along * 1.8; walkerRoot.position.y = Math.abs(Math.sin(time * 4.4)) * .009;
      walkerRoot.rotation.y = Math.cos(phase) > 0 ? -Math.PI / 2 : Math.PI / 2;
      walkerRoot.rotation.z = Math.sin(time * 4.4) * .008;
    },
    get diagnostics() { return { active, gate: 24, flight: 'AA980', destination: 'Nova York (JFK)', country: 'Brasil',
      passengers: 6, meshes: meshes.length, materials: materials.length, textures: textures.length, lights: lights.length,
      protagonistMeshes: 0, reflectionPasses: 0, ready: true }; },
    dispose() {
      if (disposed) return; disposed = true; for (const light of lights) light.dispose();
      for (const mesh of meshes) mesh.dispose(false, false); walkerRoot.dispose(false, false); root.dispose(false, false);
      for (const m of materials) m.dispose(false, false); for (const texture of textures) texture.dispose();
    },
  };
}
