import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';

type Random = () => number;
type Paint = (context: CanvasRenderingContext2D, width: number, height: number, random: Random) => void;

/** Original surface art for the upstairs corridor. These small textures belong
 * to real meshes; no generated corridor image is used as scene geometry.
 * Architectural/cloth UVs stay under the geometry module's control. */
export function createHallwayMaterials(scene: Scene) {
  const materials: StandardMaterial[] = [];
  const textures: DynamicTexture[] = [];
  const textureSizes: { name: string; width: number; height: number }[] = [];
  function material(name: string, color: string) {
    const result = new StandardMaterial(`corredor · ${name}`, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor.set(.035, .029, .023); result.specularPower = 28;
    materials.push(result); return result;
  }
  function surface(name: string, width: number, height: number, paint: Paint, cutout = false) {
    let seed = 713851;
    for (const letter of name) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const texture = new DynamicTexture(`original · corredor · ${name}`, { width, height }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    texture.anisotropicFilteringLevel = 1; texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.hasAlpha = cutout;
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    context.clearRect(0, 0, width, height); paint(context, width, height, random); texture.update(true);
    textures.push(texture); textureSizes.push({ name, width, height });
    const result = material(name, '#ffffff'); result.diffuseTexture = texture;
    if (cutout) {
      result.useAlphaFromDiffuseTexture = true; result.transparencyMode = Material.MATERIAL_ALPHATEST;
      result.alphaCutOff = .45; result.backFaceCulling = false; result.twoSidedLighting = true;
      result.specularColor.set(.012, .01, .008);
    }
    return result;
  }
  function flecks(c: CanvasRenderingContext2D, w: number, h: number, random: Random, count = 2400, alpha = .065) {
    for (let i = 0; i < count; i++) {
      c.fillStyle = `rgba(${random() > .5 ? '232,218,185' : '55,42,28'},${random() * alpha})`;
      c.fillRect(Math.floor(random() * w), Math.floor(random() * h), 1 + Math.floor(random() * 2), 1);
    }
  }
  function weave(c: CanvasRenderingContext2D, w: number, h: number, spacing = 3) {
    c.fillStyle = 'rgba(234,216,179,.055)'; for (let x = 0; x < w; x += spacing) c.fillRect(x, 0, 1, h);
    c.fillStyle = 'rgba(39,29,24,.045)'; for (let y = 0; y < h; y += spacing) c.fillRect(0, y, w, 1);
  }
  const wallpaper = surface('papel de parede bege floral discreto', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#b8a38b'; c.fillRect(0, 0, w, h);
    for (let row = -1; row < 8; row++) for (let col = -1; col < 8; col++) {
      const x = col * 36 + (row % 2 ? 18 : 0), y = row * 36;
      c.strokeStyle = 'rgba(126,112,80,.23)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x + 15, y + 30); c.bezierCurveTo(x + 20, y + 18, x + 13, y + 16, x + 19, y + 6); c.stroke();
      c.fillStyle = 'rgba(135,130,90,.27)';
      for (const [dx, dy, a] of [[-4, 10, -.55], [6, 18, .5], [-3, 25, -.5]]) {
        c.beginPath(); c.ellipse(x + 16 + dx, y + dy, 4.6, 1.8, a, 0, Math.PI * 2); c.fill();
      }
      for (let petal = 0; petal < 5; petal++) {
        const a = petal * Math.PI * 2 / 5;
        c.fillStyle = petal % 2 ? 'rgba(160,131,98,.26)' : 'rgba(180,148,114,.31)';
        c.beginPath(); c.ellipse(x + 19 + Math.sin(a) * 2.4, y + 6 + Math.cos(a) * 2.4, 1.8, 2.8, -a, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = 'rgba(139,113,74,.35)'; c.fillRect(x + 18, y + 5, 2, 2);
    }
    for (let i = 0; i < 75; i++) {
      c.fillStyle = `rgba(106,80,55,${random() * .027})`;
      c.fillRect(random() * w, random() * h, 8 + random() * 29, 3 + random() * 13);
    }
    flecks(c, w, h, random, 3700, .055);
  });
  const ceiling = surface('teto de reboco doméstico', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#94836e'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 45; i++) { c.fillStyle = `rgba(81,66,49,${random() * .033})`; c.fillRect(random() * w, random() * h, 17, 9); }
    flecks(c, w, h, random, 1800, .055);
  });
  function walnut(name: string, base: string, darker = false) {
    const result = surface(name, 128, 256, (c, w, h, random) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        const x = random() * w;
        c.strokeStyle = i % 4 ? `rgba(31,21,15,${.025 + random() * .07})` : `rgba(183,134,78,${.025 + random() * .075})`;
        c.lineWidth = .5 + random(); c.beginPath(); c.moveTo(x, 0);
        c.bezierCurveTo(x + Math.sin(i) * 3, 80, x - Math.cos(i) * 4, 173, x + Math.sin(i * 2) * 2, h); c.stroke();
      }
      for (const [x, y] of [[38, 76], [92, 187]]) for (let r = 0; r < 4; r++) {
        c.strokeStyle = 'rgba(31,20,13,.055)'; c.lineWidth = .8; c.beginPath(); c.ellipse(x, y, 1 + r * 1.8, 5 + r * 7, .08, 0, Math.PI * 2); c.stroke();
      }
      flecks(c, w, h, random, 1300, .04);
    });
    result.specularColor.set(darker ? .08 : .11, darker ? .055 : .077, darker ? .032 : .047);
    result.specularPower = 38; return result;
  }
  const wood = walnut('madeira residencial envernizada', '#68452f');
  const darkWood = walnut('madeira escura do corrimão', '#493021', true);
  const floor = surface('tacos de madeira encerados', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#513727'; c.fillRect(0, 0, w, h);
    const colors = ['#65442f', '#5a3d2b', '#6a4933', '#60412d', '#6c4b34', '#5d3d29'];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      c.save(); c.translate(col * 64, row * 64);
      if ((row + col) % 2 === 0) { c.translate(64, 0); c.rotate(Math.PI / 2); }
      for (let plank = 0; plank < 4; plank++) {
        const yy = plank * 16; c.fillStyle = colors[Math.floor(random() * colors.length)]; c.fillRect(0, yy, 64, 16);
        c.fillStyle = 'rgba(45,29,20,.31)'; c.fillRect(0, yy, 64, 1); c.fillRect(0, yy, 1, 16);
        c.fillStyle = 'rgba(171,122,77,.08)'; c.fillRect(2, yy + 1, 59, 1);
        for (let grain = 0; grain < 10; grain++) {
          c.fillStyle = grain % 3 ? 'rgba(36,24,17,.065)' : 'rgba(169,126,83,.065)';
          c.fillRect(3 + random() * 43, yy + 3 + random() * 11, 6 + random() * 17, 1);
        }
      }
      c.restore();
    }
    flecks(c, w, h, random, 1700, .04);
  }); floor.specularColor.set(.11, .079, .048); floor.specularPower = 42;
  const white = surface('pintura branca antiga dos arremates', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#c4bda9'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(245,231,202,.04)'; c.fillRect(0, y, w, 1); }
    flecks(c, w, h, random, 1300, .045);
  }); white.specularColor.set(.065, .058, .043);
  const metal = surface('latão envelhecido de ferragens', 64, 64, (c, w, h, random) => {
    c.fillStyle = '#8b7148'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { c.fillStyle = `rgba(209,178,112,${random() * .07})`; c.fillRect(0, y, w, 1); }
    flecks(c, w, h, random, 550, .08);
  }); metal.specularColor.set(.25, .19, .10); metal.specularPower = 44;
  const ceramic = surface('cerâmica marfim com flores', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#bdb49e'; c.fillRect(0, 0, w, h);
    for (const [x, y] of [[32, 42], [98, 95]]) {
      c.strokeStyle = '#777a4d'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y + 12, x - 1, y + 25); c.stroke();
      for (let a = 0; a < 5; a++) { c.fillStyle = a % 2 ? '#a2705b' : '#ac8065'; c.beginPath(); c.ellipse(x + Math.sin(a * 1.257) * 5, y + Math.cos(a * 1.257) * 5, 3, 4, -a, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#8a8e59'; c.beginPath(); c.ellipse(x + 7, y + 15, 6, 2, -.5, 0, Math.PI * 2); c.fill();
    }
    flecks(c, w, h, random, 700, .035);
  }); ceramic.specularColor.set(.12, .105, .079); ceramic.specularPower = 40;
  const terracotta = surface('barro de vaso usado', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#825c42'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(176,133,93,${random() * .065})`; c.fillRect(0, y, w, 1); }
    flecks(c, w, h, random, 1700, .10);
  });
  const leaf = surface('folha com nervuras discretas', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#495f31'; c.fillRect(0, 0, w, h);
    const gradient = c.createLinearGradient(0, 0, w, h); gradient.addColorStop(0, 'rgba(117,136,66,.38)'); gradient.addColorStop(1, 'rgba(20,43,23,.30)'); c.fillStyle = gradient; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(143,151,83,.48)'; c.lineWidth = 2; c.beginPath(); c.moveTo(63, 0); c.lineTo(66, 128); c.stroke();
    c.lineWidth = 1;
    for (let y = 16; y < h; y += 17) { c.beginPath(); c.moveTo(64, y + 17); c.lineTo(15, y - 8); c.moveTo(65, y + 17); c.lineTo(115, y - 8); c.stroke(); }
    flecks(c, w, h, random, 700, .045);
  }); leaf.backFaceCulling = false; leaf.twoSidedLighting = true;
  const fabric = surface('tecido doméstico azul escuro', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#4c5050'; c.fillRect(0, 0, w, h); weave(c, w, h); flecks(c, w, h, random, 950, .04);
  });
  // The runner mesh is .78 × 3.23 m. A 128 × 512 image keeps the
  // woven flowers and border widths close to isotropic in physical space.
  const rug = surface('passadeira persa vinho e ocre', 128, 512, (c, w, h, random) => {
    c.fillStyle = '#62473b'; c.fillRect(0, 0, w, h);
    for (const [inset, color, line] of [[2, '#a58e60', 2], [6, '#443d2f', 2], [10, '#9b8055', 4], [15, '#4c4934', 3], [19, '#b39c6e', 2]] as const) {
      c.strokeStyle = color; c.lineWidth = line; c.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    }
    c.fillStyle = '#6b3530'; c.fillRect(22, 22, w - 44, h - 44);
    const flower = (x: number, y: number, r: number, pale: boolean) => {
      c.fillStyle = pale ? '#a28f62' : '#444b39';
      c.beginPath(); for (let a = 0; a < 8; a++) { const angle = a * Math.PI / 4, rr = a % 2 ? r * .63 : r; const xx = x + Math.sin(angle) * rr, yy = y + Math.cos(angle) * rr; if (a) c.lineTo(xx, yy); else c.moveTo(xx, yy); } c.closePath(); c.fill();
      c.fillStyle = pale ? '#654836' : '#aa966d'; c.fillRect(x - .5, y - r * .5, 1, r); c.fillRect(x - r * .5, y - .5, r, 1);
      c.fillStyle = '#c0aa7a'; c.fillRect(x - .5, y - .5, 1, 1);
    };
    for (let y = 30; y < h - 29; y += 13) for (let x = 29; x < w - 27; x += 12) flower(x + (Math.floor(y / 13) % 2 ? 5 : 0), y, 2.8, (x + y) % 3 === 0);
    const center = w / 2;
    for (const y of [70, 163, 256, 349, 442]) {
      c.strokeStyle = '#baa374'; c.lineWidth = 2; c.beginPath(); c.moveTo(center, y - 33); c.lineTo(center + 28, y); c.lineTo(center, y + 33); c.lineTo(center - 28, y); c.closePath(); c.stroke();
      c.strokeStyle = '#444837'; c.lineWidth = 3; c.beginPath(); c.moveTo(center, y - 25); c.lineTo(center + 21, y); c.lineTo(center, y + 25); c.lineTo(center - 21, y); c.closePath(); c.stroke();
      flower(center, y, 9, true);
      for (const side of [-1, 1]) flower(center + side * 18, y, 3, true);
    }
    for (let y = 12; y < h - 9; y += 12) { flower(11, y, 2.5, true); flower(w - 11, y, 2.5, true); }
    for (let x = 12; x < w - 9; x += 12) { flower(x, 11, 2.5, true); flower(x, h - 11, 2.5, true); }
    weave(c, w, h, 2); flecks(c, w, h, random, 3100, .11);
  });
  const lace = surface('renda de crochê vazada', 128, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = '#d7c9a9'; c.lineWidth = 1.3;
    // Interlocking threads retain genuine transparent holes between stitches.
    for (let y = -8; y <= h + 8; y += 8) for (let x = -8; x <= w + 8; x += 8) {
      c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x + 4, y); c.lineTo(x + 8, y + 4); c.lineTo(x + 4, y + 8); c.closePath(); c.stroke();
    }
    for (let y = 24; y < h; y += 48) for (let x = 20; x < w; x += 44) {
      c.strokeStyle = '#e1d1ad'; c.lineWidth = 2;
      for (let a = 0; a < 6; a++) { const angle = a * Math.PI / 3; c.beginPath(); c.ellipse(x + Math.sin(angle) * 5.5, y + Math.cos(angle) * 5.5, 3.8, 6.5, -angle, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#d5c5a2'; c.beginPath(); c.arc(x, y, 2.8, 0, Math.PI * 2); c.fill();
    }
    for (const y of [5, 9, 245, 250]) { c.strokeStyle = '#d1c19d'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }, true);
  const glass = material('vidro transparente da janela', '#afb5b0'); glass.alpha = .07; glass.backFaceCulling = false; glass.specularColor.set(.20, .18, .14); glass.specularPower = 64;
  const telephone = surface('plástico bege do telefone antigo', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#b5a57f'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(89,74,45,${random() * .03})`; c.fillRect(random() * w, random() * h, 5 + random() * 13, 2 + random() * 5); }
    flecks(c, w, h, random, 1500, .055);
  }); telephone.specularColor.set(.11, .095, .06); telephone.specularPower = 34;
  const rubber = surface('borracha escura dos cabos', 64, 64, (c, w, h, random) => { c.fillStyle = '#292722'; c.fillRect(0, 0, w, h); flecks(c, w, h, random, 450, .045); });
  function paintFace(c: CanvasRenderingContext2D, x: number, y: number, r: number, male: boolean) {
    c.fillStyle = '#3b2d24'; c.beginPath(); c.ellipse(x, y, r * .99, r * 1.3, -.025, 0, Math.PI * 2); c.fill();
    const skin = c.createRadialGradient(x - r * .24, y - r * .20, r * .08, x, y + r * .12, r * 1.18);
    skin.addColorStop(0, '#bd9270'); skin.addColorStop(.62, '#aa7d5d'); skin.addColorStop(1, '#79533e'); c.fillStyle = skin;
    c.beginPath(); c.ellipse(x, y + r * .12, r * .75, r, -.025, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#362b24'; c.beginPath(); c.moveTo(x - r * .83, y - r * .10); c.lineTo(x - r * .72, y - r * .85); c.lineTo(x + r * .35, y - r); c.lineTo(x + r * .79, y - r * .22); c.lineTo(x + r * .22, y - r * .65); c.lineTo(x - r * .56, y - r * .44); c.closePath(); c.fill();
    c.strokeStyle = '#4b352a'; c.lineWidth = Math.max(1, r * .075); c.beginPath(); c.moveTo(x - r * .49, y - r * .09); c.lineTo(x - r * .18, y - r * .13); c.moveTo(x + r * .16, y - r * .12); c.lineTo(x + r * .46, y - r * .07); c.stroke();
    c.fillStyle = '#322b26'; c.fillRect(x - r * .39, y + r * .04, Math.max(1, r * .11), Math.max(1, r * .07)); c.fillRect(x + r * .25, y + r * .04, Math.max(1, r * .11), Math.max(1, r * .07));
    c.strokeStyle = '#82533d'; c.lineWidth = Math.max(1, r * .06); c.beginPath(); c.moveTo(x - r * .02, y + r * .12); c.lineTo(x + r * .08, y + r * .36); c.lineTo(x - r * .03, y + r * .40); c.stroke();
    if (male) { c.fillStyle = '#514033'; c.fillRect(x - r * .31, y + r * .43, r * .62, r * .12); }
    c.strokeStyle = '#684534'; c.lineWidth = Math.max(1, r * .055); c.beginPath(); c.moveTo(x - r * .22, y + r * .62); c.quadraticCurveTo(x, y + r * .68, x + r * .24, y + r * .60); c.stroke();
  }
  const family = surface('fotografia original dos pais e filho', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#a79373'; c.fillRect(0, 0, w, h); c.fillStyle = '#6a745b'; c.fillRect(8, 8, w - 16, 158);
    for (let i = 0; i < 65; i++) { c.fillStyle = ['#748062', '#59684f', '#839071'][i % 3]; c.beginPath(); c.ellipse(random() * w, random() * 144, 5 + random() * 12, 7 + random() * 10, random(), 0, Math.PI * 2); c.fill(); }
    for (const [x, y, half, color, male] of [[63, 85, 36, '#9e9582', true], [193, 82, 35, '#aa8e78', false], [131, 135, 30, '#89894e', false]] as const) {
      c.fillStyle = color; c.beginPath(); c.moveTo(x - half, 249); c.lineTo(x - half + 7, y + 36); c.lineTo(x, y + 22); c.lineTo(x + half - 7, y + 36); c.lineTo(x + half, 249); c.closePath(); c.fill();
      c.fillStyle = '#9a7658'; c.fillRect(x - 7, y + 15, 14, 20);
      paintFace(c, x, y, male ? 23 : x === 131 ? 19 : 22, male);
      c.strokeStyle = 'rgba(46,41,35,.21)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - half + 10, y + 48); c.lineTo(x - half + 4, 230); c.moveTo(x + half - 9, y + 48); c.lineTo(x + half - 4, 230); c.stroke();
    }
    c.strokeStyle = '#c8b99b'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); flecks(c, w, h, random, 2900, .115);
  });
  const landscapes = [0, 1, 2].map(variant => surface(`paisagem brasileira original ${variant + 1}`, 256, 192, (c, w, h, random) => {
    const skyGradient = c.createLinearGradient(0, 0, 0, h * .67);
    skyGradient.addColorStop(0, variant === 1 ? '#899293' : '#889696'); skyGradient.addColorStop(1, '#c3b493'); c.fillStyle = skyGradient; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(212,196,163,.22)'; c.beginPath(); c.ellipse(random() * w, 18 + random() * 53, 10 + random() * 24, 2 + random() * 7, 0, 0, Math.PI * 2); c.fill(); }
    const hills = (yy: number, color: string, amplitude: number) => { c.fillStyle = color; c.beginPath(); c.moveTo(0, h); c.lineTo(0, yy); for (let x = 0; x <= w; x += 10) c.lineTo(x, yy + Math.sin(x * .026 + variant) * amplitude + Math.cos(x * .052) * amplitude * .5); c.lineTo(w, h); c.closePath(); c.fill(); };
    hills(86, '#758279', 14); hills(111, '#68735e', 8); hills(139, '#77754d', 10);
    if (variant === 1) { c.fillStyle = '#969e8d'; c.beginPath(); c.moveTo(115, 110); c.lineTo(132, 110); c.lineTo(180, h); c.lineTo(80, h); c.closePath(); c.fill(); c.strokeStyle = 'rgba(203,194,160,.39)'; c.lineWidth = 1; for (let y = 126; y < h; y += 7) { c.beginPath(); c.moveTo(110 - (y - 120) * .25, y); c.lineTo(140 + (y - 120) * .3, y); c.stroke(); } }
    else { c.fillStyle = '#aa8e65'; c.beginPath(); c.moveTo(149, 129); c.lineTo(156, 129); c.lineTo(125, h); c.lineTo(45, h); c.quadraticCurveTo(111, 153, 149, 129); c.fill(); }
    const houseX = variant === 2 ? 99 : 166, houseY = 108;
    if (variant !== 1) {
      c.fillStyle = '#beb08a'; c.fillRect(houseX, houseY, 41, 28); c.fillStyle = '#8d634a'; c.beginPath(); c.moveTo(houseX - 5, houseY + 1); c.lineTo(houseX + 20, houseY - 18); c.lineTo(houseX + 47, houseY + 1); c.closePath(); c.fill();
      c.fillStyle = '#514a36'; c.fillRect(houseX + 18, houseY + 10, 8, 18); c.fillRect(houseX + 5, houseY + 8, 7, 9); c.fillRect(houseX + 30, houseY + 8, 7, 9);
      c.strokeStyle = 'rgba(91,67,42,.22)'; c.lineWidth = 1; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(houseX + 6 + i * 7, houseY - 10); c.lineTo(houseX + i * 9, houseY); c.stroke(); }
    }
    for (const [x, y, scale] of [[36, 115, 1], [224, 112, .8], [14, 141, .55]]) {
      c.fillStyle = '#574c34'; c.fillRect(x - scale * 3, y - 19 * scale, 5 * scale, 43 * scale);
      for (let i = 0; i < 55; i++) { c.fillStyle = ['#4c5f3f', '#637147', '#6e7a4b', '#44563b'][i % 4]; c.beginPath(); c.ellipse(x + (random() - .5) * 47 * scale, y - 22 * scale + (random() - .5) * 47 * scale, (3 + random() * 5) * scale, (4 + random() * 6) * scale, random(), 0, Math.PI * 2); c.fill(); }
    }
    for (let i = 0; i < 150; i++) { c.fillStyle = ['#7b7c52', '#8b8354', '#5f6b43'][i % 3]; c.fillRect(random() * w, 145 + random() * 47, 1 + random() * 3, 1); }
    flecks(c, w, h, random, 3300, .14);
  }));
  const sky = surface('luz suave da manhã além da janela', 128, 256, (c, w, h, random) => {
    const gradient = c.createLinearGradient(0, 0, 0, h); gradient.addColorStop(0, '#9aa7a7'); gradient.addColorStop(.5, '#bebba9'); gradient.addColorStop(1, '#d6c29c'); c.fillStyle = gradient; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { c.fillStyle = 'rgba(218,210,184,.13)'; c.beginPath(); c.ellipse(random() * w, random() * h * .65, 12 + random() * 28, 3 + random() * 8, 0, 0, Math.PI * 2); c.fill(); }
  }); sky.disableLighting = true; sky.emissiveColor.set(1, 1, 1); sky.specularColor.set(0, 0, 0);
  return { wallpaper, ceiling, floor, wood, darkWood, white, metal, ceramic, terracotta, leaf, fabric,
    rug, lace, glass, telephone, rubber, family, landscapes, sky, material, surface,
    get diagnostics() { return { materials: materials.length, textures: textures.length, sizes: textureSizes.map(size => ({ ...size })) }; },
    dispose() { for (const m of materials) m.dispose(false, false); for (const t of textures) t.dispose(); },
  };
}
export type HallwayMaterials = ReturnType<typeof createHallwayMaterials>;
