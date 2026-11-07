import type { Settings } from './types';
import { OBJECTS, type Point3 } from './layout';

export const MOTHER_LINE = 'Ei, vem tomar café pra não se atrasar!';
export type AudioCue = 'cloth' | 'bed' | 'foot' | 'door' | 'handle' | 'objective';
type ListenerCamera = {
  position: Point3;
  globalPosition?: Point3;
  getForwardRay?: () => { direction: Point3 };
  upVector?: Point3;
};
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const validPoint = (point: Point3) => [point.x, point.y, point.z].every(Number.isFinite);

/** Original procedural household sound. The only file is an explicitly
 * provisional, replaceable Portuguese mother line; no browser TTS service. */
export function createAudio(settings: () => Settings) {
  const file = new URL('audio/mother-provisional.wav', document.baseURI).href;
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let voiceFilter: BiquadFilterNode | null = null;
  let voicePanner: PannerNode | null = null;
  let kitchenFilter: BiquadFilterNode | null = null;
  let kitchenPanner: PannerNode | null = null;
  let rawVoice: ArrayBuffer | null = null;
  let voiceBuffer: AudioBuffer | null = null;
  let voiceSource: AudioBufferSourceNode | null = null;
  let noise: AudioBuffer | null = null;
  let prepared: Promise<void> | null = null;
  let decoding: Promise<void> | null = null;
  let voiceError = '';
  let disabled = false, disposed = false, paused = false, unlocked = false;
  let motherRequested = false, pendingMother = false, motherPlayed = false;
  let listener: Point3 = { x: -2.15, y: 3.86, z: -1.95 };
  let ambientTimer: ReturnType<typeof setInterval> | undefined;
  let suspendTimer: ReturnType<typeof setTimeout> | undefined;
  let nextBird = 0, nextClock = 0, nextKitchen = 0, tickNumber = 0, lastVolume = -1;
  let seed = 945813;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const transient = new Set<AudioScheduledSourceNode>();
  const persistent = new Set<AudioScheduledSourceNode>();

  function volume() {
    const requested = settings().volume;
    return Number.isFinite(requested) ? clamp(requested, 0, 1) : .5;
  }
  function updateVolume() {
    if (!context || !master) return;
    const value = paused ? 0 : volume() * .8;
    if (Math.abs(value - lastVolume) < .0001) return;
    lastVolume = value;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(value, context.currentTime, .025);
  }
  function pan(point: Point3, referenceDistance = 2.5) {
    const node = context!.createPanner();
    node.panningModel = 'HRTF';
    node.distanceModel = 'inverse';
    node.refDistance = referenceDistance;
    node.rolloffFactor = .7;
    node.maxDistance = 35;
    // Babylon uses a left-handed +Z-forward world. Web Audio uses a
    // right-handed space: reflect Z consistently for sources AND listener.
    // With up +Y and forward -Z, a source at game +X remains on the right.
    node.positionX.value = point.x; node.positionY.value = point.y; node.positionZ.value = -point.z;
    node.connect(master!);
    return node;
  }
  function finish(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    transient.add(source);
    source.onended = () => {
      transient.delete(source);
      for (const node of nodes) node.disconnect();
      source.disconnect();
    };
  }
  function envelope(duration: number, level: number, destination: AudioNode, at: number) {
    const gain = context!.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + Math.min(.018, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    gain.gain.setValueAtTime(0, at + duration + .01);
    gain.connect(destination);
    return gain;
  }
  function tone(from: number, to: number, duration: number, level: number, destination: AudioNode,
    delay = 0, type: OscillatorType = 'sine') {
    const at = context!.currentTime + delay;
    const source = context!.createOscillator();
    source.type = type;
    source.frequency.setValueAtTime(from, at);
    source.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + duration);
    const gain = envelope(duration, level, destination, at);
    source.connect(gain); finish(source, [gain]);
    source.start(at); source.stop(at + duration + .015);
  }
  function rustle(duration: number, level: number, cutoff: number, destination: AudioNode, delay = 0) {
    const at = context!.currentTime + delay;
    const source = context!.createBufferSource(); source.buffer = noise;
    const filter = context!.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff;
    const gain = envelope(duration, level, destination, at);
    source.connect(filter); filter.connect(gain); finish(source, [filter, gain]);
    source.start(at, random() * .7, duration); source.stop(at + duration + .02);
  }
  function loopAir(level: number, cutoff: number, point?: Point3) {
    const source = context!.createBufferSource(); source.buffer = noise; source.loop = true;
    const filter = context!.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff;
    const gain = context!.createGain(); gain.gain.value = level;
    const destination = point ? pan(point, 3) : master!;
    source.connect(filter); filter.connect(gain); gain.connect(destination);
    persistent.add(source); source.start();
  }
  function ambient() {
    if (!context || !master || paused || disposed || context.state !== 'running') return;
    const now = context.currentTime;
    if (now >= nextClock) {
      nextClock = now + 1;
      const position = pan({ x: -2.65, y: 3.7, z: -2.4 }, 1.2);
      tone(tickNumber++ % 2 ? 1450 : 1720, 960, .024, .011, position);
      // A panner has no source lifetime; release it after its tiny transient.
      setTimeout(() => position.disconnect(), 500);
    }
    if (now >= nextBird) {
      nextBird = now + 4.2 + random() * 4.5;
      const position = pan({ x: -5.2, y: 5.5, z: -4.8 }, 3.8);
      const pitch = 1850 + random() * 900;
      tone(pitch, pitch * 1.35, .09, .022, position);
      tone(pitch * 1.28, pitch * .92, .11, .019, position, .15);
      if (random() > .45) tone(pitch * 1.12, pitch * 1.36, .07, .013, position, .31);
      setTimeout(() => position.disconnect(), 2000);
    }
    if (now >= nextKitchen && kitchenFilter) {
      nextKitchen = now + 5.3 + random() * 4.5;
      rustle(.24, .022, 800, kitchenFilter);
      tone(1080, 980, .10, .014, kitchenFilter, .15);
      tone(1790, 1680, .08, .008, kitchenFilter, .21);
    }
  }
  function graph() {
    if (context || disposed || disabled) return;
    try {
      context = new AudioContext({ latencyHint: 'interactive' });
      master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
      const samples = noise.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < samples.length; index++) {
        previous = previous * .55 + (random() * 2 - 1) * .45;
        samples[index] = previous;
      }
      voiceFilter = context.createBiquadFilter(); voiceFilter.type = 'lowpass'; voiceFilter.frequency.value = 1900;
      voicePanner = pan(OBJECTS.mother, 5);
      voiceFilter.connect(voicePanner);
      kitchenFilter = context.createBiquadFilter(); kitchenFilter.type = 'lowpass'; kitchenFilter.frequency.value = 1100;
      kitchenPanner = pan(OBJECTS.mother, 2.5); kitchenFilter.connect(kitchenPanner);
      loopAir(.023, 420, { x: -4.8, y: 4.8, z: -3.8 });
      loopAir(.006, 150);
      nextBird = context.currentTime + .4;
      nextClock = context.currentTime + .65;
      nextKitchen = context.currentTime + 2.6;
      ambientTimer = setInterval(ambient, 250);
      updateVolume();
    } catch {
      disabled = true;
      voiceError = 'Áudio indisponível neste navegador; as legendas continuam disponíveis.';
    }
  }
  async function prepare() {
    if (prepared) return prepared;
    prepared = (async () => {
      try {
        const response = await fetch(file);
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        rawVoice = await response.arrayBuffer();
        if (rawVoice.byteLength < 1000) throw Error('Arquivo de voz vazio');
        if (context) await decodeVoice();
      } catch {
        voiceError = 'A voz provisória não pôde ser carregada; acompanhe a legenda.';
      }
    })();
    return prepared;
  }
  async function decodeVoice() {
    if (!context || !rawVoice || voiceBuffer || disposed) return;
    if (!decoding) decoding = context.decodeAudioData(rawVoice.slice(0)).then(buffer => {
      if (!disposed) voiceBuffer = buffer;
      flushMother();
    }).catch(() => { voiceError = 'Falha ao decodificar a voz provisória; acompanhe a legenda.'; });
    await decoding;
  }
  function flushMother() {
    if (!pendingMother || paused || disposed || !unlocked || !context || !voiceBuffer || !voiceFilter) return;
    if (context.state !== 'running') return;
    pendingMother = false; motherPlayed = true;
    voiceSource = context.createBufferSource(); voiceSource.buffer = voiceBuffer;
    const gain = context.createGain(); gain.gain.value = .9;
    voiceSource.connect(gain); gain.connect(voiceFilter);
    const source = voiceSource;
    source.onended = () => { source.disconnect(); gain.disconnect(); if (voiceSource === source) voiceSource = null; };
    source.start();
  }
  function unlock() {
    if (disposed) return;
    unlocked = true; graph();
    if (!context) return;
    // Called directly inside Start's gesture. It does not wait for the fetch
    // and does not consume the gesture before the controller's pointer lock.
    if (!paused) void context.resume().then(() => { updateVolume(); ambient(); flushMother(); }).catch(() => undefined);
    void prepare().then(decodeVoice);
  }
  function play(cue: AudioCue, position?: Point3) {
    if (!unlocked || paused || disposed || !context || !master || context.state !== 'running') return;
    updateVolume();
    const destination = position && validPoint(position) ? pan(position, 1.8) : master;
    if (destination !== master) setTimeout(() => destination.disconnect(), 1600);
    if (cue === 'cloth') rustle(.38, .06, 1400, destination);
    if (cue === 'bed') {
      tone(104, 76, .33, .025, destination, 0, 'triangle');
      tone(169, 124, .22, .012, destination, .11, 'triangle');
      rustle(.28, .018, 520, destination);
    }
    if (cue === 'foot') {
      rustle(.115, .075, 760, destination);
      tone(112 + random() * 24, 58, .09, .032, destination, 0, 'triangle');
    }
    if (cue === 'handle') {
      tone(1120, 760, .07, .024, destination);
      rustle(.07, .034, 2800, destination, .035);
    }
    if (cue === 'door') {
      tone(119, 82, .40, .014, destination, 0, 'triangle');
      rustle(.44, .027, 640, destination);
    }
    if (cue === 'objective') {
      tone(523.25, 523.25, .22, .018, destination);
      tone(659.25, 659.25, .25, .013, destination, .12);
    }
  }
  function updateListener(camera: ListenerCamera) {
    if (!context) return;
    const point = camera.globalPosition && validPoint(camera.globalPosition) ? camera.globalPosition : camera.position;
    if (!validPoint(point)) return;
    listener = { x: point.x, y: point.y, z: point.z };
    const forward = camera.getForwardRay?.().direction ?? { x: 0, y: 0, z: 1 };
    const up = camera.upVector ?? { x: 0, y: 1, z: 0 };
    const ear = context.listener;
    ear.positionX.value = point.x; ear.positionY.value = point.y; ear.positionZ.value = -point.z;
    ear.forwardX.value = forward.x; ear.forwardY.value = forward.y; ear.forwardZ.value = -forward.z;
    ear.upX.value = up.x; ear.upY.value = up.y; ear.upZ.value = -up.z;
    // Upstairs walls/ceiling muffle the downstairs voice. Opening the path and
    // reaching the lower floor makes the source clearer without relocating it.
    const distance = Math.hypot(point.x - OBJECTS.mother.x, point.y - OBJECTS.mother.y, point.z - OBJECTS.mother.z);
    const upstairs = clamp((point.y - 2.1) / 2.2, 0, 1);
    voiceFilter?.frequency.setTargetAtTime(clamp(4300 - distance * 90 - upstairs * 1450, 1300, 4300), context.currentTime, .12);
    kitchenFilter?.frequency.setTargetAtTime(clamp(2400 - distance * 65 - upstairs * 900, 650, 2400), context.currentTime, .12);
    updateVolume();
  }
  function pause(value: boolean) {
    paused = value;
    if (suspendTimer) clearTimeout(suspendTimer);
    if (!context) return;
    updateVolume();
    if (paused) {
      suspendTimer = setTimeout(() => { if (paused && context?.state === 'running') void context.suspend().catch(() => undefined); }, 80);
    } else if (unlocked) {
      void context.resume().then(() => { updateVolume(); flushMother(); }).catch(() => undefined);
    }
  }
  function reset() {
    pendingMother = false; motherRequested = false; motherPlayed = false;
    if (voiceSource) { try { voiceSource.stop(); } catch { /* already ended */ } voiceSource = null; }
    for (const source of transient) { try { source.stop(); } catch { /* already ended */ } }
    transient.clear();
    if (context) { nextBird = context.currentTime + .4; nextClock = context.currentTime + .65; nextKitchen = context.currentTime + 2.6; }
  }
  return {
    prepare, unlock, play, updateListener, pause, reset,
    mother() {
      if (disposed || motherRequested) return;
      motherRequested = true; pendingMother = true;
      flushMother();
    },
    get voiceInfo() {
      return Object.freeze({ label: 'Voz sintética provisória — substituir por gravação humana',
        provisional: true, file, text: MOTHER_LINE, ready: !!voiceBuffer, played: motherPlayed,
        playing: !!voiceSource, duration: voiceBuffer?.duration ?? 3.1766, error: voiceError });
    },
    get diagnostics() {
      return { supported: !disabled, unlocked, paused, state: context?.state ?? 'not-created',
        listener: { ...listener }, source: { ...OBJECTS.mother },
        webAudio: context ? {
          listener: { x: context.listener.positionX.value, y: context.listener.positionY.value, z: context.listener.positionZ.value },
          forward: { x: context.listener.forwardX.value, y: context.listener.forwardY.value, z: context.listener.forwardZ.value },
          up: { x: context.listener.upX.value, y: context.listener.upY.value, z: context.listener.upZ.value },
          mother: voicePanner ? { x: voicePanner.positionX.value, y: voicePanner.positionY.value, z: voicePanner.positionZ.value } : null,
        } : null,
        voiceLowPassHz: voiceFilter?.frequency.value ?? null, transientSources: transient.size };
    },
    dispose() {
      if (disposed) return;
      reset(); disposed = true;
      if (ambientTimer) clearInterval(ambientTimer);
      if (suspendTimer) clearTimeout(suspendTimer);
      for (const source of persistent) { try { source.stop(); } catch { /* already stopped */ } }
      persistent.clear();
      void context?.close().catch(() => undefined);
      master?.disconnect();
    },
  };
}
