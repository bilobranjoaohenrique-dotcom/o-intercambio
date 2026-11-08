import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames,
  waitPhase, walkTo, lookAt } from './browser-helpers.mjs';

const { LIVING_ROOM_WORLD: room, LIVING_ROOM_KITCHEN_PORTAL: portal,
  KITCHEN_FRONT_PASSAGE: passage } = await import('../src/game/livingRoomPlacement.ts');
const { isWalkable } = await import('../src/game/collision.ts');
const pictures = [], route = [];
let browser, session;

async function move(page, point) {
  await walkTo(page, point, { tolerance: .11 });
  const state = await snapshot(page);
  assert.equal(state.phase, 'playing'); assert.equal(state.chapterStage, 'home');
  assert.equal(state.chapterMission, 'talk-parents'); assert.equal(state.dialogue, false);
  assert.ok(isWalkable(state.position), 'the complete player body remains on usable floor');
  route.push({ position: state.position, phase: state.phase });
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => localStorage.setItem('o-intercambio.chapter1.checkpoint.v1',
    JSON.stringify({ mission: 'talk-parents', choice: null, completed: ['breakfast'] })));
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'house-integration-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  assert.deepEqual((await snapshot(page)).livingRoom.bounds, room, 'the preview must contain the current room geometry');

  assert.ok((room.maxX - room.minX) * (room.maxZ - room.minZ) > 4.2 * 3.8,
    'the living room gains a modest amount of physical floor area');
  assert.ok(portal.maxZ - portal.minZ > .9, 'the kitchen doorway is wider than its former 90cm opening');

  console.log('HOUSE: actual walk from kitchen through widened connection and into living room');
  // Every segment uses the existing mouse/W controls, including the new strip
  // of floor along the west wall. No diagnostic setter moves the camera.
  for (const point of [{ x: 3.5, z: 16.25 }, { x: 3.5, z: 14.2 },
    { x: 1.6, z: 14.2 }, { x: 1.6, z: 13.6 }, { x: -1.65, z: 13.6 }]) await move(page, point);
  await lookAt(page, { x: 1.1, y: 1.3, z: 14.3 });
  await waitFrames(page, 2);
  pictures.push(await capture(page, 'casa-sala-passagem-ampla'));

  console.log('HOUSE: return to kitchen, tiled connection and unchanged breakfast scene');
  for (const point of [{ x: -1.65, z: 14.35 }, { x: -1.65, z: 13.6 },
    { x: 1.6, z: 13.6 }, { x: 1.6, z: 14.2 }, { x: 3.5, z: 14.2 },
    { x: 3.9, z: 15.15 }]) await move(page, point);
  await lookAt(page, { x: 2.95, y: 2.05, z: 13.7 });
  await waitFrames(page, 2);
  pictures.push(await capture(page, 'casa-cozinha-azulejos'));
  await move(page, { x: 3.5, z: 16.25 }); await move(page, { x: 0, z: 16.3 });
  await lookAt(page, { x: 0, y: 1.35, z: 18.55 }); await waitFrames(page, 2);
  pictures.push(await capture(page, 'casa-cozinha-preservada'));
  const final = await snapshot(page);
  assert.deepEqual(final.errors, []); assertHealthy(session);
  assert.equal(final.breakfast.state, 'standing');
  writeFileSync('/tmp/o-intercambio-house-integration-results.json', JSON.stringify({
    status: 'passed', build: final.build, pictures, route,
    geometry: { livingRoom: room, portal, passage },
    final: { position: final.position, mission: final.chapterMission, dialogue: final.dialogue },
    coverage: ['actual walking inside the living room', 'widened room-to-kitchen passage in both directions',
      'two actual rendered views for visual inspection', 'unchanged mission and no dialogue interaction'],
    limits: ['Tile coverage and visual continuity require inspection of the real captures.',
      'Only this short house integration route was exercised; no chapter or performance benchmark.'],
  }, null, 2));
  console.log('PASS HOUSE INTEGRATION: living-room circulation, wider passage and actual tiled-kitchen capture.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-house-integration-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-house-integration-results.json', JSON.stringify({ status: 'failed',
    error: String(error), pictures, route, state: session ? await snapshot(session.page).catch(() => null) : null,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  throw error;
} finally { await browser?.close(); }
