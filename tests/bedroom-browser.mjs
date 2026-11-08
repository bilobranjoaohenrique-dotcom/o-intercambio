import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import './register-typescript.mjs';
import { DOOR, FURNITURE, OBJECTS, ROOM } from '../src/game/layout.ts';
import { launchBrowser, openScene, assertHealthy, snapshot, capture, walkTo, lookAt,
  faceYaw, aimInteraction, waitFrames, benchmark, pause, hold, waitPhase } from './browser-helpers.mjs';
import { wakeInBedroom, leaveBedroomForKitchen, pushUntilBlocked } from './bedroom-route.mjs';

const profile = process.env.INTERCAMBIO_BEDROOM_PROFILE || 'balanced';
assert.ok(['low', 'balanced', 'high'].includes(profile));
const browser = await launchBrowser();
let session;
const pictures = [], views = [], interactions = [];
let performance, physics;
async function framePixels(page) {
  const encoded = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  return PNG.sync.read(Buffer.from(encoded, 'base64'));
}
try {
  session = await openScene(browser, profile);
  const { page } = session;
  // Match the supplied room reference's 16:9 aspect ratio. The separate
  // full-chapter regression keeps its existing 1280×800 viewport.
  await page.setViewportSize({ width: 1280, height: 720 });
  await waitFrames(page, 2);
  const record = async label => {
    const shot = await capture(page, label), state = await snapshot(page);
    assert.ok(Math.abs(state.horizonTilt) < .003, `${label}: the rendered horizon must remain level`);
    pictures.push(shot);
    views.push({ label, position: state.position, rotation: state.rotation, horizonTilt: state.horizonTilt });
  };
  await wakeInBedroom(page, null);
  assert.equal((await snapshot(page)).chapterMission, 'breakfast');

  // Every image comes from this one room through genuine first-person input.
  // The cupboard remains closed: its optional interaction is out of scope.
  console.log('STAGE six physical bedroom viewpoints');
  await walkTo(page, { x: 1.68, z: 2.25 }, { tolerance: .10 });
  await walkTo(page, { x: 1.85, z: 3.025 }, { tolerance: .04 });
  await lookAt(page, { x: 1.35, y: 3.95, z: -.25 });
  await record('quarto-entrada');
  performance = await benchmark(page, `bedroom-${profile}`);
  console.log('MEASURED BEDROOM', JSON.stringify(performance));

  await walkTo(page, { x: 1.65, z: 1.5 }, { tolerance: .08 });
  await walkTo(page, { x: 1.65, z: .40 }, { tolerance: .06 });
  await lookAt(page, { x: 1.90, y: 3.95, z: 3.24 });
  await record('quarto-inversa');
  await walkTo(page, { x: 1.60, z: 1.50 }, { tolerance: .08 });
  await walkTo(page, { x: 1.75, z: 2.95 }, { tolerance: .06 });
  await lookAt(page, { x: 2.52, y: 3.90, z: .75 });
  await record('quarto-cama');
  await walkTo(page, { x: 1.63, z: 1.25 }, { tolerance: .06 });
  await lookAt(page, { x: .85, y: 3.98, z: -.13 });
  await record('quarto-escrivaninha');
  await walkTo(page, { x: 1.65, z: 2.65 }, { tolerance: .08 });
  await lookAt(page, { x: .36, y: 4.10, z: 1.62 });
  await record('quarto-guarda-roupa');
  await walkTo(page, { x: 1.52, z: 1.70 }, { tolerance: .06 });
  await lookAt(page, { x: 2.48, y: 4.87, z: -.39 });
  await record('quarto-prateleiras');

  console.log('STAGE actual centre-ray examination targets');
  await walkTo(page, { x: 1.55, z: 1.55 }, { tolerance: .06 });
  await aimInteraction(page, 'photo', OBJECTS.photo);
  await page.keyboard.press('KeyE');
  await page.locator('#examine').waitFor({ state: 'visible' });
  assert.match(await page.locator('#examine').textContent(), /casa|pais|família|mãe|pai|falta|saudade/i);
  assert.ok((await snapshot(page)).examined.includes('photo'));
  interactions.push({ id: 'photo', text: await page.locator('#examine').textContent() });

  await walkTo(page, { x: 1.25, z: 2.83 }, { tolerance: .08 });
  await aimInteraction(page, 'calendar', OBJECTS.calendar);
  await page.keyboard.press('KeyE');
  await page.locator('#examine').waitFor({ state: 'visible' });
  assert.match(await page.locator('#examine').textContent(), /13/);
  assert.ok((await snapshot(page)).examined.includes('calendar'));
  interactions.push({ id: 'calendar', text: await page.locator('#examine').textContent() });

  await walkTo(page, { x: 1.85, z: 2.78 }, { tolerance: .06 });
  await aimInteraction(page, 'suitcase', { ...FURNITURE.backpack, y: ROOM.floor + .26 });
  await page.keyboard.press('KeyE');
  await page.locator('#examine').waitFor({ state: 'visible' });
  assert.match(await page.locator('#examine').textContent(), /viagem|mala|mochila|pront/i);
  assert.ok((await snapshot(page)).examined.includes('suitcase'));
  interactions.push({ id: 'suitcase', text: await page.locator('#examine').textContent() });

  await aimInteraction(page, 'switch', OBJECTS.switch);
  await waitFrames(page, 3);
  const lightBefore = (await snapshot(page)).light;
  const darkFrame = await framePixels(page);
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  assert.notEqual((await snapshot(page)).light, lightBefore, 'the real switch changes the room light');
  const litFrame = await framePixels(page);
  assert.equal(litFrame.width, darkFrame.width); assert.equal(litFrame.height, darkFrame.height);
  let lightChangedPixels = 0;
  for (let at = 0; at < litFrame.data.length; at += 4)
    if (Math.abs(litFrame.data[at] - darkFrame.data[at]) + Math.abs(litFrame.data[at + 1] - darkFrame.data[at + 1]) +
      Math.abs(litFrame.data[at + 2] - darkFrame.data[at + 2]) > 24) lightChangedPixels++;
  assert.ok(lightChangedPixels > 50, 'switching the light must visibly change the real rendered scene');
  await record('quarto-luz-alternada');
  await page.keyboard.press('KeyE'); await waitFrames(page, 2);
  assert.equal((await snapshot(page)).light, lightBefore, 'a second activation restores the light');
  interactions.push({ id: 'switch', toggles: 2, changedPixels: lightChangedPixels, totalPixels: litFrame.width * litFrame.height });

  console.log('STAGE real door opening and closing');
  const doorX = DOOR.hingeX + DOOR.width / 2;
  await aimInteraction(page, 'door', { x: doorX, y: 4.4, z: DOOR.z });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.door.angle < -.01 && !window.__INTERCAMBIO__.door.isOpen);
  await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen);
  await aimInteraction(page, 'door', { x: DOOR.hingeX, y: 4.4, z: DOOR.z + DOOR.width / 2 });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => Math.abs(window.__INTERCAMBIO__.door.angle) < .00001);
  interactions.push({ id: 'door', animatedOpenAndClose: true });

  await walkTo(page, { x: 1.60, z: 1.35 }, { tolerance: .06 });
  await faceYaw(page, Math.PI / 2);
  const beforeBed = (await snapshot(page)).position;
  const bedStop = await pushUntilBlocked(page);
  assert.ok(bedStop.x > beforeBed.x + .08, 'the player must actually approach the bed');
  assert.ok(bedStop.x <= FURNITURE.bed.x - FURNITURE.bed.width / 2 - .215,
    'the capsule cannot cross the actual bed footprint');
  physics = { beforeBed, bedStop };

  console.log('STAGE room pause, then actual exit and preserved breakfast objective');
  await pause(page);
  const pausedPosition = (await snapshot(page)).position;
  await hold(page, 'KeyW', 350);
  assert.deepEqual((await snapshot(page)).position, pausedPosition);
  await page.locator('#resume').click(); await waitPhase(page, 'playing');
  await leaveBedroomForKitchen(page);
  assert.equal((await snapshot(page)).chapterMission, 'talk-parents');
  assertHealthy(session);
  const state = await snapshot(page);
  assert.deepEqual(state.errors, []); assert.equal(state.dialogueAudio, false);
  writeFileSync('/tmp/o-intercambio-bedroom-results.json', JSON.stringify({ status: 'passed', profile,
    pictures, views, interactions, physics, performance,
    renderer: state.renderer, webgl: state.webgl, meshes: state.meshes, vertices: state.vertices,
    coverage: ['fresh waking', 'six views in one real room', 'photo memory', 'travel calendar',
      'backpack examination', 'light switch twice', 'animated door open and close', 'bed and closed-door collision',
      'pause', 'physical exit and stairs', 'preserved breakfast mission'],
    limits: ['The six reference images are compared by human inspection, not a numerical claim of identical fidelity.',
      'SwiftShader software-renderer measurement does not establish physical-GPU or Windows performance.'],
  }, null, 2));
  console.log('PASS BEDROOM: real views, five required interactions, collisions and preserved physical chapter exit.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-bedroom-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-bedroom-results.json', JSON.stringify({ status: 'failed', profile,
    pictures, views, interactions, physics, performance,
    state: session ? await snapshot(session.page).catch(() => null) : null,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
