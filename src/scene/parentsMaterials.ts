import type { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';

/** Original woven/skin/comb textures. Human facial anatomy is geometry; no
 * photographic cutout or rendered portrait substitutes for either character. */
export function parentMaterials(scene: Scene) {
  const materials: StandardMaterial[] = [], textures: DynamicTexture[] = [];
  let seed = 290183;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function material(name: string, color: string, pattern?: (c: CanvasRenderingContext2D, size: number) => void, size = 128) {
    const result = new StandardMaterial('pais · ' + name, scene);
    result.diffuseColor = Color3.FromHexString(color); result.specularColor.set(.025, .021, .017); result.specularPower = 22;
    if (pattern && typeof document !== 'undefined') {
      const texture = new DynamicTexture(name + ' original ' + size + 'px', { width: size, height: size }, scene, false, Texture.NEAREST_SAMPLINGMODE);
      const c = texture.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = color; c.fillRect(0, 0, size, size); pattern(c, size); texture.update(true);
      result.diffuseTexture = texture; result.diffuseColor.set(1, 1, 1); textures.push(texture);
    }
    materials.push(result); return result;
  }
  const cotton = (c: CanvasRenderingContext2D, n: number) => {
    for (let y = 0; y < n; y += 2) { c.fillStyle = 'rgba(233,220,194,.055)'; c.fillRect(0, y, n, 1); }
    for (let x = 0; x < n; x += 3) { c.fillStyle = 'rgba(38,29,21,.045)'; c.fillRect(x, 0, 1, n); }
    for (let i = 0; i < 1300; i++) { c.fillStyle = random() > .5 ? 'rgba(241,223,194,.025)' : 'rgba(42,31,23,.025)'; c.fillRect(random() * n, random() * n, 1, 1); }
  };
  const skin = material('pele com variação suave', '#b08c75', (c, n) => {
    for (let i = 0; i < 1400; i++) { c.fillStyle = random() > .5 ? 'rgba(225,183,151,.035)' : 'rgba(91,62,45,.03)'; c.fillRect(random() * n, random() * n, 2, 2); }
    const glow = c.createLinearGradient(0, 0, 0, n); glow.addColorStop(0, 'rgba(239,200,168,.035)'); glow.addColorStop(.6, 'rgba(140,84,66,.025)'); glow.addColorStop(1, 'rgba(66,48,36,.04)'); c.fillStyle = glow; c.fillRect(0, 0, n, n);
  });
  const skinShade = material('sombra da pele', '#98745f'), skinLight = material('dobras da pele', '#bd9b82');
  function faceAtlas(mother: boolean) {
    return material(mother ? 'pele do rosto da mãe 256' : 'pele do rosto do pai 256', '#b08c75', (c, n) => {
      // This cylindrical head atlas has its front at U=.5. V runs from chin
      // to crown. Paint only skin planes/creases; eyes/nose/lips remain 3D.
      const uv = (x: number, y: number) => ({
        x: n * (.5 + Math.asin(Math.max(-.99, Math.min(.99, x / .101))) / (Math.PI * 2)),
        y: n * (1 - y / .279),
      });
      function wash(x: number, y: number, rx: number, ry: number, color: string) {
        const p = uv(x, y), horizontal = Math.abs(uv(x + rx, y).x - p.x), vertical = ry / .279 * n;
        c.save(); c.translate(p.x, p.y); c.scale(Math.max(.1, horizontal), Math.max(.1, vertical));
        const fade = c.createRadialGradient(0, 0, 0, 0, 0, 1); fade.addColorStop(0, color); fade.addColorStop(1, 'rgba(118,81,61,0)');
        c.fillStyle = fade; c.fillRect(-1, -1, 2, 2); c.restore();
      }
      for (let i = 0; i < 2400; i++) {
        c.fillStyle = random() > .5 ? 'rgba(216,174,139,.035)' : 'rgba(89,61,45,.035)';
        c.fillRect(random() * n, random() * n, 1, 1);
      }
      wash(0, .215, .07, .045, 'rgba(230,187,150,.13)');
      wash(0, .025, .075, .021, 'rgba(78,54,43,.15)');
      for (const side of [-1, 1]) {
        wash(side * .046, .145, .029, .022, 'rgba(88,62,48,.20)');
        wash(side * .055, .125, .028, .012, 'rgba(98,65,50,.13)');
        wash(side * .061, .108, .027, .024, 'rgba(216,171,137,.17)');
        wash(side * .065, .085, .02, .016, mother ? 'rgba(161,93,78,.12)' : 'rgba(151,103,78,.09)');
        wash(side * .086, .073, .014, .038, 'rgba(77,55,43,.13)');
        const a = uv(side * .025, .093), b = uv(side * .037, .057);
        c.strokeStyle = 'rgba(104,68,51,.15)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(b.x, (a.y + b.y) / 2, b.x, b.y); c.stroke();
        const e = uv(side * .065, .148), f = uv(side * .078, .137);
        c.strokeStyle = 'rgba(102,72,53,.14)'; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(f.x, f.y); c.stroke();
      }
      for (let row = 0; row < (mother ? 2 : 3); row++) {
        const y = .199 + row * .014, a = uv(-.046, y), b = uv(.049, y);
        c.strokeStyle = mother ? 'rgba(111,78,57,.10)' : 'rgba(104,74,54,.13)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo((a.x + b.x) / 2, a.y + 1.7, b.x, b.y); c.stroke();
      }
      if (!mother) {
        wash(0, .045, .068, .038, 'rgba(65,66,56,.09)');
        for (let i = 0; i < 170; i++) {
          const x = (random() - .5) * .15, y = .018 + random() * .067, p = uv(x, y);
          c.fillStyle = 'rgba(63,58,46,.06)'; c.fillRect(p.x, p.y, 1, 1);
        }
      }
    }, 256);
  }
  const motherFace = faceAtlas(true), fatherFace = faceAtlas(false);
  const floral = material('algodão floral da mãe', '#bdb29c', (c, n) => {
    cotton(c, n);
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const x = 10 + col * 25 + (row % 2) * 10, y = 10 + row * 26;
      c.strokeStyle = '#71765b'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 2, y + 8); c.lineTo(x + 4, y - 5); c.stroke();
      c.fillStyle = '#73785c'; c.beginPath(); c.ellipse(x - 3, y + 6, 4, 1.5, -.6, 0, Math.PI * 2); c.fill();
      for (let p = 0; p < 5; p++) { const a = p * Math.PI * 2 / 5; c.fillStyle = p % 2 ? '#a77b66' : '#95634f'; c.beginPath(); c.ellipse(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.8, 2, a, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ba9b66'; c.fillRect(x - 1, y - 1, 2, 2);
    }
  });
  const collar = material('gola de algodão', '#beb09a', cotton), seam = material('costuras e botões', '#827866');
  const skirt = floral;
  const apron = material('avental claro bordado da mãe', '#d0c4a8', (c, n) => {
    cotton(c, n);
    c.strokeStyle = '#9e8a70'; c.lineWidth = 1; c.strokeRect(3, 3, n - 6, n - 6);
    for (const x of [19, 40, 65, 88, 111]) {
      const y = 101 + (x % 3) * 4;
      c.strokeStyle = '#7f8562'; c.beginPath(); c.moveTo(x, y + 7); c.lineTo(x + 2, y - 3); c.stroke();
      c.fillStyle = '#9f6b57';
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.fillRect(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 3, 3); }
      c.fillStyle = '#c2a66e'; c.fillRect(x, y, 2, 2);
    }
  });
  const shirt = material('camisa xadrez discreta do pai', '#afa78f', (c, n) => {
    cotton(c, n);
    for (let at = 6; at < n; at += 24) {
      c.fillStyle = 'rgba(101,106,101,.32)'; c.fillRect(0, at, n, 6); c.fillRect(at, 0, 6, n);
      c.fillStyle = 'rgba(214,204,177,.45)'; c.fillRect(0, at + 8, n, 2); c.fillRect(at + 8, 0, 2, n);
      c.fillStyle = 'rgba(91,91,80,.25)'; c.fillRect(0, at + 15, n, 1); c.fillRect(at + 15, 0, 1, n);
    }
  });
  const trousers = material('calça de sarja', '#4c4c46', cotton);
  const leather = material('couro marrom dos calçados', '#483a2d', (c, n) => {
    for (let i = 0; i < 1200; i++) { c.fillStyle = random() > .5 ? 'rgba(194,163,121,.025)' : 'rgba(0,0,0,.035)'; c.fillRect(random() * n, random() * n, 2, 1); }
  });
  const sole = material('solado e cinto', '#302e29');
  const hair = material('cabelo castanho natural', '#372c25', (c, n) => {
    for (let i = 0; i < 90; i++) { c.strokeStyle = i % 3 ? 'rgba(143,111,77,.085)' : 'rgba(13,10,9,.12)'; c.lineWidth = 1; c.beginPath(); const x = i / 90 * n; c.moveTo(x, 0); c.bezierCurveTo(x - 6, 37, x + 8, 91, x + 1, n); c.stroke(); }
  });
  const fatherHair = material('cabelo escuro com têmporas grisalhas', '#352f28', (c, n) => {
    for (let i = 0; i < 110; i++) {
      const x = i / 110 * n, temple = (x > n * .18 && x < n * .3) || (x > n * .7 && x < n * .82);
      c.strokeStyle = temple && i % 3 === 0 ? 'rgba(183,179,157,.62)' : i % 3 ? 'rgba(147,127,99,.16)' : 'rgba(13,10,9,.18)';
      c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x - 3, 30, x + 4, 75, x + 1, temple ? n * .66 : n); c.stroke();
    }
  });
  const eyeWhite = material('branco natural dos olhos', '#c5c0ad'), iris = material('íris castanha', '#554c35');
  const pupil = material('pupilas e linha dos cílios', '#302b25');
  const upperLip = material('contorno dos lábios', '#815d50'), lowerLip = material('lábio inferior', '#a67c68');
  const steel = material('relógio de pulso', '#8e8c7e'); steel.specularColor.set(.22, .2, .16); steel.specularPower = 40;
  const mouthInside = material('interior escuro da boca', '#422e29'), coffee = material('café coado', '#3f2a1c');
  return { skin, motherFace, fatherFace, skinShade, skinLight, floral, collar, seam, skirt, apron, shirt, trousers, leather, sole, hair, fatherHair, eyeWhite, iris, pupil, upperLip, lowerLip, mouthInside, coffee, steel,
    dispose() { for (const m of materials) m.dispose(false, false); for (const t of textures) t.dispose(); } };
}
export type ParentMaterials = ReturnType<typeof parentMaterials>;
