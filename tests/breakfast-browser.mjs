import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames,
  waitPhase, walkTo, lookAt, aimInteraction, pause, hold } from './browser-helpers.mjs';
import { walkPrecisely } from './living-room-route.mjs';

const { BREAKFAST_SEAT, PARENT_ANCHORS } = await import('../src/game/kitchenLayout.ts');
const { isWalkable } = await import('../src/game/collision.ts');
const pictures = [], movement = [], speech = [], route = [];
const horizontal = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const actor = (state, speaker) => {
  const value = state.kitchen.parents?.find(value => value.speaker === speaker);
  assert.ok(value, `actual parent diagnostics are exposed for ${speaker}`);
  return value;
};
const pose = value => ({ posture: value.posture, head: value.head, arms: value.arms,
  jawAngle: value.jawAngle, jawPosition: value.jawPosition });
let browser, session, seating, standing, paused, final, parentPositions, serving;

async function move(page, point, precise = false) {
  if (precise) await walkPrecisely(page, point, .055);
  else await walkTo(page, point, { tolerance: .12 });
  const state = await snapshot(page);
  assert.equal(state.chapterStage, 'home'); assert.equal(state.phase, 'playing');
  assert.ok(isWalkable(state.position));
  route.push(state.position);
}

/** Observe physical camera positions over actual rendered frames. The test
 * never assigns a position, rotation, quest, dialogue beat or animation time. */
async function transition(page, stateName, endName, endpoint) {
  let previous = await snapshot(page), done = previous.breakfast.state === endName;
  const samples = [{ state: previous.breakfast.state, position: previous.position }];
  for (let attempt = 0; !done && attempt < 45; attempt++) {
    await waitFrames(page, 1); const state = await snapshot(page);
    const frames = state.perf.frames - previous.perf.frames;
    assert.ok(frames > 0);
    assert.ok([stateName, endName].includes(state.breakfast.state), JSON.stringify(state.breakfast));
    assert.ok(distance(state.position, previous.position) / frames < .30,
      'seating and standing use smooth rendered motion, without a position jump');
    samples.push({ state: state.breakfast.state, position: state.position });
    previous = state; done = state.breakfast.state === endName;
  }
  assert.ok(done, `${stateName} must finish`);
  assert.ok(distance(previous.position, endpoint) < .055, JSON.stringify({ actual: previous.position, endpoint }));
  assert.ok(new Set(samples.map(sample => sample.position.y.toFixed(3))).size >= 3,
    'the actual camera must pass through intermediate eye heights');
  return samples;
}

async function sampleSpeaking(page, speaker) {
  const samples = [];
  for (let count = 0; count < 7; count++) {
    await waitFrames(page, 1); const state = await snapshot(page);
    assert.equal(state.dialogueSpeaker, speaker); assert.equal(state.dialogueAudio, false);
    const current = actor(state, speaker), other = actor(state, speaker === 'MÃE' ? 'PAI' : 'MÃE');
    assert.ok(other.mouthOpen < .0001 && Math.abs(other.jawAngle) < .0001,
      'the listening parent keeps the actual jaw closed');
    samples.push({ mouthOpen: current.mouthOpen, jawAngle: current.jawAngle,
      jawPosition: current.jawPosition, head: current.head, arms: current.arms,
      expression: current.expression, gesture: current.gesture, serving: current.serving });
  }
  assert.ok(Math.max(...samples.map(sample => sample.mouthOpen)) > .015,
    `${speaker}: speech opens the actual articulated jaw`);
  assert.ok(new Set(samples.map(sample => sample.jawAngle.toFixed(5))).size > 1,
    `${speaker}: jaw transforms vary over real rendered frames`);
  assert.ok(new Set(samples.map(sample => JSON.stringify({ head: sample.head, arms: sample.arms }))).size > 1,
    `${speaker}: subtle head and arm poses also vary with the dialogue`);
  assert.ok(samples.every(sample => ['neutral', 'attention', 'warm', 'concern'].includes(sample.expression)));
  speech.push({ speaker, samples });
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  // A supported save starts at the kitchen entrance and avoids replaying the
  // unchanged waking sequence. All subsequent movement uses actual controls.
  await context.addInitScript(() => localStorage.setItem('o-intercambio.chapter1.checkpoint.v1',
    JSON.stringify({ mission: 'talk-parents', choice: null, completed: ['breakfast'] })));
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'breakfast-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  assert.equal((await snapshot(page)).chapterMission, 'talk-parents');

  console.log('BREAKFAST: physical living-room doorway and compact kitchen circulation');
  for (const point of [{ x: 2.2, z: 16.25 }, { x: 3.5, z: 16.25 }, { x: 3.5, z: 15.5 }]) await move(page, point);
  await move(page, { x: 3.3, z: 14.15 }, true); await move(page, { x: 2.5, z: 14.15 }, true);
  assert.ok((await snapshot(page)).position.x < 2.66, 'the complete capsule really enters the preserved living room');
  await move(page, { x: 3.3, z: 14.15 }, true);
  for (const point of [{ x: 3.5, z: 15.5 }, { x: 3.5, z: 16.25 }, { x: 2.2, z: 16.25 }, BREAKFAST_SEAT.approach]) await move(page, point);
  await lookAt(page, { x: -.5, y: 1.35, z: 18.55 });
  const family = await snapshot(page);
  parentPositions = family.kitchen.parents.map(value => ({ speaker: value.speaker, position: value.position }));
  assert.equal(actor(family, 'PAI').seated, true); assert.equal(actor(family, 'MÃE').seated, false);
  assert.equal(actor(family, 'MÃE').hasCoffeePot, true);
  assert.equal(actor(family, 'PAI').position.y, PARENT_ANCHORS.father.position.y);
  await page.waitForFunction(() => window.__INTERCAMBIO__.kitchen.parents.find(value => value.speaker === 'MÃE')?.coffeeFlow === true,
    null, { timeout: 45000 });
  const pouring = actor(await snapshot(page), 'MÃE');
  await waitFrames(page, 5);
  const poured = actor(await snapshot(page), 'MÃE');
  assert.notDeepEqual(pouring.arms, poured.arms, 'the mother actually moves her arms during the serving cycle');
  serving = { before: { amount: pouring.serving, flow: pouring.coffeeFlow, arms: pouring.arms },
    after: { amount: poured.serving, flow: poured.coffeeFlow, arms: poured.arms } };
  pictures.push(await capture(page, 'cafe-cozinha-final'));
  await aimInteraction(page, 'breakfast-chair', { ...BREAKFAST_SEAT.position, y: .5 });
  assert.match(await page.locator('#interactionText').textContent(), /Sentar à mesa/);

  console.log('BREAKFAST: smooth seated camera, actual jaws and pause');
  const beforeSit = await snapshot(page);
  await page.keyboard.press('KeyE');
  seating = await transition(page, 'sitting', 'seated', BREAKFAST_SEAT.position);
  await page.locator('#dialogueBox').waitFor({ state: 'visible' });
  assert.equal((await page.locator('#dialogueSpeaker').textContent()).trim(), 'MÃE');
  await sampleSpeaking(page, 'MÃE');
  pictures.push(await capture(page, 'cafe-sentado-pais'));
  const locked = (await snapshot(page)).position;
  await hold(page, 'KeyW', 120); assert.ok(distance((await snapshot(page)).position, locked) < .0001,
    'the seated player cannot walk through the table or chair');
  await pause(page); await waitFrames(page, 2);
  const pausedState = await snapshot(page), frozen = pausedState.kitchen.parents.map(pose);
  await waitFrames(page, 4);
  assert.deepEqual((await snapshot(page)).kitchen.parents.map(pose), frozen,
    'pause freezes body and articulated-mouth transforms');
  paused = { camera: pausedState.position, poses: frozen };
  await page.locator('#resume').click(); await waitPhase(page, 'playing');
  await lookAt(page, PARENT_ANCHORS.father.eye);
  const looked = await snapshot(page);
  assert.ok(horizontal(looked.position, locked) < .0001);
  assert.ok(Math.abs(looked.rotation.yaw - beforeSit.rotation.yaw) > .02,
    'first-person mouse look remains available while sitting');

  console.log('BREAKFAST: father speech, choice, maternal suitcase request and standing');
  await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  assert.equal((await snapshot(page)).dialogueSpeaker, 'PAI');
  await sampleSpeaking(page, 'PAI');
  await page.locator('#dialogueChoices button').first().waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.__INTERCAMBIO__.breakfast.speechRemaining === 0 &&
    window.__INTERCAMBIO__.kitchen.parents.every(value => !value.speaking && value.mouthOpen < .0001), null, { timeout: 30000 });
  await page.locator('#dialogueChoices button').first().click();
  let requestedSuitcase = false;
  for (let beat = 0; beat < 10 && (await snapshot(page)).dialogue; beat++) {
    const text = (await page.locator('#dialogueText').textContent()).trim();
    const state = await snapshot(page);
    assert.equal(state.dialogueAudio, false); assert.equal(state.breakfast.state, 'seated');
    if (/mala/i.test(text) && /sub[ae]|sobe|quarto/i.test(text)) {
      assert.equal(state.dialogueSpeaker, 'MÃE'); requestedSuitcase = true;
    }
    await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  }
  await page.waitForFunction(() => !window.__INTERCAMBIO__.dialogue);
  assert.ok(requestedSuitcase, 'the mother explicitly asks the protagonist to go upstairs for the suitcase');
  assert.equal((await snapshot(page)).chapterMission, 'pack-suitcase');
  assert.match(await page.locator('#objectiveText').textContent(), /Suba.*quarto.*mala/i);
  assert.ok((await snapshot(page)).kitchen.parents.every(value => value.mouthOpen < .0001));
  await page.keyboard.press('KeyE');
  standing = await transition(page, 'standing-up', 'standing', BREAKFAST_SEAT.stand);
  assert.ok(isWalkable((await snapshot(page)).position));
  await move(page, { x: .2, z: BREAKFAST_SEAT.stand.z });
  final = await snapshot(page); movement.push({ beforeSit: beforeSit.position, seated: locked, afterStanding: final.position });
  assert.equal(final.chapterMission, 'pack-suitcase'); assert.equal(final.chapterStage, 'home');
  assert.equal(final.dialogueAudio, false); assert.deepEqual(final.errors, []); assertHealthy(session);
  assert.deepEqual(final.kitchen.parents.map(value => ({ speaker: value.speaker, position: value.position })), parentPositions,
    'the father stays seated and mother stays standing at their physical roots');
  writeFileSync('/tmp/o-intercambio-breakfast-results.json', JSON.stringify({ status: 'passed', build: final.build,
    pictures, route, seating, standing, movement, speech, serving, paused, parentPositions,
    final: { position: final.position, mission: final.chapterMission, stage: final.chapterStage, breakfast: final.breakfast },
    coverage: ['physical living-room doorway and compact kitchen passage', 'both parents in actual kitchen capture',
      'smooth seated and standing first-person camera', 'movement blocked and look allowed while seated',
      'speaker-exclusive articulated jaws, quiet choice and dialogue end', 'pause freezes actual parent poses',
      'text-only conversation and response choice', 'mother requests upstairs suitcase, mission updated',
      'father seated and mother standing, free walking restored'],
    limits: ['Runtime screenshots need visual inspection.', 'No new FPS benchmark or physical-GPU/Windows test.',
      'The focused flow ends at the upstairs-suitcase objective; later chapters are not exercised.'],
  }, null, 2));
  console.log('PASS BREAKFAST: compact kitchen, seated camera, animated parents, text-only dialogue and upstairs suitcase objective.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-breakfast-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-breakfast-results.json', JSON.stringify({ status: 'failed', pictures, route,
    seating, standing, speech, paused, error: String(error),
    state: session ? await snapshot(session.page).catch(() => null) : null,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  throw error;
} finally { await browser?.close(); }
