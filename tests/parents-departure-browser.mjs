import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, lookAt, aimInteraction } from './browser-helpers.mjs';

const { BREAKFAST_SEAT } = await import('../src/game/kitchenLayout.ts');
const { DOOR } = await import('../src/game/layout.ts');
const { GARAGE_ROUTE: G, FAMILY_CAR_INTERACTION } = await import('../src/game/garageLayout.ts');
const { isWalkable } = await import('../src/game/collision.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const motherRequest = 'Filho, sobe lá e pega tua mala. Eu e teu pai vamos te esperar no carro, tá?';
const fatherReminder = 'E vê se não esquece o passaporte!';
const pictures = [], route = [], speech = [], dialogueLines = [];
let browser, session, departed, pickup, restored, ending, kitchenIdentity, transfer;

const actors = state => state.family.parents;
function familyAt(state, location) {
  assert.equal(state.family.location, location);
  assert.equal(state.family.actorCount, 2);
  assert.equal(actors(state).length, 2);
  assert.equal(state.family.kitchenVisibleCount, location === 'kitchen' ? 2 : 0);
  assert.equal(state.family.carVisibleCount, location === 'car' ? 2 : 0);
  for (const actor of actors(state)) {
    assert.equal(actor.location, location); assert.equal(actor.visible, true);
    if (location === 'car') { assert.equal(actor.seated, true); assert.equal(actor.apron, false); }
  }
}
async function move(page, point, tolerance = .12) {
  await walkTo(page, point, { tolerance });
  const state = await snapshot(page);
  assert.equal(state.phase, 'playing'); assert.equal(state.chapterStage, 'home');
  assert.ok(isWalkable(state.position));
  route.push({ position: state.position, mission: state.chapterMission });
}
async function speaking(page, speaker) {
  const samples = [];
  for (let i = 0; i < 4; i++) {
    await waitFrames(page, 1); const state = await snapshot(page);
    assert.equal(state.dialogueSpeaker, speaker); assert.equal(state.dialogueAudio, false);
    const current = actors(state).find(actor => actor.speaker === speaker);
    const listener = actors(state).find(actor => actor.speaker !== speaker);
    assert.ok(listener.mouthOpen < .0001 && Math.abs(listener.jawAngle) < .0001);
    samples.push({ mouthOpen: current.mouthOpen, jaw: current.jawAngle, head: current.head, arms: current.arms });
  }
  assert.ok(Math.max(...samples.map(sample => sample.mouthOpen)) > .015, `${speaker}: actual jaw opens`);
  assert.ok(new Set(samples.map(sample => sample.jaw.toFixed(5))).size > 1, `${speaker}: jaw changes over rendered frames`);
  assert.ok(new Set(samples.map(sample => JSON.stringify({ head: sample.head, arms: sample.arms }))).size > 1);
  speech.push({ speaker, samples });
}
async function houseToStairs(page) {
  for (const point of [{ x: 3.5, z: 16.25 }, { x: 3.5, z: 14.2 }, { x: 1.6, z: 14.2 },
    { x: 1.6, z: 12.6 }, { x: 1.85, z: 11.95 }, { x: 1.85, z: 4.6 }]) await move(page, point);
}
async function descendToKitchen(page) {
  for (const point of [{ x: 1.85, z: 4.6 }, { x: 1.85, z: 11.95 }, { x: 1.6, z: 12.6 },
    { x: 1.6, z: 14.2 }, { x: 3.5, z: 14.2 }, { x: 3.5, z: 16.25 }, { x: 0, z: 16.3 }]) await move(page, point);
}
async function enterGarage(page) {
  for (const point of [{ x: 3.5, z: 16.25 }, { x: 3.5, z: 15.35 }, G.houseApproach, G.entrance,
    G.rearSouth, G.frontSouth, { x: 9.65, z: 13.75 }]) await move(page, point);
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  // Seed only the initial, supported checkpoint. Reload must retain the actual
  // conversation, bag pickup and later mission saved by the game itself.
  await context.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key,
      JSON.stringify({ mission: 'talk-parents', choice: null, completed: ['breakfast'] }));
  }, SAVE);
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'parents-departure-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  familyAt(await snapshot(page), 'kitchen');
  kitchenIdentity = actors(await snapshot(page)).map(actor => ({ speaker: actor.speaker, actorId: actor.actorId, headId: actor.headId }));

  console.log('PARENTS: existing breakfast interaction and actual speaker-only jaws');
  await move(page, BREAKFAST_SEAT.approach);
  await aimInteraction(page, 'breakfast-chair', { ...BREAKFAST_SEAT.position, y: .5 });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.breakfast.state === 'seated' && window.__INTERCAMBIO__.dialogue);
  await speaking(page, 'MÃE');
  pictures.push(await capture(page, 'pais-cafe-atualizados')); console.log('CAPTURE', pictures.at(-1).path);
  await page.keyboard.press('KeyE'); await waitFrames(page, 1); await speaking(page, 'PAI');
  await page.locator('#dialogueChoices button').first().waitFor({ state: 'visible' });
  await page.locator('#dialogueChoices button').first().click();
  await page.evaluate(() => {
    const samples = []; window.__FAMILY_TRANSFER_SAMPLES__ = samples;
    function observe() {
      const state = window.__INTERCAMBIO__;
      if (state?.phase === 'transition' && state.chapterStage === 'home') samples.push({
        location: state.family.location, fade: Number(document.getElementById('sceneFade').style.opacity),
        kitchenVisible: state.family.kitchenVisibleCount, carVisible: state.family.carVisibleCount,
      });
      if (samples.length < 200 && !(state?.phase === 'playing' && state.chapterMission === 'pack-suitcase')) requestAnimationFrame(observe);
    }
    requestAnimationFrame(observe);
  });
  for (let i = 0; i < 12 && (await snapshot(page)).dialogue; i++) {
    const text = (await page.locator('#dialogueText').textContent()).trim();
    dialogueLines.push({ speaker: (await snapshot(page)).dialogueSpeaker, text });
    await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  }
  assert.ok(dialogueLines.some(line => line.speaker === 'MÃE' && line.text === motherRequest));
  assert.ok(dialogueLines.some(line => line.speaker === 'PAI' && line.text === fatherReminder));
  await page.waitForFunction(() => window.__INTERCAMBIO__.phase === 'playing' &&
    window.__INTERCAMBIO__.chapterMission === 'pack-suitcase' && window.__INTERCAMBIO__.breakfast.state === 'standing');
  departed = await snapshot(page); familyAt(departed, 'car');
  transfer = await page.evaluate(() => window.__FAMILY_TRANSFER_SAMPLES__);
  assert.ok(transfer.some(sample => sample.location === 'kitchen'));
  assert.ok(transfer.find(sample => sample.location === 'car')?.fade >= .99,
    'the parent roots change location only while the existing scene fade is opaque');
  assert.deepEqual(actors(departed).map(actor => ({ speaker: actor.speaker, actorId: actor.actorId, headId: actor.headId })), kitchenIdentity,
    'the same two actor roots and heads move from kitchen to car');
  assert.equal(departed.dialogue, false); assert.equal(departed.luggageCollected, false);
  assert.ok(actors(departed).every(actor => actor.mouthOpen < .0001));
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Suba e pegue sua mala');
  // Returning to the chair cannot restart the completed conversation.
  await lookAt(page, { ...BREAKFAST_SEAT.position, y: .5 }); await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  assert.equal((await snapshot(page)).dialogue, false); assert.equal((await snapshot(page)).chapterMission, 'pack-suitcase');

  console.log('PARENTS: real upstairs trip, suitcase pickup and descent through the preserved house');
  await houseToStairs(page);
  const doorX = DOOR.hingeX + DOOR.width / 2;
  if (!(await snapshot(page)).door.isOpen) {
    await aimInteraction(page, 'door', { x: doorX, y: 4.4, z: DOOR.z }); await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen);
  }
  await move(page, { x: doorX, z: 2.7 }, .09);
  await aimInteraction(page, 'suitcase', { x: 2.42, y: 3.23, z: 2.65 });
  assert.equal((await page.locator('#interactionText').textContent()).trim(), 'Pegar mala');
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  pickup = await snapshot(page); familyAt(pickup, 'car');
  assert.equal(pickup.chapterMission, 'enter-car'); assert.equal(pickup.luggageCollected, true);
  assert.notEqual(pickup.interaction, 'suitcase');
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Vá até a garagem. Seus pais estão esperando.');
  await descendToKitchen(page);

  console.log('PARENTS: one actual save reload, no duplicate parents or breakfast restart');
  const saved = await page.evaluate(key => localStorage.getItem(key), SAVE);
  assert.equal(JSON.parse(saved).mission, 'enter-car');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  restored = await snapshot(page); familyAt(restored, 'car');
  assert.equal(restored.chapterMission, 'enter-car'); assert.equal(restored.luggageCollected, true);
  assert.equal(restored.dialogue, false); assert.equal(restored.breakfast.state, 'standing');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), saved);

  console.log('PARENTS: parked-car occupants and existing guarded departure');
  await enterGarage(page);
  await lookAt(page, { x: 7.5, y: 1.1, z: 13.75 }); await waitFrames(page, 2);
  familyAt(await snapshot(page), 'car');
  pictures.push(await capture(page, 'pais-esperando-no-carro')); console.log('CAPTURE', pictures.at(-1).path);
  for (const point of [G.frontSouth, G.driver]) await move(page, point);
  await aimInteraction(page, 'family-car', FAMILY_CAR_INTERACTION);
  assert.match(await page.locator('#interactionText').textContent(), /Entrar no carro/i);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'airport' && window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 90000 });
  ending = await snapshot(page); assert.equal(ending.chapterMission, 'airport-gate'); assert.equal(ending.dialogueAudio, false);
  assert.deepEqual(ending.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-parents-departure-results.json', JSON.stringify({ status: 'passed', pictures, route,
    speech, dialogueLines, kitchenIdentity, transfer, departed: { mission: departed.chapterMission, family: departed.family, breakfast: departed.breakfast },
    pickup: { mission: pickup.chapterMission, luggageCollected: pickup.luggageCollected },
    restored: { mission: restored.chapterMission, family: restored.family, luggageCollected: restored.luggageCollected },
    final: { phase: ending.phase, stage: ending.chapterStage, mission: ending.chapterMission },
    coverage: ['actual seated conversation and exclusive mouth animation', 'exact farewell lines and automatic free movement',
      'parents move once from kitchen to parked car without visible teleport', 'physical ascent, suitcase pickup and descent',
      'real save reload preserves luggage and car occupants', 'actual car-occupant capture', 'existing luggage-gated airport transition'],
    limits: ['Captures need visual inspection.', 'One Chromium/Linux SwiftShader flow, no FPS benchmark or other-room suites.'],
  }, null, 2));
  console.log('PASS PARENTS: breakfast, farewell, real suitcase trip, persistent car occupants and guarded departure.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-parents-departure-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-parents-departure-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, route, speech, dialogueLines, kitchenIdentity, transfer, state: session ? await snapshot(session.page).catch(() => null) : null,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'parents> ' });
    repl.context.qa = { ...session, browser, snapshot, waitFrames, walkTo, lookAt, aimInteraction, capture,
      move, familyAt, actors, speaking, houseToStairs, descendToKitchen, enterGarage,
      pictures, route, speech, dialogueLines, G, DOOR, BREAKFAST_SEAT, FAMILY_CAR_INTERACTION };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
