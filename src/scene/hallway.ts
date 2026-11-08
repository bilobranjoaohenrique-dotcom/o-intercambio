import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { ROOM, STAIRS, KITCHEN } from '../game/layout';
import { HALLWAY, BOTTOM_LANDING, HALLWAY_FURNITURE, HALLWAY_OBJECTS, STAIR_POSTS, STAIR_RAILS } from '../game/hallwayLayout';
import { HallwayGeometry } from './hallwayGeometry';
import { createHallwayMaterials } from './hallwayMaterials';

/** One navigable connecting set. Bedroom, kitchen, characters and story are
 * kept in their existing modules; only this corridor owns these meshes. */
export function buildHallway(scene: Scene) {
  const m = createHallwayMaterials(scene), g = new HallwayGeometry(scene);
  const b = g.box.bind(g), board = g.board.bind(g), c = g.cylinder.bind(g), rod = g.rod.bind(g), bevel = g.bevel.bind(g);
  const f = HALLWAY.floor, cx = (HALLWAY.minX + HALLWAY.maxX) / 2, upperLength = HALLWAY.endZ - HALLWAY.startZ;
  const stairLength = STAIRS.endZ - STAIRS.startZ, rise = (STAIRS.topY - STAIRS.bottomY) / STAIRS.steps, tread = stairLength / STAIRS.steps;
  const window = { x: HALLWAY.maxX, z: 6.65, y: f + 1.57, width: 1.06, height: 1.20 };
  const wz0 = window.z - window.width / 2, wz1 = window.z + window.width / 2, wy0 = window.y - window.height / 2, wy1 = window.y + window.height / 2;
  // The cap is recessed behind the bedroom wall, preventing a coplanar seam
  // from changing the already approved reverse view inside the bedroom.
  const wallStart = HALLWAY.startZ + .121, ceiling = HALLWAY.ceiling;
  function wall(name: string, x: number, z0: number, z1: number, y0: number, y1: number) {
    return board(name, .12, y1 - y0, z1 - z0, x, (y0 + y1) / 2, (z0 + z1) / 2, m.wallpaper, undefined, 1.15);
  }
  board('corredor · piso superior', HALLWAY.maxX - HALLWAY.minX, .12, upperLength, cx, f - .06,
    (HALLWAY.startZ + HALLWAY.endZ) / 2, m.floor, undefined, 1.1);
  board('corredor · teto', HALLWAY.maxX - HALLWAY.minX + .24, .12, BOTTOM_LANDING.endZ - wallStart, cx, ceiling + .06,
    (wallStart + BOTTOM_LANDING.endZ) / 2, m.ceiling, undefined, 1.1);
  wall('corredor · parede esquerda superior', HALLWAY.minX - .06, wallStart, STAIRS.startZ, f, ceiling);
  wall('corredor · parede direita antes da janela', HALLWAY.maxX + .06, wallStart, wz0, f, ceiling);
  wall('corredor · parede direita depois da janela', HALLWAY.maxX + .06, wz1, STAIRS.startZ, f, ceiling);
  wall('corredor · parede sob a janela', HALLWAY.maxX + .06, wz0, wz1, f, wy0);
  wall('corredor · parede sobre a janela', HALLWAY.maxX + .06, wz0, wz1, wy1, ceiling);
  wall('escada · parede lateral contínua', HALLWAY.minX - .06, STAIRS.startZ, STAIRS.endZ, STAIRS.bottomY, ceiling);
  // Close the obsolete side connection. The flight, upper corridor, handrails
  // and lights stay unchanged; the original bottom landing now faces the room.
  wall('escada · parede lateral direita contínua', HALLWAY.maxX + .06, STAIRS.startZ, STAIRS.endZ, STAIRS.bottomY, ceiling);
  // The enclosed stairwell has an opaque interior foundation. It hides the
  // pre-existing exterior garden beneath the lateral rail gaps; its top is
  // below the last real tread, with no coincident horizontal surfaces.
  board('escada · contrapiso interno sob o lance', HALLWAY.maxX - HALLWAY.minX, .08, stairLength,
    cx, -.055, (STAIRS.startZ + STAIRS.endZ) / 2, m.darkWood, undefined, 1.1);
  // A lower landing widens to the original kitchen aperture. Its floor ends
  // at the kitchen floor's start rather than rendering a coincident overlap.
  const landingEnd = KITCHEN.startZ;
  board('escada · patamar inferior', BOTTOM_LANDING.maxX - BOTTOM_LANDING.minX, .12, landingEnd - STAIRS.endZ,
    (BOTTOM_LANDING.minX + BOTTOM_LANDING.maxX) / 2, -.06, (STAIRS.endZ + landingEnd) / 2, m.floor, undefined, 1.1);
  // Stop before the original kitchen jambs. The two rooms share a seam,
  // never overlapping differently textured wall faces.
  const returnEnd = KITCHEN.startZ - .151;
  for (const x of [BOTTOM_LANDING.minX - .06, BOTTOM_LANDING.maxX + .06])
    wall('escada · retorno do patamar inferior', x, STAIRS.endZ, returnEnd, 0, ceiling);
  for (const [x0, x1] of [[BOTTOM_LANDING.minX, HALLWAY.minX], [HALLWAY.maxX, BOTTOM_LANDING.maxX]])
    board('escada · fechamento da expansão do patamar', x1 - x0, ceiling, .12, (x0 + x1) / 2,
      ceiling / 2, STAIRS.endZ - .06, m.wallpaper, undefined, 1.15);
  // Close the upper stairwell above the existing 3.25m kitchen ceiling. Its
  // lower opening and every original kitchen surface remain untouched.
  const endWallFront = KITCHEN.startZ - .15;
  board('escada · parede alta de fechamento', BOTTOM_LANDING.maxX - BOTTOM_LANDING.minX, ceiling - 3.25, .12,
    (BOTTOM_LANDING.minX + BOTTOM_LANDING.maxX) / 2, (ceiling + 3.25) / 2, endWallFront + .06, m.wallpaper, undefined, 1.15);
  board('escada · moldura da paisagem frontal', .59, .42, .026, cx, 4.20, endWallFront - .022, m.darkWood);
  g.plane('escada · paisagem neutra frontal', .54, .37, cx, 4.20, endWallFront - .037, m.landscapes[1]);
  board('escada · cruz doméstica discreta vertical', .027, .22, .014, cx, 4.77, endWallFront - .035, m.darkWood);
  board('escada · cruz doméstica discreta horizontal', .13, .025, .015, cx, 4.81, endWallFront - .037, m.darkWood);
  for (const side of [-1, 1]) {
    const x = side < 0 ? HALLWAY.minX + .014 : HALLWAY.maxX - .014;
    board('corredor · rodapé pintado de branco', .028, .105, upperLength - .121, x, f + .0525,
      (wallStart + STAIRS.startZ) / 2, m.white);
    for (const yy of [ceiling - .02, ceiling - .058])
      board('corredor · moldura do teto', .043, .028, BOTTOM_LANDING.endZ - wallStart, x, yy,
        (wallStart + BOTTOM_LANDING.endZ) / 2, m.white);
  }
  // Side doors remain physically closed: they have no interaction registry
  // entries. Detailed frames and recessed panels replace a plain wooden slab.
  for (const z of [4.85, 6.25]) {
    const face = HALLWAY.minX + .022, doorH = 2.10, doorW = .80;
    board('porta lateral · folha fechada', .035, doorH, doorW, face, f + doorH / 2, z, m.wood);
    for (const end of [-1, 1]) board('porta lateral · guarnição vertical', .057, doorH + .08, .06,
      face + .012, f + (doorH + .08) / 2, z + end * (doorW / 2 + .04), m.white);
    board('porta lateral · guarnição superior', .058, .065, doorW + .14, face + .012, f + doorH + .05, z, m.white);
    for (const [yy, hh] of [[.48, .66], [1.48, .89]]) {
      board('porta lateral · painel rebaixado', .008, hh, doorW - .18, face + .022, f + yy, z, m.darkWood);
      for (const zz of [z - .32, z + .32]) board('porta lateral · moldura do painel', .011, hh + .045, .027, face + .029, f + yy, zz, m.wood);
      for (const y of [f + yy - hh / 2 - .014, f + yy + hh / 2 + .014])
        board('porta lateral · travessa do painel', .011, .027, doorW - .135, face + .029, y, z, m.wood);
    }
    const plate = c('porta lateral · espelho de latão', .010, .070, .070, face + .044, f + 1.02, z - .28, m.metal, undefined, 10); plate.rotation.z = Math.PI / 2;
    const knob = g.sphere('porta lateral · maçaneta redonda', .069, .065, .065, face + .078, f + 1.02, z - .28, m.metal);
    knob.metadata.castShadow = false;
  }
  // Woven runner: one whole ornamental pattern, not a stretched wood atlas.
  b('corredor · base do tapete', .78, .007, 3.23, cx, f + .004, 5.43, m.fabric);
  const runner = g.plane('corredor · tapete oriental gasto', .78, 3.23, cx, f + .009, 5.43, m.rug);
  runner.rotation.x = Math.PI / 2;
  for (const z of [5.43 - 3.23 / 2, 5.43 + 3.23 / 2]) for (let i = 0; i < 24; i++)
    rod('tapete · franja curta', { x: cx - .365 + i * .0315, y: f + .012, z }, { x: cx - .365 + i * .0315, y: f + .011, z: z + (z < 5.43 ? -.026 : .026) }, .0011, m.white);
  // Window with a genuine wall opening, restrained glazing and folded lace.
  for (const z of [wz0 - .025, wz1 + .025]) board('janela · marco vertical', .085, window.height + .12, .055, window.x - .018, window.y, z, m.white);
  for (const y of [wy0 - .025, wy1 + .025]) board('janela · marco horizontal', .085, .055, window.width + .16, window.x - .018, y, window.z, m.white);
  board('janela · peitoril', .20, .045, window.width + .19, window.x - .035, wy0 - .045, window.z, m.white);
  board('janela · montante central', .045, window.height, .032, window.x - .02, window.y, window.z, m.white);
  board('janela · travessa', .045, .03, window.width, window.x - .02, window.y + .04, window.z, m.white);
  const glass = g.plane('janela · vidro', window.width, window.height, window.x + .02, window.y, window.z, m.glass, Math.PI / 2);
  glass.isPickable = false;
  rod('janela · varão da cortina', { x: window.x - .13, y: wy1 + .15, z: wz0 - .16 }, { x: window.x - .13, y: wy1 + .15, z: wz1 + .16 }, .010, m.darkWood);
  for (const start of [wz0 - .07, wz1 - .43]) {
    const lace = g.cloth('janela · cortina rendada pregueada', 12, 20, (u, v) => ({
      x: window.x - .12 - Math.cos(u * Math.PI * 8) * .025,
      y: wy1 + .11 - v * 1.48 + Math.sin(u * 19) * .008, z: start + u * .50,
    }), m.lace); lace.metadata.castShadow = false;
    for (let i = 0; i < 5; i++) c('janela · argola da renda', .025, .024, .024, window.x - .13, wy1 + .125, start + .025 + i * .11, m.metal, undefined, 6);
  }
  const sky = g.plane('janela · céu da manhã ao longe', 9, 12, window.x + 9, 6.0, window.z, m.sky, Math.PI / 2);
  sky.isPickable = false; sky.metadata.castShadow = false;
  // The original staircase reaches the same kitchen without moving it. Tread
  // heights and clear width use precisely the values in the collision module.
  for (let i = 0; i < STAIRS.steps; i++) {
    const y = STAIRS.topY - (i + 1) * rise, z = STAIRS.startZ + (i + .5) * tread;
    board('escada · degrau ' + (i + 1), STAIRS.maxX - STAIRS.minX, .045, tread, cx, y - .0225, z, m.floor, undefined, 1.1);
    board('escada · espelho ' + (i + 1), STAIRS.maxX - STAIRS.minX, rise, .025, cx, y + rise / 2 - .018, z - tread / 2 + .0125, m.wood);
    bevel('escada · nariz arredondado ' + (i + 1), STAIRS.maxX - STAIRS.minX + .012, .038, .033, cx, y - .004, z - tread / 2 + .009, m.wood, .009);
  }
  // Sloping closed stringers support the full flight. Their top edges follow
  // the real treads rather than a floating decorative diagonal.
  for (const rail of STAIR_RAILS) {
    const a = { x: rail.x, y: STAIRS.topY - .19, z: STAIRS.startZ - .02 }, end = { x: rail.x, y: -.19, z: STAIRS.endZ + .02 };
    const stringer = g.rod('escada · longarina de madeira', a, end, .065, m.darkWood);
    stringer.scaling.x = .45;
    rod('escada · corrimão contínuo', { x: rail.x, y: STAIRS.topY + .91, z: STAIRS.startZ - .07 }, { x: rail.x, y: .91, z: STAIRS.endZ + .05 }, .035, m.darkWood);
    rod('escada · reforço inferior dos balaústres', { x: rail.x, y: STAIRS.topY + .08, z: STAIRS.startZ }, { x: rail.x, y: .08, z: STAIRS.endZ }, .020, m.darkWood);
    for (let i = 0; i < STAIRS.steps; i++) {
      const z = STAIRS.startZ + (i + .65) * tread, floor = STAIRS.topY - (i + 1) * rise;
      const topY = STAIRS.topY + .91 - (z - (STAIRS.startZ - .07)) / (stairLength + .12) * 3;
      const length = topY - floor;
      g.lathe('escada · balaústre torneado', [[.018, 0], [.018, .11], [.014, .15], [.012, .27], [.024, .35], [.018, .42], [.011, .52], [.014, length - .12], [.018, length - .10], [.018, length]], rail.x, floor + .01, z, m.darkWood, 8);
    }
  }
  for (const post of STAIR_POSTS) {
    board('escada · poste de sustentação', post.width, .84, post.depth, post.x, post.floor + .42, post.z, m.darkWood);
    for (const yy of [post.floor + .08, post.floor + .76]) bevel('escada · moldura do poste', .117, .040, .117, post.x, yy, post.z, m.wood, .007);
    bevel('escada · capitel do poste', .125, .050, .125, post.x, post.floor + .86, post.z, m.wood, .009);
    g.sphere('escada · remate facetado do poste', .11, .115, .11, post.x, post.floor + .945, post.z, m.darkWood);
  }
  // A shallow console leaves the specified physical aisle clear.
  const console = HALLWAY_FURNITURE.console, top = f + console.height;
  bevel('aparador · tampo com borda', console.width, .040, console.depth, console.x, top - .020, console.z, m.wood, .008);
  for (const x of [console.x - console.width / 2 + .027, console.x + console.width / 2 - .027]) for (const z of [console.z - console.depth / 2 + .04, console.z + console.depth / 2 - .04]) {
    board('aparador · perna', .037, console.height - .045, .037, x, f + (console.height - .045) / 2, z, m.darkWood);
    board('aparador · pé com sapata', .044, .035, .044, x, f + .0175, z, m.wood);
  }
  board('aparador · prateleira inferior', console.width - .035, .025, console.depth - .055, console.x, f + .17, console.z, m.wood);
  board('aparador · saia frontal', .024, .13, console.depth - .06, console.x - console.width / 2 + .016, top - .095, console.z, m.darkWood);
  for (const z of [console.z - .19, console.z + .19]) {
    board('aparador · frente de gaveta', .013, .095, .35, console.x - console.width / 2 + .009, top - .089, z, m.wood);
    g.sphere('aparador · puxador', .020, .019, .019, console.x - console.width / 2 - .008, top - .089, z, m.metal);
  }
  for (let i = 0; i < 5; i++) {
    board('aparador · livro guardado', .18, .032, .25, console.x, f + .196 + i * .034, console.z + .19, i % 2 ? m.fabric : m.darkWood);
    b('aparador · páginas do livro', .17, .024, .242, console.x - .004, f + .197 + i * .034, console.z + .19, m.white);
  }
  const doily = g.cloth('aparador · toalhinha de renda', 12, 24, (u, v) => ({
    x: console.x + (u - .5) * .31, y: top + .009 - Math.max(0, (Math.abs(u - .5) - .40) / .1) * .085,
    z: console.z + (v - .5) * .79,
  }), m.lace); doily.metadata.castShadow = false;
  // Beige push-button residential telephone with a separate receiver, keys,
  // sloped housing and a genuinely coiled three-dimensional cord.
  const phone = { x: console.x - .004, y: top + .014, z: console.z - .075 };
  const phoneMesh = new Mesh('telefone · corpo inclinado', scene), pp = [-.083, 0, -.13, .083, 0, -.13, .083, 0, .13, -.083, 0, .13, -.083, .026, -.13, .083, .067, -.13, .083, .067, .13, -.083, .026, .13];
  const pi = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5], pn: number[] = [];
  VertexData.ComputeNormals(pp, pi, pn); const pdata = new VertexData(); pdata.positions = pp; pdata.indices = pi; pdata.normals = pn; pdata.uvs = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]; pdata.applyToMesh(phoneMesh);
  phoneMesh.position.set(phone.x, phone.y, phone.z); g.add(phoneMesh, m.telephone);
  for (const z of [phone.z - .093, phone.z + .093]) g.sphere('telefone · cápsula do fone', .065, .043, .075, phone.x + .042, phone.y + .091, z, m.telephone);
  bevel('telefone · haste do fone', .037, .028, .19, phone.x + .046, phone.y + .105, phone.z, m.telephone, .008);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
    const x = phone.x - .056 + row * .019, y = phone.y + .026 + (x - phone.x + .083) / .166 * .041;
    bevel('telefone · tecla', .015, .006, .025, x, y + .005, phone.z - .041 + col * .036, m.white, .002);
    b('telefone · número impresso', .005, .001, .007, x, y + .0088, phone.z - .041 + col * .036, m.rubber);
  }
  const cordPath: Vector3[] = [], coilX = console.x - console.width / 2 - .015;
  for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * Math.PI * 20; cordPath.push(new Vector3(coilX + Math.cos(a) * .007, phone.y + .08 - t * .15, phone.z + .135 + Math.sin(a) * .007)); }
  const coil = MeshBuilder.CreateTube('telefone · fio espiralado', { path: cordPath, radius: .0022, tessellation: 4, cap: Mesh.CAP_ALL }, scene); g.add(coil, m.rubber);
  rod('telefone · ligação do fone ao fio', { x: phone.x + .04, y: phone.y + .08, z: phone.z + .115 }, { x: coilX, y: phone.y + .08, z: phone.z + .135 }, .0024, m.rubber);
  const returnPath = [new Vector3(coilX, phone.y - .07, phone.z + .135), new Vector3(coilX - .006, phone.y - .045, phone.z + .145),
    new Vector3(coilX - .006, phone.y + .032, phone.z + .15), new Vector3(phone.x - .081, phone.y + .035, phone.z + .12)];
  const returnCord = MeshBuilder.CreateTube('telefone · retorno do fio à base', { path: returnPath, radius: .0022, tessellation: 4, cap: Mesh.CAP_ALL }, scene); g.add(returnCord, m.rubber);
  // A small ceramic mug and a real hollow terracotta pot carry the household
  // detail without introducing optional interactions or new story content.
  const mug = { x: console.x - .012, z: console.z - .325 };
  g.lathe('aparador · caneca de cerâmica', [[.026, 0], [.031, .007], [.037, .083], [.035, .089], [.029, .084], [.025, .014], [.02, .012]], mug.x, top + .015, mug.z, m.ceramic, 12);
  const handle = MeshBuilder.CreateTorus('aparador · alça da caneca', { diameter: .047, thickness: .007, tessellation: 10 }, scene); handle.rotation.x = Math.PI / 2; handle.position.set(mug.x, top + .06, mug.z - .043); g.add(handle, m.ceramic);
  c('aparador · café na caneca', .003, .052, .052, mug.x, top + .084, mug.z, m.darkWood, undefined, 12);
  function pottedPlant(x: number, y: number, z: number, hanging = false) {
    g.lathe('planta · vaso de barro', [[.055, 0], [.072, .015], [.082, .12], [.09, .125], [.09, .14], [.075, .145], [.066, .027], [.035, .02]], x, y, z, m.terracotta, 12);
    c('planta · terra', .006, .13, .13, x, y + .128, z, m.darkWood, undefined, 10);
    for (let branch = 0; branch < (hanging ? 8 : 6); branch++) {
      const a = branch * 2.4, reach = hanging ? .15 : .105, length = hanging ? .38 + branch % 3 * .08 : .17 + branch % 2 * .045;
      const ex = Math.min(HALLWAY.maxX - .045, x + Math.cos(a) * reach), ez = z + Math.sin(a) * reach;
      const start = { x, y: y + .14, z }, end = { x: ex, y: y + .14 + (hanging ? -length : length), z: ez };
      rod('planta · caule', start, end, .0025, m.leaf);
      for (let i = 0; i < 5; i++) {
        const t = (i + 1) / 5, xx = x + (ex - x) * t, yy = start.y + (end.y - start.y) * t, zz = z + (ez - z) * t;
        g.leaf('planta · folha dobrada', xx, yy, zz, hanging ? .075 : .095, hanging ? .035 : .060, a + (i % 2 ? .7 : -.7), hanging ? -.45 : .35, m.leaf);
      }
    }
    if (hanging) for (const dz of [-.06, .06]) rod('planta · corda do vaso', { x, y: ceiling - .10, z: z + dz }, { x: x + .055, y: y + .12, z: z + dz }, .0025, m.rubber);
  }
  pottedPlant(console.x, top + .017, console.z + .275);
  pottedPlant(HALLWAY.maxX - .18, f + 1.86, 7.43, true);
  // Ordinary family photographs and neutral landscapes: no individual girl
  // portrait, no coded clue and no false interaction prompt on decoration.
  function picture(name: string, side: -1 | 1, z: number, y: number, w: number, h: number, material: StandardMaterial) {
    const x = side < 0 ? HALLWAY.minX + .018 : HALLWAY.maxX - .018, direction = side < 0 ? 1 : -1;
    board(name + ' · fundo da moldura', .027, h + .055, w + .055, x, y, z, m.darkWood);
    const face = x + direction * .017;
    g.plane(name, w, h, face, y, z, material, side < 0 ? -Math.PI / 2 : Math.PI / 2);
    for (const zz of [z - w / 2 - .012, z + w / 2 + .012]) board(name + ' · lateral da moldura', .014, h + .055, .022, face, y, zz, m.wood);
    for (const yy of [y - h / 2 - .014, y + h / 2 + .014]) board(name + ' · travessa da moldura', .014, .024, w + .055, face, yy, z, m.wood);
  }
  picture('corredor · fotografia da família', -1, 3.88, f + 1.66, .53, .43, m.family);
  picture('corredor · paisagem entre portas', -1, 5.55, f + 1.58, .33, .37, m.landscapes[0]);
  picture('corredor · paisagem junto à escada', -1, 7.12, f + 1.62, .44, .34, m.landscapes[1]);
  picture('corredor · quadro neutro de paisagem', 1, 4.72, f + 1.67, .55, .40, m.landscapes[2]);
  picture('corredor · fotografia sobre o aparador', 1, 5.50, f + 1.63, .37, .32, m.family);
  picture('escada · paisagem na descida', -1, 9.1, 3.75, .41, .32, m.landscapes[0]);
  picture('escada · fotografia no patamar', 1, 10.45, 2.6, .37, .32, m.family);
  const sw = HALLWAY_OBJECTS.switch;
  bevel('corredor · placa do interruptor', .018, .115, .078, sw.x, sw.y, sw.z, m.white, .004, 'hall-switch');
  const rocker = b('corredor · tecla do interruptor', .014, .065, .039, sw.x + .018, sw.y, sw.z, m.telephone, 'hall-switch');
  const bulb = m.material('vidro opalino das luminárias', '#e2d3b4'); bulb.specularColor.set(.06, .05, .03);
  function ceilingFixture(z: number, yy: number, wallMount = false) {
    if (wallMount) {
      board('escada · base da arandela', .045, .16, .10, HALLWAY.maxX - .025, yy, z, m.metal);
      g.sphere('escada · vidro da arandela', .10, .17, .13, HALLWAY.maxX - .085, yy, z, bulb);
      return;
    }
    c('corredor · canopla da luminária', .03, .105, .105, cx, yy - .015, z, m.metal, undefined, 10);
    rod('corredor · haste da luminária', { x: cx, y: yy - .03, z }, { x: cx, y: yy - .16, z }, .006, m.darkWood);
    g.lathe('corredor · cúpula opalina facetada', [[.015, -.39], [.07, -.39], [.13, -.36], [.17, -.30], [.15, -.23], [.09, -.19], [.02, -.18]], cx, yy, z, bulb, 12);
    c('corredor · aro da luminária', .024, .22, .22, cx, yy - .225, z, m.metal, undefined, 12);
  }
  const upperFixtureZ = (HALLWAY.startZ + HALLWAY.endZ) / 2;
  ceilingFixture(upperFixtureZ, ceiling); ceilingFixture(10.30, 2.95, true);
  const staticMeshes = g.merge(), meshes = [...staticMeshes, ...[...g.targets.values()].flat()];
  for (const mesh of meshes) { mesh.name = 'corredor · ' + mesh.name; mesh.metadata = { ...mesh.metadata, hallway: true }; if (mesh.material) (mesh.material as StandardMaterial).maxSimultaneousLights = 4; }
  const ambient = new HemisphericLight('corredor · ambiente da manhã', Vector3.Up(), scene); ambient.intensity = .32; ambient.diffuse = new Color3(.91, .86, .78); ambient.groundColor = new Color3(.26, .23, .20);
  const sun = new DirectionalLight('corredor · sol pela janela', new Vector3(-1, -.34, .12).normalize(), scene); sun.position.set(8.5, 7.7, 6.1); sun.diffuse = new Color3(1, .80, .57); sun.intensity = 1.06; sun.shadowMinZ = .1; sun.shadowMaxZ = 25; sun.shadowFrustumSize = 12;
  const ceilingLight = new PointLight('corredor · luminária superior', new Vector3(cx, ceiling - .37, upperFixtureZ), scene); ceilingLight.diffuse = new Color3(1, .78, .51); ceilingLight.intensity = .63; ceilingLight.range = 6.8;
  const stairLight = new PointLight('escada · luz suave da arandela', new Vector3(HALLWAY.maxX - .19, 2.95, 10.30), scene); stairLight.diffuse = new Color3(1, .76, .48); stairLight.intensity = .35; stairLight.range = 4.8;
  const lights = [ambient, sun, ceilingLight, stairLight];
  for (const light of lights) light.includedOnlyMeshes = [...meshes];
  const shadows = new ShadowGenerator(1024, sun); shadows.bias = .001; shadows.normalBias = .012; shadows.useBlurExponentialShadowMap = true; shadows.blurScale = 1; shadows.blurKernel = 5;
  const noShadow = new Set([m.lace, m.glass, m.sky, m.leaf, bulb]);
  for (const mesh of meshes) if (mesh.metadata?.castShadow && !noShadow.has(mesh.material as StandardMaterial)) shadows.addShadowCaster(mesh);
  const shadowMap = shadows.getShadowMap()!; shadowMap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  let lightOn = true, disposed = false;
  function refreshShadows() { if (!disposed) shadowMap.resetRefreshCounter(); }
  function setLight(on: boolean) { lightOn = on; ceilingLight.setEnabled(on); stairLight.setEnabled(on); rocker.rotation.z = on ? -.12 : .12; bulb.emissiveColor.set(on ? .42 : .01, on ? .31 : .009, on ? .18 : .006); }
  function addDoorCasters(extra: readonly AbstractMesh[]) { for (const mesh of extra) shadows.addShadowCaster(mesh); refreshShadows(); }
  setLight(true);
  void Promise.allSettled(meshes.filter(mesh => mesh.material).map(mesh => (mesh.material as StandardMaterial).forceCompilationAsync(mesh, { useInstances: false }))).then(refreshShadows);
  return { meshes, targets: g.targets, setLight, get lightOn() { return lightOn; }, refreshShadows, addDoorCasters,
    get diagnostics() { return { version: 'corredor-referencia-1', meshes: meshes.length, upper: { width: HALLWAY.maxX - HALLWAY.minX, length: upperLength }, stairs: { width: STAIRS.maxX - STAIRS.minX, steps: STAIRS.steps, rise }, materials: m.diagnostics }; },
    dispose() { disposed = true; shadows.dispose(); for (const light of lights) light.dispose(); for (const mesh of meshes) if (!mesh.isDisposed()) mesh.dispose(); m.dispose(); },
  };
}
