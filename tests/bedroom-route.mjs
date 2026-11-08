import assert from 'node:assert/strict';
import './register-typescript.mjs';
import { DOOR, STANDING_POSE, STAIRS, EYE_HEIGHT } from '../src/game/layout.ts';
import { snapshot, waitFrames, waitIntro, startScene, finishOpening, walkTo, aimInteraction, faceYaw } from './browser-helpers.mjs';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Drive real keyboard input until the capsule has reached a solid surface. */
export async function pushUntilBlocked(page) {
  let previous = (await snapshot(page)).position, travelled = 0, still = 0;
  await page.keyboard.down('KeyW');
  try {
    for (let attempt = 0; attempt < 85; attempt++) {
      await waitFrames(page, 2);
      const current = (await snapshot(page)).position, step = distance(current, previous);
      travelled += step; previous = current;
      still = travelled > .08 && step < .002 ? still + 1 : 0;
      if (still >= 3) return current;
    }
    assert.fail(`movement did not stop against the expected solid: ${JSON.stringify(previous)}`);
  } finally { await page.keyboard.up('KeyW'); await waitFrames(page, 2); }
}

export async function wakeInBedroom(page, record) {
  console.log('STAGE fresh compact-bedroom waking and text-only call');
  await startScene(page);
  await waitIntro(page, 4.8);
  await page.locator('#subtitle').waitFor({ state: 'visible' });
  assert.equal((await page.locator('#subtitleText').textContent()).trim(), 'Ei, vem tomar café pra não se atrasar!');
  assert.equal((await snapshot(page)).dialogueAudio, false, 'dialogue must not use voices or TTS');
  await finishOpening(page);
  const state = await snapshot(page);
  assert.ok(Math.abs(state.horizonTilt) < .003, 'waking hands off a level, real camera');
  assert.ok(distance(state.position, STANDING_POSE.position) < .06);
  if (record) await record('chapter-bedroom');
}

/** The full chapter and focused room test use the same physical exit. Aiming
 * and walking do not mutate player coordinates or mission state. */
export async function leaveBedroomForKitchen(page, { checkDoor = true } = {}) {
  const doorX = DOOR.hingeX + DOOR.width / 2;
  // Stay in the central aisle until past the bed, then line up with the
  // narrower 80 cm doorway instead of clipping its frame or moving leaf.
  await walkTo(page, { x: 1.68, z: 2.25 }, { tolerance: .10 });
  await walkTo(page, { x: doorX, z: 2.73 }, { tolerance: .06 });
  if (checkDoor) {
    assert.equal((await snapshot(page)).door.isOpen, false);
    await faceYaw(page, 0);
    const blocked = await pushUntilBlocked(page);
    assert.ok(blocked.z <= DOOR.z - DOOR.thickness / 2 - .215 && blocked.z > 2.8,
      'the closed animated leaf stops the real physical capsule');
  }
  if (!(await snapshot(page)).door.isOpen) {
    await aimInteraction(page, 'door', { x: doorX, y: 4.45, z: DOOR.z });
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen);
  }
  await walkTo(page, { x: doorX, z: 4.6 }, { tolerance: .08 });
  console.log('STAGE preserved physical staircase');
  const stairX = (STAIRS.minX + STAIRS.maxX) / 2;
  const tread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps;
  await walkTo(page, { x: stairX, z: STAIRS.startZ + (STAIRS.endZ - STAIRS.startZ) * .45 });
  const middle = await snapshot(page);
  assert.equal(middle.chapterMission, 'breakfast');
  assert.ok(middle.position.y > STAIRS.bottomY + EYE_HEIGHT + .4 && middle.position.y < STAIRS.topY + EYE_HEIGHT - .25,
    'eye height follows the real stair treads while the mission remains active');
  await walkTo(page, { x: stairX, z: STAIRS.endZ - tread * 1.5 }, { tolerance: .08 });
  assert.equal((await snapshot(page)).chapterMission, 'breakfast');
  await walkTo(page, { x: stairX, z: STAIRS.endZ + .15 }, { tolerance: .08 });
  assert.ok((await snapshot(page)).position.z >= STAIRS.endZ - tread / 2, 'the capsule must cross the actual last-tread trigger');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterMission === 'talk-parents');
  await walkTo(page, { x: doorX, z: 14.3 });
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Converse com seus pais');
}
