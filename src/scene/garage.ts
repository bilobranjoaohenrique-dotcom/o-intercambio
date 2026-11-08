import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { GARAGE, GARAGE_DOOR, GARAGE_SHELF, GARAGE_WEST_FACE } from '../game/garageLayout';
import { LAUNDRY_GARAGE_DOOR } from '../game/laundryLayout';
import { HomeGeometry } from './props';
import { createGarageMaterials } from './garageMaterials';
import { buildFamilyCar } from './familyCar';

/** A furnished addition connected to the existing downstairs passage. The
 * garage owns its lights and geometry; the house's approved sets stay intact. */
export function buildGarage(scene: Scene, parent: TransformNode) {
  const oldLights = [...scene.lights], root = new TransformNode('garagem da família', scene);
  root.parent = parent;
  const m = createGarageMaterials(scene), g = new HomeGeometry(scene), b = g.box.bind(g), rod = g.rod.bind(g), c = g.cylinder.bind(g);
  const width = GARAGE.maxX - GARAGE.minX, depth = GARAGE.maxZ - GARAGE.minZ;
  const cx = (GARAGE.minX + GARAGE.maxX) / 2, cz = (GARAGE.minZ + GARAGE.maxZ) / 2;
  function mapped(mesh: Mesh, period: number) {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!, normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
    mesh.computeWorldMatrix(true); const matrix = mesh.getWorldMatrix(), uvs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const p = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), matrix);
      const n = Vector3.TransformNormal(new Vector3(normals[i], normals[i + 1], normals[i + 2]), matrix);
      uvs.push((Math.abs(n.x) > .5 ? p.z : p.x) / period, (Math.abs(n.y) > .5 ? p.z : p.y) / period);
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uvs);
    return mesh;
  }
  function board(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: StandardMaterial, period = 1) {
    return mapped(b('garagem · ' + name, w, h, d, x, y, z, material), period);
  }
  const floor = board('piso de concreto contínuo', width, .10, depth, cx, -.05, cz, m.concrete, 1.5);
  floor.metadata.castShadow = false;
  board('forro simples de madeira', width + .14, .12, depth + .14, cx, GARAGE.ceiling + .06, cz, m.timber, .8);
  for (const z of [GARAGE.minZ + .44, cz, GARAGE.maxZ - .44])
    board('travessa do forro', width, .065, .055, cx, GARAGE.ceiling - .0325, z, m.timber, .8);

  // The west surface covers only the garage side of the existing house wall.
  // Its tile-facing surface and the existing room lighting are never changed.
  const westX = GARAGE_WEST_FACE - .010;
  for (const [z0, z1] of [[GARAGE.minZ, GARAGE_DOOR.minZ], [GARAGE_DOOR.maxZ, GARAGE.maxZ]]) {
    board('parede oeste clara', .020, GARAGE.ceiling - .75, z1 - z0, westX, (GARAGE.ceiling + .75) / 2, (z0 + z1) / 2, m.wall);
    board('barra inferior oeste', .020, .75, z1 - z0, westX, .375, (z0 + z1) / 2, m.dado);
  }
  board('verga sobre a porta interna', .020, GARAGE.ceiling - GARAGE_DOOR.height, GARAGE_DOOR.maxZ - GARAGE_DOOR.minZ,
    westX, (GARAGE.ceiling + GARAGE_DOOR.height) / 2, (GARAGE_DOOR.minZ + GARAGE_DOOR.maxZ) / 2, m.wall);
  for (const z of [GARAGE.minZ - .06, GARAGE.maxZ + .06]) {
    const spans = z < cz ? [[GARAGE.minX - .06, GARAGE.maxX + .06]] :
      [[GARAGE.minX - .06, LAUNDRY_GARAGE_DOOR.minX], [LAUNDRY_GARAGE_DOOR.maxX, GARAGE.maxX + .06]];
    for (const [x0, x1] of spans) {
      board('parede lateral clara', x1 - x0, GARAGE.ceiling - .75, .12, (x0 + x1) / 2, (GARAGE.ceiling + .75) / 2, z, m.wall);
      board('barra inferior lateral', x1 - x0, .75, .12, (x0 + x1) / 2, .375, z, m.dado);
      const a = Math.max(x0, GARAGE.minX), b = Math.min(x1, GARAGE.maxX);
      board('rodapé de concreto', b - a, .065, .022, (a + b) / 2, .0325, z + (z < cz ? .071 : -.071), m.dado);
    }
  }
  board('verga sobre a porta da lavanderia', LAUNDRY_GARAGE_DOOR.maxX - LAUNDRY_GARAGE_DOOR.minX,
    GARAGE.ceiling - LAUNDRY_GARAGE_DOOR.height, .12, (LAUNDRY_GARAGE_DOOR.minX + LAUNDRY_GARAGE_DOOR.maxX) / 2,
    (GARAGE.ceiling + LAUNDRY_GARAGE_DOOR.height) / 2, GARAGE.maxZ + .06, m.wall);

  // A 1m opening and a leaf folded fully back leave the real walking route free.
  for (const z of [GARAGE_DOOR.minZ - .035, GARAGE_DOOR.maxZ + .035])
    board('batente de madeira da porta da casa', .20, 2.16, .07, 4.52, 1.08, z, m.timber, .45);
  board('travessa da porta da casa', .20, .07, GARAGE_DOOR.maxZ - GARAGE_DOOR.minZ + .14, 4.52, 2.135, (GARAGE_DOOR.minZ + GARAGE_DOOR.maxZ) / 2, m.timber, .45);
  board('folha de madeira aberta contra a parede', .05, 2.04, .90, 4.62, 1.02, 13.80, m.timber, .45);
  for (const y of [.52, 1.49]) {
    b('porta · painel rebaixado', .009, .72, .68, 4.650, y, 13.80, m.dado);
    for (const z of [13.445, 14.155]) b('porta · friso vertical', .016, .78, .022, 4.656, y, z, m.timber);
    for (const yy of [y - .38, y + .38]) b('porta · friso horizontal', .016, .022, .73, 4.656, yy, 13.80, m.timber);
  }
  for (const y of [.20, 1.05, 1.88]) c('porta · dobradiça', .10, .018, .018, 4.593, y, GARAGE_DOOR.minZ, m.tool, undefined, 8);
  rod('porta · base da maçaneta', { x: 4.65, y: 1.03, z: 13.49 }, { x: 4.69, y: 1.03, z: 13.49 }, .008, m.tool);
  g.sphere('porta · maçaneta redonda', .055, .055, .055, 4.70, 1.03, 13.49, m.tool);

  // Opaque lower gate and real open grille: the morning sun passes between bars.
  for (const z of [GARAGE.minZ + .055, GARAGE.maxZ - .055])
    b('portão · montante lateral', .08, 2.68, .07, GARAGE.maxX + .03, 1.34, z, m.iron);
  for (const y of [.06, 2.10, 2.66]) b('portão · travessa de metal', .08, .07, depth - .08, GARAGE.maxX + .03, y, cz, m.iron);
  const panels = 12, panelW = (depth - .16) / panels;
  for (let i = 0; i < panels; i++) {
    const z = GARAGE.minZ + .08 + panelW * (i + .5);
    board('portão · chapa vertical com desgaste', .045, 2.01, panelW - .007, GARAGE.maxX + .035, 1.08, z, m.gate, .8);
    b('portão · nervura prensada', .018, 1.91, .012, GARAGE.maxX - .002, 1.08, z, m.iron);
  }
  for (let i = 0; i <= 19; i++) {
    const z = GARAGE.minZ + .085 + (depth - .17) * i / 19;
    b('portão · grade superior aberta', .032, .49, .025, GARAGE.maxX + .02, 2.38, z, m.gate);
  }
  for (const z0 of [GARAGE.minZ + .12, cz + .025]) {
    const z1 = z0 + depth / 2 - .15;
    rod('portão · reforço diagonal', { x: GARAGE.maxX - .018, y: .17, z: z0 }, { x: GARAGE.maxX - .018, y: 1.99, z: z1 }, .018, m.iron);
  }
  b('portão · fecho central', .045, .09, .27, GARAGE.maxX - .04, 1.12, cz, m.iron);

  const shelf = GARAGE_SHELF;
  for (const dx of [-shelf.width / 2 + .018, shelf.width / 2 - .018]) for (const dz of [-shelf.depth / 2 + .018, shelf.depth / 2 - .018])
    b('estante · cantoneira de aço', .028, shelf.height, .028, shelf.x + dx, shelf.height / 2, shelf.z + dz, m.iron);
  for (const y of [.15, .67, 1.20, 1.74]) b('estante · prateleira de metal', shelf.width, .025, shelf.depth, shelf.x, y, shelf.z, m.iron);
  b('caixa de papelão inferior', .42, .31, .27, shelf.x - .27, .319, shelf.z, m.cardboard);
  b('caixa de papelão pequena', .38, .25, .27, shelf.x + .29, .289, shelf.z, m.cardboard);
  b('caixa de papelão superior', .40, .30, .28, shelf.x, 1.903, shelf.z, m.cardboard);
  b('caixa de ferramentas usada', .60, .23, .27, shelf.x, .798, shelf.z, m.red);
  b('caixa de ferramentas · tampa', .615, .027, .28, shelf.x, .925, shelf.z, m.red);
  for (const x of [shelf.x - .19, shelf.x + .19]) b('caixa de ferramentas · trava', .035, .06, .012, x, .88, shelf.z + .142, m.tool);
  rod('caixa de ferramentas · alça', { x: shelf.x - .10, y: .955, z: shelf.z }, { x: shelf.x + .10, y: .955, z: shelf.z }, .014, m.iron);

  board('painel pequeno de ferramentas', .86, .78, .025, 6.25, 1.80, GARAGE.minZ + .026, m.timber, .6);
  for (const x of [5.92, 6.58]) for (const y of [1.50, 2.10])
    g.sphere('painel · parafuso', .011, .011, .006, x, y, GARAGE.minZ + .043, m.tool);
  for (const [x, size] of [[6.01, .21], [6.20, .25]]) {
    rod('ferramenta · corpo da chave', { x, y: 1.63, z: 11.91 }, { x, y: 1.63 + size, z: 11.91 }, .010, m.tool);
    for (const y of [1.62, 1.64 + size]) {
      const ring = MeshBuilder.CreateTorus('ferramenta · cabeça da chave', { diameter: .05, thickness: .008, tessellation: 10 }, scene);
      ring.position.set(x, y, 11.91); ring.rotation.x = Math.PI / 2; g.add(ring, m.tool);
    }
  }
  b('ferramenta · cabo de chave de fenda', .027, .085, .027, 6.39, 1.64, 11.91, m.red);
  rod('ferramenta · haste de chave de fenda', { x: 6.39, y: 1.68, z: 11.91 }, { x: 6.39, y: 1.87, z: 11.91 }, .004, m.tool);
  rod('ferramenta · cabo do martelo', { x: 6.55, y: 1.59, z: 11.91 }, { x: 6.55, y: 1.92, z: 11.91 }, .012, m.timber);
  b('ferramenta · cabeça do martelo', .12, .045, .045, 6.55, 1.92, 11.91, m.tool);

  c('luminária · canopla', .025, .10, .10, 6.7, 2.732, cz, m.iron, undefined, 12);
  rod('luminária · fio curto', { x: 6.7, y: 2.72, z: cz }, { x: 6.7, y: 2.50, z: cz }, .006, m.iron);
  c('luminária · cúpula esmaltada', .12, .06, .27, 6.7, 2.47, cz, m.iron, undefined, 14);
  g.sphere('luminária · lâmpada quente', .10, .08, .10, 6.7, 2.403, cz, m.bulb).metadata.castShadow = false;

  // Limited support scenery beyond the gate; no extra playable neighbourhood.
  board('calçada além do portão', 4, .08, depth + 1, GARAGE.maxX + 2.0, -.05, cz, m.concrete, 1.5).metadata.castShadow = false;
  const sky = g.plane('manhã vista pelas grades', 8, 6, GARAGE.maxX + 5, 2.5, cz, m.sky, Math.PI / 2);
  sky.isPickable = false; sky.metadata.castShadow = false;
  for (const z of [GARAGE.minZ - .35, GARAGE.maxZ + .30]) {
    rod('árvore distante · tronco', { x: GARAGE.maxX + 3.2, y: 0, z }, { x: GARAGE.maxX + 3.2, y: 2.3, z }, .055, m.timber).metadata.castShadow = false;
    g.sphere('árvore distante · copa', 1.6, 1.9, 1.5, GARAGE.maxX + 3.2, 2.4, z, m.greenery).metadata.castShadow = false;
  }

  const roomMeshes = g.merge();
  for (const mesh of roomMeshes) { mesh.name = 'garagem · ' + mesh.name; mesh.parent = root; mesh.computeWorldMatrix(true); }
  const car = buildFamilyCar(scene, root);
  const meshes: AbstractMesh[] = [...roomMeshes, ...car.meshes];
  for (const light of oldLights) light.excludedMeshes.push(...meshes);
  const ambient = new HemisphericLight('garagem · luz ambiente da manhã', Vector3.Up(), scene);
  ambient.intensity = .57; ambient.diffuse = new Color3(.98, .93, .82); ambient.groundColor = new Color3(.40, .35, .29);
  const sun = new DirectionalLight('garagem · sol pelas grades do portão', new Vector3(-1, -.62, .10).normalize(), scene);
  sun.position.set(GARAGE.maxX + 2.8, 4.4, cz - .3); sun.diffuse = new Color3(1, .84, .60); sun.intensity = 1.05;
  sun.shadowMinZ = .1; sun.shadowMaxZ = 20; sun.shadowFrustumSize = 8;
  const lamp = new PointLight('garagem · lâmpada do teto', new Vector3(6.7, 2.36, cz), scene);
  lamp.diffuse = new Color3(1, .76, .44); lamp.intensity = .46; lamp.range = 6.5;
  const lights = [ambient, sun, lamp];
  for (const light of lights) light.includedOnlyMeshes = [...meshes];
  const shadows = new ShadowGenerator(1024, sun); shadows.bias = .0012; shadows.normalBias = .015;
  shadows.useBlurExponentialShadowMap = true; shadows.blurScale = 1; shadows.blurKernel = 4;
  for (const mesh of [...roomMeshes, ...car.shadowCasters])
    if (mesh.metadata?.castShadow && (mesh.material as StandardMaterial).alpha >= 1 && mesh.material !== m.bulb && mesh.material !== m.sky)
      shadows.addShadowCaster(mesh as Mesh);
  const map = shadows.getShadowMap()!; map.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  let active = true, disposed = false;
  const refreshShadows = () => map.resetRefreshCounter();
  void shadows.forceCompilationAsync().then(() => { if (!disposed) refreshShadows(); })
    .catch(error => console.error('Não foi possível preparar as sombras da garagem.', error));
  return {
    meshes, targets: [car.target], refreshShadows,
    setActive(value: boolean) { active = value; root.setEnabled(value); for (const light of lights) light.setEnabled(value); if (value) refreshShadows(); },
    get diagnostics() { return { version: 'garagem-familia-1', active, bounds: GARAGE, door: GARAGE_DOOR, meshes: meshes.length, car: car.diagnostics, materials: m.diagnostics }; },
    dispose() {
      if (disposed) return; disposed = true;
      for (const light of oldLights) light.excludedMeshes = light.excludedMeshes.filter(mesh => !meshes.includes(mesh));
      shadows.dispose(); for (const light of lights) light.dispose(); car.dispose(); root.dispose(false, false); m.dispose();
    },
  };
}
