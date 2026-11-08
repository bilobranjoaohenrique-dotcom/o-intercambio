import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import './register-typescript.mjs';
import { EYE_HEIGHT, STAIRS } from '../src/game/layout.ts';
import { LIVING_ROOM, LIVING_ROOM_FURNITURE as FURNITURE, LIVING_ROOM_OBJECTS as OBJECTS,
  LIVING_ROOM_PORTAL, LIVING_ROOM_WINDOW } from '../src/game/livingRoomLayout.ts';
import { launchBrowser, openScene, assertHealthy, snapshot, capture, lookAt, faceYaw,
  aimInteraction, waitFrames, benchmark, pause, hold, waitPhase } from './browser-helpers.mjs';
import { wakeInBedroom, pushUntilBlocked } from './bedroom-route.mjs';
import { descendToLivingLanding, walkNavigable } from './living-room-route.mjs';

const profile = process.env.INTERCAMBIO_LIVING_PROFILE || 'balanced';
assert.ok(['low', 'balanced', 'high'].includes(profile));
const navigationBounds = { minX: 1.40, maxX: LIVING_ROOM.maxX, minZ: LIVING_ROOM.minZ, maxZ: 14.80 };
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const browser = await launchBrowser();
let session, traversal, stationaryPerformance, explorationPerformance, television, physics, finalState;
const pictures = [], views = [], examinations = [], decorative = [];
const go = (page, point) => walkNavigable(page, point, navigationBounds);
async function pixels(page) {
  const encoded = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  return PNG.sync.read(Buffer.from(encoded, 'base64'));
}
function changedPixels(a, b, central = false) {
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let changed = 0, samples = 0;
  const minX = central ? Math.floor(a.width * .30) : 0, maxX = central ? Math.ceil(a.width * .70) : a.width;
  const minY = central ? Math.floor(a.height * .25) : 0, maxY = central ? Math.ceil(a.height * .75) : a.height;
  for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
    const at = (y * a.width + x) * 4; samples++;
    if (Math.abs(a.data[at] - b.data[at]) + Math.abs(a.data[at + 1] - b.data[at + 1]) +
      Math.abs(a.data[at + 2] - b.data[at + 2]) > 24) changed++;
  }
  return { changed, samples };
}
/** A small patch inside the aimed CRT face proves that the programme itself
 * appears. Whole-frame deltas alone could be caused by the TV's nearby light
 * even when a backwards/culled screen remained black. */
function screenStatistics(frame) {
  const colours = new Set(); let luminance = 0, bright = 0, samples = 0;
  for (let y = Math.floor(frame.height * .45); y < frame.height * .55; y++)
    for (let x = Math.floor(frame.width * .45); x < frame.width * .55; x++) {
      const at = (y * frame.width + x) * 4, r = frame.data[at], g = frame.data[at + 1], b = frame.data[at + 2];
      const value = .2126 * r + .7152 * g + .0722 * b;
      samples++; luminance += value; if (value > 40) bright++;
      colours.add(`${r >> 4},${g >> 4},${b >> 4}`);
    }
  return { meanLuminance: luminance / samples, brightFraction: bright / samples, colours: colours.size, samples,
    region: 'centre ±5% of internal canvas width/height, inside the aimed CRT face' };
}
async function unchangedStory(page, before, label) {
  const after = await snapshot(page);
  assert.equal(after.chapterMission, before.chapterMission, `${label}: no new mission`);
  assert.equal(after.chapterStage, 'home', `${label}: no airport/travel transition`);
  assert.equal(after.dialogue, false, `${label}: no added dialogue`);
  assert.equal(after.dialogueAudio, false, `${label}: no voices or TTS`);
  return after;
}
async function examine(page, id, point, expected) {
  console.log(`INTERACTION ${id}: aim and press E`);
  await aimInteraction(page, id, point);
  const before = await snapshot(page);
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  await page.locator('#examine').waitFor({ state: 'visible' });
  assert.equal((await page.locator('#examine').textContent()).trim(), expected);
  const after = await unchangedStory(page, before, id);
  examinations.push({ id, text: expected, position: after.position, mission: after.chapterMission });
  console.log(`PASS INTERACTION ${id}`);
}
async function decorativeAt(page, name, point) {
  await lookAt(page, point); await waitFrames(page, 2);
  const before = await snapshot(page);
  assert.equal(before.interaction, null, `${name}: no false interaction prompt`);
  assert.equal(await page.locator('#interaction').isVisible(), false);
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  const after = await unchangedStory(page, before, name);
  assert.equal(after.livingRoom.tvOn, before.livingRoom.tvOn);
  decorative.push({ name, point, interaction: after.interaction });
}
/** A separate measured interval with alternating real W/S input. Sampling
 * overhead is included. Distance is summed from actual rendered positions,
 * rather than calculated from the configured walking speed. */
async function measureExploration(page) {
  await go(page, { x: 4.05, z: 10.10 }); await faceYaw(page, 0);
  const before = await snapshot(page), started = globalThis.performance.now();
  let previous = before, after = before, moved = 0, index = 0;
  const samples = [];
  while (globalThis.performance.now() - started < 10000) {
    const key = index++ % 2 ? 'KeyS' : 'KeyW';
    await page.keyboard.down(key);
    try { await waitFrames(page, 2); } finally { await page.keyboard.up(key); }
    after = await snapshot(page); moved += distance(previous.position, after.position);
    assert.equal(after.phase, 'playing'); assert.equal(after.chapterMission, 'talk-parents');
    assert.ok(Math.abs(after.position.y - EYE_HEIGHT) < .06);
    samples.push({ position: after.position, frames: after.perf.frames, key }); previous = after;
  }
  const seconds = (globalThis.performance.now() - started) / 1000, frames = after.perf.frames - before.perf.frames;
  await waitFrames(page, 2);
  assert.ok(moved > .75 && frames > 10, 'the exploration interval must include actual physical movement and rendered frames');
  return { profile: `living-${profile}`, environment: 'Chromium/SwiftShader, Linux, real alternating W/S input with frame/position sampling',
    viewport: page.viewportSize(), internal: await page.locator('#game').evaluate(c => ({ width: c.width, height: c.height })),
    seconds, frames, measuredFps: Math.round(frames / seconds * 10) / 10,
    sampledDistanceMetres: moved, samples };
}

try {
  session = await openScene(browser, profile);
  const { page } = session;
  await page.setViewportSize({ width: 1280, height: 720 }); await waitFrames(page, 2);
  const record = async label => {
    const shot = await capture(page, label), state = await snapshot(page);
    assert.ok(Math.abs(state.horizonTilt) < .003, `${label}: level real camera`);
    pictures.push(shot); views.push({ label, position: state.position, rotation: state.rotation, horizonTilt: state.horizonTilt });
  };
  const view = async (label, position, target) => {
    console.log(`VIEW ${label}: physical route to ${JSON.stringify(position)}`);
    await go(page, position); await lookAt(page, target); await record(label);
    console.log(`CAPTURE ${label}`);
  };
  await wakeInBedroom(page, null);
  console.log('STAGE living room: unchanged waking, corridor and real 18-step descent');
  traversal = await descendToLivingLanding(page);
  assert.equal(traversal.steps, 18);
  assert.equal((await snapshot(page)).livingRoom.tvOn, false);

  console.log('STAGE living room: ten real reference views in the same physical room');
  await view('sala-base-escada', { x: (STAIRS.minX + STAIRS.maxX) / 2, z: STAIRS.endZ + .14 },
    { x: 4.50, y: 1.10, z: 10.25 });
  await view('sala-entrada-cozinha', { x: (LIVING_ROOM_PORTAL.minX + LIVING_ROOM_PORTAL.maxX) / 2, z: 12.55 },
    { x: 4.80, y: 1.15, z: 9.20 });
  await view('sala-visao-geral', { x: 4.30, z: 11.40 }, { x: 4.70, y: 1.15, z: 8.75 });
  stationaryPerformance = await benchmark(page, `living-${profile}`);
  console.log('MEASURED LIVING ROOM', JSON.stringify(stationaryPerformance));
  await view('sala-sofa-poltrona', { x: 4.80, z: 8.99 }, { x: 4.65, y: .85, z: 11.10 });
  await view('sala-mesa-tapete', { x: 5.95, z: 9.60 }, { x: 4.75, y: .38, z: 9.90 });
  await view('sala-estante-tv', { x: 4.05, z: 10.05 }, { x: FURNITURE.tvCabinet.x, y: 1.05, z: FURNITURE.tvCabinet.z });

  console.log('STAGE living room: TV centre-ray/E toggle, pixel proof and real audio analyser');
  await aimInteraction(page, 'living-tv', OBJECTS.tv); await waitFrames(page, 2);
  assert.match(await page.locator('#interactionText').textContent(), /Ligar TV/);
  const off = await snapshot(page), offPixels = await pixels(page);
  assert.equal(off.livingRoom.tvOn, false);
  assert.equal(off.audio.television.requested, false); assert.equal(off.audio.television.playing, false);
  await page.keyboard.press('KeyE'); await waitFrames(page, 4);
  const on = await unchangedStory(page, off, 'TV on'), onPixels = await pixels(page);
  assert.equal(on.livingRoom.tvOn, true);
  assert.match(await page.locator('#interactionText').textContent(), /Desligar TV/);
  assert.equal(on.audio.television.requested, true); assert.equal(on.audio.television.supported, true);
  assert.equal(on.audio.television.playing, true); assert.equal(on.audio.state, 'running');
  assert.ok(on.audio.television.gain > 0 && on.audio.television.effectiveGain > 0);
  assert.ok(on.audio.television.rmsBeforeMaster > 0, 'actual TV-only AnalyserNode measures a nonzero DSP signal');
  const fullDifference = changedPixels(offPixels, onPixels), centralDifference = changedPixels(offPixels, onPixels, true);
  const screenProof = { off: screenStatistics(offPixels), on: screenStatistics(onPixels) };
  television = { off: off.audio.television, on: on.audio.television, fullDifference, centralDifference, screenProof };
  assert.ok(fullDifference.changed > 80 && centralDifference.changed > 40,
    'the TV changes actual internal 3D pixels at the same unchanged camera pose');
  assert.ok(screenProof.on.meanLuminance > 42 && screenProof.on.meanLuminance > screenProof.off.meanLuminance + 22 &&
    screenProof.on.brightFraction > .5 && screenProof.on.colours >= 5,
  `the original programme must appear as a bright coloured image on the CRT face, not only light the room: ${JSON.stringify(screenProof)}`);
  assert.ok(distance(on.position, off.position) < .00001 && Math.abs(on.position.y - off.position.y) < .00001,
    'TV pixel comparison keeps the same physical camera, allowing only floating-point eye-height settling');
  for (const axis of ['yaw', 'pitch', 'roll']) assert.ok(Math.abs(on.rotation[axis] - off.rotation[axis]) < .000001);
  await record('sala-tv-ligada');
  await pause(page);
  const paused = await snapshot(page);
  assert.equal(paused.audio.television.requested, true); assert.equal(paused.audio.television.playing, false);
  assert.equal(paused.audio.television.effectiveGain, 0); assert.equal(paused.audio.television.rmsBeforeMaster, 0);
  await hold(page, 'KeyW', 300); assert.deepEqual((await snapshot(page)).position, paused.position);
  await page.locator('#resume').click(); await waitPhase(page, 'playing'); await waitFrames(page, 3);
  assert.equal((await snapshot(page)).audio.television.playing, true);
  await aimInteraction(page, 'living-tv', OBJECTS.tv);
  await page.keyboard.press('KeyE'); await waitFrames(page, 3);
  const backOff = await unchangedStory(page, off, 'TV off'), backOffPixels = await pixels(page);
  assert.equal(backOff.livingRoom.tvOn, false);
  assert.deepEqual({ requested: backOff.audio.television.requested, playing: backOff.audio.television.playing,
    gain: backOff.audio.television.gain, rms: backOff.audio.television.rmsBeforeMaster },
  { requested: false, playing: false, gain: 0, rms: 0 });
  const offDifference = changedPixels(onPixels, backOffPixels);
  assert.ok(offDifference.changed > 80, 'turning the TV off visibly restores the dark 3D screen');
  screenProof.backOff = screenStatistics(backOffPixels);
  assert.ok(screenProof.backOff.meanLuminance < screenProof.on.meanLuminance - 22 &&
    screenProof.backOff.meanLuminance < screenProof.off.meanLuminance + 8,
  `turning off restores the dark CRT face: ${JSON.stringify(screenProof)}`);
  television = { toggles: 2, fullDifference, centralDifference, offDifference, screenProof,
    off: off.audio.television, on: on.audio.television, paused: paused.audio.television, backOff: backOff.audio.television,
    evidence: 'Actual TV-only AnalyserNode signal before master gain; no human listening assessment.' };

  await view('sala-janela-manha', { x: 5.95, z: 8.95 }, { x: LIVING_ROOM_WINDOW.x, y: 1.40, z: LIVING_ROOM_WINDOW.z });
  await view('sala-porta-principal', { x: 6.20, z: 9.95 }, { ...OBJECTS.frontDoor, y: 1.05 });
  await view('sala-conexao-escada', { x: 3.75, z: 11.40 }, { x: STAIRS.maxX, y: 1.15, z: 10.65 });

  console.log('STAGE living room: telephone, original family memory and locked main entrance');
  await go(page, { x: 3.65, z: 9.20 });
  await examine(page, 'living-phone', OBJECTS.phone, 'Esse telefone está aqui desde que eu era pequeno.');
  await examine(page, 'living-photo', OBJECTS.photo, 'Essa foto foi tirada nas nossas últimas férias.');
  await go(page, { x: 6.10, z: 8.85 });
  await examine(page, 'living-exit', OBJECTS.frontDoor, 'Ainda tenho algumas coisas para resolver antes de sair.');

  console.log('STAGE living room: real furniture, glazing and locked-door collisions');
  await go(page, { x: 5.95, z: FURNITURE.coffeeTable.z }); await faceYaw(page, -Math.PI / 2);
  const tableBefore = (await snapshot(page)).position, tableStop = await pushUntilBlocked(page);
  assert.ok(tableBefore.x - tableStop.x > .08);
  assert.ok(tableStop.x >= FURNITURE.coffeeTable.x + FURNITURE.coffeeTable.width / 2 + .215 && tableStop.x < 5.75,
    'the circular player body stops before the coffee-table solid');
  await go(page, { x: 6.00, z: 9.50 }); await faceYaw(page, Math.PI / 2);
  const wallBefore = (await snapshot(page)).position, wallStop = await pushUntilBlocked(page);
  assert.ok(wallStop.x - wallBefore.x > .08);
  assert.ok(wallStop.x <= LIVING_ROOM.maxX - .215 && wallStop.x > LIVING_ROOM.maxX - .4,
    'the window remains solid and the body cannot leave the house');
  await go(page, { x: 6.10, z: 8.85 }); await faceYaw(page, Math.PI);
  const doorBefore = (await snapshot(page)).position, doorStop = await pushUntilBlocked(page);
  assert.ok(doorBefore.z - doorStop.z > .08);
  assert.ok(doorStop.z >= LIVING_ROOM.minZ + .215 && doorStop.z < LIVING_ROOM.minZ + .4,
    'the locked entrance stops the real player before the exterior');
  physics = { tableBefore, tableStop, wallBefore, wallStop, doorBefore, doorStop };

  console.log('STAGE living room: decorations do not invent interactive promises');
  await go(page, { x: 4.05, z: 10.05 });
  await decorativeAt(page, 'coffee-table magazines', { x: 4.95, y: .49, z: 9.65 });
  await decorativeAt(page, 'cabinet books', { x: 3.99, y: 1.48, z: 8.57 });
  await go(page, { x: 5.95, z: 8.95 });
  await decorativeAt(page, 'lace window', { x: LIVING_ROOM_WINDOW.x, y: 1.55, z: LIVING_ROOM_WINDOW.z });
  explorationPerformance = await measureExploration(page);
  console.log('MEASURED LIVING EXPLORATION', JSON.stringify({ ...explorationPerformance, samples: undefined }));

  console.log('STAGE living room: preserved kitchen access and unchanged parent objective');
  await go(page, { x: 3.70, z: 12.40 });
  await go(page, { x: (STAIRS.minX + STAIRS.maxX) / 2, z: 14.30 });
  finalState = await snapshot(page);
  assert.equal(finalState.chapterMission, 'talk-parents'); assert.equal(finalState.chapterStage, 'home');
  assert.equal(finalState.kitchen.active, true); assert.equal(finalState.dialogue, false);
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Converse com seus pais');
  assert.ok(Math.abs(finalState.position.y - EYE_HEIGHT) < .06);
  assert.equal(finalState.livingRoom.tvOn, false); assert.deepEqual(finalState.errors, []);
  assertHealthy(session);
  assert.equal(pictures.length, 10);
  writeFileSync('/tmp/o-intercambio-living-room-results.json', JSON.stringify({ status: 'passed', profile, build: finalState.build,
    pictures, views, traversal, performance: stationaryPerformance, explorationPerformance, television, examinations, decorative, physics,
    final: { position: finalState.position, mission: finalState.chapterMission, stage: finalState.chapterStage, kitchen: finalState.kitchen },
    renderer: finalState.renderer, webgl: finalState.webgl, meshes: finalState.meshes, vertices: finalState.vertices,
    coverage: ['fresh waking', 'physical bedroom door, upper hallway and preserved 18-step flight',
      'ten real living-room views', 'centre-ray/E TV on/off with internal-canvas pixel proof',
      'nonzero actual TV DSP signal and stopped source when off', 'TV pause/resume and inactive movement',
      'telephone and original family photograph captions', 'story-locked entrance without new travel',
      'coffee table, window perimeter and closed entrance collisions', 'decorations without inert prompts',
      'real sampled exploration performance', 'physical kitchen connection and unchanged parent mission'],
    limits: ['The reference images require visual inspection; this suite does not assert exact visual fidelity.',
      'Audio evidence is a TV-only AnalyserNode measurement before master gain, not a human listening test.',
      'Software-rendered Chromium/SwiftShader/Linux performance does not establish physical GPU or Windows performance.',
      'Exploration includes real input and diagnostic sampling overhead; sampled movement is a lower bound on travel distance.',
      'Mesh/vertex counts describe the complete loaded scene, not the living room alone.'],
  }, null, 2));
  console.log('PASS LIVING ROOM: ten real views, physical access, TV/audio, objects, collisions and preserved mission.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-living-room-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-living-room-results.json', JSON.stringify({ status: 'failed', profile,
    pictures, views, traversal, performance: stationaryPerformance, explorationPerformance, television, examinations, decorative, physics,
    state: session ? await snapshot(session.page).catch(() => null) : null,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
