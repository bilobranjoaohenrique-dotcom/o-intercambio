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
const pictures = [], route = [], dialogueLines = [];
let browser, session, afterBreakfast, beforePickup, pickup, restored, ending, kitchenIdentity;

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
  if (state.chapterMission === 'pack-suitcase') familyAt(state, 'kitchen');
  if (state.chapterMission === 'enter-car') familyAt(state, 'car');
  route.push({ position: state.position, mission: state.chapterMission });
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
    G.rearSouth, G.driver]) await move(page, point);
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
  assert.equal((await snapshot(page)).build, 'chapter1-parents-after-luggage-1');
  familyAt(await snapshot(page), 'kitchen');
  kitchenIdentity = actors(await snapshot(page)).map(actor => ({ speaker: actor.speaker, actorId: actor.actorId, headId: actor.headId }));

  console.log('PARENTS: complete breakfast; both parents must stay in the kitchen');
  await move(page, BREAKFAST_SEAT.approach);
  await aimInteraction(page, 'breakfast-chair', { ...BREAKFAST_SEAT.position, y: .5 });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.breakfast.state === 'seated' && window.__INTERCAMBIO__.dialogue);
  await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  await page.locator('#dialogueChoices button').first().waitFor({ state: 'visible' });
  await page.locator('#dialogueChoices button').first().click();
  for (let i = 0; i < 12 && (await snapshot(page)).dialogue; i++) {
    const text = (await page.locator('#dialogueText').textContent()).trim();
    dialogueLines.push({ speaker: (await snapshot(page)).dialogueSpeaker, text });
    await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  }
  assert.ok(dialogueLines.some(line => line.speaker === 'MÃE' && line.text === motherRequest));
  assert.ok(dialogueLines.some(line => line.speaker === 'PAI' && line.text === fatherReminder));
  await page.waitForFunction(() => window.__INTERCAMBIO__.phase === 'playing' &&
    window.__INTERCAMBIO__.chapterMission === 'pack-suitcase' && window.__INTERCAMBIO__.breakfast.state === 'standing');
  afterBreakfast = await snapshot(page); familyAt(afterBreakfast, 'kitchen');
  assert.deepEqual(actors(afterBreakfast).map(actor => ({ speaker: actor.speaker, actorId: actor.actorId, headId: actor.headId })), kitchenIdentity);
  assert.equal(afterBreakfast.dialogue, false); assert.equal(afterBreakfast.luggageCollected, false);
  assert.ok(actors(afterBreakfast).every(actor => actor.mouthOpen < .0001));
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Suba e pegue sua mala');
  await lookAt(page, { x: -.5, y: 1.42, z: 18.55 });
  await page.waitForFunction(() => window.__INTERCAMBIO__.family.parents.every(actor => actor.blink < .05));
  pictures.push(await capture(page, 'pais-na-cozinha-apos-dialogo')); console.log('CAPTURE', pictures.at(-1).path);
  // Returning to the chair cannot restart the completed conversation.
  await lookAt(page, { ...BREAKFAST_SEAT.position, y: .5 }); await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  assert.equal((await snapshot(page)).dialogue, false); assert.equal((await snapshot(page)).chapterMission, 'pack-suitcase');

  console.log('PARENTS: pack-suitcase reload must keep the parents in the kitchen');
  const saved = await page.evaluate(key => localStorage.getItem(key), SAVE);
  assert.equal(JSON.parse(saved).mission, 'pack-suitcase');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  restored = await snapshot(page); familyAt(restored, 'kitchen');
  assert.equal(restored.chapterMission, 'pack-suitcase'); assert.equal(restored.luggageCollected, false);
  assert.equal(restored.dialogue, false); assert.equal(restored.breakfast.state, 'standing');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), saved);
  kitchenIdentity = actors(restored).map(actor => ({ speaker: actor.speaker, actorId: actor.actorId, headId: actor.headId }));

  console.log('PARENTS: real upstairs walk; only the suitcase pickup moves the same parents');
  await houseToStairs(page);
  const doorX = DOOR.hingeX + DOOR.width / 2;
  if (!(await snapshot(page)).door.isOpen) {
    await aimInteraction(page, 'door', { x: doorX, y: 4.4, z: DOOR.z }); await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen);
  }
  await move(page, { x: doorX, z: 2.7 }, .09);
  await aimInteraction(page, 'suitcase', { x: 2.42, y: 3.23, z: 2.65 });
  assert.equal((await page.locator('#interactionText').textContent()).trim(), 'Pegar mala');
  beforePickup = await snapshot(page); familyAt(beforePickup, 'kitchen');
  assert.ok(beforePickup.position.y > 4.5 && beforePickup.position.z < 3.3,
    'the relocation trigger happens while the player is upstairs, away from the parents');
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  pickup = await snapshot(page); familyAt(pickup, 'car');
  assert.deepEqual(actors(pickup).map(actor => ({ speaker: actor.speaker, actorId: actor.actorId, headId: actor.headId })), kitchenIdentity,
    'the same two actor roots and heads move once when the suitcase is taken');
  assert.equal(pickup.chapterMission, 'enter-car'); assert.equal(pickup.luggageCollected, true);
  assert.notEqual(pickup.interaction, 'suitcase');
  assert.ok(Math.hypot(pickup.position.x - beforePickup.position.x, pickup.position.z - beforePickup.position.z) < .001);
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Vá até a garagem. Seus pais estão esperando.');
  await descendToKitchen(page);

  console.log('PARENTS: arrive at the garage and board the rear seat with both parents present');
  await enterGarage(page);
  await aimInteraction(page, 'family-car', FAMILY_CAR_INTERACTION);
  assert.match(await page.locator('#interactionText').textContent(), /Entrar no carro/i);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'parked-car' && window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 90000 });
  ending = await snapshot(page); familyAt(ending, 'car');
  assert.equal(ending.chapterMission, 'car-ready'); assert.equal(ending.carSeat.occupied, true);
  assert.equal(ending.dialogueAudio, false); assert.equal(ending.dialogue, false);
  await lookAt(page, { x: 7.9, y: 1.05, z: 13.75 });
  await page.waitForFunction(() => window.__INTERCAMBIO__.family.parents.every(actor => actor.blink < .05));
  pictures.push(await capture(page, 'pais-no-carro-depois-da-mala')); console.log('CAPTURE', pictures.at(-1).path);
  ending = await snapshot(page); assert.deepEqual(ending.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-parents-departure-results.json', JSON.stringify({ status: 'passed', build: ending.build, pictures, route,
    dialogueLines, kitchenIdentity, afterBreakfast: { mission: afterBreakfast.chapterMission, family: afterBreakfast.family, breakfast: afterBreakfast.breakfast },
    beforePickup: { mission: beforePickup.chapterMission, family: beforePickup.family, position: beforePickup.position },
    pickup: { mission: pickup.chapterMission, family: pickup.family, luggageCollected: pickup.luggageCollected },
    restored: { mission: restored.chapterMission, family: restored.family, luggageCollected: restored.luggageCollected },
    final: { phase: ending.phase, stage: ending.chapterStage, mission: ending.chapterMission, carSeat: ending.carSeat, family: ending.family },
    coverage: ['completed breakfast leaves both parents in the kitchen', 'pack-suitcase reload keeps parents in the kitchen',
      'parents remain in the kitchen during the physical upstairs walk', 'actual suitcase pickup relocates the same actors out of view',
      'physical descent and garage arrival', 'both parents remain visible while boarding the rear bench'],
    limits: ['Captures need visual inspection.', 'One focused Chromium/Linux SwiftShader flow; no airport continuation or performance benchmark.'],
  }, null, 2));
  console.log('PASS PARENTS TIMING: parents stay for breakfast, move only at suitcase pickup and wait during rear-seat boarding.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-parents-departure-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-parents-departure-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, route, dialogueLines, kitchenIdentity, state: session ? await snapshot(session.page).catch(() => null) : null,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'parents> ' });
    repl.context.qa = { ...session, browser, snapshot, waitFrames, walkTo, lookAt, aimInteraction, capture,
      move, familyAt, actors, houseToStairs, descendToKitchen, enterGarage,
      pictures, route, dialogueLines, G, DOOR, BREAKFAST_SEAT, FAMILY_CAR_INTERACTION };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
