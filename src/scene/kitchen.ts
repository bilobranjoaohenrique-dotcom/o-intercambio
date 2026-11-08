import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { KITCHEN } from '../game/layout';
import { KITCHEN_AUTHORED_FURNITURE as KITCHEN_FURNITURE, COMPACT_KITCHEN, BREAKFAST_SEAT,
  KITCHEN_PLACEMENTS, placeKitchenPoint, type KitchenPlacement, PARENT_ANCHORS } from '../game/kitchenLayout';
import { LIVING_ROOM_WORLD, KITCHEN_FRONT_PASSAGE } from '../game/livingRoomPlacement';
import type { InteractionTarget } from '../game/types';
import { HomeGeometry } from './props';
import { createKitchenMaterials } from './kitchenMaterials';
import { createParents } from './parents';

type Point = { x: number; y: number; z: number };

/** The breakfast room is one real, furnished set joined to the existing stairs.
 * Original small textures and physical details carry its appearance; no render
 * of the reference image is used as a backdrop or as furniture. */
export function buildKitchen(scene: Scene, parent: TransformNode) {
  const oldLights = [...scene.lights];
  const root = new TransformNode('cozinha · ambiente doméstico', scene); root.parent = parent;
  const m = createKitchenMaterials(scene), g = new HomeGeometry(scene);
  const b = g.box.bind(g), c = g.cylinder.bind(g), rod = g.rod.bind(g);
  const window = { x: .25, z: COMPACT_KITCHEN.endZ, y: 2.0, width: 2.3, height: 1.3 };
  const sinkOpening = { x: 1.45, z: 22.16, width: .8, depth: .48 };
  const ceilingY = 3.25;

  function bevel(name: string, w: number, h: number, d: number, x: number, y: number, z: number,
    material: StandardMaterial, amount = .025, target?: string) {
    const mesh = new Mesh(name, scene), positions: number[] = [], indices: number[] = [], uvs: number[] = [], normals: number[] = [];
    const cut = Math.min(amount, w / 5, h / 5, d / 5);
    const ringPoints = (inset: number) => {
      const xx = w / 2 - inset, zz = d / 2 - inset;
      return [[-xx + cut, -zz], [xx - cut, -zz], [xx, -zz + cut], [xx, zz - cut],
        [xx - cut, zz], [-xx + cut, zz], [-xx, zz - cut], [-xx, -zz + cut]];
    };
    const ring = (yy: number, inset: number) => {
      const points = ringPoints(inset);
      for (let j = 0; j <= 8; j++) { const [px, pz] = points[j % 8]; positions.push(px, yy, pz); uvs.push(j / 8, (yy + h / 2) / h); }
    };
    ring(-h / 2, cut); ring(-h / 2 + cut, 0); ring(h / 2 - cut, 0); ring(h / 2, cut);
    for (let row = 0; row < 3; row++) for (let j = 0; j < 8; j++) {
      const a = row * 9 + j, b = a + 1, c = a + 9, d = b + 9;
      indices.push(a, b, c, b, d, c);
    }
    for (const top of [false, true]) {
      const yy = (top ? 1 : -1) * h / 2, center = positions.length / 3;
      positions.push(0, yy, 0); uvs.push(.5, .5);
      for (const [px, pz] of ringPoints(cut)) { positions.push(px, yy, pz); uvs.push(px / w + .5, pz / d + .5); }
      for (let j = 0; j < 8; j++) { const a = center + 1 + j, b = center + 1 + (j + 1) % 8; indices.push(center, top ? a : b, top ? b : a); }
    }
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs; data.applyToMesh(mesh);
    mesh.position.set(x, y, z); return g.add(mesh, material, target);
  }
  function lathe(name: string, profile: readonly [number, number][], x: number, y: number, z: number,
    material: StandardMaterial, sides = 16) {
    const mesh = new Mesh(name, scene), positions: number[] = [], indices: number[] = [], uvs: number[] = [], normals: number[] = [];
    for (let row = 0; row < profile.length; row++) for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2, [radius, yy] = profile[row];
      positions.push(Math.cos(angle) * radius, yy, Math.sin(angle) * radius);
      uvs.push(j / sides, row / (profile.length - 1));
    }
    for (let row = 0; row < profile.length - 1; row++) for (let j = 0; j < sides; j++) {
      const a = row * (sides + 1) + j, b = a + 1, c = a + sides + 1, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs; data.applyToMesh(mesh);
    material.backFaceCulling = false;
    mesh.position.set(x, y, z); return g.add(mesh, material);
  }
  function torus(name: string, diameter: number, thickness: number, x: number, y: number, z: number,
    material: StandardMaterial, vertical = false, scaleZ = 1) {
    const mesh = MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 16 }, scene);
    mesh.position.set(x, y, z); mesh.scaling.z = scaleZ; if (vertical) mesh.rotation.x = Math.PI / 2;
    return g.add(mesh, material);
  }
  function leaf(name: string, x: number, y: number, z: number, yaw: number, pitch = .1, size = .14) {
    const mesh = g.plane(name, size, size * 1.3, x, y, z, m.leaf, yaw);
    mesh.rotation.x = pitch; mesh.isPickable = false; mesh.metadata.castShadow = false;
    return mesh;
  }
  function smallPlant(x: number, y: number, z: number, hanging = false) {
    lathe('vaso de barro com borda', [[.07, 0], [.095, .11], [.11, .125], [.105, .145], [.08, .13], [.07, .025]], x, y, z, m.terracotta, 12);
    c('terra no vaso', .012, .155, .155, x, y + .125, z, m.darkWood);
    for (let branch = 0; branch < 4; branch++) {
      const a = branch * 1.93, reach = hanging ? .26 : .17;
      const end = { x: x + Math.cos(a) * reach, y: y + (hanging ? -.42 - branch * .08 : .27 + branch * .025), z: z + Math.sin(a) * reach };
      const start = { x, y: y + .12, z };
      rod('ramo de jiboia', start, end, .006, m.fruitGreen);
      for (let n = 0; n < 5; n++) {
        const t = (n + .6) / 5;
        leaf('folha com nervuras', x + (end.x - x) * t + Math.sin(n * 1.7) * .045,
          start.y + (end.y - start.y) * t, z + (end.z - z) * t + Math.cos(n * 1.4) * .035,
          a + n * .7, hanging ? .12 : -.35, .13 + n % 2 * .025);
      }
    }
  }


  /** Bake only a rigid world transform before material batching. Every authored
   * mesh, detail, material, UV and scale stays intact in the rearranged kitchen. */
  function furnish(placement: KitchenPlacement, build: () => void) {
    const first = g.meshes.length; build();
    const origin = placeKitchenPoint({ x: 0, z: 0 }, placement);
    const rigid = Matrix.Compose(Vector3.One(), Quaternion.RotationAxis(Vector3.Up(), placement.yaw), new Vector3(origin.x, 0, origin.z));
    for (const mesh of g.meshes.slice(first)) {
      mesh.computeWorldMatrix(true);
      mesh.bakeTransformIntoVertices(mesh.getWorldMatrix().multiply(rigid));
      mesh.position.set(0, 0, 0); mesh.rotationQuaternion = null; mesh.rotation.set(0, 0, 0); mesh.scaling.set(1, 1, 1);
      mesh.computeWorldMatrix(true);
    }
  }

  // Ceramic room shell. The rear window and the connection to the stairs are
  // physical openings; the room is not an enclosing box behind a window decal.
  const width = COMPACT_KITCHEN.maxX - COMPACT_KITCHEN.minX, length = COMPACT_KITCHEN.endZ - COMPACT_KITCHEN.startZ, middle = (COMPACT_KITCHEN.endZ + COMPACT_KITCHEN.startZ) / 2;
  // Compact only this room's shell; the approved living-room portal is unchanged.
  // The existing tile grid retains its scale rather than stretching to the new floor.
  function horizontalPiece(name: string, x0: number, x1: number, z0: number, z1: number,
    h: number, y: number, material: StandardMaterial, original: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    const mesh = b(name, x1 - x0, h, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2, material);
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!, normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
    const uv = [...mesh.getVerticesData(VertexBuffer.UVKind)!];
    for (let i = 0; i < positions.length / 3; i++) if (Math.abs(normals[i * 3 + 1]) > .5) {
      const x = positions[i * 3] + mesh.position.x, z = positions[i * 3 + 2] + mesh.position.z;
      uv[i * 2] = (z - original.minZ) / (original.maxZ - original.minZ);
      uv[i * 2 + 1] = normals[i * 3 + 1] > 0 ?
        (original.maxX - x) / (original.maxX - original.minX) : (x - original.minX) / (original.maxX - original.minX);
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uv);
  }
  const floorBounds = { minX: KITCHEN.minX, maxX: KITCHEN.maxX, minZ: KITCHEN.startZ, maxZ: KITCHEN.endZ };
  horizontalPiece('cerâmica original junto à área do café', COMPACT_KITCHEN.minX, COMPACT_KITCHEN.maxX, LIVING_ROOM_WORLD.maxZ, COMPACT_KITCHEN.endZ, .14, -.07, m.tile, floorBounds);
  horizontalPiece('cerâmica da ligação lateral com a sala', KITCHEN_FRONT_PASSAGE.minX, COMPACT_KITCHEN.maxX, COMPACT_KITCHEN.startZ, LIVING_ROOM_WORLD.maxZ, .14, -.07, m.tile, floorBounds);
  const ceilingBounds = { minX: COMPACT_KITCHEN.minX - .1, maxX: COMPACT_KITCHEN.maxX + .1, minZ: COMPACT_KITCHEN.startZ - .1, maxZ: COMPACT_KITCHEN.endZ + .1 };
  const originalCeiling = { minX: KITCHEN.minX - .1, maxX: KITCHEN.maxX + .1, minZ: KITCHEN.startZ - .1, maxZ: KITCHEN.endZ + .1 };
  horizontalPiece('teto original sobre a área do café', ceilingBounds.minX, ceilingBounds.maxX, LIVING_ROOM_WORLD.maxZ, ceilingBounds.maxZ, .13, ceilingY + .065, m.ceiling, originalCeiling);
  horizontalPiece('teto da ligação lateral com a sala', KITCHEN_FRONT_PASSAGE.minX, ceilingBounds.maxX, ceilingBounds.minZ, LIVING_ROOM_WORLD.maxZ, .13, ceilingY + .065, m.ceiling, originalCeiling);
  b('parede lateral esquerda azulejada', .15, ceilingY, COMPACT_KITCHEN.endZ - LIVING_ROOM_WORLD.maxZ,
    COMPACT_KITCHEN.minX - .075, ceilingY / 2, (COMPACT_KITCHEN.endZ + LIVING_ROOM_WORLD.maxZ) / 2, m.wallTile);
  b('parede lateral direita azulejada', .15, ceilingY, length, COMPACT_KITCHEN.maxX + .075, ceilingY / 2, middle, m.wallTile);
  const rear = (name: string, x0: number, x1: number, y0: number, y1: number) =>
    b(name, x1 - x0, y1 - y0, .15, (x0 + x1) / 2, (y0 + y1) / 2, COMPACT_KITCHEN.endZ + .075, m.wallTile);
  const wx0 = window.x - window.width / 2, wx1 = window.x + window.width / 2, wy0 = window.y - window.height / 2, wy1 = window.y + window.height / 2;
  rear('azulejos à esquerda da janela', COMPACT_KITCHEN.minX, wx0, 0, ceilingY);
  rear('azulejos à direita da janela', wx1, COMPACT_KITCHEN.maxX, 0, ceilingY);
  rear('azulejos sob a janela', wx0, wx1, 0, wy0);
  rear('verga acima da janela', wx0, wx1, wy1, ceilingY);
  // The stair aperture belongs to the living-room entry now. Close the old
  // kitchen detour, and place the exterior edge behind the vacated front area.
  b('fechamento frontal da ligação lateral', COMPACT_KITCHEN.maxX - LIVING_ROOM_WORLD.maxX, ceilingY, .15,
    (COMPACT_KITCHEN.maxX + LIVING_ROOM_WORLD.maxX) / 2, ceilingY / 2, COMPACT_KITCHEN.startZ - .075, m.plaster);
  b('fechamento da área do café junto à sala', LIVING_ROOM_WORLD.minX - COMPACT_KITCHEN.minX, ceilingY, .15,
    (COMPACT_KITCHEN.minX + LIVING_ROOM_WORLD.minX) / 2, ceilingY / 2, LIVING_ROOM_WORLD.maxZ - .075, m.plaster);
  b('rodapé de cerâmica lateral esquerdo', .035, .09, COMPACT_KITCHEN.endZ - LIVING_ROOM_WORLD.maxZ,
    COMPACT_KITCHEN.minX + .015, .045, (COMPACT_KITCHEN.endZ + LIVING_ROOM_WORLD.maxZ) / 2, m.darkWood);
  b('rodapé de cerâmica lateral direito', .035, .09, length, COMPACT_KITCHEN.maxX - .015, .045, middle, m.darkWood);
  b('rodapé cerâmico do fundo', width, .09, .035, (COMPACT_KITCHEN.minX + COMPACT_KITCHEN.maxX) / 2, .045, COMPACT_KITCHEN.endZ - .015, m.darkWood);

  // Window, slim security bars and cotton lace. Morning shadows are generated
  // by these actual pieces rather than painted on top of the reference image.
  for (const x of [wx0, wx1]) b('batente vertical da janela', .075, window.height + .08, .12, x, window.y, window.z - .025, m.wood);
  for (const y of [wy0, wy1]) b('batente horizontal da janela', window.width + .08, .065, .12, window.x, y, window.z - .025, m.wood);
  b('peitoril de pedra', window.width + .2, .045, .28, window.x, wy0 - .03, window.z - .055, m.counter);
  for (let n = 1; n < 4; n++) b('grade vertical da janela', .022, window.height - .06, .035, wx0 + n * window.width / 4, window.y, window.z - .1, m.iron);
  for (const y of [window.y - .26, window.y + .24]) b('grade horizontal da janela', window.width, .024, .035, window.x, y, window.z - .1, m.iron);
  const glass = g.plane('vidro transparente para o quintal', window.width - .05, window.height - .06, window.x, window.y, window.z + .015, m.glass, Math.PI);
  glass.isPickable = false; glass.metadata.castShadow = false;
  rod('varão de madeira da cortina', { x: wx0 - .2, y: wy1 + .15, z: window.z - .22 }, { x: wx1 + .2, y: wy1 + .15, z: window.z - .22 }, .018, m.darkWood);
  for (const start of [wx0 - .06, wx1 - .36]) {
    g.cloth('cortina de renda com pregas', 12, 16, (u, v) => ({ x: start + u * .43,
      y: wy1 + .12 - v * 1.54 + Math.sin(u * 23) * .014,
      z: window.z - .23 + Math.cos(u * Math.PI * 8) * .04 + Math.sin(v * 4) * .02 }), m.lace);
  }
  g.cloth('bandô de renda da janela', 24, 4, (u, v) => ({ x: wx0 - .08 + u * (window.width + .16),
    y: wy1 + .13 - v * (.17 + .035 * Math.sin(u * Math.PI * 10) ** 2), z: window.z - .2 - .025 * Math.cos(u * 36) }), m.lace);

  // Lower cabinetry: recessed panels, drawers, handles, toe kicks and a stone
  // lip give a useful silhouette at eye height and on the approach to the table.
  function cabinet(x: number, z: number, w: number, d: number, drawers = false, hasSink = false) {
    b('recuo escuro sob armário', w - .06, .12, d - .08, x, .06, z + .025, m.darkWood);
    if (hasSink) {
      b('fundo do armário sob a pia', w, .75, .025, x, .48, z + d / 2 - .0125, m.cabinet);
      b('base interna do armário sob a pia', w, .035, d, x, .13, z, m.darkWood);
      for (const xx of [x - w / 2 + .0125, x + w / 2 - .0125])
        b('lateral do armário sob a pia', .025, .75, d, xx, .48, z, m.cabinet);
    } else bevel('caixa do balcão pintada', w, .75, d, x, .48, z, m.cabinet, .012);
    b('filete de madeira do balcão', w + .012, .045, .055, x, .82, z - d / 2 - .007, m.wood);
    if (hasSink) {
      const left = x - (w + .045) / 2, right = x + (w + .045) / 2, front = z - (d + .045) / 2, back = z + (d + .045) / 2;
      const sx0 = sinkOpening.x - sinkOpening.width / 2, sx1 = sinkOpening.x + sinkOpening.width / 2;
      const sz0 = sinkOpening.z - sinkOpening.depth / 2, sz1 = sinkOpening.z + sinkOpening.depth / 2;
      for (const [x0, x1, z0, z1] of [[left, sx0, front, back], [sx1, right, front, back],
        [sx0, sx1, front, sz0], [sx0, sx1, sz1, back]])
        bevel('pedra recortada ao redor da cuba', x1 - x0, .055, z1 - z0, (x0 + x1) / 2, .885, (z0 + z1) / 2, m.counter, .01);
    } else bevel('bancada com borda de pedra', w + .045, .055, d + .045, x, .885, z, m.counter, .012);
    const doors = Math.max(1, Math.round(w / .59)), doorW = (w - .04) / doors;
    for (let i = 0; i < doors; i++) {
      const xx = x - w / 2 + .02 + doorW * (i + .5), front = z - d / 2 - .017;
      if (drawers && i === doors - 1) {
        for (let row = 0; row < 3; row++) {
          bevel('frente de gaveta com relevo', doorW - .025, .21, .035, xx, .24 + row * .235, front, m.cabinet, .009);
          rod('puxador de gaveta', { x: xx - .065, y: .26 + row * .235, z: front - .027 }, { x: xx + .065, y: .26 + row * .235, z: front - .027 }, .009, m.iron);
        }
      } else {
        bevel('porta de armário com moldura', doorW - .025, .64, .035, xx, .46, front, m.cabinet, .009);
        b('rebaixo da porta do balcão', doorW - .1, .53, .009, xx, .46, front - .02, m.enamel);
        rod('puxador de porta', { x: xx + doorW * .28, y: .53, z: front - .035 }, { x: xx + doorW * .28, y: .65, z: front - .035 }, .009, m.iron);
      }
    }
  }
  for (const key of ['backCabinetLeft', 'backCabinetRight'] as const) {
    const f = KITCHEN_FURNITURE[key];
    furnish(key === 'backCabinetRight' ? KITCHEN_PLACEMENTS.back : KITCHEN_PLACEMENTS.left,
      () => cabinet(f.x, f.z, f.width, f.depth, key === 'backCabinetRight', key === 'backCabinetRight'));
  }
  furnish(KITCHEN_PLACEMENTS.left, () => cabinet(-1.07, 22.2, .2, .7));
  // A short return makes the work surface read as an L instead of an isolated cube.
  const returnCabinet = KITCHEN_FURNITURE.returnCabinet;
  furnish(KITCHEN_PLACEMENTS.return, () => cabinet(returnCabinet.x, returnCabinet.z, returnCabinet.width, returnCabinet.depth, true));
  // Wall-mounted wooden cupboards: shelves and dishes really sit behind glazing.
  function upperCabinet(upperX: number, upperW: number, doors: number) {
  const upperZ = 22.44, upperBottom = 1.75, upperH = 1.12;
  b('fundo escuro do armário superior', upperW, upperH, .035, upperX, upperBottom + upperH / 2, upperZ + .18, m.darkWood);
  for (const x of [upperX - upperW / 2, upperX + upperW / 2]) b('lateral do armário superior', .055, upperH, .42, x, upperBottom + upperH / 2, upperZ, m.wood);
  for (const y of [upperBottom, upperBottom + .52, upperBottom + upperH]) b('prateleira do armário de parede', upperW, .045, .44, upperX, y, upperZ, m.wood);
  const doorW = upperW / doors;
  for (let i = 0; i < doors; i++) {
    const x = upperX - upperW / 2 + (i + .5) * doorW, z = upperZ - .24;
    for (const xx of [x - doorW / 2 + .025, x + doorW / 2 - .025]) b('moldura vertical de porta vidrada', .05, upperH - .05, .045, xx, upperBottom + upperH / 2, z, m.wood);
    for (const y of [upperBottom + .045, upperBottom + upperH - .045]) b('moldura horizontal de porta vidrada', doorW - .015, .06, .045, x, y, z, m.wood);
    const pane = g.plane('vidro do armário de louça', doorW - .10, upperH - .17, x, upperBottom + upperH / 2, z + .01, m.glass, Math.PI);
    pane.metadata.castShadow = false;
    rod('puxador do armário superior', { x: x + doorW / 2 - .1, y: upperBottom + .42, z: z - .035 }, { x: x + doorW / 2 - .1, y: upperBottom + .59, z: z - .035 }, .008, m.iron);
    for (const y of [upperBottom + .07, upperBottom + .59]) {
      c('pote guardado no armário', .18, .12, .12, x - doorW * .18, y + .09, upperZ - .02, i % 2 ? m.ceramic : m.terracotta, undefined, 10);
      c('tampa de pote', .02, .13, .13, x - doorW * .18, y + .19, upperZ - .02, m.darkWood, undefined, 10);
      for (let n = 0; n < 3; n++) c('pratos empilhados no armário', .017, .19, .19, x + doorW * .20, y + n * .019, upperZ, m.ceramic, undefined, 12);
    }
  }
  }
  furnish(KITCHEN_PLACEMENTS.left, () => upperCabinet(-2.70, .90, 2));
  furnish(KITCHEN_PLACEMENTS.back, () => { upperCabinet(-.48, .66, 1); upperCabinet(3.67, 1.20, 2); });

  furnish(KITCHEN_PLACEMENTS.left, () => {
  const fridge = KITCHEN_FURNITURE.fridge, fridgeFront = fridge.z - fridge.depth / 2;
  bevel('geladeira doméstica esmaltada', fridge.width, fridge.height, fridge.depth, fridge.x, fridge.height / 2, fridge.z, m.enamel, .045);
  bevel('porta inferior da geladeira', fridge.width - .035, 1.28, .06, fridge.x, .70, fridgeFront - .03, m.enamel, .024);
  bevel('porta do congelador', fridge.width - .035, .52, .06, fridge.x, 1.64, fridgeFront - .03, m.enamel, .024);
  b('junta de borracha das portas', fridge.width - .06, .025, .065, fridge.x, 1.366, fridgeFront - .035, m.iron);
  for (const y of [.94, 1.56]) rod('puxador envelhecido da geladeira', { x: fridge.x + .32, y: y - .13, z: fridgeFront - .083 }, { x: fridge.x + .32, y: y + .13, z: fridgeFront - .083 }, .017, m.wood);
  for (const [dx, y, angle] of [[-.22, 1.63, -.05], [.10, 1.58, .08], [-.12, 1.11, .06], [.23, 1.21, -.06]]) {
    const picture = g.plane('lembrança presa na geladeira', .17, .13, fridge.x + dx, y, fridgeFront - .068, m.photo);
    picture.rotation.z = angle; picture.metadata.castShadow = false;
    b('ímã colorido de geladeira', .028, .027, .018, fridge.x + dx + .04, y + .065, fridgeFront - .077, m.magnet);
  }
  smallPlant(fridge.x - .17, fridge.height, fridge.z - .08, true);
  // Longer trailing vine gives the fridge a lived-in outline without expensive foliage.
  for (let i = 0; i < 10; i++) {
    const y = 1.9 - i * .12, x = fridge.x - .47 + Math.sin(i * 1.3) * .045, z = fridgeFront - .035;
    if (i) rod('haste pendente da jiboia', { x, y: y + .13, z }, { x: x + .02, y, z }, .005, m.fruitGreen);
    leaf('folha da planta sobre a geladeira', x - .025, y, z - .015, Math.PI + Math.sin(i) * .4, .1, .16);
  }

  });

  furnish(KITCHEN_PLACEMENTS.left, () => {
  const stove = KITCHEN_FURNITURE.stove, stoveFront = stove.z - stove.depth / 2;
  bevel('fogão a gás de quatro bocas', stove.width, stove.height, stove.depth, stove.x, stove.height / 2, stove.z, m.enamel, .02);
  b('mesa escura do fogão', stove.width - .025, .035, stove.depth - .02, stove.x, .91, stove.z, m.iron);
  for (const dx of [-.23, .23]) for (const dz of [-.18, .18]) {
    torus('aro de queimador', .20, .017, stove.x + dx, .935, stove.z + dz, m.iron);
    c('disco de queimador', .018, .10, .11, stove.x + dx, .942, stove.z + dz, m.steel, undefined, 12);
    for (const side of [-1, 1]) b('trempe do fogão', .24, .016, .013, stove.x + dx, .96, stove.z + dz + side * .075, m.iron);
  }
  b('painel frontal de comandos', stove.width - .03, .14, .035, stove.x, .79, stoveFront - .025, m.steel);
  for (let i = 0; i < 4; i++) { const knob = c('botão de gás', .035, .052, .052, stove.x - .3 + i * .2, .79, stoveFront - .055, m.iron, undefined, 10); knob.rotation.x = Math.PI / 2; }
  bevel('moldura da porta do forno', .75, .50, .045, stove.x, .39, stoveFront - .035, m.iron, .025);
  b('vidro escuro da porta do forno', .60, .34, .013, stove.x, .38, stoveFront - .065, m.darkWood);
  rod('puxador do forno', { x: stove.x - .3, y: .65, z: stoveFront - .095 }, { x: stove.x + .3, y: .65, z: stoveFront - .095 }, .018, m.steel);
  g.cloth('pano listrado no forno', 8, 8, (u, v) => ({ x: stove.x + .03 + (u - .5) * .26, y: .65 - v * .29, z: stoveFront - .11 - Math.cos(u * 23) * .007 }), m.dishTowel);
  lathe('panela de alumínio no fogão', [[.11, 0], [.14, .015], [.145, .18], [.135, .19], [.13, .025]], stove.x + .22, .958, stove.z + .15, m.steel, 16);
  c('tampa da panela', .025, .30, .29, stove.x + .22, 1.16, stove.z + .15, m.steel, undefined, 16);
  c('pega da tampa', .035, .052, .065, stove.x + .22, 1.188, stove.z + .15, m.iron, undefined, 10);
  for (const side of [-1, 1]) rod('alça da panela', { x: stove.x + .22 + side * .14, y: 1.08, z: stove.z + .08 }, { x: stove.x + .22 + side * .21, y: 1.08, z: stove.z + .18 }, .014, m.iron);
  b('coifa simples sobre o fogão', 1.04, .23, .56, stove.x, 1.89, stove.z + .08, m.steel);
  b('duto da coifa', .33, 1.1, .27, stove.x, 2.54, stove.z + .19, m.steel);

  });

  furnish(KITCHEN_PLACEMENTS.back, () => {
  // Sink with a cavity and a curved tap, plus the ordinary objects left to dry.
  const sx = sinkOpening.x, sz = sinkOpening.z, sy = .918;
  b('fundo da cuba da pia', .75, .012, .43, sx, sy - .13, sz, m.steel);
  for (const x of [sx - .39, sx + .39]) b('lateral da cuba', .025, .13, .48, x, sy - .065, sz, m.steel);
  for (const z of [sz - .23, sz + .23]) b('parede interna da cuba', .75, .13, .02, sx, sy - .065, z, m.steel);
  for (const z of [sz - .24, sz + .24]) b('borda da cuba', .78, .012, .035, sx, sy, z, m.steel);
  c('ralo da pia', .006, .065, .065, sx, sy - .121, sz, m.iron, undefined, 12);
  const tapPoints = [[sx + .18, sy + .03, sz + .27], [sx + .18, sy + .34, sz + .27],
    [sx + .18, sy + .43, sz + .20], [sx + .18, sy + .43, sz + .08], [sx + .18, sy + .34, sz + .02]];
  for (let i = 1; i < tapPoints.length; i++) { const [ax, ay, az] = tapPoints[i - 1], [bx, by, bz] = tapPoints[i]; rod('torneira curva da pia', { x: ax, y: ay, z: az }, { x: bx, y: by, z: bz }, .015, m.steel); }
  c('base da torneira', .025, .065, .065, sx + .18, sy + .04, sz + .27, m.steel, undefined, 12);
  rod('registro da torneira', { x: sx + .10, y: sy + .15, z: sz + .29 }, { x: sx + .02, y: sy + .15, z: sz + .29 }, .009, m.steel);
  const rackX = 2.94;
  for (const z of [21.95, 22.38]) rod('base do escorredor', { x: rackX - .36, y: .965, z }, { x: rackX + .36, y: .965, z }, .012, m.wood);
  for (let i = 0; i < 7; i++) {
    const x = rackX - .29 + i * .095;
    rod('divisória do escorredor', { x, y: .96, z: 21.98 }, { x, y: 1.19, z: 22.32 }, .008, m.wood);
    if (i % 2 === 0) { const plate = c('prato secando em pé', .018, .25, .25, x + .025, 1.09, 22.14, m.ceramic, undefined, 18); plate.rotation.z = Math.PI / 2 - .12; }
  }
  c('frasco de detergente', .17, .08, .09, .82, 1.0, 22.42, m.red, undefined, 10);
  c('tampa do detergente', .03, .036, .045, .82, 1.10, 22.42, m.enamel, undefined, 8);
  bevel('esponja ao lado da pia', .12, .025, .07, .80, .94, 22.12, m.fruitYellow, .008);
  });

  furnish(KITCHEN_PLACEMENTS.return, () => smallPlant(3.98, .92, 21.4));

  function chair(x: number, z: number, yaw: number, target?: string) {
    const point = (xx: number, yy: number, zz: number) => ({ x: x + Math.cos(yaw) * xx + Math.sin(yaw) * zz, y: yy, z: z - Math.sin(yaw) * xx + Math.cos(yaw) * zz });
    const part = (name: string, w: number, h: number, d: number, xx: number, yy: number, zz: number, material: StandardMaterial) => { const p = point(xx, yy, zz); const mesh = b(name, w, h, d, p.x, p.y, p.z, material, target); mesh.rotation.y = yaw; return mesh; };
    part('assento de cadeira de madeira', .47, .06, .46, 0, .46, 0, m.wood);
    part('almofada tecida da cadeira', .40, .025, .39, 0, .50, 0, m.rug);
    for (const xx of [-.19, .19]) for (const zz of [-.18, .18]) rod('perna inclinada da cadeira', point(xx * 1.08, .015, zz * 1.08), point(xx, .46, zz), .025, m.darkWood, target);
    for (const xx of [-.20, .20]) rod('montante do encosto', point(xx, .42, -.20), point(xx, 1.03, -.24), .023, m.wood, target);
    part('travessa alta do encosto', .46, .075, .055, 0, 1.02, -.24, m.wood);
    part('travessa baixa do encosto', .43, .055, .045, 0, .66, -.22, m.darkWood);
    for (const xx of [-.12, 0, .12]) rod('ripa vertical do encosto', point(xx, .68, -.22), point(xx, .985, -.24), .014, m.wood, target);
    for (const side of [-1, 1]) rod('travamento sob a cadeira', point(-.19, .18, side * .18), point(.19, .18, side * .18), .012, m.darkWood, target);
  }

  furnish(KITCHEN_PLACEMENTS.table, () => {
  // Breakfast table, chamfered wood and a single draped cloth with real folds.
  const table = KITCHEN_FURNITURE.table, top = table.tabletopY;
  bevel('tampo de madeira da mesa', table.width, .065, table.depth, table.x, top - .0325, table.z, m.wood, .018);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const x = table.x + dx * (table.width / 2 - .14), z = table.z + dz * (table.depth / 2 - .14);
    c('perna torneada da mesa', .68, .065, .09, x, .36, z, m.wood, undefined, 8);
    c('pé da mesa com acabamento', .06, .095, .10, x, .03, z, m.darkWood, undefined, 8);
  }
  for (const side of [-1, 1]) {
    b('saia comprida da mesa', table.width - .16, .16, .035, table.x, top - .13, table.z + side * (table.depth / 2 - .07), m.darkWood);
    b('saia lateral da mesa', .035, .16, table.depth - .12, table.x + side * (table.width / 2 - .07), top - .13, table.z, m.darkWood);
  }
  g.cloth('toalha florida com caimento nos quatro lados', 28, 22, (u, v) => {
    const fx = (u - .5) * (table.width + .72), fz = (v - .5) * (table.depth + .72), ex = Math.max(0, Math.abs(fx) - table.width / 2), ez = Math.max(0, Math.abs(fz) - table.depth / 2);
    const drop = Math.max(ex, ez) + Math.min(ex, ez) * .28;
    return { x: table.x + Math.sign(fx) * Math.min(Math.abs(fx), table.width / 2 + .018) + (ex > 0 ? Math.sin(v * 53) * .017 : 0),
      y: top + .014 - drop + Math.sin(u * 35 + v * 11) * .005,
      z: table.z + Math.sign(fz) * Math.min(Math.abs(fz), table.depth / 2 + .018) + (ez > 0 ? Math.cos(u * 49) * .018 : 0) };
  }, m.tablecloth, undefined, true);

  chair(KITCHEN_FURNITURE.frontChair.x, KITCHEN_FURNITURE.frontChair.z, 0, 'breakfast-chair');
  chair(KITCHEN_FURNITURE.rightChair.x, KITCHEN_FURNITURE.rightChair.z, -Math.PI / 2);

  function plate(x: number, z: number, diameter = .31) {
    return lathe('prato de louça do café', [[.04, 0], [diameter * .36, .005], [diameter / 2, .019], [diameter / 2, .029], [diameter * .36, .017], [.04, .014]], x, top + .018, z, m.ceramic, 20);
  }
  function mug(x: number, z: number) {
    lathe('xícara de café com interior', [[.035, 0], [.048, .012], [.055, .125], [.048, .128], [.042, .025], [.025, .017]], x, top + .027, z, m.ceramic, 16);
    const handle = torus('alça de xícara', .07, .012, x + .064, top + .10, z, m.ceramic, true); handle.scaling.x = .75;
    c('café dentro da xícara', .004, .084, .084, x, top + .137, z, m.darkWood, undefined, 16);
  }
  plate(.92, 19.21); mug(.92, 19.30);
  plate(-1.11, 18.56, .27); mug(-1.11, 18.56);
  lathe('copo de água de vidro sobre a mesa', [[.031, 0], [.038, .01], [.043, .15], [.038, .15], [.033, .02]], .32, top + .025, 19.23, m.glass, 16);
  c('superfície da água no copo', .002, .067, .067, .32, top + .135, 19.23, m.glass, undefined, 16);
  plate(-.7, 18.05, .34);
  torus('borda trançada da cesta de pão', .52, .035, -.63, .94, 18.55, m.wood, false, .66);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    rod('trama da cesta de pão', { x: -.63 + Math.cos(a) * .18, y: .845, z: 18.55 + Math.sin(a) * .11 }, { x: -.63 + Math.cos(a) * .26, y: .94, z: 18.55 + Math.sin(a) * .17 }, .008, m.wood);
  }
  g.cloth('guardanapo na cesta de pão', 8, 8, (u, v) => ({ x: -.63 + (u - .5) * .49, y: .91 + Math.sin(u * 13 + v * 17) * .015, z: 18.55 + (v - .5) * .30 }), m.dishTowel, undefined, true);
  for (let i = 0; i < 6; i++) { const angle = i * 2.3, x = -.63 + Math.cos(angle) * .13, z = 18.55 + Math.sin(angle) * .09;
    const bread = g.sphere('pão francês de café da manhã', .17, .105, .13, x, .96 + (i % 3 === 0 ? .065 : 0), z, m.bread); bread.rotation.y = angle;
    rod('corte da crosta do pão', { x: x - .04, y: bread.position.y + .043, z: z - .006 }, { x: x + .04, y: bread.position.y + .043, z: z + .018 }, .003, m.paper);
  }
  lathe('fruteira de cerâmica', [[.075, 0], [.14, .018], [.235, .09], [.23, .11], [.21, .108], [.12, .04], [.07, .028]], .24, .84, 18.72, m.ceramic, 18);
  for (const [dx, dz, yy] of [[-.08, 0, .99], [.09, -.025, 1.0], [.025, .11, 1.02]]) {
    g.sphere('laranja na fruteira', .14, .14, .14, .24 + dx, yy, 18.72 + dz, m.fruitOrange);
  }
  for (let i = 0; i < 3; i++) {
    const yaw = -.30 + i * .28, x = .20, z = 18.66 + i * .039, y = 1.075 + i * .018;
    const path = Array.from({ length: 9 }, (_, n) => { const t = n / 4 - 1; return new Vector3(t * .13, .055 * t * t, 0); });
    const banana = MeshBuilder.CreateTube('banana curva no cacho', { path, tessellation: 6,
      radiusFunction: n => .018 + Math.sin(n / 8 * Math.PI) * .009, cap: Mesh.CAP_ALL }, scene);
    banana.position.set(x, y, z); banana.rotation.y = yaw; g.add(banana, m.fruitYellow);
    for (const side of [-1, 1]) {
      const xx = x + Math.cos(yaw) * .13 * side, zz = z - Math.sin(yaw) * .13 * side;
      g.sphere('ponta escura da banana', .024, .016, .022, xx, y + .055, zz, m.darkWood);
    }
  }
  lathe('garrafa térmica vermelha', [[.085, 0], [.095, .025], [.09, .28], [.065, .32], [.065, .34]], -.22, .835, 19.08, m.red, 18);
  c('faixa metálica da térmica', .033, .14, .14, -.22, 1.15, 19.08, m.steel, undefined, 18);
  c('tampa da garrafa térmica', .045, .15, .145, -.22, 1.19, 19.08, m.iron, undefined, 16);
  const thermosHandle = torus('alça da garrafa térmica', .19, .023, -.08, 1.01, 19.08, m.iron, true); thermosHandle.scaling.x = .57; thermosHandle.scaling.y = 1.2;
  bevel('manteigueira de louça', .25, .025, .16, .28, .84, 18.20, m.ceramic, .015);
  bevel('pedaço de manteiga', .13, .075, .10, .27, .887, 18.20, m.fruitYellow, .008);
  bevel('pote de geleia', .12, .15, .12, .71, .91, 18.84, m.red, .015);
  c('tampa xadrez do pote de geleia', .018, .13, .13, .71, .995, 18.84, m.tablecloth, undefined, 16);
  for (let i = 0; i < 3; i++) { const toast = bevel('fatia de pão no prato', .115, .025, .12, -.7 + i * .035, .865 + i * .017, 18.05 + i * .012, m.bread, .02); toast.rotation.y = -.1 + i * .2; }
  rod('cabo de faca sobre a mesa', { x: -.9, y: .84, z: 18.0 }, { x: -.78, y: .84, z: 18.0 }, .01, m.darkWood);
  b('lâmina da faca de manteiga', .10, .005, .022, -.73, .84, 18.0, m.steel);

  });

  chair(PARENT_ANCHORS.father.position.x, PARENT_ANCHORS.father.position.z, PARENT_ANCHORS.father.yaw);

  furnish(KITCHEN_PLACEMENTS.sideboard, () => {
  // Sideboard and a recognizable old CRT television, placed against the left
  // wall so the table remains the visual and physical centre of the room.
  const sideboard = KITCHEN_FURNITURE.sideboard;
  bevel('aparador de madeira da família', sideboard.width, .73, sideboard.depth, sideboard.x, .43, sideboard.z, m.wood, .018);
  b('tampo do aparador', sideboard.width + .045, .055, sideboard.depth + .04, sideboard.x, .845, sideboard.z, m.darkWood);
  for (const z of [sideboard.z - .65, sideboard.z + .15, sideboard.z + .75]) {
    b('frente de gaveta do aparador', .025, .28, .61, sideboard.x + sideboard.width / 2 + .01, .53, z, m.wood);
    rod('puxador do aparador', { x: sideboard.x + sideboard.width / 2 + .035, y: .54, z: z - .06 }, { x: sideboard.x + sideboard.width / 2 + .035, y: .54, z: z + .06 }, .01, m.iron);
  }
  g.cloth('toalhinha de renda sob a televisão', 8, 12, (u, v) => ({ x: sideboard.x + (u - .5) * .61, y: .878, z: sideboard.z - .15 + (v - .5) * 1.02 }), m.lace, undefined, true);
  bevel('carcaça de televisão de tubo', .49, .53, .78, -4.40, 1.155, 18.33, m.darkWood, .035);
  bevel('aro do tubo da televisão', .045, .43, .62, -4.13, 1.17, 18.27, m.iron, .015);
  const tvScreen = m.solid('tela desligada de vidro convexo', '#344541'); tvScreen.emissiveColor.set(.012, .02, .018);
  const television = g.plane('tela convexa da televisão', .52, .35, -4.102, 1.18, 18.27, tvScreen, -Math.PI / 2); television.metadata.castShadow = false;
  for (const yy of [1.08, 1.26]) { const knob = c('seletor de canal da televisão', .024, .046, .046, -4.10, yy, 18.66, m.iron, undefined, 10); knob.rotation.z = Math.PI / 2; }
  rod('haste da antena da TV', { x: -4.38, y: 1.42, z: 18.40 }, { x: -4.58, y: 1.73, z: 18.58 }, .005, m.steel);
  rod('segunda haste da antena', { x: -4.38, y: 1.42, z: 18.40 }, { x: -4.27, y: 1.69, z: 18.10 }, .005, m.steel);
  });

  // One family picture and a modest wall calendar personalise the kitchen.
  b('moldura de fotografia familiar na cozinha', .035, .45, .34, COMPACT_KITCHEN.minX + .025, 1.85, 16.6, m.darkWood);
  g.plane('fotografia familiar junto à geladeira', .29, .40, COMPACT_KITCHEN.minX + .049, 1.85, 16.6, m.photo, -Math.PI / 2);
  g.plane('calendário doméstico da cozinha', .42, .56, COMPACT_KITCHEN.maxX - .025, 1.72, 19.05, m.calendar, Math.PI / 2);
  furnish(KITCHEN_PLACEMENTS.back, () => { const rug = b('passadeira de cozinha em frente à pia', 2.7, .009, .66, 1.45, .008, 21.02, m.rug); rug.metadata.castShadow = false; });
  furnish(KITCHEN_PLACEMENTS.table, () => {
  c('base da luminária de teto', .045, .19, .19, -.15, 3.20, 18.7, m.enamel, undefined, 12);
  rod('haste da luminária de teto', { x: -.15, y: 3.2, z: 18.7 }, { x: -.15, y: 3.02, z: 18.7 }, .007, m.iron);
  lathe('cúpula de vidro fosco', [[.035, .16], [.13, .13], [.21, .02], [.20, 0], [.17, .01]], -.15, 2.88, 18.7, m.ceramic, 16);

  });

  furnish(KITCHEN_PLACEMENTS.back, () => {
  // A quiet garden exists beyond the cut-out window, not as a pasted photograph.
  const grass = m.solid('grama do quintal ao sol', '#6b7549'), roof = m.solid('telhas do quintal vizinho', '#a15e3e');
  b('quintal visto da cozinha', 15, .10, 9, 0, -.08, 27.4, grass);
  b('muro baixo do quintal', 14, .85, .13, 0, .425, 29.9, m.plaster);
  b('casa vizinha atrás do quintal', 4, 2.8, 3.2, -2.4, 1.4, 31.5, m.enamel);
  const roofA = b('água do telhado vizinho', 4.3, .13, 1.88, -2.4, 3.05, 30.67, roof); roofA.rotation.x = -.40;
  const roofB = b('segunda água do telhado vizinho', 4.3, .13, 1.88, -2.4, 3.05, 32.33, roof); roofB.rotation.x = .40;
  for (const x of [-3.3, -1.4]) b('janela da casa vizinha', .65, .8, .035, x, 1.7, 29.88, m.darkWood);
  for (let i = 0; i < 5; i++) {
    const x = -4.0 + i * 1.9, z = 25.7 + i % 2 * .8;
    rod('galho de árvore no quintal', { x, y: 0, z }, { x: x + .12, y: 2.8 + i % 2 * .4, z }, .065, m.wood);
    for (let j = 0; j < 14; j++) { const a = j * 2.4; leaf('folhagem do quintal', x + Math.cos(a) * (.25 + j % 3 * .18), 2.2 + Math.sin(j * 1.1) * .65, z + Math.sin(a) * .6, a, -.2 + j % 4 * .15, .65); }
  }

  });

  // A wall atlas covers 1.6 metres (four 40 cm tiles). Mapping in world space
  // keeps grout and floral motifs continuous around the cut-out window instead
  // of squeezing a full tile grid onto each narrow piece of wall.
  for (const mesh of g.meshes) {
    if (mesh.material !== m.wallTile) continue;
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind), normals = mesh.getVerticesData(VertexBuffer.NormalKind);
    if (!positions || !normals) continue;
    mesh.computeWorldMatrix(true);
    const world = mesh.getWorldMatrix(), uvs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const point = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), world);
      const normal = Vector3.TransformNormal(new Vector3(normals[i], normals[i + 1], normals[i + 2]), world);
      const horizontal = Math.abs(normal.x) > .5 ? point.z : point.x;
      uvs.push(horizontal / (1.6 * 6), (Math.abs(normal.y) > .5 ? point.z : point.y) / (1.6 * 2));
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uvs, false);
  }
  const staticMeshes = g.merge();
  const interactionMeshes = [...g.targets.values()].flat();
  for (const mesh of [...staticMeshes, ...interactionMeshes]) { mesh.parent = root; mesh.computeWorldMatrix(true); }
  const parents = createParents(scene, root);
  const allMeshes: AbstractMesh[] = [...staticMeshes, ...interactionMeshes, ...parents.meshes];
  for (const light of oldLights) light.excludedMeshes.push(...allMeshes);
  const ambient = new HemisphericLight('cozinha · luz difusa doméstica', Vector3.Up(), scene);
  ambient.diffuse = new Color3(1, .91, .76); ambient.groundColor = new Color3(.40, .34, .26); ambient.intensity = .50;
  const sun = new DirectionalLight('cozinha · sol entrando pela janela', new Vector3(-.35, -.27, -.83).normalize(), scene);
  sun.position.set(1.95, 3.3, 25.15); sun.diffuse = new Color3(1, .83, .58); sun.intensity = 1.2;
  sun.shadowMinZ = .1; sun.shadowMaxZ = 35; sun.shadowFrustumSize = 13;
  const bounce = new PointLight('cozinha · luz rebatida do ambiente', new Vector3(-.7, 2.5, 16.8), scene);
  bounce.diffuse = new Color3(1, .88, .72); bounce.intensity = .8; bounce.range = 8;
  for (const light of [ambient, sun, bounce]) light.includedOnlyMeshes.push(...allMeshes);
  const shadows = new ShadowGenerator(1024, sun); shadows.useBlurExponentialShadowMap = true;
  shadows.blurScale = 1; shadows.blurKernel = 4; shadows.bias = .001; shadows.normalBias = .018;
  const transparent = new Set([m.glass, m.lace, m.leaf]);
  for (const mesh of [...staticMeshes, ...interactionMeshes, ...parents.shadowCasters])
    if (!transparent.has(mesh.material as StandardMaterial) && mesh.metadata?.castShadow !== false) shadows.addShadowCaster(mesh as Mesh);
  const map = shadows.getShadowMap()!; map.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  const refreshShadows = () => map.resetRefreshCounter();
  let active = true, disposed = false, previousSpeaker = '';
  // Render-once maps must be invalidated after their depth effects actually
  // compile, otherwise an early empty map can survive the first visible frame.
  void shadows.forceCompilationAsync().then(() => { if (!disposed) refreshShadows(); })
    .catch(error => console.error('Não foi possível preparar as sombras da cozinha.', error));
  const targets: InteractionTarget[] = [{ id: 'breakfast-chair', meshes: g.targets.get('breakfast-chair') ?? [], label: () => 'Sentar à mesa', execute: () => undefined }];
  return {
    targets, meshes: allMeshes,
    setActive(value: boolean) { active = value; root.setEnabled(value); for (const light of [ambient, sun, bounce]) light.setEnabled(value); if (value) refreshShadows(); },
    refreshShadows,
    get diagnostics() { return { version: 'cafe-compacto-1', bounds: COMPACT_KITCHEN, width: COMPACT_KITCHEN.maxX - COMPACT_KITCHEN.minX, depth: COMPACT_KITCHEN.endZ - COMPACT_KITCHEN.coreStartZ, seat: BREAKFAST_SEAT, parents: parents.diagnostics }; },
    animate(time: number, speaker?: string, observer?: Point, text?: string) {
      if (!active) return;
      parents.animate(time, speaker, observer, text);
      // Micro-idle keeps the cached contact shadows; a dialogue reaction gets
      // a fresh map without rendering an entire shadow pass on every frame.
      if ((speaker ?? '') !== previousSpeaker) { previousSpeaker = speaker ?? ''; refreshShadows(); }
    },
    dispose() {
      disposed = true;
      for (const light of oldLights) light.excludedMeshes = light.excludedMeshes.filter(mesh => !allMeshes.includes(mesh));
      shadows.dispose(); ambient.dispose(); sun.dispose(); bounce.dispose(); parents.dispose(); root.dispose(false, false); m.dispose();
    },
  };
}
