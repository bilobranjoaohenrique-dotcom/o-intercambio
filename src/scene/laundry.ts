import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { LAUNDRY, LAUNDRY_KITCHEN_DOOR as KD, LAUNDRY_GARAGE_DOOR as GD,
  LAUNDRY_THRESHOLD, LAUNDRY_WEST_FACE, LAUNDRY_NORTH_FACE,
  LAUNDRY_FURNITURE as F, LAUNDRY_OPEN_LEAF } from '../game/laundryLayout';
import { HomeGeometry } from './props';
import { createLaundryMaterials } from './laundryMaterials';

/** A static service room connected by physical doorways, with no new quests. */
export function buildLaundry(scene: Scene, parent: TransformNode) {
  const previousLights = [...scene.lights], root = new TransformNode('lavanderia da casa', scene); root.parent = parent;
  const m = createLaundryMaterials(scene), g = new HomeGeometry(scene), b = g.box.bind(g), c = g.cylinder.bind(g), rod = g.rod.bind(g);
  const w = LAUNDRY.maxX - LAUNDRY.minX, d = LAUNDRY.maxZ - LAUNDRY.minZ;
  const cx = (LAUNDRY.minX + LAUNDRY.maxX) / 2, cz = (LAUNDRY.minZ + LAUNDRY.maxZ) / 2;
  function mapped(mesh: Mesh, period: number) {
    const p = mesh.getVerticesData(VertexBuffer.PositionKind)!, n = mesh.getVerticesData(VertexBuffer.NormalKind)!, uv: number[] = [];
    mesh.computeWorldMatrix(true); const world = mesh.getWorldMatrix();
    for (let i = 0; i < p.length; i += 3) {
      const v = Vector3.TransformCoordinates(new Vector3(p[i], p[i + 1], p[i + 2]), world);
      const normal = Vector3.TransformNormal(new Vector3(n[i], n[i + 1], n[i + 2]), world);
      uv.push((Math.abs(normal.x) > .5 ? v.z : v.x) / period, (Math.abs(normal.y) > .5 ? v.z : v.y) / period);
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uv); return mesh;
  }
  const board = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number, material: StandardMaterial, period = .5) =>
    mapped(b('lavanderia · ' + name, width, height, depth, x, y, z, material), period);
  board('piso cerâmico', w, .10, d, cx, -.05, cz, m.floor, .34).metadata.castShadow = false;
  board('soleira contínua até a garagem', GD.maxX - GD.minX, .10, GD.maxZ - GD.minZ, (GD.minX + GD.maxX) / 2, -.05, (GD.minZ + GD.maxZ) / 2, m.floor, .34).metadata.castShadow = false;
  const half = 1.30;
  function west(z0: number, z1: number) {
    board('azulejo oeste', .020, half, z1 - z0, LAUNDRY_WEST_FACE - .010, half / 2, (z0 + z1) / 2, m.tile, .30);
    board('pintura oeste', .020, LAUNDRY.ceiling - half, z1 - z0, LAUNDRY_WEST_FACE - .010, (LAUNDRY.ceiling + half) / 2, (z0 + z1) / 2, m.paint, 1);
  }
  west(15.956, KD.minZ); west(KD.maxZ, LAUNDRY.maxZ);
  board('verga para a cozinha', .020, LAUNDRY.ceiling - KD.height, KD.maxZ - KD.minZ, LAUNDRY_WEST_FACE - .010, (LAUNDRY.ceiling + KD.height) / 2, (KD.minZ + KD.maxZ) / 2, m.paint, 1);
  function north(x0: number, x1: number, face = LAUNDRY_NORTH_FACE as number) {
    board('azulejo norte', x1 - x0, half, .020, (x0 + x1) / 2, half / 2, face - .010, m.tile, .30);
    board('pintura norte', x1 - x0, LAUNDRY.ceiling - half, .020, (x0 + x1) / 2, (LAUNDRY.ceiling + half) / 2, face - .010, m.paint, 1);
  }
  north(LAUNDRY.minX, 4.40, 15.956); north(4.40, GD.minX); north(GD.maxX, LAUNDRY.maxX);
  board('verga acima da garagem', GD.maxX - GD.minX, LAUNDRY.ceiling - GD.height, .020, (GD.minX + GD.maxX) / 2, (LAUNDRY.ceiling + GD.height) / 2, LAUNDRY_NORTH_FACE - .010, m.paint, 1);
  for (const x of [GD.minX - .04, GD.maxX + .04]) {
    board('retorno da soleira da garagem', .08, GD.height, GD.maxZ - GD.minZ, x, GD.height / 2, (GD.minZ + GD.maxZ) / 2, m.tile, .30);
    board('batente da garagem', .07, 2.14, .07, x, 1.07, 15.84, m.wood);
  }
  board('batente superior da garagem', GD.maxX - GD.minX + .15, .07, .21, (GD.minX + GD.maxX) / 2, 2.135, 15.76, m.wood);
  board('teto da soleira', GD.maxX - GD.minX, .08, GD.maxZ - GD.minZ, (GD.minX + GD.maxX) / 2, 2.14, (GD.minZ + GD.maxZ) / 2, m.paint);
  for (const z of [KD.minZ - .035, KD.maxZ + .035]) board('batente para a cozinha', .20, 2.14, .07, 3.99, 1.07, z, m.wood);
  board('batente superior da cozinha', .20, .07, KD.maxZ - KD.minZ + .14, 3.99, 2.135, (KD.minZ + KD.maxZ) / 2, m.wood);
  const leaf = LAUNDRY_OPEN_LEAF;
  board('porta aberta da garagem', leaf.halfWidth * 2, 2.04, leaf.halfDepth * 2, leaf.x, 1.02, leaf.z, m.wood);
  for (const y of [.54, 1.51]) {
    board('painel rebaixado da porta', .69, .72, .010, leaf.x, y, leaf.z + .03, m.wood);
    for (const x of [leaf.x - .36, leaf.x + .36]) b('porta · friso lateral', .024, .79, .018, x, y, leaf.z + .037, m.wood);
    for (const yy of [y - .39, y + .39]) b('porta · friso horizontal', .74, .024, .018, leaf.x, yy, leaf.z + .037, m.wood);
  }
  g.sphere('porta · maçaneta', .055, .055, .045, 6.89, 1.04, leaf.z + .066, m.metal);
  // South wall and east wall with a real window opening.
  board('azulejo sul', w + .12, half, .12, cx, half / 2, LAUNDRY.maxZ + .06, m.tile, .30);
  board('pintura sul', w + .12, LAUNDRY.ceiling - half, .12, cx, (LAUNDRY.ceiling + half) / 2, LAUNDRY.maxZ + .06, m.paint, 1);
  const win = { z0: 16.46, z1: 18.39, y0: 1.42, y1: 2.48 };
  const eastPiece = (name: string, z0: number, z1: number, y0: number, y1: number, mat: StandardMaterial, period: number) =>
    board(name, .12, y1 - y0, z1 - z0, LAUNDRY.maxX + .06, (y0 + y1) / 2, (z0 + z1) / 2, mat, period);
  eastPiece('azulejo leste', LAUNDRY.minZ, LAUNDRY.maxZ, 0, half, m.tile, .30);
  eastPiece('pintura sob a janela', LAUNDRY.minZ, LAUNDRY.maxZ, half, win.y0, m.paint, 1);
  eastPiece('pintura antes da janela', LAUNDRY.minZ, win.z0, win.y0, LAUNDRY.ceiling, m.paint, 1);
  eastPiece('pintura depois da janela', win.z1, LAUNDRY.maxZ, win.y0, LAUNDRY.ceiling, m.paint, 1);
  eastPiece('verga da janela', win.z0, win.z1, win.y1, LAUNDRY.ceiling, m.paint, 1);
  for (const z of [win.z0, win.z1]) b('janela · montante', .08, win.y1 - win.y0 + .08, .045, 7.09, (win.y0 + win.y1) / 2, z, m.metal);
  for (const y of [win.y0, 1.94, win.y1]) b('janela · esquadria horizontal', .08, .045, win.z1 - win.z0, 7.09, y, (win.z0 + win.z1) / 2, m.metal);
  for (const z of [16.93, 17.42, 17.91]) b('janela · grade vertical leve', .025, win.y1 - win.y0, .018, 7.115, (win.y0 + win.y1) / 2, z, m.trim);
  const windowGlass = g.plane('janela · vidro', win.z1 - win.z0 - .04, win.y1 - win.y0 - .04, 7.13, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2, m.glass, Math.PI / 2);
  windowGlass.metadata.castShadow = false;
  const scenery = g.plane('quintal pela janela', win.z1 - win.z0 + .16, win.y1 - win.y0 + .16, 7.45, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2, m.sky, Math.PI / 2);
  scenery.isPickable = false; scenery.metadata.castShadow = false;
  board('telhas aparentes do teto', w + .10, .12, d + .10, cx, LAUNDRY.ceiling + .06, cz, m.roof, .62);
  for (const z of [16.15, 17.4, 18.65]) board('viga de madeira', w, .10, .095, cx, 2.70, z, m.wood, .6);
  for (const x of [4.40, 5.50, 6.60]) board('ripa de madeira', .055, .055, d, x, 2.635, cz, m.wood, .6);

  // A hollow utility basin, not a solid box with a painted black top.
  const sink = F.sink;
  for (const z of [sink.z - .32, sink.z + .32]) board('tanque · pé de concreto', .59, .67, .13, sink.x, .335, z, m.concrete, .45);
  board('tanque · fundo', .72, .09, .79, sink.x, .69, sink.z, m.basin, .5);
  for (const x of [sink.x - .36, sink.x + .36]) board('tanque · borda lateral', .08, .20, .86, x, .78, sink.z, m.concrete, .45);
  for (const z of [sink.z - .39, sink.z + .39]) board('tanque · borda curta', .64, .20, .08, sink.x, .78, z, m.concrete, .45);
  // Ribbed washing ledge at the back and a modest drain.
  for (let i = 0; i < 7; i++) b('tanque · friso de esfregar', .14, .018, .014, 6.87, .795 + i * .008, sink.z - .27 + i * .082, m.concrete);
  c('tanque · ralo', .009, .038, .038, sink.x, .741, sink.z, m.trim, undefined, 10);
  rod('torneira · base', { x: 7.065, y: 1.13, z: sink.z }, { x: 6.93, y: 1.13, z: sink.z }, .022, m.metal);
  rod('torneira · bico', { x: 6.93, y: 1.13, z: sink.z }, { x: 6.91, y: 1.08, z: sink.z }, .019, m.metal);
  rod('torneira · registro', { x: 6.997, y: 1.14, z: sink.z }, { x: 6.997, y: 1.22, z: sink.z }, .012, m.metal);
  rod('torneira · cruzeta', { x: 6.997, y: 1.22, z: sink.z - .045 }, { x: 6.997, y: 1.22, z: sink.z + .045 }, .012, m.metal);
  b('sabão em barra', .08, .035, .13, 6.75, .91, sink.z - .29, m.yellow);
  // Top-loader with an inset dark lid and a sloped rear control panel.
  const washer = F.washer;
  board('máquina · corpo esmaltado', washer.width, .88, washer.depth, washer.x, .47, washer.z, m.enamel, .7);
  b('máquina · rodapé', .65, .07, .69, washer.x, .065, washer.z, m.trim);
  b('máquina · aro superior', .72, .055, .77, washer.x, .93, washer.z, m.enamel);
  b('máquina · abertura escura', .52, .018, .58, washer.x - .025, .963, washer.z, m.trim);
  const washerLid = b('máquina · tampa superior fumê', .50, .018, .56, washer.x - .025, .975, washer.z, m.lid); washerLid.metadata.castShadow = false;
  b('máquina · pega da tampa', .032, .018, .15, washer.x - .25, .99, washer.z, m.enamel);
  const panel = b('máquina · painel inclinado', .17, .115, .71, washer.x + .27, .988, washer.z, m.enamel); panel.rotation.z = -.25;
  for (const z of [washer.z - .23, washer.z + .23]) {
    const knob = c('máquina · seletor', .024, .061, .061, washer.x + .25, 1.053, z, m.cabinet, undefined, 12); knob.rotation.z = -.25;
    b('máquina · marca do seletor', .015, .005, .034, washer.x + .249, 1.067, z, m.trim);
  }
  b('máquina · legenda do painel', .065, .004, .17, washer.x + .25, 1.054, washer.z, m.label);
  for (const x of [washer.x - .26, washer.x + .26]) for (const z of [washer.z - .27, washer.z + .27]) c('máquina · pé', .045, .05, .05, x, .027, z, m.trim, undefined, 8);

  // Wall cabinet, a small shelf and four household containers.
  board('armário · caixa de madeira', .80, .66, .29, 4.59, 1.89, 15.97, m.wood, .5);
  for (const x of [4.39, 4.79]) {
    board('armário · porta clara', .38, .62, .025, x, 1.89, 16.125, m.cabinet, .5);
    b('armário · puxador', .018, .095, .025, x + (x < 4.59 ? .14 : -.14), 1.86, 16.151, m.trim);
  }
  board('prateleira de produtos', .025, .045, .72, 4.12, 1.55, 17.54, m.wood, .5);
  board('base da prateleira', .30, .035, .76, 4.20, 1.55, 17.54, m.wood, .5);
  for (const z of [17.25, 17.81]) b('prateleira · suporte', .025, .20, .025, 4.19, 1.45, z, m.metal);
  for (const [z, mat, h] of [[17.28, m.blue, .29], [17.49, m.green, .24], [17.71, m.pink, .28]] as const) {
    c('produto · frasco', h, .092, .118, 4.21, 1.575 + h / 2, z, mat, undefined, 8);
    c('produto · tampa', .035, .044, .044, 4.21, 1.575 + h + .018, z, m.cabinet, undefined, 8);
    b('produto · rótulo', .008, h * .42, .066, 4.275, 1.575 + h * .52, z, m.label);
  }
  // Suspended rack and two cotton cloths, above walking head height.
  for (const x of [5.15, 6.04]) for (const z of [17.20, 18.05]) rod('varal · suspensão', { x, y: 2.69, z }, { x, y: 2.43, z }, .005, m.metal);
  for (const z of [17.20, 18.05]) rod('varal · extremidade', { x: 5.15, y: 2.43, z }, { x: 6.04, y: 2.43, z }, .012, m.metal);
  for (const x of [5.15, 5.44, 5.74, 6.04]) rod('varal · haste', { x, y: 2.43, z: 17.20 }, { x, y: 2.43, z: 18.05 }, .008, m.metal);
  for (const [x, z] of [[5.44, 17.30], [5.74, 17.59]]) {
    g.cloth('pano de algodão no varal', 5, 4, (u, v) => ({ x: x + Math.sin(u * Math.PI * 4) * .009,
      y: 2.42 - v * .48, z: z + u * .37 }), m.towel);
    for (const dz of [.035, .335]) b('varal · prendedor', .022, .055, .012, x, 2.43, z + dz, m.yellow);
  }
  // Open lattice basket and an open bucket use geometry rather than solid tops.
  const basket = F.basket, r = .196;
  c('cesto · base', .035, r * 1.8, r * 1.8, basket.x, .035, basket.z, m.pink, undefined, 14);
  for (const y of [.08, .235, .39, .515]) {
    const ring = MeshBuilder.CreateTorus('cesto · aro', { diameter: r * 2 * (.86 + y * .25), thickness: .022, tessellation: 14 }, scene);
    ring.position.set(basket.x, y, basket.z); g.add(ring, m.pink);
  }
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI * 2 / 14;
    rod('cesto · nervura', { x: basket.x + Math.cos(a) * r * .88, y: .04, z: basket.z + Math.sin(a) * r * .88 },
      { x: basket.x + Math.cos(a) * r, y: .515, z: basket.z + Math.sin(a) * r }, .012, m.pink);
  }
  const bucket = F.bucket;
  c('balde · fundo', .02, .22, .22, bucket.x, .018, bucket.z, m.blue, undefined, 12);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI * 2 / 12, a2 = (i + 1) * Math.PI * 2 / 12;
    g.cloth('balde · lateral aberta', 1, 1, (u, v) => { const angle = a + (a2 - a) * u, rad = .11 + v * .03;
      return { x: bucket.x + Math.cos(angle) * rad, y: .025 + v * .27, z: bucket.z + Math.sin(angle) * rad }; }, m.blue);
  }
  const rim = MeshBuilder.CreateTorus('balde · borda', { diameter: .28, thickness: .018, tessellation: 12 }, scene); rim.position.set(bucket.x, .295, bucket.z); g.add(rim, m.blue);
  for (let i = 0; i < 8; i++) {
    const a0 = i * Math.PI / 8, a1 = (i + 1) * Math.PI / 8;
    rod('balde · alça', { x: bucket.x + Math.cos(a0) * .14, y: .21 + Math.sin(a0) * .14, z: bucket.z },
      { x: bucket.x + Math.cos(a1) * .14, y: .21 + Math.sin(a1) * .14, z: bucket.z }, .005, m.metal);
  }
  const broom = F.broom;
  rod('vassoura · cabo', { x: broom.x, y: .13, z: broom.z }, { x: broom.x - .05, y: 1.40, z: broom.z + .015 }, .012, m.wood);
  b('vassoura · cepa', .23, .035, .075, broom.x, .11, broom.z, m.yellow);
  for (let i = 0; i < 12; i++) b('vassoura · cerdas', .015, .075, .055, broom.x - .105 + i * .019, .058, broom.z, m.wood);
  const rug = board('tapete simples diante do tanque', .65, .009, 1.35, 5.83, .008, 17.42, m.mat, 1.1); rug.metadata.castShadow = false;
  // One modest plant on the cabinet, without a clutter of loose items.
  c('planta · vaso', .14, .14, .105, 4.71, 2.29, 15.99, m.cabinet, undefined, 10);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    const plantLeaf = g.sphere('planta · folha', .14, .035, .075, 4.71 + Math.cos(a) * .09, 2.40 + Math.sin(i) * .04, 15.99 + Math.sin(a) * .09, m.leaf);
    plantLeaf.rotation.y = a;
  }

  const meshes: AbstractMesh[] = g.merge();
  for (const mesh of meshes) { mesh.parent = root; mesh.name = 'lavanderia · ' + mesh.name; mesh.computeWorldMatrix(true); }
  for (const light of previousLights) light.excludedMeshes.push(...meshes);
  const ambient = new HemisphericLight('lavanderia · manhã difusa', Vector3.Up(), scene);
  ambient.intensity = .78; ambient.diffuse = new Color3(1, .96, .89); ambient.groundColor = new Color3(.48, .45, .40);
  const sun = new DirectionalLight('lavanderia · sol pela janela', new Vector3(-1, -.60, .18).normalize(), scene);
  sun.position.set(9.2, 3.4, 16.8); sun.diffuse = new Color3(1, .87, .64); sun.intensity = .75;
  sun.shadowMinZ = .1; sun.shadowMaxZ = 12; sun.shadowFrustumSize = 5.2;
  const lights = [ambient, sun]; for (const light of lights) light.includedOnlyMeshes = [...meshes];
  const shadows = new ShadowGenerator(1024, sun); shadows.bias = .0012; shadows.normalBias = .012;
  shadows.useBlurExponentialShadowMap = true; shadows.blurScale = 1; shadows.blurKernel = 4;
  for (const mesh of meshes) if (mesh.metadata?.castShadow && (mesh.material as StandardMaterial).alpha >= 1 && mesh.material !== m.sky) shadows.addShadowCaster(mesh as Mesh);
  const map = shadows.getShadowMap()!; map.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  let active = true, disposed = false;
  const refresh = () => map.resetRefreshCounter();
  void shadows.forceCompilationAsync().then(() => { if (!disposed) refresh(); }).catch(error => console.error('Não foi possível preparar as sombras da lavanderia.', error));
  return {
    meshes,
    setActive(value: boolean) { active = value; root.setEnabled(value); for (const light of lights) light.setEnabled(value); if (value) refresh(); },
    get diagnostics() { return { version: 'lavanderia-brasileira-1', active, bounds: LAUNDRY, kitchenDoor: KD, garageDoor: GD, threshold: LAUNDRY_THRESHOLD,
      objects: { washer: true, sink: true, wallCabinet: true, cleaningProducts: 3, clothesRack: true, towels: 2, basket: true, bucket: true, broom: true, mat: true, window: true },
      furniture: F, meshes: meshes.length, vertices: meshes.reduce((n, mesh) => n + mesh.getTotalVertices(), 0), materials: m.diagnostics }; },
    dispose() {
      if (disposed) return; disposed = true;
      for (const light of previousLights) light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      shadows.dispose(); for (const light of lights) light.dispose(); root.dispose(false, false); m.dispose();
    },
  };
}
