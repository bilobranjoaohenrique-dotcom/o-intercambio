import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import './register-typescript.mjs';
import { EYE_HEIGHT, STAIRS } from '../src/game/layout.ts';
import { LIVING_ROOM_FURNITURE as LOCAL_FURNITURE } from '../src/game/livingRoomLayout.ts';
import { PARENT_ANCHORS } from '../src/game/kitchenLayout.ts';
import { launchBrowser, openScene, assertHealthy, snapshot, capture, lookAt, faceYaw,
  aimInteraction, waitFrames, pause, hold, waitPhase, walkTo } from './browser-helpers.mjs';
import { wakeInBedroom, pushUntilBlocked } from './bedroom-route.mjs';
import { descendToLivingLanding, crossLivingToKitchen, walkPrecisely, walkNavigable, insideLivingRoom } from './living-room-route.mjs';

const { livingToWorld, worldToLiving, LIVING_ROOM_PLACEMENT, LIVING_ROOM_WORLD,
  LIVING_ROOM_WORLD_FURNITURE: FURNITURE, LIVING_ROOM_WORLD_OBJECTS: OBJECTS,
  LIVING_ROOM_ROUTE } = await import('../src/game/livingRoomPlacement.ts');

const pictures = [], views = [], route = [], examinations = [];
const navigationBounds = { minX: LIVING_ROOM_WORLD.minX, maxX: 4.60, minZ: STAIRS.endZ, maxZ: 16.80 };
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon);
const go = (page, point) => walkNavigable(page, point, navigationBounds);
const localGo = (page, point) => go(page, livingToWorld(point));
let browser, session, traversal, arrival, directEntry, television, physics, kitchen, finalState;
const canonicalFurniture = [];
for (const [name, approved] of Object.entries(LOCAL_FURNITURE)) {
  const placed = FURNITURE[name], restored = worldToLiving(placed);
  near(restored.x, approved.x); near(restored.z, approved.z);
  for (const field of ['width', 'height', 'depth']) assert.equal(placed[field], approved[field]);
  near(placed.rotation - LIVING_ROOM_PLACEMENT.yaw, approved.rotation);
  canonicalFurniture.push({ name, approved, world: placed });
}
const canonicalPlacement = { placement: LIVING_ROOM_PLACEMENT, bounds: LIVING_ROOM_WORLD, furniture: canonicalFurniture };
async function pixels(page) {
  const encoded = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  return PNG.sync.read(Buffer.from(encoded, 'base64'));
}
function screenStatistics(frame) {
  let luminance = 0, bright = 0, samples = 0; const colours = new Set();
  for (let y = Math.floor(frame.height * .45); y < frame.height * .55; y++)
    for (let x = Math.floor(frame.width * .45); x < frame.width * .55; x++) {
      const at = (y * frame.width + x) * 4, r = frame.data[at], g = frame.data[at + 1], b = frame.data[at + 2];
      const value = .2126 * r + .7152 * g + .0722 * b;
      luminance += value; samples++; if (value > 40) bright++;
      colours.add(`${r >> 4},${g >> 4},${b >> 4}`);
    }
  return { meanLuminance: luminance / samples, brightFraction: bright / samples, colours: colours.size, samples };
}
async function unchangedStory(page, label) {
  const state = await snapshot(page);
  assert.equal(state.phase, 'playing', `${label}: no scene transition`);
  assert.equal(state.chapterStage, 'home'); assert.equal(state.chapterMission, 'talk-parents');
  assert.equal(state.dialogue, false); assert.equal(state.dialogueAudio, false);
  return state;
}
async function examine(page, id, point, text) {
  await aimInteraction(page, id, point); await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  await page.locator('#examine').waitFor({ state: 'visible' });
  assert.equal((await page.locator('#examine').textContent()).trim(), text);
  const state = await unchangedStory(page, id); examinations.push({ id, text, position: state.position });
  console.log(`PASS DIRECT INTERACTION ${id}`);
}
async function walkStraightIntoRoom(page) {
  await faceYaw(page, 0, .08); let previous = await snapshot(page), reached = false;
  const start = previous.position, samples = [];
  await page.keyboard.down('KeyW');
  try {
    for (let attempt = 0; attempt < 80; attempt++) {
      await waitFrames(page, 1); const state = await snapshot(page), frames = state.perf.frames - previous.perf.frames;
      assert.ok(frames > 0); assert.equal(state.phase, 'playing'); assert.equal(state.chapterStage, 'home');
      assert.equal(state.chapterMission, 'talk-parents');
      assert.ok(Math.abs(state.position.x - start.x) < .055, 'W enters the room without a sideways kitchen detour');
      assert.ok(distance(previous.position, state.position) / frames < .13, 'normal walking cannot teleport across the landing');
      assert.ok(Math.abs(state.position.y - EYE_HEIGHT) < .065, 'landing and living room share a continuous ground floor');
      samples.push({ position: state.position, frames: state.perf.frames, phase: state.phase }); previous = state;
      if (state.position.z >= LIVING_ROOM_WORLD.minZ + .53) { reached = true; break; }
    }
  } finally { await page.keyboard.up('KeyW'); await waitFrames(page, 2); }
  assert.ok(reached, 'real W input from the last step must enter the living room');
  assert.ok(insideLivingRoom(previous.position, .15));
  return { start, samples, end: previous.position };
}

try {
  browser = await launchBrowser();
  session = await openScene(browser, 'balanced'); const { page } = session;
  await page.setViewportSize({ width: 1280, height: 720 }); await waitFrames(page, 2);
  const record = async label => {
    const state = await snapshot(page); assert.ok(Math.abs(state.horizonTilt) < .003);
    pictures.push(await capture(page, label));
    views.push({ label, position: state.position, rotation: state.rotation, horizonTilt: state.horizonTilt });
  };
  await wakeInBedroom(page, null);
  console.log('STAGE DIRECT: original bedroom, corridor and physical final tread');
  traversal = await descendToLivingLanding(page, { onLastTread: async state => {
    arrival = { position: state.position, rotation: state.rotation, chapterMission: state.chapterMission };
    await record('sala-chegada-ultimo-degrau');
  } });
  assert.equal(traversal.steps, 18);
  console.log('STAGE DIRECT: W enters the approved living room straight ahead');
  directEntry = await walkStraightIntoRoom(page); await record('sala-entrada-direta');
  await crossLivingToKitchen(page, { recordPosition: state => route.push({ position: state.position, phase: state.phase }) });
  await lookAt(page, { x: 0, y: 1.25, z: 19.4 }); await record('sala-percurso-cozinha');
  kitchen = await unchangedStory(page, 'physical kitchen arrival');
  assert.ok(kitchen.kitchen.active); assert.ok(kitchen.position.z > LIVING_ROOM_WORLD.maxZ + .3);
  await walkTo(page, { x: 0, z: 16.6 }); await walkTo(page, { x: -2.4, z: 16.6 });
  await walkTo(page, { x: -2.3, z: 17.8 });
  await aimInteraction(page, 'parents', PARENT_ANCHORS.mother.interaction); await unchangedStory(page, 'original parent prompt');

  console.log('STAGE DIRECT: return through kitchen passage, unchanged living interactions');
  await walkTo(page, { x: -2.4, z: 16.6 }); await walkTo(page, { x: 2.1, z: 16.5 });
  for (const point of LIVING_ROOM_ROUTE.slice(1).reverse().slice(0, -1)) {
    if (Math.abs(point.z - 14.15) < .001) await walkPrecisely(page, point);
    else await walkTo(page, point, { tolerance: .11 });
  }
  await localGo(page, { x: 4.05, z: 10.05 }); await aimInteraction(page, 'living-tv', OBJECTS.tv); await waitFrames(page, 2);
  const off = await snapshot(page), offScreen = screenStatistics(await pixels(page));
  assert.equal(off.livingRoom.tvOn, false); assert.equal(off.audio.television.playing, false);
  await page.keyboard.press('KeyE'); await waitFrames(page, 4);
  const on = await unchangedStory(page, 'TV on'), onScreen = screenStatistics(await pixels(page));
  assert.equal(on.livingRoom.tvOn, true); assert.equal(on.audio.television.playing, true);
  assert.ok(on.audio.television.effectiveGain > 0 && on.audio.television.rmsBeforeMaster > 0, 'TV DSP follows the moved room');
  assert.ok(onScreen.meanLuminance > offScreen.meanLuminance + 22 && onScreen.meanLuminance > 42 &&
    onScreen.brightFraction > .5 && onScreen.colours >= 5, 'the original programme appears on the moved CRT');
  assert.ok(distance(off.position, on.position) < .00001 && Math.abs(off.position.y - on.position.y) < .00001);
  await record('sala-reposicionada-tv'); await pause(page); const paused = await snapshot(page);
  assert.equal(paused.audio.television.playing, false); assert.equal(paused.audio.television.rmsBeforeMaster, 0);
  await hold(page, 'KeyW', 250); assert.deepEqual((await snapshot(page)).position, paused.position);
  await page.locator('#resume').click(); await waitPhase(page, 'playing'); await waitFrames(page, 3);
  await aimInteraction(page, 'living-tv', OBJECTS.tv); await page.keyboard.press('KeyE'); await waitFrames(page, 3);
  const backOff = await unchangedStory(page, 'TV off'), backOffScreen = screenStatistics(await pixels(page));
  assert.equal(backOff.livingRoom.tvOn, false); assert.equal(backOff.audio.television.playing, false);
  assert.equal(backOff.audio.television.rmsBeforeMaster, 0); assert.ok(backOffScreen.meanLuminance < onScreen.meanLuminance - 22);
  television = { off: off.audio.television, on: on.audio.television, paused: paused.audio.television,
    backOff: backOff.audio.television, screen: { off: offScreen, on: onScreen, backOff: backOffScreen } };
  await localGo(page, { x: 3.65, z: 9.20 });
  await examine(page, 'living-phone', OBJECTS.phone, 'Esse telefone está aqui desde que eu era pequeno.');
  await examine(page, 'living-photo', { ...OBJECTS.photo, y: .8025 }, 'Essa foto foi tirada nas nossas últimas férias.');
  await localGo(page, { x: 6.10, z: 8.85 });
  await examine(page, 'living-exit', OBJECTS.frontDoor, 'Ainda tenho algumas coisas para resolver antes de sair.');

  console.log('STAGE DIRECT: solid furniture, window and locked front door');
  await localGo(page, { x: 4.05, z: 9.60 }); await faceYaw(page, -Math.PI / 2);
  const tableBefore = (await snapshot(page)).position, tableStop = await pushUntilBlocked(page);
  assert.ok(tableBefore.x - tableStop.x > .05);
  assert.ok(tableStop.x >= FURNITURE.coffeeTable.x + FURNITURE.coffeeTable.width / 2 + .215);
  await localGo(page, { x: 6.00, z: 9.50 }); await faceYaw(page, -Math.PI / 2);
  const windowStop = await pushUntilBlocked(page); assert.ok(windowStop.x >= LIVING_ROOM_WORLD.minX + .215);
  await localGo(page, { x: 6.10, z: 8.85 }); await faceYaw(page, 0);
  const doorStop = await pushUntilBlocked(page); assert.ok(doorStop.z <= LIVING_ROOM_WORLD.maxZ - .215);
  physics = { tableBefore, tableStop, windowStop, doorStop };
  await go(page, LIVING_ROOM_ROUTE[2]); await crossLivingToKitchen(page);
  finalState = await unchangedStory(page, 'final kitchen return');
  assert.ok(finalState.kitchen.active); assert.deepEqual(finalState.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-direct-living-results.json', JSON.stringify({ status: 'passed',
    build: finalState.build, pictures, views, canonicalPlacement, traversal, arrival, directEntry, route,
    kitchen: { position: kitchen.position, mission: kitchen.chapterMission }, television, examinations, physics,
    final: { position: finalState.position, mission: finalState.chapterMission },
    renderer: finalState.renderer, webgl: finalState.webgl, meshes: finalState.meshes, vertices: finalState.vertices,
    coverage: ['fresh waking and original door', 'original corridor and eighteen stair treads',
      'forward view from last tread before lateral movement', 'real held W directly enters living room',
      'walk into unchanged kitchen, original parent prompt and return', 'moved TV image, real DSP, pause and off',
      'phone, photo and locked entrance captions', 'table/window/front-door solids', 'no house teleport or loading phase'],
    limits: ['Real browser captures require visual inspection.', 'Canonical checks establish placement data; source/render preservation is audited separately.',
      'Audio is checked by signal graph, without human listening.', 'This placement task makes no new performance claim.'],
  }, null, 2));
  console.log('PASS DIRECT LIVING: last-tread view, straight entry, kitchen route, interactions and solids.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-direct-living-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-direct-living-results.json', JSON.stringify({ status: 'failed', pictures, views,
    canonicalPlacement, traversal, arrival, directEntry, route, television, examinations, physics,
    state: session ? await snapshot(session.page).catch(() => null) : null,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed, error: String(error) }, null, 2));
  throw error;
} finally { await browser?.close(); }
