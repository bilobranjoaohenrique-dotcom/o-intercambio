import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import './register-typescript.mjs';
import { DOOR, EYE_HEIGHT, STAIRS } from '../src/game/layout.ts';
import { launchBrowser, openScene, assertHealthy, snapshot, capture, walkTo, lookAt,
  faceYaw, aimInteraction, waitFrames, benchmark, pause, hold, waitPhase } from './browser-helpers.mjs';
import { wakeInBedroom, pushUntilBlocked } from './bedroom-route.mjs';
import { crossLivingToKitchen } from './living-room-route.mjs';

const { HALLWAY, HALLWAY_FURNITURE, HALLWAY_OBJECTS } = await import('../src/game/hallwayLayout.ts');
const profile = process.env.INTERCAMBIO_HALLWAY_PROFILE || 'balanced';
assert.ok(['low', 'balanced', 'high'].includes(profile));
const centerX = (STAIRS.minX + STAIRS.maxX) / 2;
const tread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps;
const browser = await launchBrowser();
let session, stationaryPerformance, explorationPerformance, physics, light;
const pictures = [], views = [], decorative = [], traversal = [];
const movement = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
async function pixels(page) {
  const encoded = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  return PNG.sync.read(Buffer.from(encoded, 'base64'));
}
async function decorativeAt(page, name, point) {
  await lookAt(page, point); await waitFrames(page, 2);
  const before = await snapshot(page);
  assert.equal(before.interaction, null, `${name}: no false interaction prompt`);
  assert.equal(await page.locator('#interaction').isVisible(), false);
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  const after = await snapshot(page);
  assert.equal(after.chapterMission, before.chapterMission, `${name}: decoration cannot advance the story`);
  assert.equal(after.dialogue, false, `${name}: decoration cannot start a dialogue`);
  assert.equal(after.hallway.lightOn, before.hallway.lightOn);
  decorative.push({ name, point, interaction: after.interaction });
}
/** A separate actual walking interval, not an inference from the stationary
 * benchmark. Input and sampling overhead are part of this observed interval. */
async function measureUpperWalk(page, endZ) {
  await faceYaw(page, 0);
  const before = await snapshot(page), started = globalThis.performance.now();
  let after = before, ended = started, done = false;
  await page.keyboard.down('KeyW');
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      await waitFrames(page, 2);
      after = await snapshot(page); ended = globalThis.performance.now();
      assert.equal(after.phase, 'playing'); assert.equal(after.chapterMission, 'breakfast');
      assert.ok(after.position.x > HALLWAY.minX + .215 && after.position.x < HALLWAY.maxX - .215);
      if (after.position.z >= endZ) { done = true; break; }
    }
  } finally { await page.keyboard.up('KeyW'); await waitFrames(page, 2); }
  assert.ok(done, 'measured walking interval must really reach the far part of the upper corridor');
  assert.ok(after.position.z < STAIRS.startZ && Math.abs(after.position.y - HALLWAY.floor - EYE_HEIGHT) < .08,
    'the measured upper-corridor walk must stay on the upstairs floor');
  const distance = movement(before.position, after.position), seconds = (ended - started) / 1000;
  const frames = after.perf.frames - before.perf.frames;
  assert.ok(distance > 2 && frames > 0 && seconds > 0);
  return { profile: `hallway-${profile}`, environment: 'Chromium/SwiftShader, Linux, real held-W input with frame/position sampling',
    viewport: page.viewportSize(), internal: await page.locator('#game').evaluate(c => ({ width: c.width, height: c.height })),
    from: before.position, to: after.position, distanceMetres: distance, frames, seconds,
    measuredFps: Math.round(frames / seconds * 10) / 10 };
}

async function observeDescent(page, endZ) {
  await faceYaw(page, 0);
  let previous = await snapshot(page), done = false;
  traversal.push({ position: previous.position, frames: previous.perf.frames });
  await page.keyboard.down('KeyW');
  try {
    for (let attempt = 0; attempt < 110; attempt++) {
      await waitFrames(page, 1);
      const state = await snapshot(page);
      assert.equal(state.phase, 'playing');
      assert.equal(state.chapterMission, 'breakfast', 'partial descent cannot finish the breakfast objective');
      const frames = state.perf.frames - previous.perf.frames;
      assert.ok(frames > 0);
      const yPerFrame = Math.abs(state.position.y - previous.position.y) / frames;
      assert.ok(yPerFrame < .23, `the eye height cannot jump across multiple risers in one frame: ${yPerFrame}`);
      assert.ok(state.position.x >= STAIRS.minX + .215 && state.position.x <= STAIRS.maxX - .215,
        'the whole body stays between the handrails while descending');
      assert.ok(Math.abs(state.horizonTilt) < .003, 'the actual camera horizon stays level on the flight');
      traversal.push({ position: state.position, frames: state.perf.frames, eyeDeltaPerFrame: yPerFrame });
      previous = state;
      if (state.position.z >= endZ) { done = true; break; }
    }
  } finally { await page.keyboard.up('KeyW'); await waitFrames(page, 2); }
  assert.ok(done, 'real walking must reach the requested part of the stair flight');
  assert.ok(traversal.at(-1).position.y < traversal[0].position.y - .5, 'actual eye height descends with the steps');
}
try {
  session = await openScene(browser, profile);
  const { page } = session;
  await page.setViewportSize({ width: 1280, height: 720 }); await waitFrames(page, 2);
  const record = async label => {
    const shot = await capture(page, label), state = await snapshot(page);
    assert.ok(Math.abs(state.horizonTilt) < .003, `${label}: real camera horizon remains level`);
    pictures.push(shot); views.push({ label, position: state.position, rotation: state.rotation, horizonTilt: state.horizonTilt });
  };
  await wakeInBedroom(page, null);
  assert.equal((await snapshot(page)).chapterMission, 'breakfast');

  console.log('STAGE physical bedroom door into the rebuilt corridor');
  const doorX = DOOR.hingeX + DOOR.width / 2;
  await walkTo(page, { x: 1.68, z: 2.25 }, { tolerance: .10 });
  await walkTo(page, { x: doorX, z: 2.73 }, { tolerance: .06 });
  await aimInteraction(page, 'door', { x: doorX, y: 4.4, z: DOOR.z });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen);
  await walkTo(page, { x: centerX, z: 4.45 }, { tolerance: .08 });
  // Test the same animated door from the corridor side, including its real
  // collision. Stand clear of the sweep before asking it to open again.
  await aimInteraction(page, 'door', { x: DOOR.hingeX, y: 4.4, z: DOOR.z + DOOR.width / 2 });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => Math.abs(window.__INTERCAMBIO__.door.angle) < .00001);
  await faceYaw(page, Math.PI);
  const closedDoorStop = await pushUntilBlocked(page);
  assert.ok(closedDoorStop.z >= DOOR.z + DOOR.thickness / 2 + .215 && closedDoorStop.z < 3.75,
    'the closed bedroom leaf stops the capsule on its corridor side');
  await walkTo(page, { x: centerX, z: 4.45 }, { tolerance: .08 });
  await aimInteraction(page, 'door', { x: doorX, y: 4.4, z: DOOR.z });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen);

  console.log('STAGE real reference viewpoints and stationary measurement');
  await walkTo(page, { x: centerX, z: 3.70 }, { tolerance: .08 });
  await lookAt(page, { x: centerX, y: 4.25, z: 8.30 });
  await record('corredor-entrada');
  stationaryPerformance = await benchmark(page, `hallway-${profile}`);
  console.log('MEASURED HALLWAY', JSON.stringify(stationaryPerformance));

  explorationPerformance = await measureUpperWalk(page, 7.02);
  console.log('MEASURED HALLWAY WALK', JSON.stringify(explorationPerformance));
  await lookAt(page, { x: doorX, y: 4.12, z: 2.6 });
  await record('corredor-inversa');
  await walkTo(page, { x: centerX, z: 6.85 }, { tolerance: .08 });
  await lookAt(page, { x: 1.18, y: 4.45, z: 4.65 });
  await record('corredor-detalhes');
  await walkTo(page, { x: centerX, z: 5.10 }, { tolerance: .08 });
  await lookAt(page, { x: HALLWAY_FURNITURE.console.x, y: 3.98, z: HALLWAY_FURNITURE.console.z });
  await record('corredor-aparador');

  console.log('STAGE independent corridor light switch and decorative-only objects');
  await walkTo(page, { x: centerX, z: 4.65 }, { tolerance: .08 });
  await aimInteraction(page, 'hall-switch', HALLWAY_OBJECTS.switch);
  await waitFrames(page, 3);
  const before = await snapshot(page), first = await pixels(page);
  await page.keyboard.press('KeyE'); await waitFrames(page, 3);
  const toggled = await snapshot(page), second = await pixels(page);
  assert.notEqual(toggled.hallway.lightOn, before.hallway.lightOn, 'the corridor light circuit actually toggles');
  assert.equal(toggled.light, before.light, 'the corridor switch does not change the approved bedroom light');
  assert.equal(second.width, first.width); assert.equal(second.height, first.height);
  let changed = 0;
  for (let at = 0; at < first.data.length; at += 4)
    if (Math.abs(first.data[at] - second.data[at]) + Math.abs(first.data[at + 1] - second.data[at + 1]) +
      Math.abs(first.data[at + 2] - second.data[at + 2]) > 24) changed++;
  assert.ok(changed > 50, 'the switch must visibly change actual canvas pixels, not only a flag');
  await record('corredor-luz-alternada');
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  assert.equal((await snapshot(page)).hallway.lightOn, before.hallway.lightOn);
  light = { toggles: 2, changedPixels: changed, totalPixels: first.width * first.height, bedroomLightUnchanged: true };

  for (const z of [4.85, 6.25]) {
    await walkTo(page, { x: centerX, z }, { tolerance: .08 });
    await decorativeAt(page, `closed side door z=${z}`, { x: HALLWAY.minX + .025, y: 4.15, z });
  }
  await walkTo(page, { x: centerX, z: 5.55 }, { tolerance: .08 });
  await decorativeAt(page, 'residential telephone', { x: HALLWAY_FURNITURE.console.x, y: 3.97, z: HALLWAY_FURNITURE.console.z });
  await decorativeAt(page, 'landscape frame', { x: HALLWAY.minX + .025, y: 4.52, z: 5.55 });

  console.log('STAGE physical console and both stair handrails');
  await walkTo(page, { x: 1.75, z: HALLWAY_FURNITURE.console.z }, { tolerance: .08 });
  await faceYaw(page, Math.PI / 2);
  const consoleBefore = (await snapshot(page)).position;
  const consoleStop = await pushUntilBlocked(page);
  assert.ok(consoleStop.x > consoleBefore.x + .10, 'the body really approaches the console');
  assert.ok(consoleStop.x <= HALLWAY_FURNITURE.console.x - HALLWAY_FURNITURE.console.width / 2 - .215,
    'the console solid stops the physical capsule before the visible furniture');
  await walkTo(page, { x: centerX, z: STAIRS.startZ - .45 }, { tolerance: .08 });
  await lookAt(page, { x: STAIRS.maxX, y: 3.45, z: STAIRS.startZ + 1.0 });
  await record('corredor-corrimao-escada');
  await walkTo(page, { x: centerX, z: STAIRS.startZ + .8 }, { tolerance: .08 });
  assert.equal((await snapshot(page)).chapterMission, 'breakfast');
  await faceYaw(page, Math.PI / 2);
  const rightRailStop = await pushUntilBlocked(page);
  assert.ok(rightRailStop.x <= STAIRS.maxX - .215 && rightRailStop.x >= centerX + .10);
  await walkTo(page, { x: centerX, z: STAIRS.startZ + .8 }, { tolerance: .08 });
  await faceYaw(page, -Math.PI / 2);
  const leftRailStop = await pushUntilBlocked(page);
  assert.ok(leftRailStop.x >= STAIRS.minX + .215 && leftRailStop.x <= centerX - .10);
  physics = { closedDoorStop, consoleBefore, consoleStop, rightRailStop, leftRailStop };

  console.log('STAGE smooth real descent, return upstairs and preserved breakfast mission');
  await walkTo(page, { x: centerX, z: STAIRS.startZ - .45 }, { tolerance: .08 });
  await waitFrames(page, 4);
  assert.ok(Math.abs((await snapshot(page)).position.y - HALLWAY.floor - EYE_HEIGHT) < .06,
    'ascending again restores the existing upstairs eye height');
  await observeDescent(page, STAIRS.startZ + (STAIRS.endZ - STAIRS.startZ) * .47);
  await lookAt(page, { x: centerX, y: 1.65, z: 12.4 });
  await record('corredor-descida');
  await walkTo(page, { x: centerX, z: STAIRS.startZ - .45 }, { tolerance: .08 });
  await waitFrames(page, 4);
  assert.ok(Math.abs((await snapshot(page)).position.y - HALLWAY.floor - EYE_HEIGHT) < .06);
  assert.equal((await snapshot(page)).chapterMission, 'breakfast');
  await pause(page);
  const paused = (await snapshot(page)).position;
  await hold(page, 'KeyW', 350);
  assert.deepEqual((await snapshot(page)).position, paused);
  await page.locator('#resume').click(); await waitPhase(page, 'playing');
  await walkTo(page, { x: centerX, z: STAIRS.endZ - tread * 1.5 }, { tolerance: .08 });
  assert.equal((await snapshot(page)).chapterMission, 'breakfast');
  await walkTo(page, { x: centerX, z: STAIRS.endZ + .15 }, { tolerance: .08 });
  assert.ok((await snapshot(page)).position.z >= STAIRS.endZ - tread / 2);
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterMission === 'talk-parents');
  await crossLivingToKitchen(page);
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Converse com seus pais');
  assertHealthy(session);
  const state = await snapshot(page);
  assert.deepEqual(state.errors, []); assert.equal(state.dialogueAudio, false);
  writeFileSync('/tmp/o-intercambio-hallway-results.json', JSON.stringify({ status: 'passed', profile,
    build: state.build, pictures, views, performance: stationaryPerformance, explorationPerformance, physics, light, decorative, traversal,
    renderer: state.renderer, webgl: state.webgl, meshes: state.meshes, vertices: state.vertices,
    coverage: ['fresh waking', 'bedroom door from both sides', 'real closed-door collision',
      'five reference perspectives and console detail', 'independent corridor switch with canvas pixel proof',
      'closed side doors and decorations without fake prompts', 'console and both handrail collisions',
      'physical descent and ascent with measured camera progression', 'pause',
      'real final stair tread', 'direct living-room traversal before unchanged kitchen and breakfast mission'],
    limits: ['The reference images are compared by human inspection; this does not assert exact visual fidelity.',
      'Camera step sampling uses actual rendered frames; it is not a hardware input-latency benchmark.',
      'SwiftShader/Linux measurements do not establish physical-GPU or Windows performance.'],
  }, null, 2));
  console.log('PASS HALLWAY: real corridor, five views, light switch, solids, stair traversal and existing mission.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-hallway-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-hallway-results.json', JSON.stringify({ status: 'failed', profile,
    pictures, views, performance: stationaryPerformance, explorationPerformance, physics, light, decorative, traversal,
    state: session ? await snapshot(session.page).catch(() => null) : null,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
