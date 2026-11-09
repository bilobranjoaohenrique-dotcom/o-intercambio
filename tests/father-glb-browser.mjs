import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, lookAt, aimInteraction, pause } from './browser-helpers.mjs';

const { BREAKFAST_SEAT, PARENT_ANCHORS } = await import('../src/game/kitchenLayout.ts');
const { CAR_PARENT_ANCHORS } = await import('../src/game/parentsDeparture.ts');
const { AIRPORT_PARENTS } = await import('../src/game/airportLayout.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const SOURCE = '/models/pai_intercambio.glb';
const poses = { kitchen: 'Pose_Sentado_Mesa', car: 'Pose_Dirigindo', airport: 'Pose_EmPe' };
const pictures = [], speech = [], lines = [], reviewNotes = [];
let browser, session, kitchen, afterBreakfast, car, airport;
const father = state => state.family.parents.find(parent => parent.speaker === 'PAI');
const mother = state => state.family.parents.find(parent => parent.speaker === 'MÃE');
const identity = state => state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId }));

function atAnchor(state, location) {
  const parent = father(state), imported = parent.importedModel;
  assert.equal(state.family.actorCount, 2); assert.equal(state.family.location, location);
  assert.equal(parent.visible, true); assert.equal(mother(state).visible, true);
  assert.equal(mother(state).importedModel.source, '/models/mae_intercambio.glb', 'the mother keeps her current supplied model');
  assert.equal(imported.source, SOURCE); assert.equal(imported.loaded, true); assert.equal(imported.error, null);
  assert.equal(imported.pose, location); assert.equal(imported.animation, poses[location]);
  assert.deepEqual([...imported.clips].sort(), Object.values(poses).sort());
  assert.equal(imported.materialCount, 1); assert.equal(imported.textureCount, 3);
  assert.deepEqual(imported.morphs, []); assert.equal(imported.facialAnimation, false);
  assert.deepEqual(imported.morphWeights, { JawOpen: 0, Smile: 0 });
  assert.equal(imported.importedVisibleMeshes, 1); assert.equal(imported.proceduralVisibleMeshes, 0);
  assert.equal(imported.litMeshes, 1, 'the imported body receives the active scene lighting');
  const anchor = location === 'kitchen' ? PARENT_ANCHORS.father : location === 'car' ? CAR_PARENT_ANCHORS.father : AIRPORT_PARENTS.father;
  assert.ok(Math.hypot(parent.position.x - anchor.position.x, parent.position.y - anchor.position.y,
    parent.position.z - anchor.position.z) < .025, 'existing actor anchor is preserved');
  assert.equal(parent.seated, location !== 'airport');
  const bounds = imported.bounds;
  assert.ok(bounds.size.y > (location === 'car' ? .7 : 1) && bounds.size.y < 2.1,
    `plausible human scale: ${JSON.stringify(bounds)}`);
  if (location === 'car') assert.ok(bounds.max.y <= 1.45, 'the driver fits below the existing roof');
  if (location === 'airport') assert.ok(bounds.min.y > -.04 && bounds.min.y < .06, 'feet rest on the existing airport floor');
  return imported;
}
async function sampleSpeech(page, speaker) {
  const samples = [];
  for (let index = 0; index < 3; index++) {
    await waitFrames(page, 1); const state = await snapshot(page), imported = atAnchor(state, 'kitchen');
    assert.equal(state.dialogueSpeaker, speaker); assert.equal(state.dialogueAudio, false);
    assert.equal(father(state).speaking, speaker === 'PAI');
    if (speaker === 'PAI') assert.ok(mother(state).mouthOpen < .0001);
    samples.push({ pose: imported.animation, facialAnimation: imported.facialAnimation, speaking: father(state).speaking });
  }
  speech.push({ speaker, samples });
}
async function review(page, location) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  const repl = (await import('node:repl')).start({ prompt: `father-${location}> ` });
  repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt, aimInteraction,
    pause, atAnchor, father, mother, pictures, reviewNotes, location, BREAKFAST_SEAT, PARENT_ANCHORS };
  repl.context.continueFlow = () => repl.close();
  await new Promise(resolve => repl.once('exit', resolve));
}
async function loadCheckpoint(page, checkpoint, first = false) {
  if (!first) {
    await page.evaluate(({ key, checkpoint }) => localStorage.setItem(key, JSON.stringify(checkpoint)), { key: SAVE, checkpoint });
    await page.reload({ waitUntil: 'domcontentloaded' });
  } else await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 120000 });
  if (first) {
    await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
    await page.locator('#resume').click();
  }
  await page.locator('#startGame').click();
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ mission: 'talk-parents', choice: null, completed: ['breakfast'] }));
  }, SAVE);
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'father-rigged-balanced' };
  await loadCheckpoint(page, null, true); await waitPhase(page, 'playing');
  kitchen = await snapshot(page); atAnchor(kitchen, 'kitchen');
  console.log('FATHER: supplied seated pose and one existing breakfast conversation');
  await walkTo(page, BREAKFAST_SEAT.approach, { tolerance: .13 });
  await aimInteraction(page, 'breakfast-chair', { ...BREAKFAST_SEAT.position, y: .5 });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.breakfast.state === 'seated' && window.__INTERCAMBIO__.dialogue);
  await sampleSpeech(page, 'MÃE'); await page.keyboard.press('KeyE'); await sampleSpeech(page, 'PAI');
  await page.locator('#dialogueChoices button').first().click();
  for (let index = 0; index < 12 && (await snapshot(page)).dialogue; index++) {
    lines.push({ speaker: (await snapshot(page)).dialogueSpeaker, text: (await page.locator('#dialogueText').textContent()).trim() });
    await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  }
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterMission === 'pack-suitcase' && window.__INTERCAMBIO__.breakfast.state === 'standing');
  afterBreakfast = await snapshot(page); atAnchor(afterBreakfast, 'kitchen');
  assert.deepEqual(identity(afterBreakfast), identity(kitchen));
  assert.ok(lines.some(line => /sobe lá e pega tua mala/.test(line.text)));
  await walkTo(page, { x: 2.6, z: 16.25 }, { tolerance: .13 });
  await walkTo(page, { x: 2.6, z: 18.5 }, { tolerance: .13 });
  await lookAt(page, PARENT_ANCHORS.father.eye); await waitFrames(page, 2);
  pictures.push(await capture(page, 'pai-rigged-cozinha')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'kitchen');

  console.log('FATHER: supported car-ready checkpoint, not a replay of the house/luggage route');
  await loadCheckpoint(page, { mission: 'car-ready', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car'] });
  // This save resumes the existing automatic departure. Pause through the
  // normal menu before its fade and inspect the real, unchanged WebGL frame.
  await pause(page); await waitFrames(page, 2); car = await snapshot(page); atAnchor(car, 'car');
  assert.equal(car.chapterStage, 'parked-car'); assert.equal(car.luggageCollected, true);
  const frame = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  const path = '/tmp/o-intercambio-pai-rigged-carro.png'; writeFileSync(path, Buffer.from(frame, 'base64'));
  pictures.push({ label: 'pai-rigged-carro', path, source: 'Actual WebGL frame, normal pause before departure fade; no pause-menu overlay in the canvas.' });
  console.log('CAPTURE', path); await review(page, 'car');

  console.log('FATHER: supported airport-farewell checkpoint and existing standing pose');
  await loadCheckpoint(page, { mission: 'airport-farewell', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car', 'car-ready'] });
  await waitPhase(page, 'playing'); await waitFrames(page, 2);
  airport = await snapshot(page); atAnchor(airport, 'airport');
  assert.equal(airport.dialogue, true); assert.equal(airport.dialogueAudio, false);
  pictures.push(await capture(page, 'pai-rigged-aeroporto')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'airport'); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-father-rigged-results.json', JSON.stringify({ status: 'passed', build: airport.build,
    pictures, speech, lines, reviewNotes,
    kitchen: { family: kitchen.family, mission: kitchen.chapterMission },
    afterBreakfast: { family: afterBreakfast.family, mission: afterBreakfast.chapterMission },
    car: { family: car.family, mission: car.chapterMission, position: car.position },
    airport: { family: airport.family, mission: airport.chapterMission }, errors, consoleErrors, failedAssets: failed,
    coverage: ['new supplied GLB, original embedded material/textures and three authored poses',
      'one existing breakfast dialogue and actor identity without duplication',
      'existing parent anchors, driver pose and airport standing pose', 'mother remains unchanged'],
    limits: ['The supplied model has no mouth/facial morphs or authored talking/idle animation.',
      'Car and airport use supported stage checkpoints; no upstairs, garage route or airport-gate replay.',
      'Car image is the real WebGL frame paused before the existing automatic departure.',
      'Captures need visual inspection; Chromium/Linux SwiftShader, no benchmark or physical GPU/Windows test.'],
  }, null, 2));
  console.log('PASS FATHER: new rigged father in kitchen, car and airport with the original conversation.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-father-rigged-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-father-rigged-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, speech, lines, state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'father-debug> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt, aimInteraction,
      pause, atAnchor, father, mother, pictures, reviewNotes, loadCheckpoint, BREAKFAST_SEAT, PARENT_ANCHORS,
      kitchen, afterBreakfast, car, airport, lines, speech };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
