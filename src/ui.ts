/** Native-resolution interface and screen overlays. Scene/gameplay state is owned by main. */
export const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function mountUI() {
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<canvas id="game" tabindex="0" aria-label="Quarto do protagonista. Jogo 3D em primeira pessoa."></canvas>
<div id="grainLayer" aria-hidden="true"></div><div id="vignette" aria-hidden="true"></div>
<svg id="eyelids" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path id="upperLid"></path><path id="lowerLid"></path></svg>
<div id="sceneFade" aria-hidden="true"></div>
<div id="hud" hidden>
 <div id="reticle" hidden></div>
 <section id="objective" aria-live="polite" hidden><span id="objectiveState">NOVA MISSÃO</span><strong id="objectiveText">Desça para o café</strong></section>
 <div id="subtitle" role="status" hidden><b>MÃE:</b> <span id="subtitleText"></span></div>
 <div id="interaction" hidden><kbd>E</kbd><span id="interactionText"></span></div>
 <div id="examine" role="status" hidden></div>
 <section id="dialogueBox" aria-live="polite" hidden><b id="dialogueSpeaker"></b><p id="dialogueText"></p><div id="dialogueChoices"></div><small id="dialogueHint">E · CONTINUAR</small></section>
 <div id="controlsHint" hidden>WASD · MOVER &nbsp; MOUSE · OLHAR &nbsp; E · INTERAGIR &nbsp; ESC · PAUSAR<small>Shift para correr</small></div>
 <button id="captureMouse" hidden>Clique para olhar com o mouse</button>
 <output id="perf" hidden aria-label="Indicador de desempenho"></output>
</div>
<section id="startScreen" class="screen"><div class="screenContent"><p class="eyebrow">CAPÍTULO 1 &nbsp; / &nbsp; A DESPEDIDA</p><h1>O Intercâmbio</h1><div class="startRule"></div><p>Uma manhã em casa.<br>Uma viagem prestes a começar.</p><div class="screenActions"><button id="startGame" class="primaryButton" disabled>Preparando a cena…</button><button id="startSettings" class="secondaryButton">Configurações</button></div><p class="startHint">Controles de computador. Diálogos por texto.</p></div><small class="screenNote">UMA AVENTURA NARRATIVA EM PRIMEIRA PESSOA</small></section>
<dialog id="pauseMenu" aria-labelledby="pauseTitle"><p class="eyebrow">O INTERCÂMBIO</p><h2 id="pauseTitle">Pausado</h2><div class="pauseActions"><button id="resume" class="primaryButton">Continuar</button><button id="openSettings" class="secondaryButton">Configurações</button><button id="restart" class="secondaryButton">Reiniciar cena</button></div>
 <section id="settingsPanel" hidden><h3>Configurações</h3>
 <label class="setting rangeSetting">Sensibilidade do mouse <output id="sensitivityValue"></output><input id="sensitivity" type="range" min="0.2" max="2.5" step="0.05"></label>
 <label class="setting"><span>Balanço suave ao caminhar</span><input id="headBob" type="checkbox"></label>
 <label class="setting rangeSetting">Volume <output id="volumeValue"></output><input id="volume" type="range" min="0" max="1" step="0.05"></label>
 <label class="setting"><span>Legendas</span><input id="subtitles" type="checkbox"></label>
 <label class="setting"><span>Qualidade da cena</span><select id="quality"><option value="low">Baixa</option><option value="balanced">Equilibrada</option><option value="high">Alta</option></select></label>
 <label class="setting"><span>Granulação discreta</span><input id="grain" type="checkbox"></label>
 <label class="setting"><span>Indicador de desempenho</span><input id="performance" type="checkbox"></label>
 <p id="settingsNotice" class="finePrint"></p><p id="audioNotice" class="finePrint">Diálogos aparecem somente como texto. O áudio contém efeitos e ambiência.</p>
 </section><p class="finePrint">Capítulo 1 · A Despedida<br>Checkpoint salvo ao avançar de sequência.</p>
</dialog>
<section id="endScreen" class="screen" hidden><div class="screenContent"><p class="eyebrow">CAPÍTULO 1 CONCLUÍDO</p><h2>A Despedida</h2><p>Continua no Capítulo 2 — O Aluno Esquecido.</p><div class="screenActions"><button id="replay" class="primaryButton">Jogar novamente</button></div></div></section>
<section id="fatal" hidden><h2>Não foi possível iniciar a cena.</h2><p id="fatalMessage"></p><button id="retry" class="primaryButton">Tentar novamente</button></section>`;
}

export function setEyes(opening: number) {
  const value = Math.max(0, Math.min(1, opening));
  el('upperLid').setAttribute('d', `M0 0 H100 V${50 - value * 65} Q50 ${50 - value * 90} 0 ${50 - value * 65} Z`);
  el('lowerLid').setAttribute('d', `M0 100 H100 V${50 + value * 65} Q50 ${50 + value * 90} 0 ${50 + value * 65} Z`);
}

export function createGrain() {
  const noise = document.createElement('canvas'); noise.width = noise.height = 96;
  const context = noise.getContext('2d')!;
  const image = context.createImageData(96, 96); let seed = 170923;
  for (let index = 0; index < image.data.length; index += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = seed >>> 24;
    image.data.set([value, value, value, 255], index);
  }
  context.putImageData(image, 0, 0);
  el('grainLayer').style.backgroundImage = `url(${noise.toDataURL()})`;
}
