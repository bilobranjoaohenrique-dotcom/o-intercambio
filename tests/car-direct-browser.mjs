import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, lookAt, faceYaw, aimInteraction, hold, pause } from './browser-helpers.mjs';

const { GARAGE, GARAGE_ROUTE: R, FAMILY_CAR, FAMILY_CAR_INTERACTION } = await import('../src/game/garageLayout.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const pictures = [], route = [], reviewNotes = [];
let browser, session, blocked, collider, airport, legacy, travelFrames, legacyFrames;
function asset(state) {
  const model = state.garage.car;
  assert.equal(model.source, '/models/carro_intercambio.glb'); assert.equal(model.loaded, true);
  assert.ok(!model.error, String(model.error));
  assert.deepEqual(state.errors, []);
  return model;
}
function parents(state) {
  assert.equal(state.family.actorCount, 2);
  for (const [speaker, source] of [['PAI', '/models/pai_intercambio.glb'], ['MÃE', '/models/mae_intercambio.glb']]) {
    const person = state.family.parents.find(parent => parent.speaker === speaker);
    assert.equal(person.importedModel.source, source); assert.equal(person.importedModel.loaded, true);
  }
}
async function move(page, point) {
  await walkTo(page, point, { tolerance: .13 });
  const state = await snapshot(page); assert.equal(state.phase, 'playing'); assert.equal(state.chapterStage, 'home');
  route.push({ position: state.position, mission: state.chapterMission });
}
async function reachCar(page) {
  for (const point of [{ x: 3.5, z: 16.25 }, { x: 3.5, z: 15.35 }, R.houseApproach, R.entrance, R.rearSouth])
    await move(page, point);
  assert.ok((await snapshot(page)).position.x > GARAGE.minX + .3);
}
async function observe(page) {
  await page.evaluate(() => {
    const result = { samples: [], stop: false }; window.__CAR_DIRECT_QA__ = result;
    function sample() {
      if (result.stop) return;
      const state = window.__INTERCAMBIO__;
      if (state && result.samples.length < 1200) result.samples.push({ phase: state.phase, stage: state.chapterStage,
        mission: state.chapterMission, position: state.position, fade: Number(document.getElementById('sceneFade').style.opacity),
        occupied: state.carSeat?.occupied ?? false });
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
}
const stopObservation = page => page.evaluate(() => {
  window.__CAR_DIRECT_QA__.stop = true; return window.__CAR_DIRECT_QA__.samples;
});
async function review(page) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  await pause(page);
  const repl = (await import('node:repl')).start({ prompt: 'car-direct-visual> ' });
  repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt, faceYaw,
    aimInteraction, hold, pause, asset, parents, move, reachCar, observe, stopObservation,
    R, GARAGE, FAMILY_CAR, FAMILY_CAR_INTERACTION, pictures, route, reviewNotes };
  repl.context.continueFlow = () => repl.close();
  await new Promise(resolve => repl.once('exit', resolve));
  if ((await snapshot(page)).phase === 'paused') await page.locator('#resume').click();
}
async function loadCheckpoint(page, checkpoint, { first = false, recording = false } = {}) {
  if (!first) {
    await page.evaluate(({ key, checkpoint }) => localStorage.setItem(key, JSON.stringify(checkpoint)), { key: SAVE, checkpoint });
    await page.reload({ waitUntil: 'domcontentloaded' });
  } else await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ &&
    (document.getElementById('game')?.dataset.ready === 'true' || window.__INTERCAMBIO__.errors.length), null, { timeout: 120000 });
  assert.deepEqual((await snapshot(page)).errors, [], 'the new car must not block startup');
  if (first) {
    await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
    await page.locator('#resume').click();
  }
  if (recording) await observe(page);
  await page.locator('#startGame').click();
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ mission: 'pack-suitcase', choice: 'nervous',
      completed: ['breakfast', 'talk-parents'] }));
  }, SAVE);
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'direct-car-balanced' };
  await loadCheckpoint(page, null, { first: true }); await waitPhase(page, 'playing');
  assert.equal((await snapshot(page)).chapterMission, 'pack-suitcase');
  assert.equal((await snapshot(page)).luggageCollected, false); asset(await snapshot(page)); parents(await snapshot(page));

  console.log('CAR: original garage connection, new GLB and one external capture');
  await reachCar(page); await lookAt(page, { x: FAMILY_CAR.x - .85, y: .70, z: FAMILY_CAR.z }); await waitFrames(page, 2);
  pictures.push(await capture(page, 'carro-glb-garagem')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page);

  console.log('CAR: existing solid footprint and luggage requirement');
  await move(page, R.driver); await faceYaw(page, Math.PI);
  const before = (await snapshot(page)).position; await hold(page, 'KeyW', 400);
  const stopped = (await snapshot(page)).position;
  assert.ok(before.z - stopped.z > .06, 'real forward input reaches the parked-car collision');
  assert.ok(stopped.z >= FAMILY_CAR.z + FAMILY_CAR.width / 2 + .205, 'the player cannot enter the car body');
  collider = { before, stopped };
  await aimInteraction(page, 'family-car', FAMILY_CAR_INTERACTION);
  assert.match(await page.locator('#interactionText').textContent(), /aeroporto/i);
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  blocked = await snapshot(page); assert.equal(blocked.phase, 'playing'); assert.equal(blocked.chapterStage, 'home');
  assert.equal(blocked.chapterMission, 'pack-suitcase'); assert.equal(blocked.luggageCollected, false);
  assert.match(await page.locator('#examine').textContent(), /Ainda preciso pegar minha mala/i);
  assert.equal(blocked.garage.gate.progress, 0);

  console.log('CAR: luggage-complete checkpoint and one direct fade to the existing airport');
  await loadCheckpoint(page, { mission: 'enter-car', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase'] });
  await waitPhase(page, 'playing'); assert.equal((await snapshot(page)).luggageCollected, true);
  await reachCar(page); await move(page, R.driver); await aimInteraction(page, 'family-car', FAMILY_CAR_INTERACTION);
  const standing = (await snapshot(page)).position;
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'airport' &&
    window.__INTERCAMBIO__.phase === 'playing' && window.__INTERCAMBIO__.dialogue, null, { timeout: 120000 });
  travelFrames = await stopObservation(page); airport = await snapshot(page);
  assert.equal(airport.chapterMission, 'airport-farewell'); assert.equal(airport.dialogueAudio, false); parents(airport);
  assert.ok(travelFrames.some(sample => sample.stage === 'home' && sample.fade > 0 && sample.fade < .99), 'the new transition fades gradually');
  assert.ok(travelFrames.find(sample => sample.stage === 'airport')?.fade >= .99, 'the scene changes only under black');
  for (const sample of travelFrames) {
    assert.ok(['home', 'airport'].includes(sample.stage), 'there is no intermediate seated/driving chapter stage');
    assert.equal(sample.occupied, false, 'the protagonist never occupies the car');
    if (sample.stage === 'home' && sample.fade < .99)
      assert.ok(Math.hypot(sample.position.x - standing.x, sample.position.y - standing.y,
        sample.position.z - standing.z) < .025, 'the camera remains outside until black');
  }
  assert.equal(airport.garage.gate.progress, 0, 'direct travel does not run the gate-opening sequence');

  console.log('CAR: legacy car-ready checkpoint resumes at the airport without an interior view');
  await loadCheckpoint(page, { mission: 'car-ready', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car'] }, { recording: true });
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'airport' && window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 120000 });
  legacyFrames = await stopObservation(page); legacy = await snapshot(page);
  assert.equal(legacy.chapterMission, 'airport-farewell'); assert.equal(legacy.dialogue, true);
  assert.ok(legacyFrames.every(sample => sample.stage !== 'parked-car' && sample.occupied === false));
  assert.deepEqual(legacy.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-car-direct-results.json', JSON.stringify({ status: 'passed', build: legacy.build,
    pictures, route, reviewNotes, collider, blocked: { mission: blocked.chapterMission, position: blocked.position,
      luggageCollected: blocked.luggageCollected, car: blocked.garage.car },
    airport: { mission: airport.chapterMission, stage: airport.chapterStage, family: airport.family },
    legacy: { mission: legacy.chapterMission, stage: legacy.chapterStage }, travelFrames, legacyFrames,
    errors, consoleErrors, failedAssets: failed,
    coverage: ['supplied GLB visible in the unchanged garage', 'one external capture and actual car collision',
      'departure blocked before luggage', 'E with luggage fades directly to the existing airport',
      'no player car-entry view or gate-opening sequence', 'legacy car-ready checkpoint migration', 'current parents GLBs preserved'],
    limits: ['A direct stage fixture skips the already-tested upstairs luggage route.',
      'Capture requires visual inspection; Chromium/Linux SwiftShader, no benchmark or physical GPU/Windows test.'],
  }, null, 2));
  console.log('PASS CAR: supplied parked model, guarded direct airport transition and legacy checkpoint.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-car-direct-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-car-direct-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, route, reviewNotes, collider, blocked, airport, legacy, travelFrames, legacyFrames,
    state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'car-direct> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt, faceYaw,
      aimInteraction, hold, pause, asset, parents, move, reachCar, observe, stopObservation, loadCheckpoint,
      R, GARAGE, FAMILY_CAR, FAMILY_CAR_INTERACTION, pictures, route, reviewNotes,
      collider, blocked, airport, legacy, travelFrames, legacyFrames };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
