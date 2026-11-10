import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
const { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, lookAt, aimInteraction, hold, pause } = await import('./browser-helpers.mjs');

const { GARAGE_ROUTE: G, FAMILY_CAR_INTERACTION } = await import('../src/game/garageLayout.ts');
const { AIRPORT_ARRIVAL, AIRPORT_GATE, AIRPORT_ROUTE } = await import('../src/game/airportLayout.ts');
const { airportGoodbye } = await import('../src/game/narrative.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const pictures = [], route = [], lines = [], speech = [], reviewNotes = [];
let browser, session, initial, arrival, afterFarewell, final, departureFrames, planeFrames;
const identities = state => state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId }));

function parents(state, location) {
  assert.equal(state.family.actorCount, 2); assert.equal(state.family.location, location);
  for (const [speaker, source] of [['PAI', '/models/pai_intercambio.glb'], ['MÃE', '/models/mae_intercambio.glb']]) {
    const actor = state.family.parents.find(parent => parent.speaker === speaker), model = actor.importedModel;
    assert.equal(model.source, source); assert.equal(model.loaded, true); assert.equal(model.facialAnimation, true);
    assert.ok(model.morphs.some(name => /JawOpen/.test(name)));
    assert.equal(actor.location, location);
    if (location === 'airport') assert.equal(actor.visible, true);
  }
}
function airportView(state) {
  parents(state, 'airport');
  const model = state.airport.scenery;
  assert.equal(model.active, true); assert.equal(model.ready, true); assert.equal(model.loaded, true);
  assert.equal(model.source, '/models/aeroporto_intercambio.glb'); assert.equal(model.error, null);
  assert.equal(model.passengers, 8); assert.equal(model.animationsActive, 8);
  assert.equal(model.gate, 24); assert.equal(model.flight, 'AA980'); assert.equal(model.destination, 'Nova York (JFK)');
  assert.equal(model.country, 'Brasil'); assert.equal(model.protagonistMeshes, 0);
  assert.equal(state.audio.ambience, 'airport'); assert.equal(state.audio.dialogueAudio, false);
}
async function move(page, point, area) {
  console.log('AIRPORT GLB WALK', area, JSON.stringify(point));
  const before = await snapshot(page);
  if (Math.hypot(before.position.x - point.x, before.position.z - point.z) >= .12) {
    // Continuous real keyboard input avoids repeated frame-wait pulses on a
    // slow software renderer. A tight heading and RAF polling stop at target.
    await lookAt(page, { ...point, y: before.position.y }, .009);
    await page.keyboard.down('KeyW');
    try {
      await page.waitForFunction(point => Math.hypot(window.__INTERCAMBIO__.position.x - point.x,
        window.__INTERCAMBIO__.position.z - point.z) < .12, point, { polling: 'raf', timeout: 60000 });
    } finally { await page.keyboard.up('KeyW'); }
    await waitFrames(page, 1);
  }
  const state = await snapshot(page); assert.equal(state.phase, 'playing'); assert.equal(state.chapterStage, area);
  assert.ok(Math.hypot(state.position.x - point.x, state.position.z - point.z) < .20);
  route.push({ area, position: state.position, mission: state.chapterMission });
}
async function observe(page) {
  await page.evaluate(() => {
    const observation = { samples: [], stop: false }; window.__AIRPORT_GLB_QA__ = observation;
    function frame() {
      if (observation.stop) return;
      const state = window.__INTERCAMBIO__;
      if (state && observation.samples.length < 1600) observation.samples.push({
        phase: state.phase, stage: state.chapterStage, mission: state.chapterMission,
        fade: Number(document.getElementById('sceneFade').style.opacity), position: state.position,
        occupied: state.carSeat?.occupied ?? false, location: state.family.location,
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
const stopObservation = page => page.evaluate(() => {
  window.__AIRPORT_GLB_QA__.stop = true; return window.__AIRPORT_GLB_QA__.samples;
});
async function review(page, label) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  await pause(page);
  const repl = (await import('node:repl')).start({ prompt: `airport-glb-${label}> ` });
  repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt,
    aimInteraction, hold, pause, airportView, parents, identities, move, observe, stopObservation,
    G, FAMILY_CAR_INTERACTION, AIRPORT_ARRIVAL, AIRPORT_GATE, AIRPORT_ROUTE, airportGoodbye,
    pictures, route, lines, speech, reviewNotes, initial, arrival, afterFarewell, departureFrames };
  repl.context.continueFlow = () => repl.close();
  await new Promise(resolve => repl.once('exit', resolve));
  if ((await snapshot(page)).phase === 'paused') await page.locator('#resume').click();
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(key => localStorage.setItem(key, JSON.stringify({ mission: 'enter-car', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase'] })), SAVE);
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'airport-glb-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ &&
    (document.getElementById('game')?.dataset.ready === 'true' || window.__INTERCAMBIO__.errors.length), null, { timeout: 120000 });
  assert.deepEqual((await snapshot(page)).errors, []);
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  initial = await snapshot(page); assert.equal(initial.chapterMission, 'enter-car'); assert.equal(initial.luggageCollected, true);
  parents(initial, 'car');

  console.log('AIRPORT GLB: physical garage approach and existing direct car transition');
  for (const point of [{ x: 3.5, z: 16.25 }, { x: 3.5, z: 15.35 }, G.houseApproach, G.entrance, G.rearSouth, G.driver])
    await move(page, point, 'home');
  await aimInteraction(page, 'family-car', FAMILY_CAR_INTERACTION);
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'airport' &&
    window.__INTERCAMBIO__.phase === 'playing' && window.__INTERCAMBIO__.dialogue, null, { timeout: 120000 });
  arrival = await snapshot(page); airportView(arrival); departureFrames = await stopObservation(page);
  assert.equal(arrival.chapterMission, 'airport-farewell'); assert.deepEqual(identities(arrival), identities(initial));
  assert.ok(Math.hypot(arrival.position.x - AIRPORT_ARRIVAL.position.x,
    arrival.position.y - AIRPORT_ARRIVAL.position.y, arrival.position.z - AIRPORT_ARRIVAL.position.z) < .025);
  assert.ok(departureFrames.some(frame => frame.stage === 'home' && frame.fade > 0 && frame.fade < .99));
  assert.ok(departureFrames.find(frame => frame.stage === 'airport')?.fade >= .99);
  assert.ok(departureFrames.every(frame => ['home', 'airport'].includes(frame.stage) && !frame.occupied));
  pictures.push(await capture(page, 'aeroporto-glb-chegada')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'chegada');

  console.log('AIRPORT GLB: preserve nine farewell lines and individual parent speech');
  for (const [index, line] of airportGoodbye.entries()) {
    const state = await snapshot(page); airportView(state);
    assert.equal(state.dialogueSpeaker, line.speaker);
    assert.equal((await page.locator('#dialogueText').textContent()).trim(), line.text); lines.push(line);
    for (const actor of state.family.parents) if (actor.speaker !== line.speaker)
      assert.equal(actor.importedModel.morphWeights.JawOpen, 0);
    if (index === 2 || index === 3) {
      const samples = [];
      for (let frame = 0; frame < 4; frame++) {
        await waitFrames(page, 1); const current = await snapshot(page);
        samples.push(current.family.parents.find(parent => parent.speaker === line.speaker).importedModel.morphWeights.JawOpen);
      }
      assert.ok(samples.some(value => value > .01)); assert.ok(new Set(samples.map(value => value.toFixed(5))).size > 1);
      speech.push({ speaker: line.speaker, samples });
    }
    await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  }
  await page.waitForFunction(() => window.__INTERCAMBIO__.phase === 'playing' &&
    window.__INTERCAMBIO__.chapterMission === 'airport-gate', null, { timeout: 90000 });
  afterFarewell = await snapshot(page); airportView(afterFarewell);
  assert.equal(afterFarewell.airport.farewell.completed, true);
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Dirija-se ao portão de embarque.');
  await lookAt(page, { x: 30, y: 1.6, z: 7 });
  pictures.push(await capture(page, 'aeroporto-glb-saguao')); console.log('CAPTURE', pictures.at(-1).path);

  console.log('AIRPORT GLB: physical passage from check-in to gate24');
  for (const point of AIRPORT_ROUTE) await move(page, point, 'airport');
  await aimInteraction(page, 'gate', AIRPORT_GATE);
  pictures.push(await capture(page, 'aeroporto-glb-embarque')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'embarque');
  assert.equal((await page.locator('#interactionText').textContent()).trim(), 'Embarcar');
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'plane' &&
    window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 120000 });
  planeFrames = await stopObservation(page); final = await snapshot(page);
  assert.equal(final.chapterMission, 'plane-seat'); assert.equal(final.family.location, 'airport');
  assert.equal(final.family.actorCount, 2); assert.deepEqual(identities(final), identities(initial));
  assert.ok(planeFrames.some(frame => frame.stage === 'airport' && frame.fade > 0 && frame.fade < .99));
  assert.ok(planeFrames.find(frame => frame.stage === 'plane')?.fade >= .99);
  assert.equal(final.dialogueAudio, false); assert.deepEqual(final.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-airport-glb-results.json', JSON.stringify({ status: 'passed', build: final.build,
    pictures, route, lines, speech, reviewNotes, departureFrames, planeFrames,
    arrival: { position: arrival.position, family: arrival.family, airport: arrival.airport },
    afterFarewell: { mission: afterFarewell.chapterMission, airport: afterFarewell.airport },
    final: { phase: final.phase, stage: final.chapterStage, mission: final.chapterMission, familyLocation: final.family.location },
    errors, consoleErrors, failedAssets: failed,
    coverage: ['real supplied airport GLB and eight original NPC poses', 'physical garage route and direct transition',
      'same two parents and nine original text lines', 'exclusive parent mouth animation',
      'physical check-in-to-lounge gate24 route', 'boarding into the existing plane; parents stay in Brazil'],
    limits: ['Actual captures require visual inspection.', 'Chromium/Linux with SwiftShader; no hardware GPU or FPS benchmark.',
      'The fixture skips the already-tested upstairs luggage route. No other room or arrival scene suite was repeated.'],
  }, null, 2));
  console.log('PASS AIRPORT GLB: real model, NPCs, farewell, walkable passage and boarding.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-airport-glb-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-airport-glb-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, route, lines, speech, reviewNotes, departureFrames, planeFrames,
    state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error);
    const repl = (await import('node:repl')).start({ prompt: 'airport-glb-debug> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt,
      aimInteraction, hold, pause, airportView, parents, identities, move, observe, stopObservation,
      G, FAMILY_CAR_INTERACTION, AIRPORT_ARRIVAL, AIRPORT_GATE, AIRPORT_ROUTE, airportGoodbye,
      pictures, route, lines, speech, reviewNotes, initial, arrival, afterFarewell, departureFrames, planeFrames };
    repl.context.continueFlow = () => repl.close();
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
