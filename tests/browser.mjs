import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { launchBrowser, openScene, assertHealthy, snapshot, waitPhase, capture, walkTo, aimInteraction } from './browser-helpers.mjs';
import { wakeAndReachKitchen, kitchenViewsAndPhysics, checkKitchenPauseAndCheckpoint,
  talkToParents, approachKitchenSuitcase, pressDialogue } from './kitchen-route.mjs';

const browser = await launchBrowser();
let session = null;
const pictures = [];
let kitchen;
try {
  session = await openScene(browser, 'balanced');
  const { page } = session;
  const record = async (label, options) => pictures.push(await capture(page, label, options));
  await wakeAndReachKitchen(page, record);
  kitchen = await kitchenViewsAndPhysics(page, record, 'balanced');
  await checkKitchenPauseAndCheckpoint(page);
  await talkToParents(page, record);

  // The visual upgrade must preserve the rest of the existing chapter.
  console.log('STAGE suitcase and existing car-to-airport transition');
  await approachKitchenSuitcase(page);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'car');
  const car = await snapshot(page);
  assert.equal(car.phase, 'transition'); assert.equal(car.dialogueAudio, false);
  await waitPhase(page, 'playing');
  await page.locator('#dialogueBox').waitFor({ state: 'visible' });
  assert.equal((await snapshot(page)).chapterStage, 'airport');
  await pressDialogue(page, 2);
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterMission === 'airport-gate' && !window.__INTERCAMBIO__.dialogue);
  console.log('STAGE existing airport, plane and arrival flow');
  await walkTo(page, { x: 30, z: .4 });
  await aimInteraction(page, 'gate', { x: 30, y: 1.1, z: -1.8 });
  await page.keyboard.press('KeyE');
  await waitPhase(page, 'playing');
  assert.equal((await snapshot(page)).chapterStage, 'plane');
  await aimInteraction(page, 'seat', { x: 56.5, y: 1.5, z: -1.55 });
  await page.keyboard.press('KeyE');
  await page.locator('#dialogueBox').waitFor({ state: 'visible' });
  await pressDialogue(page, 3);
  await waitPhase(page, 'playing');
  assert.equal((await snapshot(page)).chapterStage, 'town');
  await aimInteraction(page, 'host', { x: 86, y: 1.82, z: 0 });
  await page.keyboard.press('KeyE');
  await page.locator('#dialogueBox').waitFor({ state: 'visible' });
  assert.match(await page.locator('#dialogueText').textContent(), /Bem-vindo/);
  await page.keyboard.press('Enter');
  await waitPhase(page, 'complete');
  await page.locator('#endScreen').waitFor({ state: 'visible' });
  assert.match(await page.locator('#endScreen').textContent(), /Capítulo 1 concluído/i);
  await record('chapter-ending', { uiOnly: true });
  const state = await snapshot(page);
  assert.equal(state.chapterMission, 'complete');
  assert.equal(state.dialogueAudio, false);
  assert.deepEqual(state.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-browser-results.json', JSON.stringify({
    status: 'passed', pictures, kitchen, renderer: state.renderer, webgl: state.webgl,
    meshes: state.meshes, vertices: state.vertices,
    coverage: ['fresh opening', 'physical door and stairs', 'six kitchen perspectives',
      'table and parent collisions', 'pause', 'real checkpoint reload', 'text-only parent dialogue and choice',
      'suitcase', 'existing car trip', 'airport gate', 'plane', 'host-family ending'],
  }, null, 2));
  console.log('VERIFIED: full existing chapter, physical kitchen, six real views, pause/reload, text-only parent dialogue and actual measured kitchen performance.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-browser-failure.png' }).catch(() => {});
  const state = session ? await snapshot(session.page).catch(() => null) : null;
  writeFileSync('/tmp/o-intercambio-browser-results.json', JSON.stringify({ pictures, kitchen, state,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
