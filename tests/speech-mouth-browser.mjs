import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, waitFrames, waitPhase, pause } from './browser-helpers.mjs';

const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const people = state => state.family.parents;
const person = (state, speaker) => people(state).find(parent => parent.speaker === speaker);
const jaw = (state, speaker) => person(state, speaker).importedModel.morphWeights.JawOpen;
const pictures = [], samples = [], reviewNotes = [];
let browser, session, initial, mother, father, paused, final;
let videoPath, recordingStartedAt;

function verifyParents(state) {
  assert.equal(state.chapterStage, 'airport'); assert.equal(state.chapterMission, 'airport-farewell');
  assert.equal(state.family.actorCount, 2); assert.equal(state.dialogueAudio, false);
  assert.equal(state.audio.dialogueAudio, false);
  for (const speaker of ['MÃE', 'PAI']) {
    const parent = person(state, speaker), model = parent.importedModel;
    assert.equal(parent.visible, true); assert.equal(parent.location, 'airport');
    assert.equal(model.source, speaker === 'PAI' ? '/models/pai_intercambio.glb' : '/models/mae_intercambio.glb');
    assert.equal(model.loaded, true); assert.equal(model.animation, 'Pose_EmPe');
    assert.equal(model.facialAnimation, true);
    assert.ok(model.morphs.some(name => /JawOpen/.test(name)), 'the actual imported body has an opening target');
    const physical = model.speechMouth;
    assert.ok(physical && physical.affectedVertices >= 8 && physical.maxDisplacement > .001,
      'the rendered body has a real non-zero local geometry target');
    assert.ok(physical.maxDisplacement <= .035, 'the face movement stays anatomically small');
    assert.ok(Math.abs(physical.currentDisplacement - model.morphWeights.JawOpen * physical.maxDisplacement) < 1e-6,
      'the imported mouth reports the actual active target displacement');
    assert.equal(model.importedVisibleMeshes, 1); assert.equal(model.proceduralVisibleMeshes, 0);
    assert.equal(model.litMeshes, 1);
  }
}

async function captureAt(page, speaker, mode) {
  const result = await page.evaluate(({ speaker, mode }) => new Promise((resolve, reject) => {
    const started = performance.now(), history = [];
    function frame() {
      const state = window.__INTERCAMBIO__;
      if (state?.errors.length) return reject(Error(state.errors.join('\n')));
      const current = state?.family.parents.find(parent => parent.speaker === speaker);
      const other = state?.family.parents.find(parent => parent.speaker !== speaker);
      if (current?.importedModel && other?.importedModel) {
        const weight = current.importedModel.morphWeights.JawOpen;
        if (history.length < 600) history.push({ weight, speaking: current.speaking,
          listenerWeight: other.importedModel.morphWeights.JawOpen, speaker: state.dialogueSpeaker });
        const matches = mode === 'open' ? current.speaking && weight >= .55 : !current.speaking && weight <= .000001;
        if (matches && state.dialogueSpeaker === speaker && state.phase === 'playing') {
          // Read the frame inside the browser's animation callback so the
          // captured pixels and the sampled morph influence belong together.
          const encoded = document.getElementById('game').toDataURL('image/png').split(',')[1];
          return resolve({ encoded, state: structuredClone(state), history });
        }
      }
      if (performance.now() - started > 90000) return reject(Error(`No ${mode} mouth frame for ${speaker}`));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }), { speaker, mode });
  const label = `boca-${speaker === 'PAI' ? 'pai' : 'mae'}-${mode === 'open' ? 'aberta' : 'fechada'}`;
  const path = '/tmp/o-intercambio-' + label + '.png';
  const bytes = Buffer.from(result.encoded, 'base64'), png = PNG.sync.read(bytes);
  assert.ok(png.width >= 1000 && png.height >= 600, 'real high-quality internal game frame');
  writeFileSync(path, bytes); delete result.encoded;
  verifyParents(result.state);
  const listener = speaker === 'PAI' ? 'MÃE' : 'PAI';
  assert.equal(jaw(result.state, listener), 0, 'the listener mouth stays closed');
  if (mode === 'open') assert.ok(jaw(result.state, speaker) >= .55);
  else assert.equal(jaw(result.state, speaker), 0);
  const picture = { label, path, speaker, mode, jaw: jaw(result.state, speaker),
    head: person(result.state, speaker).head, geometry: person(result.state, speaker).importedModel.speechMouth,
    recordingSeconds: (Date.now() - recordingStartedAt) / 1000,
    source: 'Actual WebGL frame sampled during normal game animation; no influence or clock was rewritten.' };
  pictures.push(picture); samples.push(...result.history);
  console.log('CAPTURE', path);
  return result;
}

async function review(page) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  await pause(page);
  const repl = (await import('node:repl')).start({ prompt: 'speech-mouth-visual> ' });
  repl.context.qa = { ...session, browser, snapshot, waitFrames, waitPhase, pause,
    verifyParents, person, jaw, captureAt, pictures, samples, reviewNotes, initial, mother, father, paused };
  repl.context.continueFlow = () => repl.close();
  await new Promise(resolve => repl.once('exit', resolve));
  if ((await snapshot(page)).phase === 'paused') await page.locator('#resume').click();
}

try {
  browser = await launchBrowser();
  const videoDirectory = '/tmp/o-intercambio-speech-mouth-video', recording = process.env.INTERCAMBIO_RECORD_VIDEO === '1';
  if (recording) mkdirSync(videoDirectory, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1,
    ...(recording ? { recordVideo: { dir: videoDirectory, size: { width: 1280, height: 720 } } } : {}) });
  await context.addInitScript(key => localStorage.setItem(key, JSON.stringify({ mission: 'airport-farewell', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car', 'car-ready'] })), SAVE);
  recordingStartedAt = Date.now();
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  videoPath = page.video() ? await page.video().path() : null;
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'speech-mouth-high' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ &&
    (document.getElementById('game')?.dataset.ready === 'true' || window.__INTERCAMBIO__.errors.length), null, { timeout: 120000 });
  assert.deepEqual((await snapshot(page)).errors, []);
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('high');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  initial = await snapshot(page); verifyParents(initial);

  console.log('MOUTH: real mother mouth frames, listener and pause');
  const motherOpen = await captureAt(page, 'MÃE', 'open');
  await pause(page); const before = await snapshot(page); await waitFrames(page, 3); paused = await snapshot(page);
  assert.equal(jaw(paused, 'MÃE'), jaw(before, 'MÃE'), 'normal pause freezes the current mouth influence');
  assert.equal(jaw(paused, 'PAI'), 0);
  await page.locator('#resume').click();
  const motherClosed = await captureAt(page, 'MÃE', 'closed');
  mother = { open: motherOpen.state, closed: motherClosed.state };
  assert.ok(new Set(motherClosed.history.map(sample => sample.weight.toFixed(5))).size > 2, 'the active mouth changes over time');
  console.log('MOTHER PAIR READY', pictures.slice(0, 2).map(picture => picture.path).join(' '));

  await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  assert.equal((await snapshot(page)).dialogueSpeaker, 'VOCÊ');
  assert.equal(jaw(await snapshot(page), 'MÃE'), 0); assert.equal(jaw(await snapshot(page), 'PAI'), 0);
  await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  assert.equal((await snapshot(page)).dialogueSpeaker, 'MÃE');
  await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  assert.equal((await snapshot(page)).dialogueSpeaker, 'PAI');

  console.log('MOUTH: real father mouth frames and mother closed on hand-off');
  const fatherOpen = await captureAt(page, 'PAI', 'open');
  const fatherClosed = await captureAt(page, 'PAI', 'closed');
  father = { open: fatherOpen.state, closed: fatherClosed.state };
  assert.ok(new Set(fatherClosed.history.map(sample => sample.weight.toFixed(5))).size > 2);
  assert.deepEqual(people(fatherClosed.state).map(parent => parent.actorId), people(initial).map(parent => parent.actorId));
  await review(page);
  final = await snapshot(page); verifyParents(final); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-speech-mouth-results.json', JSON.stringify({ status: 'passed', build: final.build,
    pictures, samples, reviewNotes, video: { path: videoPath, recordingStartedAt },
    mother: { open: mother.open.family, closed: mother.closed.family }, father: { open: father.open.family, closed: father.closed.family },
    pause: { phase: paused.phase, mouthWeights: people(paused).map(parent => ({ speaker: parent.speaker, weights: parent.importedModel.morphWeights })) },
    final: { phase: final.phase, stage: final.chapterStage, mission: final.chapterMission, dialogueSpeaker: final.dialogueSpeaker },
    errors, consoleErrors, failedAssets: failed,
    coverage: ['both actual imported meshes expose and animate JawOpen', 'real open/closed WebGL frames for each parent',
      'only the current speaker moves their mouth', 'reading interval closes the mouth without advancing the line',
      'normal pause freezes the morph', 'original parent identity, poses and on-screen dialogue preserved'],
    limits: ['Captures require actual visual inspection.', 'One short existing airport dialogue checkpoint; no house/car/plane replay.',
      'No voices or phoneme/recorded-audio synchronization.', 'Chromium/Linux SwiftShader; no FPS or physical-GPU benchmark.'],
  }, null, 2));
  console.log('PASS MOUTH: actual mouth movement for both parents, current-speaker gating and pause.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-speech-mouth-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-speech-mouth-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, samples, reviewNotes, state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'speech-mouth-debug> ' });
    repl.context.qa = { ...session, browser, snapshot, waitFrames, waitPhase, pause, captureAt,
      verifyParents, person, jaw, pictures, samples, reviewNotes, initial, mother, father, paused };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
