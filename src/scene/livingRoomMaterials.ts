import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';

type Random = () => number;
type Paint = (context: CanvasRenderingContext2D, width: number, height: number, random: Random) => void;

/** Small, original texture paintings for the playable living room. No reference
 * image, photograph, external artwork or rendered room is used as a backdrop.
 * UVs belong to the model: surfaces never mutate a shared texture's UV scale. */
export function createLivingRoomMaterials(scene: Scene) {
  const materials: StandardMaterial[] = [];
  const textures: DynamicTexture[] = [];
  const textureSizes: { name: string; width: number; height: number }[] = [];

  function material(name: string, color: string) {
    const result = new StandardMaterial(`sala · ${name}`, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor.set(.035, .029, .023);
    result.specularPower = 32;
    materials.push(result);
    return result;
  }
  function surface(name: string, width: number, height: number, paint: Paint, cutout = false) {
    let seed = 815327;
    for (const letter of name) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const texture = new DynamicTexture(`original · sala · ${name}`, { width, height }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    texture.anisotropicFilteringLevel = 1;
    texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.hasAlpha = cutout;
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    context.clearRect(0, 0, width, height);
    paint(context, width, height, random);
    texture.update(true);
    textures.push(texture);
    textureSizes.push({ name, width, height });
    const result = material(name, '#ffffff');
    result.diffuseTexture = texture;
    if (cutout) {
      result.useAlphaFromDiffuseTexture = true;
      result.transparencyMode = Material.MATERIAL_ALPHATEST;
      result.alphaCutOff = .42;
      result.backFaceCulling = false;
      result.twoSidedLighting = true;
      result.specularColor.set(.01, .009, .007);
    }
    return result;
  }
  function flecks(c: CanvasRenderingContext2D, w: number, h: number, random: Random, count = 2000, alpha = .06) {
    for (let i = 0; i < count; i++) {
      c.fillStyle = `rgba(${random() > .5 ? '231,214,180' : '47,35,24'},${random() * alpha})`;
      c.fillRect(Math.floor(random() * w), Math.floor(random() * h), 1 + Math.floor(random() * 2), 1);
    }
  }
  function weave(c: CanvasRenderingContext2D, w: number, h: number, spacing = 3) {
    c.fillStyle = 'rgba(231,208,162,.075)';
    for (let x = 0; x < w; x += spacing) c.fillRect(x, 0, 1, h);
    c.fillStyle = 'rgba(42,32,25,.07)';
    for (let y = 0; y < h; y += spacing) c.fillRect(0, y, w, 1);
  }
  function flower(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, center: string) {
    c.fillStyle = color;
    for (let petal = 0; petal < 6; petal++) {
      const angle = petal * Math.PI / 3;
      c.beginPath(); c.ellipse(x + Math.sin(angle) * radius * .57, y + Math.cos(angle) * radius * .57, radius * .46, radius * .64, -angle, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = center; c.beginPath(); c.arc(x, y, radius * .28, 0, Math.PI * 2); c.fill();
  }

  const wall = surface('parede bege envelhecida', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#b7a28a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 125; i++) {
      c.fillStyle = `rgba(${i % 2 ? '116,93,70' : '222,204,171'},${.018 + random() * .027})`;
      c.fillRect(random() * w, random() * h, 3 + random() * 18, 3 + random() * 15);
    }
    // Quiet embossed pattern, subordinate to furniture and pictures.
    for (let row = -1; row < 9; row++) for (let col = -1; col < 9; col++) {
      const x = col * 32 + (row % 2 ? 16 : 0), y = row * 32;
      c.strokeStyle = 'rgba(139,117,89,.11)'; c.lineWidth = .8;
      c.beginPath(); c.moveTo(x + 16, y + 29); c.bezierCurveTo(x + 12, y + 19, x + 20, y + 15, x + 16, y + 4); c.stroke();
      for (const [dx, dy, angle] of [[-3, 12, -.7], [3, 21, .7]]) {
        c.fillStyle = 'rgba(133,121,87,.12)';
        c.beginPath(); c.ellipse(x + 16 + dx, y + dy, 3.5, 1.5, angle, 0, Math.PI * 2); c.fill();
      }
    }
    flecks(c, w, h, random, 4900, .055);
  });
  const ceiling = surface('reboco quente do teto', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#9b8b75'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 65; i++) { c.fillStyle = `rgba(81,67,52,${random() * .035})`; c.fillRect(random() * w, random() * h, 8 + random() * 15, 4 + random() * 12); }
    flecks(c, w, h, random, 2100, .065);
  });
  // One texture covers four by four 36 cm tiles (period 1.44 m). It is ceramic,
  // deliberately distinct from the approved upstairs wooden parquet.
  const floor = surface('cerâmica marrom quadriculada', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#514335'; c.fillRect(0, 0, w, h);
    const tones = ['#795139', '#805039', '#714832', '#85563b', '#704b35', '#7a4c34'];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 64 + 1, y = row * 64 + 1;
      c.fillStyle = tones[Math.floor(random() * tones.length)]; c.fillRect(x, y, 62, 62);
      for (let i = 0; i < 55; i++) {
        c.fillStyle = `rgba(${i % 3 ? '52,29,19' : '185,128,78'},${.02 + random() * .065})`;
        c.beginPath(); c.ellipse(x + random() * 62, y + random() * 62, 1 + random() * 12, 1 + random() * 6, random() * 3, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = 'rgba(183,130,83,.17)'; c.lineWidth = 1; c.strokeRect(x + 2, y + 2, 57, 57);
      c.strokeStyle = 'rgba(42,27,20,.24)'; c.strokeRect(x + 4, y + 4, 53, 53);
      // Glazed clay had subtle variations, not a metal-like mirror.
      c.strokeStyle = 'rgba(193,137,88,.085)';
      for (let i = 0; i < 8; i++) { const yy = y + 8 + random() * 46; c.beginPath(); c.moveTo(x + 6, yy); c.lineTo(x + 54, yy - 3 + random() * 6); c.stroke(); }
    }
    flecks(c, w, h, random, 4200, .07);
  });
  floor.specularColor.set(.15, .105, .067); floor.specularPower = 48;

  function walnut(name: string, base: string, darker = false) {
    const result = surface(name, 128, 256, (c, w, h, random) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) {
        const x = random() * w;
        c.strokeStyle = i % 4 ? `rgba(28,18,12,${.025 + random() * .075})` : `rgba(180,127,72,${.035 + random() * .07})`;
        c.lineWidth = .5 + random(); c.beginPath(); c.moveTo(x, 0);
        c.bezierCurveTo(x + Math.sin(i) * 3, 80, x - Math.cos(i) * 4, 173, x + Math.sin(i * 2) * 2, h); c.stroke();
      }
      for (const [x, y] of [[34, 79], [94, 187]]) for (let r = 0; r < 5; r++) {
        c.strokeStyle = 'rgba(30,19,12,.06)'; c.lineWidth = .8; c.beginPath(); c.ellipse(x, y, 1 + r * 1.7, 4 + r * 7, .08, 0, Math.PI * 2); c.stroke();
      }
      for (let i = 0; i < 14; i++) {
        c.strokeStyle = 'rgba(179,127,76,.12)'; const x = random() * w, y = random() * h;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + .6, y + 3 + random() * 8); c.stroke();
      }
      flecks(c, w, h, random, 1300, .045);
    });
    result.specularColor.set(darker ? .075 : .105, darker ? .052 : .074, darker ? .032 : .045);
    result.specularPower = 40;
    return result;
  }
  const wood = walnut('nogueira doméstica envernizada', '#64412b');
  const darkWood = walnut('nogueira escura da estante', '#442f21', true);
  const fabric = surface('tecido ocre xadrez do sofá e poltrona', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#86704d'; c.fillRect(0, 0, w, h);
    for (let position = -16; position < w; position += 48) {
      c.fillStyle = 'rgba(59,56,46,.27)'; c.fillRect(position, 0, 17, h); c.fillRect(0, position, w, 17);
      c.fillStyle = 'rgba(166,143,97,.26)'; c.fillRect(position + 20, 0, 9, h); c.fillRect(0, position + 20, w, 9);
      c.fillStyle = 'rgba(55,58,54,.33)'; c.fillRect(position + 3, 0, 2, h); c.fillRect(0, position + 3, w, 2);
      c.fillStyle = 'rgba(197,170,119,.17)'; c.fillRect(position + 34, 0, 1, h); c.fillRect(0, position + 34, w, 1);
    }
    for (let i = 0; i < 110; i++) { c.fillStyle = `rgba(42,36,29,${random() * .085})`; c.fillRect(random() * w, random() * h, 2 + random() * 12, 2 + random() * 7); }
    weave(c, w, h, 2); flecks(c, w, h, random, 6200, .08);
  });
  fabric.specularColor.set(.012, .01, .008); fabric.specularPower = 6;
  const cushion = surface('almofada creme com flores bordadas', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#c8b79a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#80754e'; c.lineWidth = 3;
    for (const [x, y, angle] of [[65, 65, .4], [180, 69, -.5], [120, 174, .1]]) {
      c.beginPath(); c.moveTo(x, y + 40); c.quadraticCurveTo(x - 5, y + 15, x + 4, y - 14); c.stroke();
      c.fillStyle = '#78805a';
      for (const side of [-1, 1]) { c.beginPath(); c.ellipse(x + side * 11, y + 19, 12, 5, side * -.55 + angle, 0, Math.PI * 2); c.fill(); }
      flower(c, x + 3, y - 10, 16, '#9b655b', '#baa26d');
      flower(c, x - 14, y + 8, 9, '#b38673', '#a58c5b');
    }
    c.strokeStyle = 'rgba(100,79,53,.35)'; c.lineWidth = 2; c.strokeRect(9, 9, w - 18, h - 18);
    c.strokeStyle = 'rgba(229,213,177,.55)'; c.setLineDash([2, 3]); c.lineWidth = 1; c.strokeRect(13, 13, w - 26, h - 26); c.setLineDash([]);
    weave(c, w, h, 2); flecks(c, w, h, random, 3600, .06);
  });
  cushion.specularColor.set(.009, .008, .006);
  const lace = surface('renda e crochê de algodão com vazados', 128, 256, (c, w, h) => {
    c.strokeStyle = '#cfc2a4'; c.lineWidth = 1.25;
    for (let y = -8; y <= h + 8; y += 8) for (let x = -8; x <= w + 8; x += 8) {
      c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x + 4, y); c.lineTo(x + 8, y + 4); c.lineTo(x + 4, y + 8); c.closePath(); c.stroke();
    }
    for (let y = 24; y < h; y += 48) for (let x = 20; x < w; x += 44) {
      c.strokeStyle = '#e2d4b6'; c.lineWidth = 2;
      for (let petal = 0; petal < 6; petal++) {
        const a = petal * Math.PI / 3;
        c.beginPath(); c.ellipse(x + Math.sin(a) * 5.5, y + Math.cos(a) * 5.5, 3.8, 6.5, -a, 0, Math.PI * 2); c.stroke();
      }
      c.fillStyle = '#d8c9a9'; c.beginPath(); c.arc(x, y, 2.8, 0, Math.PI * 2); c.fill();
    }
    for (const y of [4, 9, 245, 250]) { c.strokeStyle = '#d6c6a4'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }, true);
  const rug = surface('tapete ornamental vinho quadrado', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#683a32'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a48658'; c.lineWidth = 3; c.strokeRect(4, 4, w - 8, h - 8);
    c.strokeStyle = '#42362b'; c.lineWidth = 2; c.strokeRect(9, 9, w - 18, h - 18);
    c.strokeStyle = '#9f8054'; c.lineWidth = 10; c.strokeRect(17, 17, w - 34, h - 34);
    c.strokeStyle = '#493d31'; c.lineWidth = 2; c.strokeRect(25, 25, w - 50, h - 50);
    for (let i = 12; i < 248; i += 14) for (const [x, y] of [[i, 17], [i, 239], [17, i], [239, i]]) {
      flower(c, x, y, 4.2, '#6b4435', '#c2a67b');
    }
    for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
      const x = 35 + col * 23 + (row % 2 ? 10 : 0), y = 37 + row * 22;
      if (x > 224 || (Math.abs(x - 128) < 37 && Math.abs(y - 128) < 42)) continue;
      c.strokeStyle = '#a78b5b'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x - 3, y + 6); c.quadraticCurveTo(x + 5, y, x + 1, y - 5); c.stroke();
      flower(c, x, y - 5, 3, '#b39367', '#493e30');
      c.fillStyle = '#6e7857'; c.beginPath(); c.ellipse(x + 4, y + 3, 3.5, 1.6, -.5, 0, Math.PI * 2); c.fill();
    }
    const diamond = (radius: number, color: string) => {
      c.fillStyle = color; c.beginPath(); c.moveTo(128, 128 - radius); c.lineTo(128 + radius * .8, 128); c.lineTo(128, 128 + radius); c.lineTo(128 - radius * .8, 128); c.closePath(); c.fill();
    };
    diamond(53, '#a18a5d'); diamond(48, '#453f32'); diamond(41, '#9c7752'); diamond(35, '#6b3930');
    flower(c, 128, 128, 22, '#a88c60', '#4d4c36');
    for (const [x, y] of [[37, 37], [219, 37], [37, 219], [219, 219]]) flower(c, x, y, 9, '#b89a6c', '#5c513a');
    weave(c, w, h, 2); flecks(c, w, h, random, 7000, .11);
  });
  rug.specularColor.set(.009, .007, .005);
  const plastic = surface('plástico grafite da TV e rádio', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#353431'; c.fillRect(0, 0, w, h);
    flecks(c, w, h, random, 2800, .06);
    for (let i = 0; i < 15; i++) { c.strokeStyle = 'rgba(155,146,127,.09)'; const x = random() * w, y = random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5 + random() * 10, y + 1); c.stroke(); }
  });
  plastic.specularColor.set(.11, .10, .085); plastic.specularPower = 46;
  const glass = material('vidro transparente da janela', '#b1b7b3');
  glass.alpha = .065; glass.backFaceCulling = false; glass.specularColor.set(.20, .18, .14); glass.specularPower = 64;
  const tvOff = surface('vidro escuro da TV desligada', 256, 192, (c, w, h, random) => {
    const gradient = c.createRadialGradient(w * .43, h * .35, 5, w * .5, h * .5, w * .65);
    gradient.addColorStop(0, '#303635'); gradient.addColorStop(.6, '#242b2b'); gradient.addColorStop(1, '#181e1f');
    c.fillStyle = gradient; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(156,137,102,.07)'; c.beginPath(); c.moveTo(12, 30); c.lineTo(42, 35); c.lineTo(52, 111); c.lineTo(21, 94); c.closePath(); c.fill();
    c.fillStyle = 'rgba(175,155,113,.055)'; c.fillRect(16, 38, 25, 2); c.fillRect(21, 66, 26, 2); c.fillRect(27, 94, 22, 2);
    flecks(c, w, h, random, 800, .025);
  });
  tvOff.specularColor.set(.25, .27, .25); tvOff.specularPower = 96;
  const tvOn = surface('programa matinal original na TV', 256, 192, (c, w, h, random) => {
    // One static locally painted channel. No stream, speech or per-frame upload.
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7f9998'); sky.addColorStop(.7, '#c3b585'); sky.addColorStop(1, '#918c58');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d9c88b'; c.beginPath(); c.arc(185, 43, 18, 0, Math.PI * 2); c.fill();
    for (const [base, amplitude, color] of [[102, 18, '#73836d'], [124, 14, '#63754f'], [153, 15, '#4f6541']] as const) {
      c.fillStyle = color; c.beginPath(); c.moveTo(0, h); c.lineTo(0, base);
      for (let x = 0; x <= w; x += 8) c.lineTo(x, base + Math.sin(x * .024 + base) * amplitude);
      c.lineTo(w, h); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(31,45,42,.73)'; c.fillRect(0, 150, w, 42);
    c.fillStyle = '#ded3b1'; c.font = 'bold 19px monospace'; c.textAlign = 'left'; c.fillText('BOM DIA', 17, 177);
    c.font = 'bold 10px monospace'; c.textAlign = 'right'; c.fillText('TV LAR', 239, 18); c.font = '10px monospace'; c.fillText('06:30', 238, 176);
    c.fillStyle = 'rgba(13,22,21,.15)'; for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
    flecks(c, w, h, random, 1200, .04);
  });
  tvOn.disableLighting = true;
  tvOn.emissiveTexture = tvOn.diffuseTexture;
  tvOn.diffuseColor.set(0, 0, 0); tvOn.emissiveColor.set(.7, .75, .68); tvOn.specularColor.set(.04, .05, .04);
  const ivory = surface('plástico bege envelhecido do telefone', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#b8a987'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 42; i++) { c.fillStyle = `rgba(108,86,50,${random() * .035})`; c.fillRect(random() * w, random() * h, 4 + random() * 15, 2 + random() * 5); }
    flecks(c, w, h, random, 1800, .06);
  });
  ivory.specularColor.set(.11, .095, .065); ivory.specularPower = 40;
  const white = surface('esmalte marfim dos arremates', 64, 64, (c, w, h, random) => {
    c.fillStyle = '#ccc0a8'; c.fillRect(0, 0, w, h); flecks(c, w, h, random, 500, .035);
  });
  const metal = surface('latão envelhecido', 64, 64, (c, w, h, random) => {
    c.fillStyle = '#82704c'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(208,178,106,${random() * .13})`; c.fillRect(0, y, w, 1); }
    flecks(c, w, h, random, 650, .1);
  });
  metal.specularColor.set(.33, .26, .13); metal.specularPower = 52;
  const ceramic = surface('cerâmica creme com pintura floral', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#c4b594'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const x = col * 43 + 14 + (row % 2 ? 13 : 0), y = row * 43 + 20;
      c.strokeStyle = '#6f8058'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x - 4, y + 17); c.quadraticCurveTo(x + 3, y + 6, x, y - 3); c.stroke();
      c.fillStyle = '#71815a'; c.beginPath(); c.ellipse(x + 5, y + 11, 5, 2, -.5, 0, Math.PI * 2); c.fill();
      flower(c, x, y, 5.2, '#a57875', '#a49157');
    }
    flecks(c, w, h, random, 1400, .045);
  });
  ceramic.specularColor.set(.18, .15, .10); ceramic.specularPower = 64;
  const terracotta = surface('terracota gasta dos vasos', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#8f6044'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { c.fillStyle = `rgba(58,42,28,${random() * .07})`; c.fillRect(0, y, w, 1); }
    for (let i = 0; i < 25; i++) { c.fillStyle = `rgba(188,165,125,${random() * .08})`; c.fillRect(random() * w, random() * h, 2 + random() * 10, 4 + random() * 17); }
    flecks(c, w, h, random, 2400, .1);
  });
  const leaf = surface('folha verde com nervuras', 64, 128, (c, w, h, random) => {
    const gradient = c.createLinearGradient(0, 0, w, 0); gradient.addColorStop(0, '#4c6138'); gradient.addColorStop(.5, '#738048'); gradient.addColorStop(1, '#465b32');
    c.fillStyle = gradient; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#8b9357'; c.lineWidth = 1.7; c.beginPath(); c.moveTo(32, 128); c.quadraticCurveTo(31, 62, 32, 0); c.stroke();
    c.strokeStyle = 'rgba(151,159,91,.38)'; c.lineWidth = .8;
    for (let y = 12; y < h; y += 14) for (const side of [-1, 1]) { c.beginPath(); c.moveTo(32, y + 14); c.quadraticCurveTo(32 + side * 16, y + 3, 32 + side * 30, y - 3); c.stroke(); }
    flecks(c, w, h, random, 1800, .09);
  });
  leaf.backFaceCulling = false; leaf.twoSidedLighting = true; leaf.specularColor.set(.035, .045, .015);
  const bookColors = ['#685442', '#6c7159', '#8b7560'].map((color, index) => surface(`capa de livro doméstico ${index + 1}`, 64, 128, (c, w, h, random) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(40,31,22,.27)'; c.lineWidth = 2; c.strokeRect(4, 3, w - 8, h - 6);
    c.fillStyle = 'rgba(204,184,143,.4)'; c.fillRect(8, 11, w - 16, 2); c.fillRect(8, h - 14, w - 16, 2);
    for (let y = 28; y < 61; y += 7) { c.fillStyle = 'rgba(207,188,149,.35)'; c.fillRect(17, y, w - 34, 1); }
    weave(c, w, h); flecks(c, w, h, random, 850, .07);
  }));
  const paper = surface('papel de páginas envelhecidas', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#c0b395'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(92,77,54,${.05 + random() * .1})`; c.fillRect(0, y, w, 1); }
    flecks(c, w, h, random, 1100, .05);
  });
  const magazine = surface('revista fictícia Lar e Quintal', 128, 192, (c, w, h, random) => {
    c.fillStyle = '#b9ad8d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#596c51'; c.fillRect(8, 42, w - 16, 102);
    c.fillStyle = '#97936c'; c.fillRect(8, 106, w - 16, 38);
    c.fillStyle = '#a99369'; c.fillRect(45, 80, 50, 42);
    c.fillStyle = '#70533d'; c.beginPath(); c.moveTo(36, 81); c.lineTo(70, 57); c.lineTo(104, 81); c.closePath(); c.fill();
    c.fillStyle = '#514e38'; c.fillRect(64, 96, 12, 26); c.fillRect(84, 88, 8, 12);
    for (const x of [20, 105]) { c.fillStyle = '#425c3c'; c.beginPath(); c.ellipse(x, 111, 16, 24, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#554d3c'; c.textAlign = 'center'; c.font = 'bold 14px serif'; c.fillText('LAR', 64, 19); c.font = '11px serif'; c.fillText('& QUINTAL', 64, 34);
    c.textAlign = 'left'; c.font = '9px monospace'; c.fillText('Ideias para o lar', 10, 159);
    for (let y = 167; y < 183; y += 5) { c.fillStyle = 'rgba(72,66,48,.5)'; c.fillRect(10, y, 83 - random() * 27, 1); }
    flecks(c, w, h, random, 1600, .08);
  });
  function paintFace(c: CanvasRenderingContext2D, x: number, y: number, radius: number, father: boolean) {
    c.fillStyle = '#3b2d24'; c.beginPath(); c.ellipse(x, y, radius * .99, radius * 1.3, -.025, 0, Math.PI * 2); c.fill();
    const skin = c.createRadialGradient(x - radius * .24, y - radius * .2, radius * .08, x, y + radius * .12, radius * 1.18);
    skin.addColorStop(0, '#bd9270'); skin.addColorStop(.62, '#aa7d5d'); skin.addColorStop(1, '#79533e'); c.fillStyle = skin;
    c.beginPath(); c.ellipse(x, y + radius * .12, radius * .75, radius, -.025, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#362b24'; c.beginPath(); c.moveTo(x - radius * .83, y - radius * .1); c.lineTo(x - radius * .72, y - radius * .85); c.lineTo(x + radius * .35, y - radius); c.lineTo(x + radius * .79, y - radius * .22); c.lineTo(x + radius * .22, y - radius * .65); c.lineTo(x - radius * .56, y - radius * .44); c.closePath(); c.fill();
    c.strokeStyle = '#4b352a'; c.lineWidth = Math.max(1, radius * .075); c.beginPath(); c.moveTo(x - radius * .49, y - radius * .09); c.lineTo(x - radius * .18, y - radius * .13); c.moveTo(x + radius * .16, y - radius * .12); c.lineTo(x + radius * .46, y - radius * .07); c.stroke();
    c.fillStyle = '#322b26'; c.fillRect(x - radius * .39, y + radius * .04, Math.max(1, radius * .11), Math.max(1, radius * .07)); c.fillRect(x + radius * .25, y + radius * .04, Math.max(1, radius * .11), Math.max(1, radius * .07));
    c.strokeStyle = '#82533d'; c.lineWidth = Math.max(1, radius * .06); c.beginPath(); c.moveTo(x - radius * .02, y + radius * .12); c.lineTo(x + radius * .08, y + radius * .36); c.lineTo(x - radius * .03, y + radius * .4); c.stroke();
    if (father) { c.fillStyle = '#514033'; c.fillRect(x - radius * .31, y + radius * .43, radius * .62, radius * .12); }
    c.strokeStyle = '#684534'; c.lineWidth = Math.max(1, radius * .055); c.beginPath(); c.moveTo(x - radius * .22, y + radius * .62); c.quadraticCurveTo(x, y + radius * .68, x + radius * .24, y + radius * .6); c.stroke();
  }
  const family = surface('retrato original dos pais e filho', 256, 256, (c, w, h, random) => {
    c.fillStyle = '#a79373'; c.fillRect(0, 0, w, h); c.fillStyle = '#6a745b'; c.fillRect(8, 8, w - 16, 158);
    for (let i = 0; i < 65; i++) { c.fillStyle = ['#748062', '#59684f', '#839071'][i % 3]; c.beginPath(); c.ellipse(random() * w, random() * 144, 5 + random() * 12, 7 + random() * 10, random(), 0, Math.PI * 2); c.fill(); }
    // The same fictional parents and boy used in the approved upstairs artwork.
    for (const [x, y, half, color, father] of [[63, 85, 36, '#9e9582', true], [193, 82, 35, '#aa8e78', false], [131, 135, 30, '#89894e', false]] as const) {
      c.fillStyle = color; c.beginPath(); c.moveTo(x - half, 249); c.lineTo(x - half + 7, y + 36); c.lineTo(x, y + 22); c.lineTo(x + half - 7, y + 36); c.lineTo(x + half, 249); c.closePath(); c.fill();
      c.fillStyle = '#9a7658'; c.fillRect(x - 7, y + 15, 14, 20); paintFace(c, x, y, father ? 23 : x === 131 ? 19 : 22, father);
      c.strokeStyle = 'rgba(46,41,35,.21)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - half + 10, y + 48); c.lineTo(x - half + 4, 230); c.moveTo(x + half - 9, y + 48); c.lineTo(x + half - 4, 230); c.stroke();
    }
    c.strokeStyle = '#c8b99b'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); flecks(c, w, h, random, 2900, .11);
  });
  const landscapes = [0, 1].map(variant => surface(`paisagem brasileira original ${variant + 1}`, 256, 192, (c, w, h, random) => {
    const sky = c.createLinearGradient(0, 0, 0, h * .7); sky.addColorStop(0, '#8e9b9b'); sky.addColorStop(1, '#c6b794'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(213,198,167,.28)'; c.beginPath(); c.ellipse(random() * w, 18 + random() * 55, 10 + random() * 24, 2 + random() * 7, 0, 0, Math.PI * 2); c.fill(); }
    const hill = (base: number, color: string, amplitude: number) => {
      c.fillStyle = color; c.beginPath(); c.moveTo(0, h); c.lineTo(0, base);
      for (let x = 0; x <= w; x += 8) c.lineTo(x, base + Math.sin(x * .026 + variant) * amplitude + Math.cos(x * .052) * amplitude * .5);
      c.lineTo(w, h); c.closePath(); c.fill();
    };
    hill(86, '#7b877b', 14); hill(111, '#69765d', 8); hill(139, '#7d7d4f', 10);
    c.fillStyle = '#aa9068'; c.beginPath(); c.moveTo(149, 129); c.lineTo(156, 129); c.lineTo(125, h); c.lineTo(45, h); c.quadraticCurveTo(111, 153, 149, 129); c.fill();
    const x = variant ? 89 : 166, y = 108;
    c.fillStyle = '#bfb18a'; c.fillRect(x, y, 41, 28); c.fillStyle = '#8b634b'; c.beginPath(); c.moveTo(x - 5, y + 1); c.lineTo(x + 20, y - 18); c.lineTo(x + 47, y + 1); c.closePath(); c.fill();
    c.fillStyle = '#514a36'; c.fillRect(x + 18, y + 10, 8, 18); c.fillRect(x + 5, y + 8, 7, 9); c.fillRect(x + 30, y + 8, 7, 9);
    for (const [tx, ty, scale] of [[36, 115, 1], [224, 112, .8], [14, 141, .55]]) {
      c.fillStyle = '#574c34'; c.fillRect(tx - scale * 3, ty - 19 * scale, 5 * scale, 43 * scale);
      for (let i = 0; i < 55; i++) { c.fillStyle = ['#4c5f3f', '#637147', '#6e7a4b', '#44563b'][i % 4]; c.beginPath(); c.ellipse(tx + (random() - .5) * 47 * scale, ty - 22 * scale + (random() - .5) * 47 * scale, (3 + random() * 5) * scale, (4 + random() * 6) * scale, random(), 0, Math.PI * 2); c.fill(); }
    }
    for (let i = 0; i < 150; i++) { c.fillStyle = ['#7b7c52', '#8b8354', '#5f6b43'][i % 3]; c.fillRect(random() * w, 145 + random() * 47, 1 + random() * 3, 1); }
    flecks(c, w, h, random, 3300, .13);
  }));
  const cable = surface('borracha dos cabos e teclas', 64, 64, (c, w, h, random) => {
    c.fillStyle = '#292722'; c.fillRect(0, 0, w, h); flecks(c, w, h, random, 500, .045);
  });
  const lampshade = surface('linho quente do abajur', 128, 128, (c, w, h, random) => {
    c.fillStyle = '#cdb58a'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      c.fillStyle = 'rgba(99,77,48,.09)'; c.fillRect(x, 0, 2, h); c.fillStyle = 'rgba(235,210,158,.17)'; c.fillRect(x + 4, 0, 5, h);
    }
    weave(c, w, h, 2); flecks(c, w, h, random, 1700, .06);
  });
  lampshade.emissiveColor.set(.21, .13, .055); lampshade.specularColor.set(.01, .008, .005); lampshade.backFaceCulling = false;
  const bulb = surface('vidro leitoso da luminária', 64, 64, (c, w, h, random) => {
    c.fillStyle = '#d2c1a1'; c.fillRect(0, 0, w, h); flecks(c, w, h, random, 500, .035);
  });
  bulb.emissiveColor.set(.82, .58, .28); bulb.specularColor.set(.1, .08, .045);
  const sky = surface('manhã suave além da janela da sala', 128, 256, (c, w, h, random) => {
    const gradient = c.createLinearGradient(0, 0, 0, h); gradient.addColorStop(0, '#9faeae'); gradient.addColorStop(.5, '#c4c0aa'); gradient.addColorStop(1, '#d6bf95'); c.fillStyle = gradient; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 13; i++) { c.fillStyle = 'rgba(224,213,182,.15)'; c.beginPath(); c.ellipse(random() * w, random() * h * .65, 12 + random() * 28, 3 + random() * 8, 0, 0, Math.PI * 2); c.fill(); }
  });
  sky.disableLighting = true; sky.emissiveColor.set(1, 1, 1); sky.specularColor.set(0, 0, 0);

  return {
    wall, wallpaper: wall, ceiling, floor, wood, darkWood, white, fabric, cushion,
    crochet: lace, lace, rug, plastic, glass, tvOn, tvOff, screenGlass: tvOff,
    ivory, telephone: ivory, metal, ceramic, terracotta, leaf, bookColors, paper,
    magazine, family, landscapes, cable, rubber: cable, lampshade, bulb, sky,
    /** Physical size represented by one complete UV tile; full-art props like
     * the square rug, framed art and CRT use [0, 1] instead of metric tiling. */
    periods: { wall: .9, ceiling: 1, floor: 1.44, wood: .45, fabric: .32, lace: .42, crochet: .42 },
    material, surface,
    get diagnostics() { return { materials: materials.length, textures: textures.length, sizes: textureSizes.map(size => ({ ...size })) }; },
    dispose() { for (const m of materials) m.dispose(false, false); for (const t of textures) t.dispose(); },
  };
}

export type LivingRoomMaterials = ReturnType<typeof createLivingRoomMaterials>;
