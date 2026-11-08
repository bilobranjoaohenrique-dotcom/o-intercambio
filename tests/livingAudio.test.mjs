import assert from 'node:assert/strict';
import test from 'node:test';
import './register-typescript.mjs';
const { createAudio } = await import('../src/game/audio.ts');
const { Vector3 } = await import('@babylonjs/core/Maths/math.vector.js');

class Param {
  constructor(value = 1) { this.value = value; this.calls = []; }
  setValueAtTime(value, time) { this.value = value; this.calls.push(['set', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.value = value; this.calls.push(['ramp', value, time]); }
  setTargetAtTime(value, time, constant) {
    if (!Number.isFinite(value)) throw new TypeError('AudioParam value must be finite');
    this.value = value; this.calls.push(['target', value, time, constant]);
  }
}
class Node {
  constructor(kind) { this.kind = kind; this.outputs = []; this.disconnects = 0; }
  connect(node) { this.outputs.push(node); return node; }
  disconnect() { this.disconnects++; this.outputs = []; }
}
class Source extends Node {
  constructor(kind) { super(kind); this.started = false; this.stopped = false; this.stopCalls = 0; this.frequency = new Param(); this.onended = null; }
  start(...args) { this.started = true; this.startArguments = args; }
  stop(time) {
    this.stopCalls++;
    if (!this.started) throw new Error('An unstarted AudioBufferSource cannot be stopped');
    this.scheduledStop = time;
    if (time === undefined) { this.stopped = true; this.onended?.(); }
  }
}

async function fixture(run, { analyserFails = false } = {}) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const contexts = [];
  class Context {
    constructor() {
      contexts.push(this); this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000;
      this.destination = new Node('destination'); this.sources = []; this.oscillators = [];
      this.gains = []; this.filters = []; this.analysers = []; this.closed = 0;
    }
    createGain() { const n = new Node('gain'); n.gain = new Param(); this.gains.push(n); return n; }
    createBuffer(channels, size) { const data = new Float32Array(size); return { channels, getChannelData: () => data }; }
    createBufferSource() { const n = new Source('buffer'); this.sources.push(n); return n; }
    createOscillator() { const n = new Source('oscillator'); this.oscillators.push(n); return n; }
    createBiquadFilter() { const n = new Node('filter'); n.frequency = new Param(); n.Q = new Param(); this.filters.push(n); return n; }
    createAnalyser() {
      if (analyserFails) throw new Error('unsupported analyser');
      const n = new Node('analyser'); n.reads = 0;
      // A deterministic mock signal exercises diagnostic lifecycle only. Actual
      // browser signal power must be verified through its real AnalyserNode.
      n.getFloatTimeDomainData = data => { n.reads++; data.fill(.001); };
      this.analysers.push(n); return n;
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.closed++; this.state = 'closed'; return Promise.resolve(); }
  }
  Object.defineProperty(globalThis, 'AudioContext', { value: Context, configurable: true, writable: true });
  const settings = { volume: .6 }, audio = createAudio(() => settings);
  try { await run({ audio, settings, contexts }); }
  finally {
    audio.dispose();
    if (original) Object.defineProperty(globalThis, 'AudioContext', original); else delete globalThis.AudioContext;
  }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} must equal ${b}`);

test('TV áudio: desbloqueio tardio usa o mesmo contexto, buffer e volume da casa', () => fixture(async ({ audio, contexts }) => {
  audio.setTelevision(true, { x: 4, y: 1.2, z: 8 });
  assert.equal(contexts.length, 0, 'requesting TV audio cannot create an unauthorized AudioContext');
  assert.equal(audio.diagnostics.television.requested, true);
  assert.equal(audio.diagnostics.television.playing, false);
  audio.updateListener({ position: { x: 4, y: 1.2, z: 8 } });
  audio.unlock(); await flush();
  assert.equal(contexts.length, 1);
  const context = contexts[0], [wind, tv] = context.sources;
  assert.equal(context.sources.length, 2); assert.equal(tv.buffer, wind.buffer);
  assert.equal(tv.loop, true); assert.equal(tv.started, true);
  const filter = tv.outputs[0], gain = filter.outputs[0], analyser = gain.outputs[0];
  assert.equal(filter.type, 'bandpass'); near(filter.frequency.value, 1250);
  assert.equal(analyser.outputs[0], context.gains[0], 'TV must enter the existing master, not an independent output');
  assert.equal(context.gains[0].outputs[0], context.destination);
  assert.equal(audio.diagnostics.television.playing, true);
  assert.equal(audio.diagnostics.dialogueAudio, false);
  near(audio.diagnostics.television.gain, .045);
  near(audio.diagnostics.television.effectiveGain, .045 * .6 * .8);
  const reads = analyser.reads;
  for (let i = 0; i < 3; i++) audio.updateListener({ position: { x: 4, y: 1.2, z: 8 } });
  assert.equal(analyser.reads, reads, 'the normal frame path must not continuously sample audio');
  assert.ok(audio.diagnostics.television.rmsBeforeMaster > 0);
  assert.equal(analyser.reads, reads + 1);
}));

test('TV áudio: desligar desconecta e para o ruído, mantendo o vento existente', () => fixture(async ({ audio, contexts }) => {
  audio.unlock(); await flush();
  audio.setTelevision(true, { x: 0, y: 0, z: 0 });
  const context = contexts[0], [wind, tv] = context.sources;
  const filter = tv.outputs[0], gain = filter.outputs[0], analyser = gain.outputs[0];
  audio.setTelevision(true);
  assert.equal(context.sources.length, 2, 'repeated on cannot duplicate a looping source');
  audio.setTelevision(false);
  assert.equal(tv.stopped, true);
  for (const node of [tv, filter, gain, analyser]) assert.equal(node.disconnects, 1);
  assert.equal(wind.stopped, false, 'switching off the television must preserve the existing ambience');
  assert.equal(audio.diagnostics.television.playing, false);
  assert.equal(audio.diagnostics.television.rmsBeforeMaster, 0);
  assert.equal(audio.diagnostics.television.gain, 0);
  audio.setTelevision(true);
  const next = context.sources[2];
  assert.notEqual(next, tv); assert.equal(next.started, true);
  audio.dispose();
  assert.equal(next.stopped, true); assert.equal(wind.stopped, true); assert.equal(context.closed, 1);
  audio.dispose(); audio.setTelevision(true); audio.unlock();
  assert.equal(contexts.length, 1); assert.equal(context.closed, 1);
}));

test('TV áudio: distância, volume e pausa respeitam os controles existentes', () => fixture(async ({ audio, settings, contexts }) => {
  const position = { x: 2, y: 1, z: 3 };
  audio.updateListener({ position }); audio.unlock(); await flush(); audio.setTelevision(true, position);
  const context = contexts[0], tv = context.sources[1];
  audio.updateListener({ position: { x: 7.5, y: 1, z: 3 } });
  near(audio.diagnostics.television.gain, 0);
  audio.updateListener({ position }); near(audio.diagnostics.television.gain, .045);
  const copy = audio.diagnostics.television.position; copy.x = 100;
  audio.setTelevision(true, { x: NaN, y: 1, z: 3 });
  assert.deepEqual(audio.diagnostics.television.position, position, 'invalid anchors and diagnostics copies cannot corrupt the sound location');
  settings.volume = 0; audio.updateListener({ position });
  near(context.gains[0].gain.value, 0); near(audio.diagnostics.television.effectiveGain, 0);
  settings.volume = .6; audio.updateListener({ position });
  audio.pause(true); await flush();
  assert.equal(context.state, 'suspended'); assert.equal(audio.diagnostics.television.playing, false);
  near(audio.diagnostics.television.gain, 0);
  audio.pause(false); await flush();
  assert.equal(context.state, 'running'); assert.equal(audio.diagnostics.television.playing, true);
  assert.equal(context.sources[1], tv); assert.equal(context.sources.length, 2);
  near(audio.diagnostics.television.gain, .045);
}));

test('TV áudio: Vector3 do Babylon preserva coordenadas e nunca envia ganho inválido', () => fixture(async ({ audio, contexts }) => {
  const listener = new Vector3(4, 1.65, 10);
  assert.equal(Object.keys(listener).includes('x'), false, 'this regression must exercise non-enumerable Babylon coordinate getters');
  audio.updateListener({ position: new Vector3(0, 0, 0), globalPosition: listener });
  assert.deepEqual(audio.diagnostics.listener, { x: 4, y: 1.65, z: 10 });
  audio.unlock(); await flush();
  assert.doesNotThrow(() => audio.setTelevision(true), 'default TV location must copy the valid listener coordinates');
  near(audio.diagnostics.television.gain, .045);

  const anchor = new Vector3(4, 1.65, 12.75);
  assert.doesNotThrow(() => audio.setTelevision(true, anchor));
  assert.deepEqual(audio.diagnostics.television.position, { x: 4, y: 1.65, z: 12.75 });
  near(audio.diagnostics.television.gain, .045 / 4);
  listener.x = 200; anchor.z = NaN;
  assert.deepEqual(audio.diagnostics.listener, { x: 4, y: 1.65, z: 10 }, 'external vector mutations cannot corrupt the stored listener');
  assert.deepEqual(audio.diagnostics.television.position, { x: 4, y: 1.65, z: 12.75 });
  assert.doesNotThrow(() => {
    audio.updateListener({ position: new Vector3(Infinity, NaN, 0) });
    audio.setTelevision(true, anchor);
  });
  near(audio.diagnostics.television.gain, .045 / 4);
  // Finite input coordinates can still overflow subtraction; that distance is
  // out of range and must yield silence, never NaN or an invalid AudioParam.
  audio.updateListener({ position: new Vector3(Number.MAX_VALUE, 0, 0) });
  audio.setTelevision(true, new Vector3(-Number.MAX_VALUE, 0, 0));
  near(audio.diagnostics.television.gain, 0);
  for (const gain of contexts[0].gains) {
    assert.ok(Number.isFinite(gain.gain.value));
    for (const [, value] of gain.gain.calls) assert.ok(Number.isFinite(value));
  }
}));

test('TV áudio: reiniciar cancela pedidos pendentes e para a fonte ativa; clique é não verbal', () => fixture(async ({ audio, contexts }) => {
  audio.setTelevision(true); audio.reset(); audio.unlock(); await flush();
  const context = contexts[0];
  assert.equal(context.sources.length, 1, 'reset before unlock must not schedule a stale television loop');
  assert.equal(audio.diagnostics.television.requested, false);
  audio.setTelevision(true); const tv = context.sources[1];
  audio.play('tv');
  assert.equal(context.oscillators.length, 1, 'the electronic click uses the existing oscillator path');
  assert.equal(context.sources.length, 3, 'the short click reuses procedural noise');
  assert.equal(audio.diagnostics.dialogueAudio, false);
  audio.reset();
  assert.equal(tv.stopped, true); assert.equal(audio.diagnostics.television.requested, false);
  assert.equal(context.sources[0].stopped, false, 'reset keeps the pre-existing wind source');
  assert.equal(audio.diagnostics.transientSources, 0);
}));

test('TV áudio: falha no ramo da TV não desativa os efeitos e a ambiência existentes', () => fixture(async ({ audio, contexts }) => {
  audio.unlock(); await flush(); audio.setTelevision(true);
  const context = contexts[0], failed = context.sources[1];
  assert.equal(audio.diagnostics.supported, true);
  assert.equal(audio.diagnostics.television.supported, false);
  assert.equal(audio.diagnostics.television.playing, false);
  assert.equal(failed.started, false, 'a partial graph must never start its looping source');
  assert.ok(failed.disconnects > 0);
  assert.equal(context.sources[0].stopped, false);
  audio.play('foot');
  assert.ok(context.oscillators.length > 0);
  assert.equal(audio.diagnostics.dialogueAudio, false);
  audio.setTelevision(false); audio.reset();
}, { analyserFails: true }));
