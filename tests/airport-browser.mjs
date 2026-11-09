import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, hold, aimInteraction } from './browser-helpers.mjs';

const { GARAGE_ROUTE: G, FAMILY_CAR_INTERACTION } = await import('../src/game/garageLayout.ts');
const { AIRPORT_ARRIVAL, AIRPORT_GATE, AIRPORT_ROUTE } = await import('../src/game/airportLayout.ts');
const { airportGoodbye } = await import('../src/game/narrative.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const pictures = [], route = [], lines = [], speech = [];
let browser, session, initial, arrival, restored, afterFarewell, final, departureFrames, planeFrames;

const identities = state => state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId }));
function parentsAt(state, location) {
  assert.equal(state.family.location, location);
  assert.equal(state.family.actorCount, 2);
  assert.equal(state.family.parents.length, 2);
  assert.equal(state.family.kitchenVisibleCount, 0);
  assert.equal(state.family.carVisibleCount, location === 'car' ? 2 : 0);
  assert.equal(state.family.airportVisibleCount, location === 'airport' ? 2 : 0);
  for (const parent of state.family.parents) {
    assert.equal(parent.visible, true); assert.equal(parent.location, location); assert.equal(parent.apron, false);
  }
}
function airportView(state) {
  parentsAt(state, 'airport');
  assert.equal(state.airport.scenery.active, true);
  assert.equal(state.airport.scenery.ready, true);
  assert.equal(state.airport.scenery.gate, 24);
  assert.equal(state.airport.scenery.flight, 'AA980');
  assert.equal(state.airport.scenery.destination, 'Nova York (JFK)');
  assert.equal(state.airport.scenery.country, 'Brasil');
  assert.equal(state.airport.scenery.protagonistMeshes, 0);
  assert.ok(state.airport.scenery.passengers > 0 && state.airport.scenery.passengers < 12);
  assert.equal(state.audio.ambience, 'airport');
  assert.equal(state.audio.dialogueAudio, false);
}
async function move(page, point, area) {
  console.log('AIRPORT WALK', area, JSON.stringify(point));
  await walkTo(page, point, { tolerance: .13 });
  const state = await snapshot(page);
  assert.equal(state.phase, 'playing'); assert.equal(state.chapterStage, area);
  if (area === 'home') parentsAt(state, 'car'); else parentsAt(state, 'airport');
  route.push({ area, position: state.position, mission: state.chapterMission });
}
async function observe(page) {
  await page.evaluate(() => {
    const observation = { samples: [], stop: false }; window.__AIRPORT_QA__ = observation;
    function frame() {
      if (observation.stop) return;
      const state = window.__INTERCAMBIO__;
      if (state && observation.samples.length < 1600) observation.samples.push({
        phase: state.phase, stage: state.chapterStage, mission: state.chapterMission,
        fade: Number(document.getElementById('sceneFade').style.opacity),
        gate: state.garage.gate, position: state.position, location: state.family.location,
        carVisible: state.family.carVisibleCount, airportVisible: state.family.airportVisibleCount,
        actors: state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId })),
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
const stopObservation = page => page.evaluate(() => {
  window.__AIRPORT_QA__.stop = true; return window.__AIRPORT_QA__.samples;
});
async function verifyTextAndMouth(page, line) {
  const state = await snapshot(page);
  parentsAt(state, 'airport');
  assert.equal(state.dialogue, true); assert.equal(state.dialogueSpeaker, line.speaker);
  assert.equal((await page.locator('#dialogueText').textContent()).trim(), line.text);
  assert.equal(state.dialogueAudio, false);
  for (const parent of state.family.parents) {
    if (parent.speaker !== line.speaker) assert.ok(parent.mouthOpen < .0001,
      'only the parent whose text is on screen can move their mouth');
  }
  lines.push({ ...line });
}
async function sampleSpeaking(page, speaker) {
  const samples = [];
  for (let frame = 0; frame < 4; frame++) {
    await waitFrames(page, 1); const state = await snapshot(page);
    assert.equal(state.dialogueSpeaker, speaker);
    const current = state.family.parents.find(parent => parent.speaker === speaker);
    const listener = state.family.parents.find(parent => parent.speaker !== speaker);
    assert.ok(listener.mouthOpen < .0001);
    samples.push({ mouthOpen: current.mouthOpen, jaw: current.jawAngle, head: current.head });
  }
  assert.ok(samples.some(sample => sample.mouthOpen > .015), `${speaker}: the visible speaking parent actually opens their mouth`);
  assert.ok(new Set(samples.map(sample => sample.jaw.toFixed(5))).size > 1);
  speech.push({ speaker, samples });
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ mission: 'enter-car', choice: 'nervous',
      completed: ['breakfast', 'talk-parents', 'pack-suitcase'] }));
  }, SAVE);
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'airport-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  initial = await snapshot(page); parentsAt(initial, 'car');
  assert.equal(initial.build, 'chapter1-plane-cabin-1');
  assert.equal(initial.luggageCollected, true); assert.equal(initial.chapterMission, 'enter-car');

  console.log('AIRPORT: real garage approach, one E and automatic gate departure');
  for (const point of [{ x: 3.5, z: 16.25 }, { x: 3.5, z: 15.35 }, G.houseApproach, G.entrance, G.rearSouth, G.driver])
    await move(page, point, 'home');
  await aimInteraction(page, 'family-car', FAMILY_CAR_INTERACTION);
  assert.match(await page.locator('#interactionText').textContent(), /Entrar no carro/i);
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => {
    const state = window.__INTERCAMBIO__;
    return state.garage.gate.progress > .03 && state.family.carVisibleCount === 2
      && Number(document.getElementById('sceneFade').style.opacity) < .9;
  }, null, { timeout: 90000 });
  // Record the real opening while the same parents remain in front of the rear seat.
  pictures.push(await capture(page, 'portao-abrindo-para-aeroporto')); console.log('CAPTURE', pictures.at(-1).path);
  await page.waitForFunction(() => {
    const state = window.__INTERCAMBIO__;
    return state.chapterStage === 'airport' && state.phase === 'playing' && state.dialogue;
  }, null, { timeout: 90000 });
  arrival = await snapshot(page); airportView(arrival);
  assert.equal(arrival.chapterMission, 'airport-farewell');
  assert.deepEqual(identities(arrival), identities(initial), 'reuse the same two actor roots and heads, not copies');
  assert.ok(Math.hypot(arrival.position.x - AIRPORT_ARRIVAL.position.x,
    arrival.position.y - AIRPORT_ARRIVAL.position.y, arrival.position.z - AIRPORT_ARRIVAL.position.z) < .02);
  departureFrames = await stopObservation(page);
  const visibleOpening = departureFrames.filter(frame => frame.gate?.progress > .03 && frame.fade < .9 && frame.stage !== 'airport');
  assert.ok(visibleOpening.length > 0, 'the gate actually starts opening before the airport fade');
  assert.ok(visibleOpening.some(frame => frame.gate.angle > .02 && frame.carVisible === 2));
  const firstAirport = departureFrames.find(frame => frame.stage === 'airport');
  assert.ok(firstAirport && firstAirport.fade >= .99, 'the airport only becomes active under an opaque screen');
  for (const frame of departureFrames.filter(frame => frame.stage !== 'airport' && frame.fade < .99)) {
    assert.equal(frame.carVisible, 2); assert.deepEqual(frame.actors, identities(initial));
  }

  console.log('AIRPORT: one actual farewell checkpoint reload, no skipped goodbye');
  const saved = await page.evaluate(key => localStorage.getItem(key), SAVE);
  assert.equal(JSON.parse(saved).mission, 'airport-farewell');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startGame').click();
  await page.waitForFunction(() => window.__INTERCAMBIO__.phase === 'playing' && window.__INTERCAMBIO__.dialogue);
  restored = await snapshot(page); airportView(restored);
  assert.equal(restored.chapterMission, 'airport-farewell');
  assert.equal(restored.airport.farewell.completed, false);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), saved);
  const lockedPosition = restored.position;
  await hold(page, 'KeyW', 160);
  assert.ok(Math.hypot((await snapshot(page)).position.x - lockedPosition.x,
    (await snapshot(page)).position.z - lockedPosition.z) < .002, 'farewell keeps the initial framing until dialogue completes');
  pictures.push(await capture(page, 'aeroporto-despedida-portao-24')); console.log('CAPTURE', pictures.at(-1).path);
  if (process.env.INTERCAMBIO_VISUAL_REVIEW === '1') {
    // Keep this same browser/checkpoint available while the actual image is inspected.
    const review = (await import('node:repl')).start({ prompt: 'airport-visual> ' });
    review.context.qa = { ...session, browser, snapshot, capture, waitFrames, airportView, airportGoodbye,
      pictures, route, lines, speech, initial, arrival, restored, departureFrames };
    review.context.continueFlow = () => review.close();
    await new Promise(resolve => review.once('exit', resolve));
  }

  console.log('AIRPORT: nine exact text lines, emotional pause, then accessible gate24');
  for (const [index, line] of airportGoodbye.entries()) {
    await verifyTextAndMouth(page, line);
    if (index === 2 || index === 3) await sampleSpeaking(page, line.speaker);
    await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  }
  await page.waitForFunction(() => window.__INTERCAMBIO__.phase === 'farewell');
  assert.equal((await snapshot(page)).chapterMission, 'airport-farewell');
  await page.waitForFunction(() => window.__INTERCAMBIO__.phase === 'playing'
    && window.__INTERCAMBIO__.chapterMission === 'airport-gate', null, { timeout: 90000 });
  afterFarewell = await snapshot(page); parentsAt(afterFarewell, 'airport');
  assert.equal(afterFarewell.airport.farewell.completed, true);
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Dirija-se ao portão de embarque.');
  const routePoints = Array.isArray(AIRPORT_ROUTE) ? AIRPORT_ROUTE : Object.values(AIRPORT_ROUTE);
  for (const point of routePoints) await move(page, point, 'airport');
  await aimInteraction(page, 'gate', AIRPORT_GATE);
  assert.equal((await page.locator('#interactionText').textContent()).trim(), 'Embarcar');
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'plane'
    && window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 90000 });
  planeFrames = await stopObservation(page);
  assert.ok(planeFrames.some(frame => frame.stage === 'airport' && frame.phase === 'transition'
    && frame.fade > 0 && frame.fade < .99), 'boarding fades gradually before changing to the existing plane');
  const firstPlane = planeFrames.find(frame => frame.stage === 'plane');
  assert.ok(firstPlane && firstPlane.fade >= .99, 'boarding changes scene only under a full fade');
  final = await snapshot(page); assert.equal(final.chapterMission, 'plane-seat');
  assert.equal(final.dialogueAudio, false); assert.deepEqual(final.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-airport-results.json', JSON.stringify({ status: 'passed', build: final.build,
    pictures, route, lines, speech, departureFrames, planeFrames,
    arrival: { position: arrival.position, family: arrival.family, airport: arrival.airport },
    restored: { position: restored.position, mission: restored.chapterMission, airport: restored.airport },
    afterFarewell: { mission: afterFarewell.chapterMission, family: afterFarewell.family, airport: afterFarewell.airport },
    final: { phase: final.phase, stage: final.chapterStage, mission: final.chapterMission },
    errors, consoleErrors, failedAssets: failed,
    coverage: ['one luggage-gated car interaction', 'same parents in rear-seat departure',
      'existing gate opens before the fade', 'opaque airport activation', 'actual farewell checkpoint reload',
      'nine exact text-only lines and exclusive parent mouth animation', 'brief emotional pause',
      'walkable gate24 route and guarded boarding into the existing plane'],
    limits: ['Real captures require visual inspection.', 'Chromium/Linux with SwiftShader; no FPS or physical-GPU/Windows benchmark.',
      'The kitchen, bedroom and previous chapter suites were not repeated.'],
  }, null, 2));
  console.log('PASS AIRPORT: garage gate, direct airport farewell, checkpoint and gate24 boarding.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-airport-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-airport-results.json', JSON.stringify({ status: 'failed', error: String(error), pictures, route, lines, speech,
    departureFrames, planeFrames, state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'airport> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, hold, aimInteraction,
      parentsAt, airportView, identities, move, observe, stopObservation, verifyTextAndMouth, sampleSpeaking,
      G, FAMILY_CAR_INTERACTION, AIRPORT_ARRIVAL, AIRPORT_GATE, AIRPORT_ROUTE, airportGoodbye,
      pictures, route, lines, speech, initial, arrival, restored, afterFarewell, departureFrames, planeFrames };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
