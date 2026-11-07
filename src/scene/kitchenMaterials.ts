import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';

type Paint = (context: CanvasRenderingContext2D, size: number, random: () => number) => void;

/** Original surface art for the family kitchen. Patterns are drawn once onto
 * small textures and attached to actual geometry; none is a scene backdrop. */
export function createKitchenMaterials(scene: Scene) {
  const materials: StandardMaterial[] = [];
  const textures: DynamicTexture[] = [];
  const textureSizes: { name: string; width: number; height: number }[] = [];

  function solid(name: string, color: string) {
    const material = new StandardMaterial(`cozinha · ${name}`, scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor.set(.045, .04, .03);
    material.specularPower = 24;
    materials.push(material);
    return material;
  }
  function surface(name: string, size: number, paint: Paint, cutout = false) {
    let seed = 8641973;
    for (const letter of name) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const texture = new DynamicTexture(`original · ${name}`, { width: size, height: size }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    texture.anisotropicFilteringLevel = 1;
    texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.hasAlpha = cutout;
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    context.clearRect(0, 0, size, size);
    paint(context, size, random);
    texture.update(true);
    textures.push(texture);
    textureSizes.push({ name, width: size, height: size });
    const material = solid(name, '#ffffff');
    material.diffuseTexture = texture;
    if (cutout) {
      material.useAlphaFromDiffuseTexture = true;
      material.transparencyMode = Material.MATERIAL_ALPHATEST;
      material.alphaCutOff = .42;
      material.backFaceCulling = false;
      material.twoSidedLighting = true;
      material.specularColor.set(.012, .012, .01);
    }
    return material;
  }
  function flecks(context: CanvasRenderingContext2D, size: number, random: () => number, count: number, alpha = .05) {
    for (let index = 0; index < count; index++) {
      const light = random() > .5;
      context.fillStyle = `rgba(${light ? '240,224,189' : '57,45,31'},${random() * alpha})`;
      context.fillRect(Math.floor(random() * size), Math.floor(random() * size), 1 + Math.floor(random() * 2), 1);
    }
  }
  function weave(context: CanvasRenderingContext2D, size: number, spacing = 3) {
    context.fillStyle = 'rgba(244,226,188,.042)';
    for (let x = 0; x < size; x += spacing) context.fillRect(x, 0, 1, size);
    context.fillStyle = 'rgba(57,44,32,.04)';
    for (let y = 0; y < size; y += spacing) context.fillRect(0, y, size, 1);
  }
  function flower(context: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, pale = false) {
    context.save(); context.translate(x, y); context.rotate(angle);
    context.strokeStyle = pale ? '#899078' : '#70754d';
    context.lineWidth = Math.max(1, radius * .2);
    context.beginPath(); context.moveTo(-radius * .25, radius * .45);
    context.quadraticCurveTo(radius * .45, radius * 1.4, -radius * .05, radius * 2.1); context.stroke();
    context.fillStyle = pale ? '#949c7b' : '#788052';
    for (const side of [-1, 1]) {
      context.beginPath(); context.ellipse(side * radius * .6, radius * 1.25, radius * .65, radius * .27, side * .55, 0, Math.PI * 2); context.fill();
    }
    for (let petal = 0; petal < 5; petal++) {
      const a = petal * Math.PI * 2 / 5;
      context.fillStyle = pale ? ['#c2a48c', '#c7ac94', '#bda38d'][petal % 3] : ['#b56e51', '#bf7e58', '#a65b49'][petal % 3];
      context.beginPath(); context.ellipse(Math.sin(a) * radius * .57, Math.cos(a) * radius * .57,
        radius * .48, radius * .66, -a, 0, Math.PI * 2); context.fill();
      context.strokeStyle = pale ? 'rgba(139,111,83,.16)' : 'rgba(127,71,46,.22)'; context.lineWidth = .7; context.stroke();
    }
    context.fillStyle = pale ? '#a68e65' : '#d0a36a';
    context.beginPath(); context.arc(0, 0, radius * .3, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#7f6244'; context.fillRect(-radius * .08, -radius * .08, Math.max(1, radius * .2), Math.max(1, radius * .2));
    context.restore();
  }

  const tile = surface('cerâmica de chão acetinada', 256, (c, n, random) => {
    c.fillStyle = '#827762'; c.fillRect(0, 0, n, n);
    const colors = ['#aa9c83', '#a4977e', '#ad9e85', '#a89b82', '#b0a38d', '#a39880'];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const x = col * 32, y = row * 32;
      c.fillStyle = colors[Math.floor(random() * colors.length)]; c.fillRect(x + 1, y + 1, 30, 30);
      c.strokeStyle = 'rgba(226,211,177,.20)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x + 2, y + 30); c.lineTo(x + 2, y + 2); c.lineTo(x + 30, y + 2); c.stroke();
      for (let vein = 0; vein < 3; vein++) {
        const offset = random() * 28;
        c.strokeStyle = vein % 2 ? 'rgba(109,96,75,.10)' : 'rgba(220,204,170,.12)';
        c.beginPath(); c.moveTo(x + 2, y + offset);
        c.bezierCurveTo(x + 10, y + offset - 2, x + 18, y + offset + 3, x + 30, y + offset + 1); c.stroke();
      }
    }
    flecks(c, n, random, 3600, .055);
  });
  (tile.diffuseTexture as Texture).uScale = 4;
  (tile.diffuseTexture as Texture).vScale = 4;
  tile.specularColor.set(.10, .09, .07); tile.specularPower = 32;

  const wallTile = surface('azulejo marfim com flor discreta', 256, (c, n, random) => {
    c.fillStyle = '#918b7c'; c.fillRect(0, 0, n, n);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 64, y = row * 64;
      c.fillStyle = ['#c6bdab', '#c2b9a7', '#c9c0ad', '#c4bca9'][(col + row * 3) % 4]; c.fillRect(x + 1, y + 1, 62, 62);
      c.strokeStyle = 'rgba(236,225,202,.26)'; c.lineWidth = 1; c.strokeRect(x + 2, y + 2, 60, 60);
      if ((row + col) % 3 === 0) {
        flower(c, x + 32, y + 27, 6.1, (col - row) * .2, true);
        c.strokeStyle = 'rgba(131,138,112,.30)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x + 12, y + 46); c.quadraticCurveTo(x + 32, y + 57, x + 52, y + 46); c.stroke();
      }
    }
    flecks(c, n, random, 1500, .024);
  });
  (wallTile.diffuseTexture as Texture).uScale = 6;
  (wallTile.diffuseTexture as Texture).vScale = 2;
  wallTile.specularColor.set(.08, .075, .062);

  const plaster = surface('pintura de parede quente', 256, (c, n, random) => {
    c.fillStyle = '#bdb29c'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 150; i++) {
      c.fillStyle = `rgba(105,92,71,${random() * .018})`;
      c.fillRect(random() * n, random() * n, 4 + random() * 29, 1 + random() * 5);
    }
    flecks(c, n, random, 2200, .04);
  });
  function walnut(name: string, base: string, dark = false) {
    return surface(name, 256, (c, n, random) => {
      c.fillStyle = base; c.fillRect(0, 0, n, n);
      for (let grain = 0; grain < 210; grain++) {
        const x = random() * n;
        c.strokeStyle = grain % 4 === 0 ? `rgba(213,163,98,${dark ? .10 : .14})` : `rgba(44,29,20,${dark ? .12 : .14})`;
        c.lineWidth = .5 + random() * 1.4;
        c.beginPath(); c.moveTo(x, 0);
        c.bezierCurveTo(x + Math.sin(grain) * 5, 75, x - Math.cos(grain) * 4, 181, x + Math.sin(grain * 2) * 3, n); c.stroke();
      }
      for (const [x, y] of [[68, 91], [197, 213]]) {
        c.strokeStyle = 'rgba(38,25,17,.18)'; c.lineWidth = 1;
        for (let ring = 0; ring < 4; ring++) {
          c.beginPath(); c.ellipse(x, y, 2 + ring * 2.2, 8 + ring * 7, .12, 0, Math.PI * 2); c.stroke();
        }
      }
      flecks(c, n, random, 1300, .05);
    });
  }
  const wood = walnut('madeira mel e nogueira', '#79573a');
  const darkWood = walnut('madeira escurecida nas bordas', '#4c3829', true);
  wood.specularColor.set(.10, .075, .045); wood.specularPower = 28;

  const cabinet = surface('fórmica marfim envelhecida', 256, (c, n, random) => {
    c.fillStyle = '#c8bda5'; c.fillRect(0, 0, n, n);
    for (let x = 0; x < n; x += 3) {
      c.strokeStyle = `rgba(238,225,197,${random() * .035})`; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 1, n); c.stroke();
    }
    const shade = c.createLinearGradient(0, 0, 0, n);
    shade.addColorStop(0, 'rgba(116,91,58,.035)'); shade.addColorStop(.75, 'rgba(116,91,58,0)'); shade.addColorStop(1, 'rgba(96,79,52,.09)');
    c.fillStyle = shade; c.fillRect(0, 0, n, n); flecks(c, n, random, 1700, .03);
  });
  cabinet.specularColor.set(.075, .066, .05);
  const enamel = surface('esmalte usado da geladeira', 256, (c, n, random) => {
    c.fillStyle = '#c7c4b8'; c.fillRect(0, 0, n, n);
    const shade = c.createLinearGradient(0, 0, n, 0);
    shade.addColorStop(0, 'rgba(85,79,65,.08)'); shade.addColorStop(.2, 'rgba(235,231,208,.08)'); shade.addColorStop(.9, 'rgba(235,231,208,0)'); shade.addColorStop(1, 'rgba(85,79,65,.07)');
    c.fillStyle = shade; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 70; i++) {
      const y = n - 3 - random() * 29;
      c.fillStyle = `rgba(126,99,66,${random() * .12})`; c.fillRect(random() * n, y, 1 + random() * 3, 1);
    }
    flecks(c, n, random, 1500, .024);
  });
  enamel.specularColor.set(.16, .15, .12); enamel.specularPower = 48;
  const steel = surface('aço escovado doméstico', 256, (c, n, random) => {
    c.fillStyle = '#8b8c84'; c.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y++) {
      c.fillStyle = y % 3 ? `rgba(226,226,207,${random() * .08})` : `rgba(54,58,53,${random() * .13})`;
      c.fillRect(0, y, n, 1);
    }
    const shade = c.createLinearGradient(0, 0, n, n);
    shade.addColorStop(0, 'rgba(236,226,196,.12)'); shade.addColorStop(.4, 'rgba(236,226,196,0)'); shade.addColorStop(1, 'rgba(45,48,43,.17)');
    c.fillStyle = shade; c.fillRect(0, 0, n, n);
  });
  steel.specularColor.set(.31, .30, .25); steel.specularPower = 64;
  const iron = surface('ferro fosco do fogão', 128, (c, n, random) => {
    c.fillStyle = '#34372f'; c.fillRect(0, 0, n, n); flecks(c, n, random, 1000, .09);
  });
  iron.specularColor.set(.12, .11, .09); iron.specularPower = 32;
  const glass = solid('vidro levemente azulado', '#91a5a0');
  glass.alpha = .14; glass.backFaceCulling = false; glass.specularColor.set(.18, .19, .17); glass.specularPower = 48;
  const ceramic = surface('louça de porcelana floral', 256, (c, n, random) => {
    c.fillStyle = '#d4ccb8'; c.fillRect(0, 0, n, n);
    c.fillStyle = '#9c8f6d'; c.fillRect(0, 8, n, 3); c.fillRect(0, n - 12, n, 3);
    for (let y = 57; y < n; y += 102) for (let x = 37; x < n; x += 96) flower(c, x, y, 9, (x - y) * .01, true);
    flecks(c, n, random, 900, .022);
  });
  ceramic.specularColor.set(.13, .12, .09); ceramic.specularPower = 48;

  const tablecloth = surface('toalha floral de família com barra xadrez', 512, (c, n, random) => {
    c.fillStyle = '#cfc1a3'; c.fillRect(0, 0, n, n);
    for (let row = -1; row < 8; row++) for (let col = -1; col < 9; col++) {
      const x = 52 + col * 60 + (row % 2 ? 25 : 0) + random() * 8;
      const y = 48 + row * 62 + random() * 8;
      if (x > 42 && x < n - 42 && y > 42 && y < n - 42) {
        flower(c, x, y, 8.2 + random() * 2.8, random() * .85 - .42);
        flower(c, x + 16, y + 14, 4.1, -.7 + random() * .3, true);
      }
    }
    for (let y = 0; y < n; y += 11) for (let x = 0; x < n; x += 11) {
      if (x < 37 || x >= n - 37 || y < 37 || y >= n - 37) {
        c.fillStyle = (Math.floor(x / 11) + Math.floor(y / 11)) % 2 ? '#c4ad91' : '#a65d4c';
        c.fillRect(x, y, 11, 11);
        if (Math.floor(x / 11) % 2 && Math.floor(y / 11) % 2) { c.fillStyle = '#904c40'; c.fillRect(x, y, 11, 11); }
      }
    }
    c.strokeStyle = '#b4866b'; c.lineWidth = 3; c.strokeRect(40, 40, n - 80, n - 80);
    c.strokeStyle = '#c8b79a'; c.lineWidth = 2; c.strokeRect(45, 45, n - 90, n - 90);
    weave(c, n, 3); flecks(c, n, random, 3300, .032);
  });
  tablecloth.backFaceCulling = false; tablecloth.twoSidedLighting = true;
  tablecloth.specularColor.set(.012, .011, .009);

  const lace = surface('renda de algodão com flores vazadas', 512, (c, n) => {
    c.strokeStyle = 'rgba(220,207,177,.80)'; c.lineWidth = 1.2;
    for (let x = 0; x <= n; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, n); c.stroke(); }
    for (let y = 0; y <= n; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(n, y); c.stroke(); }
    c.strokeStyle = '#d8caab'; c.lineWidth = 2.4;
    for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) {
      const x = col * 112 + 56 + (row % 2 ? 56 : 0), y = row * 112 + 48;
      for (let petal = 0; petal < 6; petal++) {
        const angle = petal * Math.PI / 3;
        c.beginPath(); c.ellipse(x + Math.sin(angle) * 17, y + Math.cos(angle) * 17, 9, 19, -angle, 0, Math.PI * 2); c.stroke();
      }
      c.beginPath(); c.ellipse(x, y, 8, 8, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x, y + 34); c.bezierCurveTo(x - 11, y + 55, x + 18, y + 64, x, y + 81); c.stroke();
      c.beginPath(); c.ellipse(x - 10, y + 58, 7, 15, -.7, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(x + 11, y + 68, 7, 15, .7, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = '#cdbd9e'; c.fillRect(0, 0, 5, n); c.fillRect(n - 5, 0, 5, n);
    c.lineWidth = 4;
    for (let x = 0; x < n; x += 32) {
      c.beginPath(); c.arc(x + 16, n - 19, 15, 0, Math.PI); c.stroke();
      c.beginPath(); c.arc(x + 16, 15, 13, Math.PI, Math.PI * 2); c.stroke();
    }
  }, true);

  const rug = surface('tapete de crochê vermelho e cru', 256, (c, n, random) => {
    c.fillStyle = '#8d4e43'; c.fillRect(0, 0, n, n);
    for (let band = 0; band < 8; band++) {
      c.strokeStyle = band % 2 ? '#b7a789' : '#714036'; c.lineWidth = 5;
      c.strokeRect(5 + band * 8, 5 + band * 8, n - 10 - band * 16, n - 10 - band * 16);
    }
    for (let y = 7; y < n; y += 11) for (let x = 7; x < n; x += 11) {
      c.strokeStyle = (x + y) % 3 ? 'rgba(222,203,165,.30)' : 'rgba(52,30,24,.22)'; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(x, y, 2.3, 3.6, .7, 0, Math.PI * 2); c.stroke();
    }
    flecks(c, n, random, 1800, .045);
  });
  const leaf = surface('folha de jiboia com nervuras', 256, (c, n, random) => {
    c.save(); c.beginPath(); c.moveTo(128, 52);
    c.bezierCurveTo(180, -3, 249, 29, 231, 105); c.bezierCurveTo(217, 157, 163, 215, 128, 247);
    c.bezierCurveTo(78, 208, 32, 154, 21, 105); c.bezierCurveTo(5, 29, 77, -3, 128, 52); c.closePath();
    const gradient = c.createLinearGradient(40, 20, 203, 229); gradient.addColorStop(0, '#87905a'); gradient.addColorStop(.4, '#63764b'); gradient.addColorStop(1, '#405637');
    c.fillStyle = gradient; c.fill(); c.clip();
    for (let i = 0; i < 150; i++) {
      c.fillStyle = `rgba(185,180,98,${random() * .16})`; c.fillRect(random() * n, random() * n, 2 + random() * 8, 1 + random() * 5);
    }
    c.strokeStyle = 'rgba(185,189,126,.65)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(128, 29); c.quadraticCurveTo(118, 128, 128, 249); c.stroke();
    c.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) for (const side of [-1, 1]) {
      const y = 52 + i * 21;
      c.beginPath(); c.moveTo(124, y + 19); c.quadraticCurveTo(124 + side * 44, y + 4, 124 + side * (75 - i * 4), y - 28); c.stroke();
    }
    c.restore();
  }, true);

  const terracotta = surface('barro do vaso doméstico', 128, (c, n, random) => {
    c.fillStyle = '#975f41'; c.fillRect(0, 0, n, n); flecks(c, n, random, 2100, .14);
    for (let y = 4; y < n; y += 7) { c.fillStyle = 'rgba(215,159,103,.055)'; c.fillRect(0, y, n, 1); }
  });
  const red = surface('pintura vermelha da garrafa térmica', 128, (c, n, random) => {
    c.fillStyle = '#9d4435'; c.fillRect(0, 0, n, n);
    const gradient = c.createLinearGradient(0, 0, n, 0); gradient.addColorStop(0, 'rgba(48,25,20,.15)'); gradient.addColorStop(.3, 'rgba(232,160,112,.12)'); gradient.addColorStop(.65, 'rgba(232,160,112,0)'); gradient.addColorStop(1, 'rgba(48,25,20,.12)');
    c.fillStyle = gradient; c.fillRect(0, 0, n, n); flecks(c, n, random, 500, .035);
  });
  red.specularColor.set(.16, .11, .08); red.specularPower = 40;
  const bread = surface('casca de pão francês', 256, (c, n, random) => {
    c.fillStyle = '#ba8a54'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 2200; i++) {
      c.fillStyle = i % 3 ? `rgba(99,58,30,${random() * .13})` : `rgba(240,211,153,${random() * .21})`;
      c.fillRect(random() * n, random() * n, 1 + random() * 4, 1 + random() * 3);
    }
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = '#dbb779'; c.lineWidth = 7; c.beginPath(); c.moveTo(28 + i * 76, 23); c.quadraticCurveTo(79 + i * 62, 122, 43 + i * 76, 234); c.stroke();
      c.strokeStyle = 'rgba(137,87,43,.4)'; c.lineWidth = 1; c.stroke();
    }
  });
  function fruitSkin(name: string, base: string, warm: string) {
    const result = surface(name, 128, (c, n, random) => {
      c.fillStyle = base; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 2100; i++) { c.fillStyle = i % 2 ? `rgba(${warm},${random() * .15})` : `rgba(71,56,28,${random() * .08})`; c.fillRect(random() * n, random() * n, 1, 1); }
      c.fillStyle = 'rgba(109,80,33,.20)'; for (let i = 0; i < 16; i++) c.fillRect(random() * n, random() * n, 1 + random() * 2, 1);
    });
    result.specularColor.set(.10, .085, .05); result.specularPower = 30; return result;
  }
  const fruitYellow = fruitSkin('casca de banana madura', '#c7a346', '230,208,111');
  const fruitOrange = fruitSkin('casca de laranja', '#bd7939', '232,171,83');
  const fruitGreen = fruitSkin('casca de fruta verde', '#83905a', '176,191,106');
  const paper = surface('papel de anotações domésticas', 128, (c, n, random) => {
    c.fillStyle = '#d0c5ab'; c.fillRect(0, 0, n, n); flecks(c, n, random, 600, .04);
    c.fillStyle = '#928a73'; for (let i = 0; i < 5; i++) c.fillRect(16, 30 + i * 14, 67 - i % 3 * 8, 1);
  });
  const photo = surface('fotografia original da família no quintal', 256, (c, n, random) => {
    c.fillStyle = '#c7c1a6'; c.fillRect(0, 0, n, n);
    c.fillStyle = '#a4b2aa'; c.fillRect(9, 9, n - 18, 123); c.fillStyle = '#89916a'; c.fillRect(9, 121, n - 18, n - 130);
    for (let i = 0; i < 35; i++) { c.fillStyle = ['#758261', '#627254', '#89906a'][i % 3]; c.beginPath(); c.ellipse(random() * n, 62 + random() * 44, 9 + random() * 22, 15 + random() * 22, 0, 0, Math.PI * 2); c.fill(); }
    for (const [x, y, shirt, hair] of [[63, 109, '#b1a78e', '#493a2d'], [129, 128, '#6a7978', '#3d3630'], [192, 106, '#aa9b80', '#453c2f']] as const) {
      c.fillStyle = shirt; c.beginPath(); c.moveTo(x - 28, 237); c.lineTo(x - 21, y + 27); c.lineTo(x + 21, y + 27); c.lineTo(x + 29, 237); c.fill();
      c.fillStyle = '#b49678'; c.beginPath(); c.ellipse(x, y, 16, 23, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = hair; c.beginPath(); c.ellipse(x, y - 14, 17, 12, 0, Math.PI, Math.PI * 2); c.fill();
      if (x === 63) { c.fillRect(x - 17, y - 12, 6, 32); c.fillRect(x + 11, y - 12, 6, 32); }
      c.fillStyle = '#4e463a'; c.fillRect(x - 7, y - 1, 3, 2); c.fillRect(x + 4, y - 1, 3, 2);
      c.fillStyle = '#96705d'; c.fillRect(x - 4, y + 12, 8, 2);
      if (x === 192) { c.fillStyle = '#5a4935'; c.fillRect(x - 6, y + 7, 12, 3); }
    }
    flecks(c, n, random, 1700, .055); c.strokeStyle = '#d8ceb5'; c.lineWidth = 9; c.strokeRect(4, 4, n - 8, n - 8);
  });
  const magnet = surface('ímã brasileiro original', 128, (c, n) => {
    c.fillStyle = '#58714b'; c.fillRect(0, 0, n, n);
    c.fillStyle = '#c4b267'; c.beginPath(); c.moveTo(n / 2, 18); c.lineTo(n - 10, n / 2); c.lineTo(n / 2, n - 18); c.lineTo(10, n / 2); c.closePath(); c.fill();
    c.fillStyle = '#506a7a'; c.beginPath(); c.arc(n / 2, n / 2, 25, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c9cbb2'; c.lineWidth = 4; c.beginPath(); c.moveTo(43, 57); c.quadraticCurveTo(65, 47, 88, 66); c.stroke();
    c.fillStyle = '#d5cfb8'; for (const [x, y] of [[51, 71], [63, 79], [73, 72], [70, 62], [59, 67]]) c.fillRect(x, y, 2, 2);
  });
  const calendar = surface('calendário de cozinha com viagem marcada', 256, (c, n, random) => {
    c.fillStyle = '#cdc1a6'; c.fillRect(0, 0, n, n);
    c.fillStyle = '#855949'; c.fillRect(0, 0, n, 45); c.fillStyle = '#d8ceb5'; c.font = 'bold 23px sans-serif'; c.textAlign = 'center'; c.fillText('JUNHO', 128, 31);
    c.fillStyle = '#6c6655'; c.font = '13px monospace';
    for (let col = 0; col < 7; col++) c.fillText(['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][col], 22 + col * 35, 69);
    for (let day = 1; day <= 30; day++) {
      const x = 22 + (day - 1) % 7 * 35, y = 98 + Math.floor((day - 1) / 7) * 29;
      c.fillStyle = '#6a6454'; c.fillText(String(day), x, y);
      if (day === 13) { c.strokeStyle = '#92523f'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y - 5, 14, 12, -.2, 0, Math.PI * 2); c.stroke(); }
    }
    c.font = '12px monospace'; c.fillStyle = '#86624b'; c.fillText('Dia da viagem', 128, 247); flecks(c, n, random, 850, .025);
  });
  const dishTowel = surface('pano de prato de algodão listrado', 256, (c, n, random) => {
    c.fillStyle = '#c8bda3'; c.fillRect(0, 0, n, n);
    for (const y of [24, 31, n - 36, n - 28]) { c.fillStyle = '#8c5d4b'; c.fillRect(0, y, n, 4); }
    for (let x = 11; x < n; x += 31) { c.fillStyle = 'rgba(159,106,78,.32)'; c.fillRect(x, 0, 2, n); }
    weave(c, n); flecks(c, n, random, 1300, .035);
  });
  dishTowel.backFaceCulling = false; dishTowel.twoSidedLighting = true;
  const counter = surface('pedra doméstica da bancada', 256, (c, n, random) => {
    c.fillStyle = '#706a5b'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 3800; i++) {
      c.fillStyle = ['rgba(188,176,146,.28)', 'rgba(51,49,42,.22)', 'rgba(141,128,104,.34)'][i % 3];
      c.fillRect(random() * n, random() * n, 1 + random() * 3, 1 + random() * 2);
    }
  });
  counter.specularColor.set(.12, .11, .08); counter.specularPower = 32;
  const ceiling = surface('forro de madeira envelhecida', 256, (c, n, random) => {
    c.fillStyle = '#79654e'; c.fillRect(0, 0, n, n);
    for (let x = 0; x < n; x += 32) {
      c.fillStyle = 'rgba(47,33,23,.14)'; c.fillRect(x, 0, 1, n);
      for (let line = 0; line < 12; line++) {
        c.strokeStyle = line % 2 ? 'rgba(178,146,100,.065)' : 'rgba(44,31,24,.065)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x + 2 + line * 2.3, 0); c.bezierCurveTo(x + 2 + line * 2.3, 91, x + line * 2.3 + 4, 182, x + line * 2.3 + 2, n); c.stroke();
      }
    }
    flecks(c, n, random, 1000, .035);
  });
  (ceiling.diffuseTexture as Texture).uScale = 2;
  (ceiling.diffuseTexture as Texture).vScale = 2;

  return {
    tile, wallTile, plaster, wood, darkWood, cabinet, enamel, steel, iron, glass,
    ceramic, tablecloth, lace, rug, leaf, terracotta, red, bread, fruitYellow,
    fruitOrange, fruitGreen, paper, photo, magnet, calendar, dishTowel, counter, ceiling,
    solid,
    get diagnostics() { return { materialCount: materials.length, textures: textureSizes.map(size => ({ ...size })), externalAssets: 0 }; },
    dispose() { for (const material of materials) material.dispose(false, false); for (const texture of textures) texture.dispose(); },
  };
}

export type KitchenMaterials = ReturnType<typeof createKitchenMaterials>;
