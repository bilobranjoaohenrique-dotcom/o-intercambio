import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';

type Paint = (context: CanvasRenderingContext2D, size: number, random: () => number) => void;

/** Original, deterministic surface art for the reference bedroom. Textures
 * describe materials and small printed objects, never the room perspective.
 * Architectural UVs are metre-based in bedroom.ts: no global scaling is baked
 * into a material used on differently sized pieces. */
export function bedroomMaterials(scene: Scene) {
  const materials: StandardMaterial[] = [];
  const textures: DynamicTexture[] = [];
  function material(name: string, color: string) {
    const m = new StandardMaterial(`quarto · ${name}`, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor.set(.035, .030, .024); m.specularPower = 26;
    materials.push(m); return m;
  }
  function surface(name: string, size: number, paint: Paint) {
    let seed = 456871;
    for (const letter of name) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const t = new DynamicTexture(`original · quarto · ${name}`, { width: size, height: size }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    t.wrapU = t.wrapV = Texture.WRAP_ADDRESSMODE; t.anisotropicFilteringLevel = 1;
    paint(t.getContext() as unknown as CanvasRenderingContext2D, size, random);
    t.update(true); textures.push(t);
    const m = material(name, '#ffffff'); m.diffuseTexture = t; return m;
  }
  function flecks(c: CanvasRenderingContext2D, n: number, random: () => number, amount = 2400, alpha = .11) {
    for (let i = 0; i < amount; i++) {
      c.fillStyle = `rgba(${random() > .52 ? '231,207,172' : '41,29,25'},${random() * alpha})`;
      c.fillRect(Math.floor(random() * n), Math.floor(random() * n), 1 + Math.floor(random() * 2), 1 + Math.floor(random() * 2));
    }
  }
  function weave(c: CanvasRenderingContext2D, n: number) {
    c.fillStyle = 'rgba(223,213,192,.085)'; for (let x = 0; x < n; x += 2) c.fillRect(x, 0, 1, n);
    c.fillStyle = 'rgba(22,28,35,.075)'; for (let y = 0; y < n; y += 2) c.fillRect(0, y, n, 1);
  }
  const plaster = surface('papel de parede rosa envelhecido', 256, (c, n, random) => {
    c.fillStyle = '#ab9585'; c.fillRect(0, 0, n, n);
    for (let y = -16; y < n; y += 32) for (let x = -16; x < n; x += 32) {
      const xx = x + (Math.floor(y / 32) % 2 ? 16 : 0);
      c.strokeStyle = 'rgba(119,100,85,.21)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(xx + 16, y + 16, 7, 11, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(204,174,149,.32)';
      for (let a = 0; a < 4; a++) {
        c.beginPath(); c.ellipse(xx + 16 + Math.cos(a * Math.PI / 2) * 3, y + 16 + Math.sin(a * Math.PI / 2) * 4, 2, 3, a * Math.PI / 2, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = 'rgba(105,103,75,.20)'; c.fillRect(xx + 15, y + 22, 2, 4);
    }
    for (let i = 0; i < 120; i++) {
      c.fillStyle = `rgba(78,57,45,${random() * .045})`;
      c.fillRect(random() * n, random() * n, 4 + random() * 24, 3 + random() * 11);
    }
    flecks(c, n, random, 4800, .105);
  });
  const ceiling = surface('teto escurecido pelo tempo', 128, (c, n, random) => {
    c.fillStyle = '#716258'; c.fillRect(0, 0, n, n); flecks(c, n, random, 2900, .17);
    for (let i = 0; i < 22; i++) { c.fillStyle = 'rgba(39,31,27,.035)'; c.fillRect(random() * n, random() * n, 17, 8); }
  });
  function walnut(name: string, base: string) {
    return surface(name, 256, (c, n, random) => {
      c.fillStyle = base; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 180; i++) {
        const x = random() * n;
        c.strokeStyle = i % 4 ? `rgba(40,25,17,${.025 + random() * .075})` : `rgba(187,144,95,${.025 + random() * .075})`;
        c.lineWidth = .5 + random() * 1.1; c.beginPath(); c.moveTo(x, 0);
        c.bezierCurveTo(x + Math.sin(i) * 4, 75, x - Math.cos(i) * 5, 173, x + Math.sin(i * 2) * 3, n); c.stroke();
      }
      for (const [x, y] of [[57, 79], [202, 189]]) for (let i = 0; i < 4; i++) {
        c.strokeStyle = 'rgba(42,24,16,.06)'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 2 + i * 2, 6 + i * 9, .08, 0, Math.PI * 2); c.stroke();
      }
      flecks(c, n, random, 1600, .055);
    });
  }
  const wood = walnut('nogueira mel com veios verticais', '#68472f');
  const darkWood = walnut('nogueira escura das molduras', '#4b3326');
  wood.specularColor.set(.10, .066, .035); wood.specularPower = 35;
  const floor = surface('taco de madeira em cestos', 256, (c, n, random) => {
    c.fillStyle = '#4b3527'; c.fillRect(0, 0, n, n);
    const colors = ['#543626', '#61412a', '#4e3423', '#66442d', '#5a3a26', '#69472f'];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const vertical = (row + col) % 2 === 0;
      for (let plank = 0; plank < 4; plank++) {
        c.save(); c.translate(col * 64, row * 64);
        if (vertical) { c.translate(64, 0); c.rotate(Math.PI / 2); }
        c.fillStyle = colors[Math.floor(random() * colors.length)]; c.fillRect(0, plank * 16, 64, 16);
        c.fillStyle = '#493225'; c.fillRect(0, plank * 16, 64, 1); c.fillRect(0, plank * 16, 1, 16);
        c.fillStyle = 'rgba(171,121,76,.07)'; c.fillRect(2, plank * 16 + 1, 60, 1);
        for (let grain = 0; grain < 13; grain++) {
          c.fillStyle = grain % 3 ? 'rgba(26,16,12,.075)' : 'rgba(172,122,79,.08)';
          c.fillRect(2 + random() * 43, plank * 16 + 3 + random() * 10, 7 + random() * 18, 1);
        }
        c.restore();
      }
    }
    flecks(c, n, random, 2200, .055);
  }); floor.specularColor.set(.065, .046, .03); floor.specularPower = 28;
  function fabric(name: string, base: string) {
    return surface(name, 128, (c, n, random) => { c.fillStyle = base; c.fillRect(0, 0, n, n); weave(c, n); flecks(c, n, random, 1100, .075); });
  }
  function plaid(name: string, darker = false) {
    return surface(name, 256, (c, n, random) => {
      c.fillStyle = darker ? '#555b68' : '#737784'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < n; i += 64) {
        c.fillStyle = darker ? 'rgba(19,35,58,.75)' : 'rgba(30,47,71,.74)'; c.fillRect(i + 2, 0, 24, n); c.fillRect(0, i + 2, n, 24);
        c.fillStyle = 'rgba(195,181,149,.43)'; c.fillRect(i + 34, 0, 13, n); c.fillRect(0, i + 34, n, 13);
        c.fillStyle = 'rgba(222,209,180,.43)'; c.fillRect(i + 38, 0, 3, n); c.fillRect(0, i + 38, n, 3);
        c.fillStyle = 'rgba(34,40,54,.55)'; c.fillRect(i + 53, 0, 2, n); c.fillRect(0, i + 53, n, 2);
        c.fillStyle = 'rgba(157,121,104,.38)'; c.fillRect(i + 58, 0, 1, n); c.fillRect(0, i + 58, n, 1);
      }
      weave(c, n); flecks(c, n, random, 3600, .08);
    });
  }
  const linen = fabric('lençol de algodão cru', '#a69d8d');
  const blanket = plaid('xadrez azul da cama');
  const curtain = plaid('xadrez azul das cortinas', true);
  const navy = fabric('lona azul escura da mochila', '#343a49');
  const olive = navy;
  const clothes = fabric('tecido da cadeira e casaco', '#343740');
  const rug = surface('tapete persa azul cinza gasto', 256, (c, n, random) => {
    c.fillStyle = '#76717a'; c.fillRect(0, 0, n, n);
    const colors = ['#3e4558', '#a29589', '#646575', '#b0a395', '#41495a', '#9a8d83'];
    for (let border = 0; border < colors.length; border++) {
      const inset = 4 + border * 4; c.strokeStyle = colors[border]; c.lineWidth = border === 2 ? 5 : 3;
      c.strokeRect(inset, inset, n - inset * 2, n - inset * 2);
    }
    const rosette = (x: number, y: number, r: number, pale = false) => {
      c.fillStyle = pale ? '#afa090' : '#4f5364';
      c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .55, y - r * .55); c.lineTo(x + r, y); c.lineTo(x + r * .55, y + r * .55); c.lineTo(x, y + r); c.lineTo(x - r * .55, y + r * .55); c.lineTo(x - r, y); c.lineTo(x - r * .55, y - r * .55); c.closePath(); c.fill();
      c.fillStyle = pale ? '#6a6570' : '#a09489'; c.fillRect(x - 1, y - r * .48, 2, r * .96); c.fillRect(x - r * .48, y - 1, r * .96, 2);
      c.fillStyle = '#4b4e5d'; c.fillRect(x - 1, y - 1, 2, 2);
    };
    for (let y = 39; y < 226; y += 17) for (let x = 38; x < 226; x += 17) rosette(x + (Math.floor(y / 17) % 2 ? 7 : 0), y, 4, (x + y) % 3 === 0);
    c.strokeStyle = '#3c4557'; c.lineWidth = 3; c.beginPath(); c.moveTo(128, 60); c.lineTo(174, 128); c.lineTo(128, 196); c.lineTo(82, 128); c.closePath(); c.stroke();
    rosette(128, 128, 17, true);
    for (let i = 35; i < 230; i += 12) { rosette(i, 15, 3, true); rosette(i, 241, 3, true); rosette(15, i, 3, true); rosette(241, i, 3, true); }
    weave(c, n); flecks(c, n, random, 4100, .13);
  });
  const plastic = surface('plástico bege amarelado do CRT', 128, (c, n, random) => { c.fillStyle = '#a6a08f'; c.fillRect(0, 0, n, n); flecks(c, n, random, 2100, .07); });
  const metal = surface('metal antigo escovado', 128, (c, n, random) => {
    c.fillStyle = '#8c8472'; c.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y++) { c.fillStyle = `rgba(216,209,181,${random() * .12})`; c.fillRect(0, y, n, 1); }
    flecks(c, n, random, 500, .08);
  }); metal.specularColor.set(.22, .18, .12); metal.specularPower = 38;
  const paper = surface('papel de livro envelhecido', 128, (c, n, random) => { c.fillStyle = '#c8bd9f'; c.fillRect(0, 0, n, n); flecks(c, n, random, 1300, .07); });
  const rubber = fabric('borracha preta e emborrachados', '#272624');
  const ivory = plastic;
  const brown = fabric('couro castanho usado', '#57432f');
  const brick = surface('telhas de barro do bairro', 128, (c, n, random) => {
    c.fillStyle = '#81553e'; c.fillRect(0, 0, n, n);
    for (let row = 0; row < 8; row++) for (let col = -1; col < 9; col++) {
      const x = col * 16 + (row % 2 ? 8 : 0), y = row * 16;
      c.fillStyle = ['#906048', '#9d6b4f', '#76513d'][Math.floor(random() * 3)]; c.fillRect(x + 1, y + 1, 14, 14);
      c.fillStyle = 'rgba(41,30,23,.25)'; c.fillRect(x + 13, y + 1, 2, 14);
    } flecks(c, n, random, 900, .08);
  });
  const grass = fabric('grama vista da janela', '#596446');
  const leaf = surface('folhas verde oliva', 128, (c, n, random) => {
    c.fillStyle = '#4c572f'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 48; i++) { c.fillStyle = i % 2 ? '#697341' : '#586333'; c.beginPath(); c.ellipse(random() * n, random() * n, 4 + random() * 7, 8 + random() * 9, random() * 6, 0, Math.PI * 2); c.fill(); }
    flecks(c, n, random, 800, .10);
  }); const leafShade = leaf;
  const concrete = surface('reboco cinza do muro externo', 128, (c, n, random) => {
    c.fillStyle = '#8f8a7d'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 45; i++) { c.fillStyle = `rgba(77,72,62,${random() * .055})`; c.fillRect(random() * n, random() * n, 3 + random() * 16, 2 + random() * 7); }
    flecks(c, n, random, 2100, .09);
  });
  const house = surface('reboco creme gasto da casa vizinha', 128, (c, n, random) => {
    c.fillStyle = '#b8a283'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 65; i++) { c.fillStyle = `rgba(115,91,62,${random() * .055})`; c.fillRect(random() * n, random() * n, 4 + random() * 15, 2 + random() * 7); }
    flecks(c, n, random, 2100, .075);
  });
  const glass = material('vidro com leve reflexo da manhã', '#aaafac');
  glass.alpha = .07; glass.backFaceCulling = false; glass.specularColor.set(.20, .18, .19); glass.specularPower = 64;
  const bookColors = ['#594c40', '#615a4b', '#35424b', '#775745', '#6b6053'].map((base, index) => surface(`capa gasta de livro ${index + 1}`, 64, (c, n, random) => {
    c.fillStyle = base; c.fillRect(0, 0, n, n); c.fillStyle = 'rgba(193,173,125,.3)'; c.fillRect(7, 5, 2, n - 10); c.fillRect(13, 12, n - 23, 1); c.fillRect(13, n - 12, n - 23, 1); flecks(c, n, random, 400, .13);
  }));
  const screen = surface('vidro curvo preto do monitor', 128, (c, n, random) => {
    const reflection = c.createLinearGradient(0, 0, n, n); reflection.addColorStop(0, '#2b2b2b'); reflection.addColorStop(.24, '#1e2224'); reflection.addColorStop(.8, '#181d1e'); reflection.addColorStop(1, '#23292a');
    c.fillStyle = reflection; c.fillRect(0, 0, n, n); c.fillStyle = 'rgba(228,196,153,.22)'; c.fillRect(15, 12, 3, 2);
    flecks(c, n, random, 400, .025);
  }); screen.specularColor.set(.28, .25, .21); screen.specularPower = 64;
  const digital = surface('mostrador vermelho 06:30', 256, (c, n) => {
    c.fillStyle = '#100e0e'; c.fillRect(0, 0, n, n);
    // Compensate for the physical display's wide aspect ratio: the square
    // texture is stretched across the clock face, not shown as a square card.
    c.save(); c.translate(0, -170); c.scale(1, 2.3);
    const segments: Record<string, number[]> = { '0': [0, 1, 2, 3, 4, 5], '6': [0, 2, 3, 4, 5, 6], '3': [0, 1, 2, 3, 6] };
    const digit = (x: number, value: string) => {
      const paths = [[4, 0, 29, 5], [32, 5, 5, 35], [32, 46, 5, 35], [4, 81, 29, 5], [0, 46, 5, 35], [0, 5, 5, 35], [4, 40, 29, 5]];
      for (let i = 0; i < 7; i++) { c.fillStyle = segments[value].includes(i) ? '#ff261e' : '#351410'; const p = paths[i]; c.fillRect(x + p[0], 80 + p[1], p[2], p[3]); }
    };
    digit(22, '0'); digit(66, '6'); digit(145, '3'); digit(189, '0');
    c.fillStyle = '#ff261e'; c.fillRect(122, 104, 5, 5); c.fillRect(122, 137, 5, 5);
    c.restore();
  }); digital.emissiveColor.set(.68, .11, .07); digital.specularColor.set(0, 0, 0);
  const calendar = surface('calendário da viagem 13 de junho', 256, (c, n, random) => {
    c.fillStyle = '#c7bda6'; c.fillRect(0, 0, n, n); c.fillStyle = '#6d4b3f'; c.fillRect(0, 0, n, 44);
    c.fillStyle = '#ded1b4'; c.textAlign = 'center'; c.font = 'bold 23px monospace'; c.fillText('JUNHO', 128, 31);
    c.fillStyle = '#5b5348'; c.font = '13px monospace';
    for (let col = 0; col < 7; col++) c.fillText(['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][col], 23 + col * 35, 66);
    for (let day = 1; day <= 30; day++) {
      const x = 23 + (day - 1) % 7 * 35, y = 93 + Math.floor((day - 1) / 7) * 29; c.fillText(String(day), x, y);
      if (day === 13) { c.strokeStyle = '#9d3d34'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y - 4, 15, 12, -.1, 0, Math.PI * 2); c.stroke(); }
    }
    c.font = '12px monospace'; c.fillStyle = '#8e4437'; c.fillText('VIAGEM / DIA 13', 128, 242); flecks(c, n, random, 900, .04);
  });
  const travel = surface('papéis e passagem sobre a mesa', 256, (c, n, random) => {
    c.fillStyle = '#cbbfa5'; c.fillRect(0, 0, n, n); c.fillStyle = '#62685d'; c.fillRect(18, 18, 220, 29);
    c.fillStyle = '#e5d9bb'; c.font = 'bold 17px monospace'; c.fillText('INTERCAMBIO', 27, 39);
    c.fillStyle = '#675e50'; c.font = '13px monospace'; c.fillText('EMBARQUE: 13 JUN', 25, 82); c.fillText('DOCUMENTOS', 25, 115);
    for (let i = 0; i < 8; i++) { c.fillStyle = '#99917c'; c.fillRect(25, 136 + i * 10, 190 - i % 3 * 24, 2); }
    flecks(c, n, random, 700, .045);
  });
  function face(c: CanvasRenderingContext2D, x: number, y: number, r: number, male: boolean) {
    c.fillStyle = '#47362c'; c.beginPath(); c.ellipse(x, y, r * 1.08, r * 1.32, -.04, 0, Math.PI * 2); c.fill();
    const skin = c.createLinearGradient(x - r, y, x + r, y); skin.addColorStop(0, '#a27a5c'); skin.addColorStop(.47, '#c29b78'); skin.addColorStop(1, '#8b674f');
    c.fillStyle = skin; c.beginPath(); c.ellipse(x, y + r * .14, r * .77, r, -.05, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3b2c26'; c.beginPath(); c.moveTo(x - r * .9, y); c.lineTo(x - r * .7, y - r * .85); c.lineTo(x + r * .4, y - r); c.lineTo(x + r * .85, y - r * .1); c.lineTo(x + r * .2, y - r * .6); c.lineTo(x - r * .6, y - r * .4); c.closePath(); c.fill();
    c.fillStyle = '#493b31'; c.fillRect(x - r * .48, y - r * .1, r * .25, Math.max(1, r * .08)); c.fillRect(x + r * .19, y - r * .1, r * .25, Math.max(1, r * .08));
    c.fillStyle = '#76523f'; c.fillRect(x - r * .05, y + r * .03, r * .11, r * .29); c.fillRect(x - r * .24, y + r * .55, r * .46, Math.max(1, r * .07));
    if (male) { c.fillStyle = '#544035'; c.fillRect(x - r * .32, y + r * .38, r * .64, r * .13); }
  }
  const family = surface('fotografia original dos pais e filho', 256, (c, n, random) => {
    c.fillStyle = '#a99677'; c.fillRect(0, 0, n, n); c.fillStyle = '#6e7a62'; c.fillRect(7, 7, 242, 169);
    for (let i = 0; i < 80; i++) { c.fillStyle = i % 2 ? '#788365' : '#5c6a52'; c.beginPath(); c.ellipse(random() * n, random() * 155, 5 + random() * 13, 8 + random() * 13, random(), 0, Math.PI * 2); c.fill(); }
    for (const [x, y, w, color, male] of [[62, 84, 56, '#a29a86', false], [130, 111, 48, '#5e6d72', true], [196, 80, 57, '#b1a28a', true]] as const) {
      c.fillStyle = color; c.beginPath(); c.moveTo(x - w / 2, 245); c.lineTo(x - w / 2 + 4, y + 31); c.lineTo(x, y + 21); c.lineTo(x + w / 2 - 4, y + 31); c.lineTo(x + w / 2, 245); c.closePath(); c.fill();
      face(c, x, y, 20, male);
    }
    flecks(c, n, random, 3000, .14); c.strokeStyle = '#c8bda1'; c.lineWidth = 9; c.strokeRect(4, 4, n - 8, n - 8);
  });
  const posters = [
    surface('pôster original banda Horizonte', 256, (c, n, random) => {
      c.fillStyle = '#a38a6e'; c.fillRect(0, 0, n, n); c.fillStyle = '#332e2a'; c.font = 'bold 32px serif'; c.textAlign = 'center'; c.fillText('HORIZONTE', 128, 39);
      for (const [x, y, r] of [[35, 110, 20], [94, 99, 21], [155, 105, 20], [218, 117, 18]]) {
        c.fillStyle = '#272727'; c.beginPath(); c.moveTo(x - 28, 231); c.lineTo(x - 24, y + 27); c.lineTo(x, y + 15); c.lineTo(x + 25, y + 27); c.lineTo(x + 32, 231); c.closePath(); c.fill();
        face(c, x, y, r, false);
      }
      c.fillStyle = '#ad9674'; c.font = '13px monospace'; c.fillText('AO VIVO · 1998', 128, 246); flecks(c, n, random, 5000, .22);
    }),
    surface('pôster original retrato noturno', 256, (c, n, random) => {
      c.fillStyle = '#3e3934'; c.fillRect(0, 0, n, n); c.fillStyle = '#665c4d'; c.fillRect(14, 11, 228, 234);
      c.fillStyle = '#292b2a'; c.beginPath(); c.moveTo(49, 246); c.lineTo(68, 128); c.lineTo(130, 102); c.lineTo(189, 132); c.lineTo(209, 246); c.fill(); face(c, 129, 87, 37, true);
      c.fillStyle = '#b3a186'; c.font = '17px serif'; c.textAlign = 'center'; c.fillText('LADO DE DENTRO', 128, 230); flecks(c, n, random, 3800, .19);
    }),
  ];
  const brazilFlag = surface('bandeira brasileira de tecido', 256, (c, n, random) => {
    c.fillStyle = '#375b3c'; c.fillRect(0, 0, n, n); c.fillStyle = '#b59d43'; c.beginPath(); c.moveTo(128, 25); c.lineTo(234, 128); c.lineTo(128, 231); c.lineTo(22, 128); c.closePath(); c.fill();
    c.fillStyle = '#354357'; c.beginPath(); c.ellipse(128, 128, 55, 57, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c3c0a8'; c.lineWidth = 7; c.beginPath(); c.moveTo(79, 105); c.quadraticCurveTo(131, 101, 177, 143); c.stroke();
    c.fillStyle = '#d0c8ac'; for (const [x, y] of [[112, 151], [134, 148], [151, 163], [104, 166], [130, 173], [158, 145], [139, 131], [100, 136], [120, 123]]) c.fillRect(x, y, 2, 2);
    weave(c, n); flecks(c, n, random, 2300, .07);
  });
  const lampShade = surface('cúpula de tecido do abajur', 128, (c, n, random) => {
    c.fillStyle = '#d3b879'; c.fillRect(0, 0, n, n);
    for (let x = 0; x < n; x += 4) { c.fillStyle = x % 8 ? 'rgba(102,72,30,.16)' : 'rgba(243,214,153,.22)'; c.fillRect(x, 0, 1, n); }
    weave(c, n); flecks(c, n, random, 1700, .065);
  }); lampShade.emissiveColor.set(.39, .24, .08); lampShade.specularColor.set(0, 0, 0); lampShade.backFaceCulling = false; lampShade.twoSidedLighting = true;
  const bulb = material('lâmpada incandescente acesa', '#f8d894'); bulb.emissiveColor.set(1, .67, .30); bulb.specularColor.set(0, 0, 0);
  const sky = surface('céu distante de amanhecer rosado', 256, (c, n, random) => {
    const gradient = c.createLinearGradient(0, 0, 0, n);
    gradient.addColorStop(0, '#66637d'); gradient.addColorStop(.37, '#aa7783'); gradient.addColorStop(.73, '#d69a83'); gradient.addColorStop(1, '#e4ad83');
    c.fillStyle = gradient; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 43; i++) {
      const x = random() * n, y = random() * n * .83, width = 9 + random() * 41;
      c.fillStyle = `rgba(${i % 3 ? '229,168,143' : '98,85,117'},${.07 + random() * .11})`;
      c.beginPath(); c.ellipse(x, y, width, 2 + random() * 6, -.1, 0, Math.PI * 2); c.fill();
    }
  }); sky.disableLighting = true; sky.emissiveColor.set(1, 1, 1); sky.specularColor.set(0, 0, 0);
  return { plaster, ceiling, wood, darkWood, floor, linen, blanket, curtain, olive, clothes, rug,
    plastic, metal, paper, rubber, ivory, brown, navy, brick, grass, leaf, leafShade, concrete, house, glass,
    bookColors, screen, digital, calendar, travel, family, posters, brazilFlag, lampShade, bulb, sky, material,
    dispose() { for (const m of materials) m.dispose(false, false); for (const t of textures) t.dispose(); },
  };
}
export type BedroomMaterials = ReturnType<typeof bedroomMaterials>;
