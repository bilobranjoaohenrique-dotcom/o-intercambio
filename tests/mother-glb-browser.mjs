import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, lookAt, aimInteraction, pause } from './browser-helpers.mjs';

const { BREAKFAST_SEAT, PARENT_ANCHORS } = await import('../src/game/kitchenLayout.ts');
const { CAR_PARENT_ANCHORS } = await import('../src/game/parentsDeparture.ts');
const { AIRPORT_PARENTS } = await import('../src/game/airportLayout.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const SOURCE = '/models/mae_intercambio.glb';
const poses = { kitchen: 'Pose_EmPe', car: 'Pose_Sentado_Mesa', airport: 'Pose_EmPe' };
const pictures = [], speech = [], lines = [], reviewNotes = [];
let browser, session, kitchen, afterBreakfast, car, airport, serving;
const father = state => state.family.parents.find(parent => parent.speaker === 'PAI');
const mother = state => state.family.parents.find(parent => parent.speaker === 'MÃE');
const identity = state => state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId }));

function atAnchor(state, location) {
  const parent = mother(state), imported = parent.importedModel, dad = father(state).importedModel;
  assert.equal(state.family.actorCount, 2); assert.equal(state.family.location, location);
  assert.equal(parent.visible, true); assert.equal(father(state).visible, true);
  assert.equal(dad.source, '/models/pai_intercambio.glb'); assert.equal(dad.loaded, true);
  assert.equal(dad.animation, location === 'kitchen' ? 'Pose_Sentado_Mesa' : location === 'car' ? 'Pose_Dirigindo' : 'Pose_EmPe');
  assert.equal(father(state).vertices, 20029, 'the established father mesh is unchanged');
  assert.equal(father(state).triangles, 33000);
  assert.equal(imported.source, SOURCE); assert.equal(imported.loaded, true); assert.equal(imported.error, null);
  assert.equal(imported.pose, location); assert.equal(imported.animation, poses[location]);
  assert.deepEqual([...imported.clips].sort(), ['Pose_Dirigindo', 'Pose_EmPe', 'Pose_Sentado_Mesa'].sort());
  assert.equal(imported.materialCount, 1); assert.equal(imported.textureCount, 3);
  assert.deepEqual(imported.morphs, []); assert.equal(imported.facialAnimation, false);
  assert.deepEqual(imported.morphWeights, { JawOpen: 0, Smile: 0 });
  assert.equal(imported.importedVisibleMeshes, 1); assert.equal(imported.proceduralVisibleMeshes, 0);
  assert.equal(imported.litMeshes, 1, 'the imported body receives the active scene lighting');
  const anchor = location === 'kitchen' ? PARENT_ANCHORS.mother : location === 'car' ? CAR_PARENT_ANCHORS.mother : AIRPORT_PARENTS.mother;
  assert.ok(Math.hypot(parent.position.x - anchor.position.x, parent.position.y - anchor.position.y,
    parent.position.z - anchor.position.z) < .025, 'existing mother anchor is preserved');
  assert.equal(parent.seated, location === 'car');
  const bounds = imported.bounds;
  assert.ok(bounds.size.y > (location === 'car' ? .7 : 1.5) && bounds.size.y < 1.9,
    `plausible human scale: ${JSON.stringify(bounds)}`);
  if (location === 'car') assert.ok(bounds.max.y <= 1.43, 'the passenger fits below the existing roof');
  else assert.ok(bounds.min.y > -.04 && bounds.min.y < .06, 'feet rest on the existing floor');
  assert.equal(parent.hasCoffeePot, location === 'kitchen');
  return imported;
}
async function sampleSpeech(page, speaker) {
  const samples = [];
  for (let index = 0; index < 3; index++) {
    await waitFrames(page, 1); const state = await snapshot(page), imported = atAnchor(state, 'kitchen');
    assert.equal(state.dialogueSpeaker, speaker); assert.equal(state.dialogueAudio, false);
    assert.equal(mother(state).speaking, speaker === 'MÃE');
    samples.push({ pose: imported.animation, facialAnimation: imported.facialAnimation, speaking: mother(state).speaking });
  }
  speech.push({ speaker, samples });
}
async function checkParentPrompt(page) {
  await walkTo(page, { x: -1.1, z: 16.35 }, { tolerance: .13 });
  await aimInteraction(page, 'parents', { x: -1.55, y: 1.2, z: 18.25 });
  assert.equal((await page.locator('#interactionText').textContent()).trim(), 'Conversar com seus pais');
  await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  assert.match(await page.locator('#examine').textContent(), /Vou me sentar à mesa/);
  assert.equal(await page.locator('#examine').isVisible(), true);
  const state = await snapshot(page);
  assert.equal(state.chapterMission, 'talk-parents'); assert.equal(state.dialogue, false);
}
async function review(page, location) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  const repl = (await import('node:repl')).start({ prompt: `mother-${location}> ` });
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
  await page.waitForFunction(() => window.__INTERCAMBIO__ &&
    (document.getElementById('game')?.dataset.ready === 'true' || window.__INTERCAMBIO__.errors.length), null, { timeout: 120000 });
  assert.deepEqual((await snapshot(page)).errors, [], 'the scene must initialize without a runtime error');
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
  session = { page, errors, consoleErrors, failed, profile: 'mother-rigged-balanced' };
  await loadCheckpoint(page, null, true); await waitPhase(page, 'playing');
  kitchen = await snapshot(page); atAnchor(kitchen, 'kitchen');
  await checkParentPrompt(page);
  await page.evaluate(() => {
    const result = { samples: [], stop: false }; window.__MOTHER_SERVING_QA__ = result;
    function sample() {
      if (result.stop) return;
      const parent = window.__INTERCAMBIO__?.family.parents.find(parent => parent.speaker === 'MÃE');
      if (parent && result.samples.length < 2000) result.samples.push({ serving: parent.serving, coffeeFlow: parent.coffeeFlow, hasCoffeePot: parent.hasCoffeePot });
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  console.log('MOTHER: original breakfast conversation and new standing mother');
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
  // Stay in front of the refrigerator rather than its solid footprint.
  await walkTo(page, { x: -1.75, z: 16.25 }, { tolerance: .13 });
  await lookAt(page, { ...PARENT_ANCHORS.mother.eye, y: 1.04 }); await waitFrames(page, 2);
  if (!(await page.evaluate(() => window.__MOTHER_SERVING_QA__.samples.some(sample => sample.coffeeFlow))))
    await page.waitForFunction(() => window.__MOTHER_SERVING_QA__.samples.some(sample => sample.coffeeFlow), null, { timeout: 90000 });
  serving = await page.evaluate(() => { window.__MOTHER_SERVING_QA__.stop = true; return window.__MOTHER_SERVING_QA__.samples; });
  assert.ok(serving.some(sample => sample.hasCoffeePot && sample.serving > .94 && sample.coffeeFlow), 'the preserved serving cycle enables the coffee stream');
  pictures.push(await capture(page, 'mae-rigged-cozinha')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'kitchen');

  console.log('MOTHER: supported passenger checkpoint without a garage-route replay');
  await loadCheckpoint(page, { mission: 'car-ready', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car'] });
  await pause(page); await waitFrames(page, 2); car = await snapshot(page); atAnchor(car, 'car');
  assert.equal(car.chapterStage, 'parked-car'); assert.equal(car.luggageCollected, true);
  const frame = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  const path = '/tmp/o-intercambio-mae-rigged-carro.png'; writeFileSync(path, Buffer.from(frame, 'base64'));
  pictures.push({ label: 'mae-rigged-carro', path, source: 'Actual WebGL frame paused normally before departure, without the pause-menu overlay.' });
  console.log('CAPTURE', path); await review(page, 'car');

  console.log('MOTHER: existing airport farewell and standing pose');
  await loadCheckpoint(page, { mission: 'airport-farewell', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car', 'car-ready'] });
  await waitPhase(page, 'playing'); await waitFrames(page, 2);
  airport = await snapshot(page); atAnchor(airport, 'airport');
  assert.equal(airport.dialogue, true); assert.equal(airport.dialogueAudio, false);
  pictures.push(await capture(page, 'mae-rigged-aeroporto')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'airport'); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-mother-rigged-results.json', JSON.stringify({ status: 'passed', build: airport.build,
    pictures, speech, lines, serving, reviewNotes,
    kitchen: { family: kitchen.family, mission: kitchen.chapterMission },
    afterBreakfast: { family: afterBreakfast.family, mission: afterBreakfast.chapterMission },
    car: { family: car.family, mission: car.chapterMission, position: car.position },
    airport: { family: airport.family, mission: airport.chapterMission }, errors, consoleErrors, failedAssets: failed,
    coverage: ['new mother GLB with original materials, textures and rig', 'parents prompt and E interaction on the asynchronously imported mother body', 'existing coffee prop, serving cycle and breakfast dialogue',
      'same parents and quest after breakfast', 'passenger pose without steering and standing airport pose', 'father asset and poses remain intact'],
    limits: ['The supplied model has static poses and no facial morphs or authored talking cycle.',
      'Car and airport use supported checkpoints; no upstairs, garage route or airport-gate replay.',
      'Captures require visual inspection; Chromium/Linux SwiftShader, no benchmark or physical GPU/Windows test.'],
  }, null, 2));
  console.log('PASS MOTHER: supplied mother in kitchen, passenger seat and airport; father and story preserved.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-mother-rigged-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-mother-rigged-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, speech, lines, serving, state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'mother-debug> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt, aimInteraction,
      pause, atAnchor, father, mother, pictures, reviewNotes, loadCheckpoint, BREAKFAST_SEAT, PARENT_ANCHORS,
      kitchen, afterBreakfast, car, airport, lines, speech, serving };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
