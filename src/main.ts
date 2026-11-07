import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { buildEnvironment } from './scene/environment';
import { createPlayer, LOOK_RADIANS_PER_PIXEL } from './game/player';
import { createBreakfastObjective } from './game/objective';
import { createDoor } from './game/door';
import { createInteractions } from './game/interactions';
import { sampleOpening, openingCuesBetween, OPENING_DURATION } from './game/opening';
import { createAudio } from './game/audio';
import { loadSettings, storeSettings } from './game/settings';
import { BED_POSE } from './game/layout';
import type { Settings } from './game/types';
import { mountUI, el, setEyes, createGrain } from './ui';
import './style.css';

type Phase = 'ready' | 'opening' | 'playing' | 'paused' | 'ending' | 'complete';
const MOTHER_LINE = 'Ei, vem tomar café pra não se atrasar!';
mountUI();
const canvas = el<HTMLCanvasElement>('game');
const settings: Settings = loadSettings();
const errors: string[] = [];
let phase: Phase = 'ready', beforePause: Phase = 'ready';
let introTime = 0, worldTime = 0, playingAt = 0, endingTime = 0, subtitleUntil = 0, examineUntil = 0;
let ready = false, hadPointerLock = false;
let frameCount = 0, last = performance.now(), lastStats = 0;
let samples: number[] = [];
let perf = { frames: 0, meanFrameMs: 0, p95FrameMs: 0, fps: 0 };
const examined = new Set<string>();
const objective = createBreakfastObjective();
const recordError = (message: string) => { if (!errors.includes(message) && errors.length < 20) errors.push(message); };
window.addEventListener('error', event => recordError(event.message));
window.addEventListener('unhandledrejection', event => recordError(String(event.reason?.message ?? event.reason)));
el('retry').onclick = () => location.reload();


setEyes(0);


createGrain();

try {
  const engine = new Engine(canvas, false, { preserveDrawingBuffer: true, stencil: false,
    disableWebGL2Support: new URLSearchParams(location.search).get('webgl') === '1' }, false);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(.58, .61, .60, 1);
  const camera = new UniversalCamera('protagonist', new Vector3(BED_POSE.position.x, BED_POSE.position.y, BED_POSE.position.z), scene);
  camera.minZ = .045; camera.maxZ = 95; camera.fov = 1.13;
  camera.rotation.set(BED_POSE.pitch, BED_POSE.yaw, BED_POSE.roll);
  scene.activeCamera = camera;
  const environment = buildEnvironment(scene);
  const audio = createAudio(() => settings);
  void audio.prepare().catch(() => { el('voiceNotice').textContent = 'A legenda está disponível. O arquivo de voz não pôde ser carregado nesta sessão.'; });
  const door = createDoor(scene, cue => audio.play(cue));
  for (const light of scene.lights) {
    const shadow = light.getShadowGenerator() as ShadowGenerator | null;
    if (shadow?.addShadowCaster) for (const mesh of door.target.meshes) shadow.addShadowCaster(mesh);
  }
  const interactions = createInteractions(scene, camera, [door.target, ...environment.targets]);
  const player = createPlayer(canvas, camera, () => settings, () => [door.collider()], () => audio.play('foot', camera.position));
  player.setActive(false);

  function applySettings() {
    const scale = settings.quality === 'low' ? 2.2 : settings.quality === 'high' ? 1 : 1.4;
    engine.setHardwareScalingLevel(scale);
    engine.resize();
    el('grainLayer').hidden = !settings.grain;
    el('perf').hidden = !settings.performance;
    el<HTMLInputElement>('sensitivity').value = String(settings.sensitivity);
    el('sensitivityValue').textContent = settings.sensitivity.toFixed(2) + '×';
    el<HTMLInputElement>('volume').value = String(settings.volume);
    el('volumeValue').textContent = Math.round(settings.volume * 100) + '%';
    for (const key of ['headBob', 'subtitles', 'grain', 'performance'] as const) el<HTMLInputElement>(key).checked = settings[key];
    el<HTMLSelectElement>('quality').value = settings.quality;
    el('voiceNotice').textContent = 'Voz da mãe: provisória, sintética e substituível. Legendas em português.';
  }
  applySettings();
  const changeSetting = () => {
    settings.sensitivity = Number(el<HTMLInputElement>('sensitivity').value);
    settings.volume = Number(el<HTMLInputElement>('volume').value);
    settings.quality = el<HTMLSelectElement>('quality').value as Settings['quality'];
    for (const key of ['headBob', 'subtitles', 'grain', 'performance'] as const) settings[key] = el<HTMLInputElement>(key).checked;
    applySettings();
    el('settingsNotice').textContent = storeSettings(settings) ? '' : 'As preferências valem nesta sessão; o navegador não permitiu guardá-las.';
  };
  for (const id of ['sensitivity', 'volume', 'headBob', 'subtitles', 'quality', 'grain', 'performance'])
    el(id).addEventListener('input', changeSetting);
  const resize = () => engine.resize();
  window.addEventListener('resize', resize);

  function releaseMouse() { if (document.pointerLockElement === canvas) document.exitPointerLock(); }
  function pauseGame(showSettings = false) {
    if (phase === 'paused' || phase === 'complete') return;
    beforePause = phase; phase = 'paused'; player.setActive(false); player.clearInput(); audio.pause(true);
    releaseMouse();
    el('settingsPanel').hidden = !showSettings;
    el('pauseTitle').textContent = beforePause === 'ready' ? 'Configurações' : 'Pausado';
    el('resume').textContent = beforePause === 'ready' ? 'Voltar' : 'Continuar';
    el<HTMLDialogElement>('pauseMenu').showModal();
  }
  function resumeGame() {
    if (phase !== 'paused') return;
    el<HTMLDialogElement>('pauseMenu').close(); phase = beforePause; last = performance.now();
    audio.pause(false); player.setActive(phase === 'playing');
    if (phase === 'playing' || phase === 'opening') player.requestPointerLock();
  }
  function beginScene() {
    if (!ready) return;
    el<HTMLDialogElement>('pauseMenu').close();
    phase = 'opening'; beforePause = 'opening'; introTime = worldTime = endingTime = 0;
    subtitleUntil = examineUntil = 0; examined.clear(); objective.reset(); door.reset(); environment.refreshShadows(); environment.setRoomLight(false);
    interactions.clear(); player.reset(); player.setActive(false); audio.reset(); audio.pause(false); audio.unlock();
    camera.position.set(BED_POSE.position.x, BED_POSE.position.y, BED_POSE.position.z);
    camera.rotation.set(BED_POSE.pitch, BED_POSE.yaw, BED_POSE.roll);
    el('startScreen').hidden = true; el('endScreen').hidden = true; el('hud').hidden = false;
    el('objective').hidden = true; el('objective').classList.remove('compact');
    el('reticle').hidden = true; el('interaction').hidden = true; el('examine').hidden = true;
    el('sceneFade').style.opacity = '0'; setEyes(0);
    samples = []; last = performance.now();
    canvas.focus({ preventScroll: true }); player.requestPointerLock();
  }
  function activatePlayer() {
    phase = 'playing'; playingAt = worldTime; setEyes(1); document.documentElement.style.setProperty('--blur', '0px');
    objective.activate();
    player.activateFromCamera();
    samples = []; lastStats = performance.now();
    el('objectiveState').textContent = 'NOVA MISSÃO'; el('objective').hidden = false; el('reticle').hidden = false;
    audio.play('objective');
  }
  function finishScene() {
    phase = 'ending'; endingTime = 0; player.setActive(false); interactions.clear();
    el('interaction').hidden = true; el('examine').hidden = true; el('controlsHint').hidden = true;
    el('objectiveState').textContent = 'OBJETIVO CONCLUÍDO'; el('objective').classList.remove('compact');
    el('reticle').hidden = true; audio.play('objective');
  }
  function activateInteraction() {
    if (phase !== 'playing') return;
    const result = interactions.activate();
    if (result?.text) {
      if (['suitcase', 'calendar', 'photo'].includes(result.id)) examined.add(result.id);
      el('examine').textContent = result.text; examineUntil = worldTime + 3.5;
      el('examine').hidden = false;
    }
  }
  el('startGame').onclick = beginScene;
  el('replay').onclick = beginScene;
  el('restart').onclick = beginScene;
  el('resume').onclick = resumeGame;
  el('startSettings').onclick = () => pauseGame(true);
  el('openSettings').onclick = () => { el('settingsPanel').hidden = !el('settingsPanel').hidden; };
  el('captureMouse').onclick = () => { canvas.focus(); player.requestPointerLock(); };
  el<HTMLDialogElement>('pauseMenu').addEventListener('cancel', event => { event.preventDefault(); resumeGame(); });
  document.addEventListener('keydown', event => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (phase === 'paused') resumeGame(); else pauseGame();
    } else if (event.code === 'KeyE' && !event.repeat && phase === 'playing') {
      event.preventDefault(); activateInteraction();
    }
  });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (!locked && hadPointerLock && (phase === 'playing' || phase === 'opening')) pauseGame();
    hadPointerLock = locked;
  });
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
    if (document.hidden && ['opening', 'playing', 'ending'].includes(phase)) pauseGame();
  });

  Object.defineProperty(window, '__INTERCAMBIO__', { configurable: true, get: () => ({
    phase, introTime, duration: OPENING_DURATION,
    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    rotation: { yaw: camera.rotation.y, pitch: camera.rotation.x },
    door: { angle: door.angle, isOpen: door.isOpen }, interaction: interactions.current?.id ?? null,
    examined: [...examined], light: environment.roomLightOn,
    mission: objective.state,
    perf: { ...perf, frames: frameCount }, renderer: 'Babylon.js', webgl: engine.webGLVersion, gpu: engine.getGlInfo(), settings: { ...settings },
    input: { pointerLocked: document.pointerLockElement === canvas, mouseScale: LOOK_RADIANS_PER_PIXEL * settings.sensitivity },
    meshes: scene.meshes.length, vertices: scene.getTotalVertices(), errors: [...errors], voice: audio.voiceInfo,
    audio: audio.diagnostics,
  }) });

  engine.runRenderLoop(() => {
    const now = performance.now(), frameMs = Math.max(0, now - last), dt = document.hidden ? 0 : Math.min(.1, frameMs / 1000);
    last = now;
    if (!ready && scene.isReady()) {
      ready = true; el<HTMLButtonElement>('startGame').disabled = false; el('startGame').textContent = 'Começar';
      canvas.dataset.ready = 'true';
    }
    if (phase !== 'paused' && phase !== 'ready' && phase !== 'complete') worldTime += dt;
    if (phase === 'opening') {
      const previous = introTime; introTime = Math.min(OPENING_DURATION, introTime + dt);
      for (const cue of openingCuesBetween(previous, introTime)) {
        if (cue === 'mother') {
          audio.mother(); subtitleUntil = worldTime + 4.2; el('subtitleText').textContent = MOTHER_LINE;
        } else audio.play(cue === 'feet' ? 'foot' : cue);
      }
      const pose = sampleOpening(introTime);
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      camera.rotation.set(pose.pitch, pose.yaw, pose.roll); setEyes(pose.eyes);
      document.documentElement.style.setProperty('--blur', `${pose.blur * 1.65}px`);
      if (pose.finished) activatePlayer();
    } else if (phase === 'playing') {
      const previousDoorAngle = door.angle;
      door.update(dt, player.position);
      if (Math.abs(door.angle - previousDoorAngle) > 1e-7) environment.refreshShadows();
      player.update(dt);
      const target = interactions.update();
      el('interaction').hidden = !target;
      if (target) el('interactionText').textContent = target.label();
      el('objective').classList.toggle('compact', worldTime - playingAt > 5);
      el('controlsHint').hidden = worldTime - playingAt > 9;
      if (objective.update(player.position)) finishScene();
    } else if (phase === 'ending') {
      endingTime += dt;
      el('sceneFade').style.opacity = String(Math.max(0, Math.min(1, (endingTime - 1.5) / 1.25)));
      if (endingTime >= 3) {
        phase = 'complete'; el('hud').hidden = true; el('endScreen').hidden = false; releaseMouse();
      }
    }
    el('subtitle').hidden = !settings.subtitles || worldTime >= subtitleUntil || phase === 'ready' || phase === 'complete';
    if (worldTime >= examineUntil) el('examine').hidden = true;
    el('captureMouse').hidden = phase !== 'playing' || document.pointerLockElement === canvas;
    audio.updateListener(camera);
    scene.render(); frameCount++;
    canvas.dataset.phase = phase; canvas.dataset.frames = String(frameCount);
    if (ready && (phase === 'opening' || phase === 'playing') && !document.hidden && frameMs > 0 && frameMs < 500) {
      samples.push(frameMs); if (samples.length > 600) samples.shift();
    }
    if (now - lastStats >= 500 && samples.length) {
      lastStats = now;
      const sorted = [...samples].sort((a, b) => a - b);
      const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      perf = { frames: frameCount, meanFrameMs: Math.round(mean * 10) / 10,
        p95FrameMs: Math.round(sorted[Math.floor((sorted.length - 1) * .95)] * 10) / 10,
        fps: Math.round(10000 / mean) / 10 };
      if (settings.performance) el('perf').textContent = `${perf.fps.toFixed(1)} FPS\n${perf.meanFrameMs.toFixed(1)} ms · P95 ${perf.p95FrameMs.toFixed(1)} ms`;
    }
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  recordError(message); el('fatal').hidden = false; el('fatalMessage').textContent = message;
  console.error(error);
}
