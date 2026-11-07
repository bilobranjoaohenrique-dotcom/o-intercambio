import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { launchBrowser, openScene, assertHealthy, snapshot, capture } from './browser-helpers.mjs';
import { wakeAndReachKitchen, kitchenViewsAndPhysics, checkKitchenPauseAndCheckpoint, talkToParents } from './kitchen-route.mjs';

const profiles = (process.env.INTERCAMBIO_KITCHEN_PROFILES || 'balanced,low').split(',');
assert.ok(profiles.length && profiles.every(profile => ['balanced', 'low', 'high'].includes(profile)));
const browser = await launchBrowser();
const results = [], pictures = [];
let session;
try {
  for (const profile of profiles) {
    session = await openScene(browser, profile);
    const { page } = session;
    const record = async (label, options) => pictures.push(await capture(page, label, options));
    await wakeAndReachKitchen(page, null);
    const detailed = profile === 'balanced';
    const kitchen = await kitchenViewsAndPhysics(page, record, profile, detailed);
    if (detailed) {
      await checkKitchenPauseAndCheckpoint(page);
      await talkToParents(page, record);
      assert.equal((await snapshot(page)).chapterMission, 'pack-suitcase');
    }
    const state = await snapshot(page);
    assert.deepEqual(state.errors, []); assert.equal(state.dialogueAudio, false); assertHealthy(session);
    results.push({ profile, status: 'passed', kitchen, renderer: state.renderer, webgl: state.webgl,
      meshes: state.meshes, vertices: state.vertices, chapterMission: state.chapterMission,
      coverage: detailed ? 'kitchen, actors, physics, dialogue/choice, pause and checkpoint reload' : 'fresh actual approach, image and measured performance' });
    console.log('PASS KITCHEN', profile);
    await page.close(); session = null;
  }
  writeFileSync('/tmp/o-intercambio-kitchen-results.json', JSON.stringify({ status: 'passed', results, pictures }, null, 2));
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-kitchen-failure.png' }).catch(() => {});
  const state = session ? await snapshot(session.page).catch(() => null) : null;
  writeFileSync('/tmp/o-intercambio-kitchen-results.json', JSON.stringify({ results, pictures, state,
    consoleErrors: session?.consoleErrors, failedAssets: session?.failed, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
