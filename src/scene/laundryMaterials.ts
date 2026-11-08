import type { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';

/** Original, small repeating surfaces; no downloads or textures from other games. */
export function createLaundryMaterials(scene: Scene) {
  const materials: StandardMaterial[] = [], textures: DynamicTexture[] = [];
  let seed = 800143;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function surface(name: string, color: string, pattern?: (c: CanvasRenderingContext2D, n: number) => void, n = 128) {
    const mat = new StandardMaterial('lavanderia · ' + name, scene);
    mat.diffuseColor = Color3.FromHexString(color); mat.specularColor.set(.035, .032, .028); mat.specularPower = 24;
    if (pattern && typeof document !== 'undefined') {
      const t = new DynamicTexture('lavanderia · ' + name + ' original', { width: n, height: n }, scene, false, Texture.NEAREST_SAMPLINGMODE);
      const ctx = t.getContext() as unknown as CanvasRenderingContext2D;
      ctx.fillStyle = color; ctx.fillRect(0, 0, n, n); pattern(ctx, n); t.update(true);
      t.wrapU = t.wrapV = Texture.WRAP_ADDRESSMODE; t.anisotropicFilteringLevel = 1;
      mat.diffuseColor.set(1, 1, 1); mat.diffuseTexture = t; textures.push(t);
    }
    materials.push(mat); return mat;
  }
  function grain(c: CanvasRenderingContext2D, n: number, amount = .06) {
    for (let i = 0; i < n * n / 3; i++) {
      c.fillStyle = rand() < .5 ? `rgba(41,32,29,${rand() * amount})` : `rgba(244,229,206,${rand() * amount})`;
      c.fillRect(Math.floor(rand() * n), Math.floor(rand() * n), 1 + Math.floor(rand() * 2), 1);
    }
  }
  const floor = surface('cerâmica bege acinzentada', '#a29a8b', (c, n) => {
    grain(c, n, .14); c.strokeStyle = '#756f65'; c.lineWidth = 3; c.strokeRect(0, 0, n, n);
    c.strokeStyle = 'rgba(231,216,189,.22)'; c.lineWidth = 1; c.strokeRect(3, 3, n - 6, n - 6);
  });
  const tile = surface('azulejo claro até meia altura', '#c5bcac', (c, n) => {
    grain(c, n, .04); c.strokeStyle = '#a79f95'; c.lineWidth = 3; c.strokeRect(0, 0, n, n);
    c.strokeStyle = 'rgba(248,237,211,.35)'; c.lineWidth = 1; c.strokeRect(3, 3, n - 6, n - 6);
  });
  const paint = surface('pintura lavanda suave', '#a39a9e', (c, n) => {
    grain(c, n, .045);
    for (let i = 0; i < 24; i++) { c.fillStyle = 'rgba(220,201,187,.026)'; c.fillRect(rand() * n, rand() * n, 8 + rand() * 20, 5 + rand() * 16); }
  });
  const wood = surface('madeira envernizada', '#765035', (c, n) => {
    grain(c, n, .09);
    for (let i = 0; i < 58; i++) { const x = rand() * n; c.strokeStyle = i % 2 ? 'rgba(35,24,17,.17)' : 'rgba(209,160,99,.16)'; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 2, 30, x - 3, 95, x, n); c.stroke(); }
    c.fillStyle = 'rgba(30,20,14,.3)'; c.fillRect(0, 0, 1, n);
  });
  const roof = surface('telha aparente', '#915b3d', (c, n) => {
    grain(c, n, .13);
    for (let x = 0; x < n; x += 32) {
      const grad = c.createLinearGradient(x, 0, x + 32, 0); grad.addColorStop(0, 'rgba(39,24,16,.45)'); grad.addColorStop(.35, 'rgba(191,118,70,.25)'); grad.addColorStop(1, 'rgba(47,28,18,.32)'); c.fillStyle = grad; c.fillRect(x, 0, 32, n);
    }
    c.fillStyle = 'rgba(40,25,18,.4)'; for (let y = 0; y < n; y += 64) c.fillRect(0, y, n, 3);
  });
  const concrete = surface('tanque de concreto', '#a89c80', (c, n) => {
    grain(c, n, .21); for (let i = 0; i < 45; i++) { c.fillStyle = 'rgba(77,71,57,.11)'; c.fillRect(rand() * n, rand() * n, 1 + rand() * 2, 1 + rand() * 2); }
  });
  const basin = surface('interior do tanque', '#807a68', (c, n) => grain(c, n, .12));
  const enamel = surface('esmalte branco usado', '#d7d3bf', (c, n) => { grain(c, n, .035); c.fillStyle = 'rgba(124,119,100,.08)'; for (let i = 0; i < 12; i++) c.fillRect(rand() * n, n * .9 + rand() * n * .1, 1 + rand() * 3, 1); });
  enamel.specularColor.set(.16, .15, .13);
  const trim = surface('borracha e comandos', '#444a46', (c, n) => grain(c, n, .035));
  const metal = surface('metal simples', '#999e97'); metal.specularColor.set(.22, .22, .19);
  const cabinet = surface('MDF creme', '#c7bda7', (c, n) => grain(c, n, .04));
  const glass = surface('vidro levemente azulado', '#91a6a4'); glass.alpha = .19; glass.specularColor.set(.18, .18, .16); glass.backFaceCulling = false;
  const lid = surface('tampa fumê da máquina', '#56666b'); lid.alpha = .74; lid.specularColor.set(.2, .2, .18); lid.backFaceCulling = false;
  const blue = surface('plástico azul de limpeza', '#4a7483', (c, n) => grain(c, n, .055));
  const green = surface('plástico verde discreto', '#688675');
  const pink = surface('cesto lilás', '#9b8291', (c, n) => grain(c, n, .04));
  const yellow = surface('sabão e prendedores', '#bda04f');
  const label = surface('rótulo doméstico', '#e5d9bd', (c, n) => {
    grain(c, n, .035); c.fillStyle = '#587c8b'; c.fillRect(0, n * .16, n, n * .20); c.font = 'bold 14px monospace'; c.fillText('LIMPEZA', 10, n * .65); c.fillStyle = '#8f9b88'; c.fillRect(14, n * .76, n - 28, 4);
  });
  const towel = surface('algodão floral', '#c9c0aa', (c, n) => {
    grain(c, n, .07);
    for (let x = 16; x < n; x += 32) { c.fillStyle = '#879974'; c.fillRect(x, 77, 2, 18); c.fillRect(x - 6, 88, 14, 3); c.fillStyle = '#ae7b72'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.fillRect(x - 3 + Math.cos(a) * 5, 73 + Math.sin(a) * 5, 6, 6); } c.fillStyle = '#b6a054'; c.fillRect(x - 1, 75, 3, 3); }
    c.fillStyle = '#a8766a'; c.fillRect(0, 106, n, 3); c.fillRect(0, 113, n, 2);
  });
  towel.backFaceCulling = false; towel.twoSidedLighting = true;
  const mat = surface('tapete de retalhos', '#aa9b81', (c, n) => {
    const colors = ['#8d6e65','#baaa8a','#6e8280','#b18e6c','#bbb09b'];
    for (let y = 0; y < n; y += 8) { c.fillStyle = colors[Math.floor(y / 8) % colors.length]; c.fillRect(0, y, n, 6); }
    grain(c, n, .13); for (let x = 0; x < n; x += 3) { c.fillStyle = 'rgba(63,53,45,.12)'; c.fillRect(x, 0, 1, n); }
  });
  const leaf = surface('folhas da jiboia', '#6d8050', (c, n) => grain(c, n, .08));
  const sky = surface('quintal visto pela janela', '#c6c8af', (c, n) => {
    const grad = c.createLinearGradient(0, 0, 0, n); grad.addColorStop(0, '#b8c9c9'); grad.addColorStop(.52, '#d7c9a6'); grad.addColorStop(1, '#c0b08c'); c.fillStyle = grad; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 44; i++) { c.fillStyle = i % 3 ? '#879261' : '#a1a477'; c.fillRect(rand() * n, n * .2 + rand() * n * .5, 6 + rand() * 12, 6 + rand() * 10); }
    c.fillStyle = '#b37d58'; c.beginPath(); c.moveTo(0, n * .81); c.lineTo(n * .40, n * .54); c.lineTo(n, n * .80); c.fill();
    c.fillStyle = '#a5977a'; c.fillRect(0, n * .81, n, n * .19);
    grain(c, n, .045);
  });
  sky.disableLighting = true; sky.emissiveTexture = sky.diffuseTexture; sky.emissiveColor.set(.8, .8, .75);
  return { floor, tile, paint, wood, roof, concrete, basin, enamel, trim, metal, cabinet, glass, lid, blue, green, pink, yellow, label, towel, mat, leaf, sky,
    get diagnostics() { return { materials: materials.length, textures: textures.length }; },
    dispose() { for (const mat of materials) mat.dispose(false, false); for (const tex of textures) tex.dispose(); },
  };
}
