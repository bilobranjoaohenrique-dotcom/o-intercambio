import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { LivingRoomGeometry } from './livingRoomGeometry';
import { createLivingRoomMaterials } from './livingRoomMaterials';
import { LIVING_ROOM, LIVING_ROOM_FURNITURE as F, LIVING_ROOM_WINDOW, LIVING_ROOM_RUG } from '../game/livingRoomLayout';
import { LIVING_ROOM_PLACEMENT, LIVING_ROOM_WORLD, livingToWorld } from '../game/livingRoomPlacement';

/** The approved room is authored unchanged in local space. One rigid parent
 * places its entrance at the original stair landing; only its joints change. */
export function buildLivingRoom(scene: Scene) {
  const existingLights = [...scene.lights], m = createLivingRoomMaterials(scene), g = new LivingRoomGeometry(scene);
  const b = g.box.bind(g), bevel = g.bevel.bind(g), c = g.cylinder.bind(g), rod = g.rod.bind(g);
  const metricPeriods = new Map<StandardMaterial, number>([[m.floor, 1.44], [m.wall, .9], [m.ceiling, 1], [m.wood, .45], [m.darkWood, .45], [m.fabric, .32]]);
  const board = (...args: Parameters<LivingRoomGeometry['board']>) => { const mesh = g.board(...args), period = metricPeriods.get(args[7]); if (period) g.metric(mesh, 1 / period); return mesh; };
  const room = { ...LIVING_ROOM, height: LIVING_ROOM.ceiling };
  const trim = m.material('acabamento bege da sala', '#c8bba1'); trim.specularColor.set(.04, .04, .03);
  const seam = m.material('vivo de tecido castanho', '#504535'); seam.specularColor.set(0, 0, 0);
  const violet = m.material('pétalas de hortênsia violeta', '#9170a9'); violet.specularColor.set(.01, .01, .01);
  const blossomCenter = m.material('miolo creme das flores', '#cebd8e');
  const window = { ...LIVING_ROOM_WINDOW, low: .95, high: 2.15 };
  // A self-lit sky still needs its original painted texture in the emissive
  // channel. A white emissive constant would hide the morning gradient.
  m.sky.emissiveTexture = m.sky.diffuseTexture; m.sky.diffuseColor.set(0, 0, 0); m.sky.emissiveColor.set(.88, .90, .89);
  function textileUV(mesh: Mesh, uTiles: number, vTiles: number) { const uv = mesh.getVerticesData('uv')!; mesh.setVerticesData('uv', uv.map((value, i) => value * (i % 2 ? vTiles : uTiles))); }
  const boardWall = (name: string, w: number, h: number, d: number, x: number, y: number, z: number) => board(name, w, h, d, x, y, z, m.wall, undefined, 1.25);

  // Ceramic floor and independent ceiling stop exactly at the shared seams.
  board('sala · piso de cerâmica marrom', 4.20, .10, 3.80, 4.77, -.05, 9.95, m.floor, undefined, 1);
  // The original wooden landing and the kitchen floor now meet this main
  // floor at its two apertures; no coincident threshold or old side alcove.
  board('sala · teto', 4.20, .12, 3.80, 4.77, 2.66, 9.95, m.ceiling, undefined, 1.15);
  // Real north-wall door aperture; its closed leaf supplies the final face.
  boardWall('sala · parede norte esquerda', 3.13, 2.60, .12, 4.235, 1.30, 7.99);
  boardWall('sala · parede norte direita', .27, 2.60, .12, 6.735, 1.30, 7.99);
  boardWall('sala · verga da porta principal', .80, .50, .12, 6.20, 2.35, 7.99);
  boardWall('sala · parede sul complementar', 2.07, 2.60, .12, 5.835, 1.30, 11.91);
  // Complete the former kitchen-facing joint around its approved doorway.
  // After the half turn this is the north entry, aligned with the last tread.
  boardWall('sala · ligação à esquerda da entrada', .58, 2.60, .12, 2.96, 1.30, 11.91);
  boardWall('sala · ligação à direita da entrada', .65, 2.60, .12, 4.475, 1.30, 11.91);
  boardWall('sala · fechamento acima da entrada', .90, .50, .12, 3.70, 2.35, 11.91);
  board('sala · encaixe alto do patamar', 2.10, .65, .12, 3.70, 2.925, 11.94, m.wall);
  // The formerly stair-facing side now leads to the kitchen. A single real
  // doorway fits between the unchanged chair and phone table.
  boardWall('sala · lateral antes da passagem da cozinha', .12, 2.60, 1.15, 2.61, 1.30, 8.625);
  boardWall('sala · lateral depois da passagem da cozinha', .12, 2.60, 1.75, 2.61, 1.30, 10.975);
  boardWall('sala · verga lateral da cozinha', .12, .50, .90, 2.61, 2.35, 9.65);
  boardWall('sala · parede antes da janela', .12, 2.60, .55, 6.93, 1.30, 8.325);
  boardWall('sala · parede depois da janela', .12, 2.60, 1.85, 6.93, 1.30, 10.925);
  boardWall('sala · parede sob janela', .12, .95, 1.40, 6.93, .475, 9.30);
  boardWall('sala · parede sobre janela', .12, .45, 1.40, 6.93, 2.375, 9.30);
  // Layered painted mouldings, intentionally separated from large surfaces.
  for (const [x, z, w, d] of [[4.235, 8.065, 3.13, .028], [6.735, 8.065, .27, .028], [5.835, 11.835, 2.07, .028], [6.855, 9.95, .028, 3.80]]) {
    board('sala · rodapé pintado', w, .105, d, x, .0525, z, trim);
    board('sala · perfil superior do rodapé', w + .002, .014, d + .007, x, .109, z, trim);
  }
  for (const [x, z, w, d] of [[4.77, 8.075, 4.20, .055], [4.77, 11.825, 4.20, .055], [6.845, 9.95, .055, 3.80], [2.695, 9.95, .055, 3.80]]) {
    board('sala · sanca simples', w, .042, d, x, 2.565, z, trim);
    board('sala · filete da sanca', w, .021, d + .012, x, 2.532, z, trim);
  }
  for (const x of [3.215, 4.185]) board('sala · batente da passagem', .065, 2.16, .15, x, 1.08, 11.91, m.wood);
  board('sala · verga aparente da passagem', 1.035, .07, .15, 3.70, 2.135, 11.91, m.wood);
  for (const z of [9.165, 10.135]) board('sala · batente lateral da cozinha', .15, 2.16, .065, 2.61, 1.08, z, m.wood);
  board('sala · travessa lateral da cozinha', .15, .07, 1.035, 2.61, 2.135, 9.65, m.wood);

  function picture(name: string, x: number, y: number, z: number, w: number, h: number, image: StandardMaterial, yaw = 0, target?: string) {
    g.group(name, x, y, z, yaw, () => {
      board(name + ' · fundo de madeira', w + .055, h + .055, .022, 0, 0, -.008, m.darkWood, target);
      b(name + ' · passe-partout', w + .014, h + .014, .006, 0, 0, .007, m.ivory, target);
      g.plane(name + ' · imagem original', w, h, 0, 0, .012, image, Math.PI, target);
      for (const xx of [-w / 2 - .017, w / 2 + .017]) bevel(name + ' · moldura lateral', .025, h + .060, .025, xx, 0, .009, m.wood, .004, target);
      for (const yy of [-h / 2 - .017, h / 2 + .017]) bevel(name + ' · travessa da moldura', w + .070, .025, .025, 0, yy, .009, m.wood, .004, target);
    });
  }
  function pot(x: number, y: number, z: number, hanging = false, scale = 1) {
    g.group('planta doméstica', x, y, z, 0, () => {
      const mesh = g.lathe('planta · vaso cerâmico oco', [[.07, 0], [.09, .012], [.105, .15], [.115, .16], [.115, .18], [.097, .184], [.080, .03], [.03, .022]], 0, 0, 0, m.terracotta, 12);
      c('planta · terra no vaso', .006, .17, .17, 0, .162, 0, m.darkWood, undefined, 12);
      for (let j = 0; j < (hanging ? 9 : 8); j++) {
        const a = j * 2.4, reach = hanging ? .21 + j % 2 * .06 : .16 + j % 3 * .03, endY = hanging ? -.30 - j % 3 * .11 : .33 + j % 3 * .055;
        const end = { x: Math.cos(a) * reach, y: endY, z: Math.sin(a) * reach };
        rod('planta · ramo arqueado', { x: 0, y: .17, z: 0 }, end, .0028, m.leaf);
        const leaves = hanging ? 7 : 5;
        for (let k = 1; k <= leaves; k++) { const t = k / leaves; g.leaf('planta · folha nervurada', end.x * t, .17 + (end.y - .17) * t, end.z * t, hanging ? .12 : .09 + k % 2 * .02, hanging ? .07 : .052, a + (k % 2 ? .55 : -.55), hanging ? -.45 : .55, m.leaf); }
      }
      if (hanging) for (let j = 0; j < 7; j++) { const a = j * 2.4; g.leaf('planta · copa da jibóia', Math.cos(a) * .065, .24 + j % 2 * .025, Math.sin(a) * .065, .12, .07, a, .65, m.leaf); }
      // Trailing vines sit on furniture/shelves; no unattached hanging cords.
      void mesh;
    });
    g.groups[g.groups.length - 1].scaling.setAll(scale);
  }
  function flatDoily(name: string, x: number, y: number, z: number, w: number, d: number) {
    const cloth = g.cloth(name, 12, 12, (u, v) => ({ x: x + (u - .5) * w, y: y + Math.sin(u * 21) * Math.sin(v * 19) * .0015, z: z + (v - .5) * d }), m.crochet);
    textileUV(cloth, w / .42, d / .84);
    cloth.metadata.castShadow = false;
  }
  function magazine(x: number, y: number, z: number, yaw: number, cover = m.magazine) {
    g.group('revista doméstica', x, y, z, yaw, () => { b('revista · páginas', .19, .012, .26, 0, .006, 0, m.ivory); const page = g.plane('revista · capa original', .20, .27, 0, .013, 0, cover); page.rotation.x = Math.PI / 2; });
  }

  // Window: an actual aperture, four individual panes and translucent lace.
  for (const z of [8.57, 10.03]) bevel('janela · marco vertical', .10, 1.31, .070, 6.84, 1.55, z, m.wood, .008);
  for (const y of [.92, 2.18]) bevel('janela · marco horizontal', .10, .070, 1.56, 6.84, y, 9.30, m.wood, .008);
  board('janela · peitoril de madeira', .23, .045, 1.60, 6.795, .89, 9.30, m.wood);
  board('janela · montante central', .055, 1.20, .034, 6.825, 1.55, 9.30, m.darkWood);
  board('janela · travessa central', .055, .034, 1.40, 6.825, 1.55, 9.30, m.darkWood);
  const glazing = g.plane('janela · vidro da sala', 1.40, 1.20, 6.89, 1.55, 9.30, m.glass, Math.PI / 2); glazing.isPickable = false;
  rod('janela · varão', { x: 6.70, y: 2.31, z: 8.43 }, { x: 6.70, y: 2.31, z: 10.17 }, .011, m.darkWood);
  for (const z0 of [8.46, 9.71]) {
    const curtain = g.cloth('janela · renda com pregas e bainha', 16, 22, (u, v) => ({ x: 6.70 - Math.cos(u * Math.PI * 10) * .031, y: 2.285 - v * 1.55 + .012 * Math.sin(u * 30) * v, z: z0 + u * .43 }), m.lace); curtain.metadata.castShadow = false;
    textileUV(curtain, .43 / .42, 1.55 / .84);
    for (let i = 0; i < 6; i++) c('janela · argola da cortina', .026, .024, .024, 6.70, 2.30, z0 + .025 + i * .073, m.metal, undefined, 6);
  }
  // Only a modest, non-navigable neighbourhood is visible beyond the glass.
  const sky = g.plane('janela · céu matinal de fundo', 14, 10, 15.0, 3.5, 9.3, m.sky, Math.PI / 2); sky.isPickable = false;
  board('janela · muro do quintal vizinho', .15, 1.15, 7.0, 10.30, .57, 9.30, m.wall);
  for (const neighbour of [{ x: 11.60, z: 6.90 }, { x: 12.60, z: 10.40 }]) {
    board('janela · casa vizinha', 2.60, 2.60, 3.40, neighbour.x, 1.30, neighbour.z, m.wall);
    for (const offset of [-.85, .85]) {
      const xx = neighbour.x - 1.34, zz = neighbour.z + offset;
      board('janela · moldura externa vizinha', .065, .73, .65, xx, 1.65, zz, m.wood);
      board('janela · vidro da casa vizinha', .072, .62, .54, xx - .035, 1.65, zz, m.plastic);
      board('janela · caixilho vizinho vertical', .078, .62, .027, xx - .039, 1.65, zz, m.wood);
      board('janela · caixilho vizinho horizontal', .078, .027, .54, xx - .039, 1.65, zz, m.wood);
    }
    for (const side of [-1, 1]) { const roof = board('janela · telhado cerâmico vizinho', 1.6, .09, 3.8, neighbour.x + side * .73, 2.92, neighbour.z, m.terracotta); roof.rotation.z = side * -.45; }
  }
  pot(10.2, 1.15, 10.9, false, 1.9);

  // Paneled front door: a closed physical object, never a travel trigger.
  board('porta principal · folha de madeira fechada', .80, 2.10, .045, 6.20, 1.05, 8.048, m.wood, 'living-exit');
  for (const x of [5.755, 6.645]) bevel('porta principal · batente', .070, 2.19, .08, x, 1.095, 8.085, m.darkWood, .006, 'living-exit');
  bevel('porta principal · travessa superior', .96, .07, .08, 6.20, 2.16, 8.085, m.darkWood, .006, 'living-exit');
  for (const x of [6.00, 6.40]) for (const [y, height] of [[.49, .68], [1.48, .91]]) {
    board('porta principal · painel rebaixado', .295, height, .010, x, y, 8.074, m.darkWood, 'living-exit');
    for (const xx of [x - .153, x + .153]) bevel('porta principal · moldura vertical do painel', .024, height + .04, .016, xx, y, 8.083, m.wood, .003, 'living-exit');
    for (const yy of [y - height / 2 - .008, y + height / 2 + .008]) bevel('porta principal · moldura do painel', .33, .024, .016, x, yy, 8.083, m.wood, .003, 'living-exit');
  }
  bevel('porta principal · espelho da fechadura', .038, .15, .012, 5.89, 1.0, 8.095, m.metal, .006, 'living-exit');
  rod('porta principal · eixo da maçaneta', { x: 5.89, y: 1.03, z: 8.098 }, { x: 5.89, y: 1.03, z: 8.145 }, .013, m.metal, 'living-exit');
  g.sphere('porta principal · maçaneta', .056, .053, .054, 5.89, 1.03, 8.15, m.metal, 'living-exit');
  for (const y of [.23, 1.05, 1.87]) c('porta principal · dobradiça', .095, .015, .015, 6.59, y, 8.087, m.metal, 'living-exit', 8);

  // TV shelving: open niches, a separately modeled CRT and lower doors.
  g.group('estante da sala', F.tvCabinet.x, 0, F.tvCabinet.z, F.tvCabinet.rotation, () => {
    board('estante · fundo', 1.86, 1.86, .035, 0, 1.015, -.225, m.darkWood);
    for (const x of [-.925, .925]) { board('estante · montante lateral', .055, 1.91, .50, x, 1.005, 0, m.wood); bevel('estante · pé', .09, .12, .43, x, .06, 0, m.darkWood, .009); }
    for (const y of [.125, .61, 1.66, 1.94]) bevel('estante · prateleira com borda', 1.90, .055, .51, 0, y, 0, m.wood, .007);
    for (const x of [-.57, .57]) board('estante · divisão vertical', .038, 1.30, .48, x, 1.29, 0, m.darkWood);
    for (const x of [-.46, .46]) {
      bevel('estante · porta inferior', .875, .405, .035, x, .36, .266, m.wood, .007);
      board('estante · almofada da porta', .765, .29, .009, x, .36, .29, m.darkWood);
      for (const xx of [x - .393, x + .393]) board('estante · friso vertical', .019, .336, .012, xx, .36, .299, m.wood);
      for (const yy of [.20, .52]) board('estante · friso horizontal', .805, .019, .012, x, yy, .299, m.wood);
      g.sphere('estante · puxador latão', .025, .025, .025, x + (x < 0 ? .30 : -.30), .39, .321, m.metal);
    }
    for (const x of [-.745, .745]) {
      board('estante · prateleira lateral', .30, .028, .45, x, 1.18, .015, m.wood);
      for (let i = 0; i < 7; i++) {
        const height = .23 + i % 3 * .032, xx = x - .13 + i * .041;
        board('estante · livro com lombada', .033, height, .18, xx, .64 + height / 2, .135, m.bookColors[i % m.bookColors.length]);
        b('estante · filete dourado da lombada', .024, .006, .002, xx, .67 + height * .65, .227, m.metal);
        const upperHeight = .24 + i % 2 * .02;
        board('estante · livro superior', .035, upperHeight, .19, xx, 1.194 + upperHeight / 2, .13, m.bookColors[(i + 2) % m.bookColors.length]);
      }
    }
    // CRT's deep shell is wider at the front and recedes into the cabinet.
    bevel('TV · gabinete traseiro', .82, .68, .32, 0, 1.095, .013, m.plastic, .048, 'living-tv');
    bevel('TV · moldura convexa', .91, .70, .085, 0, 1.10, .244, m.plastic, .035, 'living-tv');
    b('TV · recorte escuro da tela', .754, .556, .018, -.025, 1.118, .293, m.cable, 'living-tv');
    const screen = g.cloth('TV · vidro levemente convexo', 18, 14, (u, v) => ({ x: -.025 + (u - .5) * .718, y: 1.12 + (.5 - v) * .508, z: .305 + .018 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) }), m.tvOff, 'living-tv', true);
    // A viewer on +Z sees world -X as screen-right. Match the authored
    // program to that front view so Portuguese text is never mirrored.
    screen.setVerticesData('uv', screen.getVerticesData('uv')!.map((value, i) => i % 2 ? value : 1 - value));
    screen.metadata.castShadow = false;
    for (let i = 0; i < 3; i++) { const button = c('TV · botão de controle', .009, .023, .023, .383, .885 + i * .041, .293, m.ivory, 'living-tv', 10); button.rotation.x = Math.PI / 2; }
    for (let i = 0; i < 8; i++) b('TV · fenda do alto-falante', .025, .006, .007, .381, 1.09 + i * .018, .291, m.cable, 'living-tv');
    b('TV · luz indicadora', .008, .005, .004, .345, .813, .291, m.bulb, 'living-tv');
    for (const x of [-.31, .31]) bevel('TV · pé de apoio', .13, .1175, .22, x, .69625, .07, m.plastic, .008, 'living-tv');
    // Portable stereo with actual speaker cones, cassette window and dial.
    bevel('rádio · gabinete', .57, .215, .165, -.30, 2.078, -.012, m.plastic, .019);
    for (const x of [-.505, -.095]) {
      const ring = c('rádio · aro do alto-falante', .012, .16, .16, x, 2.075, .076, m.metal, undefined, 16); ring.rotation.x = Math.PI / 2;
      const cone = c('rádio · cone do alto-falante', .016, .137, .137, x, 2.075, .086, m.cable, undefined, 16); cone.rotation.x = Math.PI / 2;
      g.sphere('rádio · centro do cone', .065, .065, .021, x, 2.075, .098, m.plastic);
    }
    b('rádio · fita cassete', .17, .075, .010, -.30, 2.04, .080, m.ivory);
    b('rádio · visor do sintonizador', .18, .026, .012, -.30, 2.135, .081, m.tvOff);
    for (let i = 0; i < 7; i++) b('rádio · escala do dial', .008, .017, .003, -.37 + i * .024, 2.135, .089, m.ivory);
    rod('rádio · antena telescópica', { x: -.11, y: 2.18, z: -.035 }, { x: .12, y: 2.40, z: -.04 }, .0027, m.metal);
    for (const x of [-.42, -.18]) rod('rádio · alça de transporte', { x, y: 2.18, z: -.035 }, { x, y: 2.235, z: -.035 }, .009, m.plastic);
    rod('rádio · pega da alça', { x: -.42, y: 2.235, z: -.035 }, { x: -.18, y: 2.235, z: -.035 }, .009, m.plastic);
  });
  flatDoily('estante · renda superior', 5.21, 1.976, 8.37, .38, .37);
  pot(5.48, 1.976, 8.30, true, .80);
  picture('estante · retrato familiar', 4.80, 1.81, 8.51, .24, .19, m.family);
  picture('parede · paisagem rural', 3.38, 1.71, 8.087, .62, .43, m.landscapes[0]);
  board('parede · crucifixo vertical', .023, .26, .022, 3.38, 2.19, 8.083, m.darkWood);
  board('parede · crucifixo horizontal', .135, .023, .022, 3.38, 2.23, 8.083, m.darkWood);
  picture('parede · família nas férias', 6.839, 1.62, 10.60, .37, .30, m.family, -Math.PI / 2);
  picture('parede · paisagem pequena', 6.839, 1.99, 11.24, .27, .24, m.landscapes[1], -Math.PI / 2);

  function upholstery(name: string, x: number, z: number, width: number, depth: number, yaw: number, seats: number) {
    g.group(name, x, 0, z, yaw, () => {
      for (const xx of [-width / 2 + .10, width / 2 - .10]) for (const zz of [-depth / 2 + .11, depth / 2 - .11]) g.lathe(name + ' · pé torneado', [[.025, 0], [.032, .02], [.022, .07], [.029, .115]], xx, 0, zz, m.darkWood, 8);
      g.cushion(name + ' · estrutura estofada', width - .035, .25, depth - .025, 0, .24, 0, m.fabric, .05);
      g.piping(name + ' · costura inferior', width - .02, depth - .02, 0, .20, 0, seam);
      const inner = width - .29, seatW = inner / seats;
      for (let i = 0; i < seats; i++) {
        const xx = -inner / 2 + seatW * (i + .5);
        g.cushion(name + ' · almofada do assento', seatW - .014, .17, depth - .22, xx, .425, .044, m.fabric, .052);
        g.piping(name + ' · vivo do assento', seatW - .030, depth - .245, xx, .472, .044, seam);
        const back = g.cushion(name + ' · encosto almofadado', seatW - .006, .48, .20, xx, .658, -depth / 2 + .12, m.fabric, .065); back.rotation.x = -.13;
        // A small real tuck at the upper cushion seam breaks the silhouette.
        for (const dx of [-.07, .07]) rod(name + ' · prega costurada', { x: xx + dx, y: .786, z: -depth / 2 + .235 }, { x: xx + dx * .85, y: .835, z: -depth / 2 + .216 }, .0017, seam);
      }
      for (const xx of [-width / 2 + .079, width / 2 - .079]) {
        g.cushion(name + ' · braço acolchoado', .175, .345, depth - .055, xx, .475, .018, m.fabric, .073);
        g.piping(name + ' · vivo do braço', .145, depth - .09, xx, .572, .018, seam);
      }
      // Soft floral pillow rather than a printed panel on the chair itself.
      const pillow = g.cushion(name + ' · almofada floral', seats > 1 ? .32 : .30, .31, .13, seats > 1 ? -.46 : 0, .635, -.035, m.cushion, .059); pillow.rotation.set(-.16, 0, seats > 1 ? -.13 : .05);
      const crochetThrow = g.cloth(name + ' · manta de crochê sobre o encosto', 16, 18, (u, v) => {
        const xx = seats > 1 ? .09 + (u - .5) * .57 : (u - .5) * .40;
        if (v < .24) return { x: xx, y: .89 - v * .06, z: -depth / 2 + .03 + v / .24 * .20 };
        return { x: xx, y: .875 - (v - .24) / .76 * .33 + Math.sin(u * 24) * .004, z: -depth / 2 + .235 + Math.sin(v * Math.PI) * .015 };
      }, m.crochet); crochetThrow.metadata.castShadow = false;
      textileUV(crochetThrow, (seats > 1 ? .57 : .40) / .42, .53 / .84);
    });
  }
  upholstery('sofá de dois lugares', F.sofa.x, F.sofa.z, F.sofa.width, F.sofa.depth, F.sofa.rotation, 2);
  upholstery('poltrona junto à escada', F.armchair.x, F.armchair.z, F.armchair.width, F.armchair.depth, F.armchair.rotation, 1);

  // A single entire rug image, with physical thickness and discreet fringe.
  b('tapete · suporte têxtil', 2.25, .008, 2.40, 4.75, .0045, 10.05, seam);
  const rug = g.plane('tapete · desenho ornamental completo', LIVING_ROOM_RUG.width, LIVING_ROOM_RUG.depth, LIVING_ROOM_RUG.x, .010, LIVING_ROOM_RUG.z, m.rug); rug.rotation.x = Math.PI / 2;
  for (const z of [8.85, 11.25]) for (let i = 0; i < 38; i++) rod('tapete · franja', { x: 3.65 + i * .059, y: .010, z }, { x: 3.65 + i * .059, y: .009, z: z + (z < 10 ? -.025 : .025) }, .0013, m.ivory);
  // Low wooden coffee table with turned legs, a lower shelf and real props.
  const table = { x: 4.90, z: 9.60, top: .46 };
  bevel('mesa de centro · tampo chanfrado', .95, .05, .60, table.x, .435, table.z, m.wood, .012);
  for (const x of [4.50, 5.30]) for (const z of [9.365, 9.835]) g.lathe('mesa de centro · perna torneada', [[.025, 0], [.032, .025], [.020, .08], [.023, .24], [.037, .31], [.035, .41]], x, 0, z, m.darkWood, 10);
  for (const x of [4.48, 5.32]) board('mesa de centro · saia lateral', .035, .10, .50, x, .37, table.z, m.wood);
  for (const z of [9.36, 9.84]) board('mesa de centro · saia frontal', .85, .10, .035, table.x, .37, z, m.wood);
  board('mesa de centro · prateleira baixa', .79, .025, .43, table.x, .14, table.z, m.wood);
  flatDoily('mesa de centro · toalha de renda', 4.79, .465, 9.60, .48, .43);
  const vaseY = .471;
  g.lathe('mesa de centro · vaso de flores', [[.052, 0], [.071, .012], [.085, .085], [.074, .145], [.040, .178], [.043, .189], [.033, .19], [.031, .177]], 4.74, vaseY, 9.59, m.ceramic, 14);
  for (let j = 0; j < 13; j++) {
    const a = j * 2.4, radius = j === 0 ? 0 : .048 + j % 3 * .016, xx = 4.74 + Math.cos(a) * radius, zz = 9.59 + Math.sin(a) * radius, yy = vaseY + .28 + j % 3 * .030;
    rod('hortênsia · haste', { x: 4.74, y: vaseY + .15, z: 9.59 }, { x: xx, y: yy, z: zz }, .0021, m.leaf);
    if (j % 2 === 0) g.leaf('hortênsia · folha', xx, yy - .065, zz, .075, .044, a, .7, m.leaf);
    for (let k = 0; k < 5; k++) { const angle = k * Math.PI * 2 / 5; g.flowerPart('hortênsia · pétala', .028, .011, .023, xx + Math.cos(angle) * .017, yy + .002, zz + Math.sin(angle) * .017, violet); }
    g.flowerPart('hortênsia · miolo', .010, .009, .010, xx, yy + .006, zz, blossomCenter);
  }
  magazine(5.17, .465, 9.60, -.13);
  magazine(5.17, .482, 9.60, -.03);
  magazine(4.92, .154, 9.58, .06);
  g.lathe('mesa de centro · cinzeiro de vidro âmbar', [[.040, 0], [.058, .012], [.060, .030], [.050, .032], [.046, .014], [.015, .012]], 4.95, .468, 9.78, m.metal, 12);

  // The side table, tactile old telephone and lamp are at fixed shared anchors.
  bevel('mesa lateral · tampo', .42, .038, .40, 3.10, .661, 9.20, m.wood, .008);
  for (const x of [2.93, 3.27]) for (const z of [9.04, 9.36]) g.lathe('mesa lateral · perna', [[.018, 0], [.025, .03], [.016, .12], [.022, .52], [.029, .64]], x, 0, z, m.darkWood, 8);
  board('mesa lateral · prateleira', .35, .022, .33, 3.10, .18, 9.20, m.wood);
  flatDoily('mesa lateral · toalha de renda', 3.10, .684, 9.20, .415, .395);
  g.group('telefone interativo', 3.10, .691, 9.20, Math.PI / 2, () => {
    const base = bevel('telefone · base inclinada', .17, .060, .22, 0, .032, 0, m.ivory, .018, 'living-phone'); base.rotation.x = -.11;
    for (const x of [-.066, .066]) g.cushion('telefone · cápsula do fone', .068, .044, .066, x, .094, -.072, m.ivory, .018, 'living-phone');
    bevel('telefone · haste do fone', .155, .027, .033, 0, .102, -.072, m.ivory, .010, 'living-phone');
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const x = -.033 + col * .032, z = -.008 + row * .023;
      bevel('telefone · tecla numerada', .023, .006, .017, x, .066 - z * .11, z, trim, .003, 'living-phone');
      b('telefone · marca do número', .005, .001, .005, x, .070 - z * .11, z, m.cable, 'living-phone');
    }
    const path: Vector3[] = [];
    for (let i = 0; i <= 90; i++) { const t = i / 90, a = t * Math.PI * 24; path.push(new Vector3(-.108 + Math.cos(a) * .006, .09 - Math.sin(t * Math.PI) * .11, -.070 + t * .19 + Math.sin(a) * .006)); }
    g.tube('telefone · cabo espiralado', path, .0018, m.cable, 'living-phone', 4);
    rod('telefone · ligação do cabo', { x: -.072, y: .092, z: -.072 }, { x: -.102, y: .092, z: -.072 }, .0023, m.cable, 'living-phone');
  });
  picture('mesa lateral · retrato das férias', 3.12, .8025, 9.08, .15, .16, m.family, 0, 'living-photo');
  rod('retrato · cavalete de apoio', { x: 3.12, y: .691, z: 9.04 }, { x: 3.12, y: .85, z: 9.075 }, .005, m.darkWood);
  // Lamp moved to a small matching plinth so the .42m phone table stays usable.
  bevel('abajur · apoio lateral', .30, .026, .28, 3.16, .715, 8.76, m.wood, .007);
  g.lathe('abajur · pé de madeira torneada', [[.065, 0], [.082, .012], [.065, .035], [.023, .06], [.045, .13], [.050, .16], [.023, .23], [.018, .27]], 3.16, .73, 8.76, m.darkWood, 12);
  rod('abajur · eixo metálico', { x: 3.16, y: .96, z: 8.76 }, { x: 3.16, y: 1.16, z: 8.76 }, .005, m.metal);
  g.lathe('abajur · cúpula de tecido', [[.155, 0], [.157, .016], [.095, .24], [.091, .248]], 3.16, 1.02, 8.76, m.lampshade, 16);
  for (const y of [1.023, 1.263]) { const ring = MeshBuilder.CreateTorus('abajur · borda da cúpula', { diameter: y < 1.1 ? .312 : .185, thickness: .007, tessellation: 16 }, scene); ring.position.set(3.16, y, 8.76); g.add(ring, trim); }
  g.sphere('abajur · lâmpada', .045, .07, .045, 3.16, 1.12, 8.76, m.bulb);
  for (const x of [3.06, 3.26]) for (const z of [8.67, 8.85]) board('apoio do abajur · perna', .025, .70, .025, x, .35, z, m.darkWood);
  pot(6.52, 0, 8.58, false, 1.25);
  bevel('planta · prateleira fixada na parede', .30, .040, .29, 6.70, 1.82, 8.39, m.wood, .006);
  for (const z of [8.29, 8.49]) rod('planta · suporte da prateleira', { x: 6.84, y: 1.67, z }, { x: 6.58, y: 1.80, z }, .009, m.metal);
  pot(6.60, 1.84, 8.39, true, .80);
  pot(3.17, .195, 9.20, false, .65);
  picture('parede sul · fotografia da família', 4.96, 1.64, 11.815, .46, .33, m.family, Math.PI);

  // Opaline ceiling fixture: ascending outer profile gives outward normals.
  c('luminária · canopla', .028, .11, .11, 4.77, 2.578, 10.02, m.metal, undefined, 12);
  rod('luminária · haste', { x: 4.77, y: 2.56, z: 10.02 }, { x: 4.77, y: 2.40, z: 10.02 }, .007, m.darkWood);
  g.lathe('luminária · globo opalino facetado', [[.012, -.39], [.075, -.385], [.145, -.35], [.19, -.29], [.18, -.22], [.13, -.18], [.028, -.17]], 4.77, 2.60, 10.02, m.bulb, 16);
  c('luminária · aro de latão', .025, .25, .25, 4.77, 2.422, 10.02, m.metal, undefined, 16);

  const staticMeshes = g.merge(), meshes = [...staticMeshes, ...[...g.targets.values()].flat()];
  m.tvOn.maxSimultaneousLights = 5;
  // Compilation/picking refer to the final batches, never disposed primitives.
  const screen = g.targets.get('living-tv')!.find(mesh => mesh.material === m.tvOff)!;
  for (const mesh of meshes) { mesh.name = 'sala · ' + mesh.name; mesh.metadata = { ...mesh.metadata, livingRoom: true }; if (mesh.material) (mesh.material as StandardMaterial).maxSimultaneousLights = 5; }
  for (const light of existingLights) if (!light.includedOnlyMeshes.length) light.excludedMeshes.push(...meshes);
  const ambient = new HemisphericLight('sala · ambiente difuso', Vector3.Up(), scene); ambient.intensity = .44; ambient.diffuse = new Color3(.92, .87, .79); ambient.groundColor = new Color3(.29, .24, .20);
  const sun = new DirectionalLight('sala · manhã pela janela', new Vector3(-1, -.60, .19).normalize(), scene); sun.position.set(10, 4.1, 8.5); sun.diffuse = new Color3(1, .87, .68); sun.intensity = .89; sun.shadowMinZ = .1; sun.shadowMaxZ = 22; sun.shadowFrustumSize = 12;
  const ceilingLight = new PointLight('sala · luz da luminária', new Vector3(4.77, 2.22, 10.02), scene); ceilingLight.diffuse = new Color3(1, .79, .53); ceilingLight.intensity = .70; ceilingLight.range = 5.8;
  const lampLight = new PointLight('sala · luz do abajur', new Vector3(3.16, 1.14, 8.76), scene); lampLight.diffuse = new Color3(1, .73, .41); lampLight.intensity = .27; lampLight.range = 2.5;
  const tvLight = new PointLight('sala · luz suave da tela', new Vector3(4.80, 1.10, 8.91), scene); tvLight.diffuse = new Color3(.60, .73, .90); tvLight.intensity = .20; tvLight.range = 1.65;
  const lights = [ambient, sun, ceilingLight, lampLight, tvLight];
  for (const light of lights) light.includedOnlyMeshes = [...meshes];
  // Adopt only top-level groups/meshes while the placement node is identity.
  // Single target meshes can still belong to a furnished group after batching.
  // Their local transforms, UVs, normals and materials are never rewritten.
  const placement = new TransformNode('sala · posição no pé da escada', scene);
  for (const group of g.groups) if (!group.parent) group.parent = placement;
  for (const mesh of meshes) if (!mesh.parent) mesh.parent = placement;
  for (const light of lights) light.parent = placement;
  placement.position.set(LIVING_ROOM_PLACEMENT.x, LIVING_ROOM_PLACEMENT.y, LIVING_ROOM_PLACEMENT.z);
  placement.rotation.y = LIVING_ROOM_PLACEMENT.yaw;
  placement.computeWorldMatrix(true);
  for (const mesh of meshes) mesh.computeWorldMatrix(true);
  const shadows = new ShadowGenerator(1024, sun); shadows.bias = .001; shadows.normalBias = .012; shadows.useBlurExponentialShadowMap = true; shadows.blurScale = 1; shadows.blurKernel = 5;
  const noShadow = new Set([m.lace, m.crochet, m.glass, m.sky, m.leaf, m.bulb, m.tvOff, m.tvOn]);
  for (const mesh of meshes) if (mesh.metadata?.castShadow && !noShadow.has(mesh.material as StandardMaterial)) shadows.addShadowCaster(mesh);
  const shadowMap = shadows.getShadowMap()!; shadowMap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  let tvOn = false, disposed = false;
  function refreshShadows() { if (!disposed) shadowMap.resetRefreshCounter(); }
  // Keep a stable light definition for both material variants: zero energy
  // when off avoids a first-interaction shader change without per-frame work.
  function setTV(on: boolean) { tvOn = on; screen.material = on ? m.tvOn : m.tvOff; tvLight.intensity = on ? .20 : 0; }
  setTV(false);
  void Promise.allSettled([
    ...meshes.filter(mesh => mesh.material).map(mesh => (mesh.material as StandardMaterial).forceCompilationAsync(mesh, { useInstances: false })),
    m.tvOn.forceCompilationAsync(screen, { useInstances: false }),
  ]).then(refreshShadows);
  return { meshes, targets: g.targets, setTV, get tvOn() { return tvOn; }, refreshShadows,
    get diagnostics() { return { version: 'sala-entrada-direta-1', meshes: meshes.length, tvOn, bounds: LIVING_ROOM_WORLD, localBounds: room, placement: LIVING_ROOM_PLACEMENT, screen: livingToWorld({ x: 4.80, y: 1.10, z: 8.61 }), staticShadowMap: 1024, materials: m.diagnostics }; },
    dispose() { disposed = true; shadows.dispose(); for (const light of lights) light.dispose(); for (const mesh of meshes) if (!mesh.isDisposed()) mesh.dispose(); for (const node of g.groups) node.dispose(); placement.dispose(); m.dispose(); },
  };
}
