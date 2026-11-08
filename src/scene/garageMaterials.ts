import type { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';

/** Small original surface set for this room only; no downloaded dependencies. */
export function createGarageMaterials(scene: Scene) {
  const materials: StandardMaterial[] = [], textures: DynamicTexture[] = [];
  let seed = 712034;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function surface(name: string, colour: string, pattern?: (c: CanvasRenderingContext2D, n: number) => void, size = 128) {
    const m = new StandardMaterial('garagem · ' + name, scene);
    m.diffuseColor = Color3.FromHexString(colour); m.specularColor.set(.035, .032, .028); m.specularPower = 20;
    if (pattern && typeof document !== 'undefined') {
      const t = new DynamicTexture('garagem · ' + name + ' original', { width: size, height: size }, scene, false, Texture.NEAREST_SAMPLINGMODE);
      const c = t.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = colour; c.fillRect(0, 0, size, size); pattern(c, size); t.update(true);
      t.anisotropicFilteringLevel = 1; t.wrapU = t.wrapV = Texture.WRAP_ADDRESSMODE;
      m.diffuseTexture = t; m.diffuseColor.set(1, 1, 1); textures.push(t);
    }
    materials.push(m); return m;
  }
  const grain = (c: CanvasRenderingContext2D, n: number, amount = .07) => {
    for (let i = 0; i < n * n / 3; i++) {
      c.fillStyle = random() > .5 ? `rgba(239,224,193,${random() * amount})` : `rgba(41,35,29,${random() * amount})`;
      c.fillRect(Math.floor(random() * n), Math.floor(random() * n), 1 + Math.floor(random() * 2), 1);
    }
  };
  const concrete = surface('concreto varrido', '#928774', (c, n) => {
    grain(c, n, .18);
    for (let y = 0; y < n; y += 3) { c.strokeStyle = 'rgba(50,43,36,.035)'; c.beginPath(); c.moveTo(0, y); c.lineTo(n, y + random() * 2); c.stroke(); }
    c.strokeStyle = 'rgba(76,66,53,.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(3, 47); c.lineTo(39, 50); c.lineTo(53, 56); c.stroke();
  }, 256);
  const wall = surface('reboco creme gasto', '#c2ad8c', (c, n) => {
    grain(c, n, .05);
    for (let i = 0; i < 26; i++) { c.fillStyle = 'rgba(112,87,61,.025)'; c.fillRect(random() * n, random() * n, 3 + random() * 15, 3 + random() * 9); }
  });
  const dado = surface('barra inferior pintada', '#918575', (c, n) => grain(c, n, .09));
  const timber = surface('forro e porta de madeira', '#705138', (c, n) => {
    grain(c, n, .1);
    for (let x = 0; x < n; x += 21) { c.fillStyle = 'rgba(27,21,15,.35)'; c.fillRect(x, 0, 1, n); }
    for (let i = 0; i < 70; i++) { const x = random() * n; c.strokeStyle = i % 2 ? 'rgba(202,162,100,.13)' : 'rgba(37,25,18,.15)'; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x - 2, 35, x + 3, 86, x, n); c.stroke(); }
  });
  const gate = surface('portão de metal envelhecido', '#77796b', (c, n) => {
    grain(c, n, .07);
    for (let i = 0; i < 36; i++) { c.fillStyle = i % 3 ? 'rgba(47,48,40,.09)' : 'rgba(135,85,47,.17)'; c.fillRect(random() * n, random() * n, 1 + random() * 3, 2 + random() * 9); }
  });
  const iron = surface('ferragens escuras', '#373b34', (c, n) => grain(c, n, .045));
  const tool = surface('aço das ferramentas', '#a9aba1'); tool.specularColor.set(.19, .18, .15);
  const cardboard = surface('caixas de papelão', '#9a774b', (c, n) => {
    grain(c, n, .1); c.fillStyle = '#b99c6b'; c.fillRect(n * .43, 0, n * .14, n);
    c.fillStyle = 'rgba(53,40,24,.50)'; c.font = 'bold 10px monospace'; c.fillText('CASA', 8, n * .69); c.font = '7px monospace'; c.fillText('FRÁGIL', 8, n * .80);
    c.strokeStyle = 'rgba(79,54,30,.3)'; c.strokeRect(2, 2, n - 4, n - 4);
  });
  const red = surface('caixa de ferramentas vermelha', '#854b3b', (c, n) => {
    grain(c, n, .07); c.fillStyle = 'rgba(185,160,119,.30)'; for (let i = 0; i < 24; i++) c.fillRect(random() * n, random() * n, 1 + random() * 4, 1);
  });
  const bulb = surface('lâmpada acesa', '#ffe5ac'); bulb.emissiveColor.set(.93, .73, .38); bulb.disableLighting = true;
  const sky = surface('manhã além do portão', '#b2c7c4', (c, n) => {
    const gradient = c.createLinearGradient(0, 0, 0, n); gradient.addColorStop(0, '#a4bec6'); gradient.addColorStop(.66, '#d7c9a6'); gradient.addColorStop(1, '#e3ca94'); c.fillStyle = gradient; c.fillRect(0, 0, n, n);
  });
  sky.emissiveTexture = sky.diffuseTexture; sky.emissiveColor.set(.9, .9, .86); sky.disableLighting = true;
  const greenery = surface('folhagem além da rua', '#69724b', (c, n) => grain(c, n, .12));
  return { concrete, wall, dado, timber, gate, iron, tool, cardboard, red, bulb, sky, greenery,
    get diagnostics() { return { materials: materials.length, textures: textures.length }; },
    dispose() { for (const m of materials) m.dispose(false, false); for (const t of textures) t.dispose(); } };
}
