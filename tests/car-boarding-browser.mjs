import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, faceYaw, hold, pause, aimInteraction } from './browser-helpers.mjs';
const { CAR_BACK_SEAT, GARAGE_ROUTE: G, FAMILY_CAR_INTERACTION } = await import('../src/game/garageLayout.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const pictures = [], route = [], movement = [];
let browser, session, before, boarded, resumed, restored, ending, boardingFrames, departureFrames;

const identity = state => state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId }));
function parentsVisible(state) {
  assert.equal(state.family.location, 'car'); assert.equal(state.family.actorCount, 2);
  assert.equal(state.family.kitchenVisibleCount, 0); assert.equal(state.family.carVisibleCount, 2);
  assert.equal(state.family.parents.length, 2);
  for (const parent of state.family.parents) {
    assert.equal(parent.location, 'car'); assert.equal(parent.visible, true); assert.equal(parent.seated, true);
  }
}
function inRearSeat(state) {
  assert.equal(state.chapterStage, 'parked-car'); assert.equal(state.chapterMission, 'car-ready');
  assert.equal(state.carSeat.occupied, true); assert.equal(state.luggageCollected, true);
  assert.equal(state.dialogue, false); parentsVisible(state);
  assert.ok(Math.hypot(state.position.x - CAR_BACK_SEAT.position.x, state.position.y - CAR_BACK_SEAT.position.y,
    state.position.z - CAR_BACK_SEAT.position.z) < .015, 'player stays inside the existing rear bench');
}
async function observeFrames(page) {
  await page.evaluate(() => {
    const observation = { samples: [], stop: false }; window.__CAR_BOARDING_QA__ = observation;
    function observe() {
      if (observation.stop) return;
      const state = window.__INTERCAMBIO__;
      if (state && observation.samples.length < 1200) observation.samples.push({
        phase: state.phase, stage: state.chapterStage, mission: state.chapterMission,
        fade: Number(document.getElementById('sceneFade').style.opacity),
        carVisible: state.family.carVisibleCount, kitchenVisible: state.family.kitchenVisibleCount,
        actors: state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId })),
      });
      requestAnimationFrame(observe);
    }
    requestAnimationFrame(observe);
  });
}
async function finishObservation(page) {
  return page.evaluate(() => { window.__CAR_BOARDING_QA__.stop = true; return window.__CAR_BOARDING_QA__.samples; });
}
function noVisibleDisappearance(samples, actors) {
  const visibleHome = samples.filter(frame => ['home', 'parked-car'].includes(frame.stage) && frame.fade < .99);
  assert.ok(visibleHome.length >= 3, 'checks multiple actual visible frames');
  for (const frame of visibleHome) {
    assert.equal(frame.carVisible, 2, 'parents must not vanish while their car is visible');
    assert.equal(frame.kitchenVisible, 0); assert.deepEqual(frame.actors, actors);
  }
}
async function verifyMovementLock(page, codes) {
  const start = (await snapshot(page)).position;
  for (const code of codes) {
    await hold(page, code, 160);
    const state = await snapshot(page); inRearSeat(state);
    assert.ok(Math.hypot(state.position.x - start.x, state.position.y - start.y, state.position.z - start.z) < .005,
      `${code}: protagonist cannot walk out of the parked car`);
    movement.push({ code, position: state.position });
  }
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  // Only seed the supported starting checkpoint. The actual reload below must
  // preserve the car-ready checkpoint written by the game, not this fixture.
  await context.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ mission: 'enter-car', choice: 'nervous',
      completed: ['breakfast', 'talk-parents', 'pack-suitcase'] }));
  }, SAVE);
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'car-boarding-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  before = await snapshot(page); parentsVisible(before);

  console.log('BOARDING: real walk from house to existing garage car');
  for (const point of [{ x: 3.5, z: 16.25 }, { x: 3.5, z: 15.35 }, G.houseApproach, G.entrance, G.rearSouth, G.driver]) {
    await walkTo(page, point, { tolerance: .12 });
    const state = await snapshot(page); parentsVisible(state);
    assert.equal(state.chapterStage, 'home'); assert.equal(state.chapterMission, 'enter-car');
    route.push(state.position);
  }
  await aimInteraction(page, 'family-car', FAMILY_CAR_INTERACTION);
  assert.match(await page.locator('#interactionText').textContent(), /Entrar no carro/i);
  await observeFrames(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'parked-car'
    && window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 90000 });
  boarded = await snapshot(page); inRearSeat(boarded); assert.deepEqual(identity(boarded), identity(before));
  await page.waitForFunction(() => /Seguir para o aeroporto/i.test(document.getElementById('interactionText')?.textContent ?? ''));
  assert.match(await page.locator('#interactionText').textContent(), /Seguir para o aeroporto/i);
  await page.waitForTimeout(2200); await waitFrames(page, 5);
  inRearSeat(await snapshot(page));

  console.log('BOARDING: parents stay visible, real look input works, walking and pause stay locked');
  await verifyMovementLock(page, ['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  await faceYaw(page, CAR_BACK_SEAT.yaw - .35, .04);
  const turned = await snapshot(page); inRearSeat(turned);
  assert.ok(Math.abs(turned.rotation.yaw - boarded.rotation.yaw) > .2, 'real mouse input still turns the seated camera');
  await faceYaw(page, CAR_BACK_SEAT.yaw, CAR_BACK_SEAT.pitch);
  await pause(page); parentsVisible(await snapshot(page));
  await page.locator('#resume').click(); await waitPhase(page, 'playing');
  resumed = await snapshot(page); inRearSeat(resumed);
  await verifyMovementLock(page, ['KeyW']);
  boardingFrames = await finishObservation(page); noVisibleDisappearance(boardingFrames, identity(before));
  const firstParked = boardingFrames.find(frame => frame.stage === 'parked-car');
  assert.ok(firstParked && firstParked.fade >= .99, 'camera enters the car only under the full fade');
  assert.equal(boardingFrames.some(frame => frame.stage === 'airport'), false, 'boarding cannot automatically skip the car view');

  console.log('BOARDING: one actual reload restores the occupied rear seat and both parents');
  const saved = await page.evaluate(key => localStorage.getItem(key), SAVE);
  assert.equal(JSON.parse(saved).mission, 'car-ready');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  restored = await snapshot(page); inRearSeat(restored);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), saved);
  await verifyMovementLock(page, ['KeyW']);
  await faceYaw(page, CAR_BACK_SEAT.yaw, CAR_BACK_SEAT.pitch); await waitFrames(page, 2);
  pictures.push(await capture(page, 'banco-traseiro-com-os-pais')); console.log('CAPTURE', pictures.at(-1).path);

  console.log('BOARDING: only the second E starts the existing airport transition');
  await observeFrames(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'airport'
    && window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 90000 });
  departureFrames = await finishObservation(page); noVisibleDisappearance(departureFrames, identity(restored));
  const firstAirport = departureFrames.find(frame => frame.stage === 'airport');
  assert.ok(firstAirport && firstAirport.fade >= .99, 'parents/home disappear only once departure is fully opaque');
  ending = await snapshot(page); assert.equal(ending.chapterMission, 'airport-gate');
  assert.equal(ending.carSeat.occupied, false); assert.equal(ending.dialogueAudio, false);
  assert.deepEqual(ending.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-car-boarding-results.json', JSON.stringify({ status: 'passed', pictures, route, movement,
    actors: identity(before), boardingFrames, departureFrames,
    boarded: { position: boarded.position, family: boarded.family, carSeat: boarded.carSeat },
    resumed: { position: resumed.position, carSeat: resumed.carSeat },
    restored: { position: restored.position, family: restored.family, carSeat: restored.carSeat },
    final: { phase: ending.phase, stage: ending.chapterStage, mission: ending.chapterMission },
    errors, consoleErrors, failedAssets: failed,
    coverage: ['physical route to car', 'same two actors stay visible throughout boarding and parked frames',
      'real seated camera look, locked WASD and pause/resume', 'actual saved-seat reload',
      'no automatic airport skip', 'second E departure hides home only after opaque fade'],
    limits: ['One Chromium/Linux SwiftShader flow; no FPS or hardware performance claim.', 'Real capture requires visual inspection.'],
  }, null, 2));
  console.log('PASS BOARDING: rear seat, visible parents, look/movement lock, reload and explicit departure.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-car-boarding-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-car-boarding-results.json', JSON.stringify({ status: 'failed', error: String(error), pictures, route, movement,
    boardingFrames, departureFrames, state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'boarding> ' });
    repl.context.qa = { ...session, browser, snapshot, waitFrames, waitPhase, walkTo, faceYaw, hold, pause, aimInteraction,
      capture, observeFrames, finishObservation, noVisibleDisappearance, verifyMovementLock, parentsVisible, inRearSeat,
      identity, before, boarded, resumed, restored, G, CAR_BACK_SEAT, FAMILY_CAR_INTERACTION, pictures, route, movement };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
