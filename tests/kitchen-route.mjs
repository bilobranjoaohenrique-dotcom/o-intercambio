import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import './register-typescript.mjs';
import { PARENT_ANCHORS, KITCHEN_FURNITURE } from '../src/game/kitchenLayout.ts';
import { wakeInBedroom, leaveBedroomForKitchen } from './bedroom-route.mjs';
import { snapshot, waitFrames, waitPhase,
  walkTo, aimInteraction, faceYaw, lookAt, pause, hold, benchmark } from './browser-helpers.mjs';

const { HOME_RESUME_POSITION } = await import('../src/game/livingRoomPlacement.ts');

const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** Observe the rendered camera basis rather than a configuration flag or the
 * Euler roll field: a stale up-vector can tilt the image while roll is zero. */
export async function assertLevelHorizon(page, label) {
  await waitFrames(page, 1);
  const state = await snapshot(page);
  assert.equal(state.phase, 'playing', `${label}: horizon is checked during actual gameplay`);
  assert.ok(Number.isFinite(state.horizonTilt), `${label}: the real camera right-vector must be measurable`);
  assert.ok(Math.abs(state.horizonTilt) < .003,
    `${label}: rendered horizon tilted despite the controller pose: ${JSON.stringify({ basisRightY: state.horizonTilt, rotation: state.rotation })}`);
  return { view: label, basisRightY: state.horizonTilt, rotation: state.rotation };
}
export async function pressDialogue(page, count) {
  for (let index = 0; index < count; index++) {
    await page.keyboard.press('KeyE'); await page.waitForTimeout(180);
  }
}

/** Hold a physical key until collision stops the capsule. This waits for actual
 * frames, so a software renderer cannot silently miss a short key pulse. */
async function pushUntilBlocked(page) {
  let previous = (await snapshot(page)).position, travelled = 0, still = 0;
  await page.keyboard.down('KeyW');
  try {
    for (let attempt = 0; attempt < 85; attempt++) {
      await waitFrames(page, 2);
      const current = (await snapshot(page)).position;
      const step = horizontalDistance(current, previous);
      travelled += step; previous = current;
      still = travelled > .12 && step < .002 ? still + 1 : 0;
      if (still >= 3) return current;
    }
    assert.fail(`the real movement did not stop at the expected obstacle: ${JSON.stringify(previous)}`);
  } finally { await page.keyboard.up('KeyW'); await waitFrames(page, 2); }
}

export async function wakeAndReachKitchen(page, record) {
  await wakeInBedroom(page, record);
  await assertLevelHorizon(page, 'compact bedroom after the actual waking animation');
  await leaveBedroomForKitchen(page);
}

async function canvasFrame(page) {
  const encoded = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  return PNG.sync.read(Buffer.from(encoded, 'base64'));
}
async function lightingSample(page) {
  const image = await canvasFrame(page);
  let clipped = 0, samples = 0;
  for (let y = 0; y < image.height; y += 3) for (let x = 0; x < image.width; x += 3) {
    const at = (y * image.width + x) * 4; samples++;
    if (image.data[at] >= 250 && image.data[at + 1] >= 250 && image.data[at + 2] >= 250) clipped++;
  }
  const whiteClipFraction = clipped / samples;
  assert.ok(whiteClipFraction < .16, `the kitchen frame is excessively clipped to white: ${whiteClipFraction}`);
  return { whiteClipFraction, samples };
}

async function observeIdleMotion(page) {
  const beforePosition = (await snapshot(page)).position;
  const before = await canvasFrame(page);
  await waitFrames(page, 7);
  const after = await canvasFrame(page);
  assert.ok(horizontalDistance((await snapshot(page)).position, beforePosition) < .001,
    'the idle comparison must keep the actual camera position still');
  let changed = 0;
  for (let at = 0; at < before.data.length; at += 4) {
    if (Math.abs(before.data[at] - after.data[at]) + Math.abs(before.data[at + 1] - after.data[at + 1]) +
      Math.abs(before.data[at + 2] - after.data[at + 2]) > 30) changed++;
  }
  assert.ok(changed > 8, 'a fixed camera looking at the mother must show actual animated scene changes');
  return { changedPixels: changed, totalPixels: before.width * before.height, observedFrames: 7 };
}

export async function kitchenViewsAndPhysics(page, record, profile, detailed = true) {
  const horizon = [];
  console.log('STAGE kitchen overview and measurement', profile);
  await walkTo(page, { x: 0, z: 16.4 });
  await lookAt(page, { x: 0, y: 1.25, z: 19.4 });
  horizon.push(await assertLevelHorizon(page, `${profile} kitchen overview`));
  await record(`${profile}-cozinha-geral`);
  const lighting = await lightingSample(page);
  const performance = await benchmark(page, `kitchen-${profile}`);
  console.log('MEASURED KITCHEN', JSON.stringify(performance));
  if (!detailed) return { lighting, performance, horizon };

  // Composition is reached through the same real first-person controls.
  await walkTo(page, { x: .5, z: 16.6 });
  await lookAt(page, { x: -.1, y: 1.15, z: 19.35 });
  horizon.push(await assertLevelHorizon(page, 'both parents across the table'));
  await record('cozinha-pais-a-mesa');
  await walkTo(page, { x: 0, z: 17.0 });
  await lookAt(page, { x: 0, y: .98, z: 18.65 });
  horizon.push(await assertLevelHorizon(page, 'looking downward while approaching the table'));
  await record('cozinha-aproximacao-mesa');
  await faceYaw(page, 0);
  const before = (await snapshot(page)).position;
  assert.ok(Math.abs(before.x) < .17, 'the table test must begin inside the clear central approach lane');
  const tableStop = await pushUntilBlocked(page);
  assert.ok(tableStop.z > before.z + .15, 'walking must genuinely approach the table');
  assert.ok(tableStop.z <= KITCHEN_FURNITURE.table.z - KITCHEN_FURNITURE.table.depth / 2 - .18,
    'the player cannot cross the breakfast table');
  assert.ok(Math.abs(tableStop.x - before.x) < .035, 'forward movement must not drift sideways while the table blocks the capsule');

  // Left route stays outside the front chair and table footprints.
  await walkTo(page, { x: 0, z: 16.6 });
  await walkTo(page, { x: -2.4, z: 16.6 });
  await walkTo(page, { x: -2.3, z: 17.8 });
  await aimInteraction(page, 'parents', PARENT_ANCHORS.mother.interaction);
  horizon.push(await assertLevelHorizon(page, 'mother close-up after turning left'));
  await record('cozinha-mae');
  const idle = await observeIdleMotion(page);
  const actorBefore = (await snapshot(page)).position;
  await lookAt(page, { ...PARENT_ANCHORS.mother.position, y: actorBefore.y });
  const parentStop = await pushUntilBlocked(page);
  const separation = horizontalDistance(parentStop, PARENT_ANCHORS.mother.position);
  assert.ok(separation >= .36 && separation < .65, `the mother's body must block walking: ${separation}`);
  await walkTo(page, { x: -2.3, z: 17.8 });
  await walkTo(page, { x: -2.4, z: 16.6 });
  await walkTo(page, { x: 2.6, z: 16.6 });
  await walkTo(page, { x: 2.6, z: 17.95 });
  await walkTo(page, { x: 1.65, z: 17.95 });
  await aimInteraction(page, 'parents', PARENT_ANCHORS.father.interaction);
  horizon.push(await assertLevelHorizon(page, 'father close-up after turning right'));
  await record('cozinha-pai');
  assert.equal((await snapshot(page)).chapterMission, 'talk-parents', 'looking at parents does not auto-complete the mission');
  return { lighting, performance, idle, horizon, collisions: { before, tableStop, parentStop, separation } };
}

export async function checkKitchenPauseAndCheckpoint(page) {
  console.log('STAGE pause and genuine checkpoint reload');
  await pause(page);
  const before = (await snapshot(page)).position;
  await hold(page, 'KeyW', 400);
  assert.deepEqual((await snapshot(page)).position, before, 'the paused scene cannot move');
  await page.locator('#resume').click(); await waitPhase(page, 'playing');
  await assertLevelHorizon(page, 'resuming the father view after pause');
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('o-intercambio.chapter1.checkpoint.v1') || 'null'));
  assert.equal(checkpoint?.mission, 'talk-parents');
  await page.reload();
  await page.waitForFunction(() => document.getElementById('game')?.dataset.ready === 'true');
  assert.equal((await snapshot(page)).chapterMission, 'talk-parents', 'the real saved checkpoint survives a reload');
  await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  const resumed = await snapshot(page);
  assert.ok(horizontalDistance(resumed.position, HOME_RESUME_POSITION) < .05, 'a kitchen checkpoint resumes on clear kitchen floor');
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Converse com seus pais');
  await assertLevelHorizon(page, 'kitchen checkpoint after genuine page reload');
}

export async function talkToParents(page, record) {
  console.log('STAGE text-only parent dialogue and choice');
  // Safe route works both from the entrance and after the father close-up.
  if ((await snapshot(page)).position.z > 17) {
    await walkTo(page, { x: 2.6, z: 17.95 });
    await walkTo(page, { x: 2.6, z: 16.6 });
  }
  await walkTo(page, { x: -2.4, z: 16.6 });
  await walkTo(page, { x: -2.3, z: 17.8 });
  await aimInteraction(page, 'parents', PARENT_ANCHORS.mother.interaction);
  await assertLevelHorizon(page, 'mother dialogue view after checkpoint and mouse movement');
  await page.keyboard.press('KeyE');
  await page.locator('#dialogueBox').waitFor({ state: 'visible' });
  assert.equal((await page.locator('#dialogueSpeaker').textContent()).trim(), 'MÃE');
  assert.match(await page.locator('#dialogueText').textContent(), /Bom dia/);
  assert.equal((await snapshot(page)).dialogueAudio, false);
  const locked = (await snapshot(page)).position;
  await hold(page, 'KeyW', 400);
  assert.deepEqual((await snapshot(page)).position, locked, 'dialogue freezes movement instead of allowing a walk through the actors');
  assert.equal(await page.locator('#captureMouse').isVisible(), false,
    'the mouse-capture button must stay hidden while dialogue deliberately releases the pointer');
  assert.equal(await page.locator('#reticle').isVisible(), false, 'the reticle must not remain on a character during dialogue');
  await record('cozinha-dialogo');
  await page.keyboard.press('KeyE');
  assert.equal((await page.locator('#dialogueSpeaker').textContent()).trim(), 'PAI');
  await page.locator('#dialogueChoices button').first().waitFor({ state: 'visible' });
  await waitFrames(page, 1);
  assert.equal(await page.locator('#captureMouse').isVisible(), false, 'dialogue choices must keep the pointer free from the capture control');
  assert.equal(await page.locator('#reticle').isVisible(), false, 'dialogue choices must keep the scene reticle hidden');
  await page.locator('#dialogueChoices button').first().click();
  await page.waitForFunction(() => document.getElementById('dialogueText')?.textContent?.includes('Eu sabia'));
  await pressDialogue(page, 4);
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterMission === 'pack-suitcase' && !window.__INTERCAMBIO__.dialogue);
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('o-intercambio.chapter1.checkpoint.v1') || 'null'));
  assert.equal(checkpoint?.choice, 'excited');
  assert.equal((await snapshot(page)).dialogueAudio, false);
  assert.equal(await page.locator('#reticle').isVisible(), true, 'normal gameplay restores the reticle after the conversation ends');
}

export async function approachKitchenSuitcase(page) {
  await walkTo(page, { x: -2.4, z: 16.6 });
  await walkTo(page, { x: 2.3, z: 16.6 });
  await walkTo(page, { x: 4.1, z: 16.4 });
  await aimInteraction(page, 'suitcase', { x: 3.25, y: .45, z: 15.6 });
}
