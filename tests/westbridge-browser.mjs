import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createInterface } from 'node:readline/promises';

const BASE = process.env.INTERCAMBIO_URL || 'http://127.0.0.1:5180';
const output = '/tmp/westbridge-review'; mkdirSync(output, { recursive: true });
const errors = [], consoleErrors = [], failedAssets = [], variants = {};
const reuseOriginal = process.env.WESTBRIDGE_SKIP_ORIGINAL === '1';
if (reuseOriginal) {
  variants.original = JSON.parse(readFileSync(`${output}/original-results.json`, 'utf8'));
  assert.equal(variants.original.variant, 'original'); assert.equal(variants.original.ready, true);
  assert.equal(variants.original.captures.length, 5);
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const snapshot = page => page.evaluate(() => window.__WESTBRIDGE__.diagnostics);
async function frames(page, count) {
  const before = (await snapshot(page)).frames;
  await page.waitForFunction(({ before, count }) => window.__WESTBRIDGE__.diagnostics.frames >= before + count,
    { before, count }, { timeout: 90000 });
}
try {
  for (const variant of reuseOriginal ? ['remaster'] : ['original', 'remaster']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push({ variant, error: error.message }));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ variant, error: message.text(), location: message.location() }); });
    page.on('response', response => { if (response.status() >= 400) failedAssets.push({ variant, status: response.status(), url: response.url() }); });
    console.log('WESTBRIDGE: loading', variant);
    await page.goto(`${BASE}/tools/westbridge-review.html?variant=${variant}&capture=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__WESTBRIDGE__?.diagnostics.ready || window.__WESTBRIDGE__?.diagnostics.error, null, { timeout: 120000 });
    let state = await snapshot(page); assert.equal(state.error, null); assert.equal(state.ready, true);
    assert.ok(state.meshes > 0); assert.ok(state.textures.every(texture => texture.ready));
    const captures = [];
    for (const view of state.views) {
      await page.evaluate(id => window.__WESTBRIDGE__.setView(id), view.id); await frames(page, 6);
      const path = `${output}/${variant}-${view.id}.png`;
      await page.locator('#review').screenshot({ path });
      state = await snapshot(page); captures.push({ view: view.id, path, camera: state.camera, activeMeshes: state.activeMeshes });
      console.log('CAPTURE', path);
    }
    // One same-camera stationary sample, excluding loading and shader warm-up.
    await page.evaluate(() => window.__WESTBRIDGE__.setView('rua')); await frames(page, 12);
    await page.evaluate(() => window.__WESTBRIDGE__.resetMetrics()); await frames(page, 24);
    state = await snapshot(page); variants[variant] = { ...state, captures };
    await page.close();
    if (variant === 'original' && process.env.WESTBRIDGE_PAUSE_AFTER_ORIGINAL === '1') {
      writeFileSync(`${output}/original-results.json`, JSON.stringify(variants.original, null, 2));
      console.log('ORIGINAL COMPLETE: five captures and warmed metrics. Waiting for remaster asset.');
      const input = createInterface({ input: process.stdin, output: process.stdout });
      try { await input.question('Press Enter when the remaster GLB is ready: '); }
      finally { input.close(); }
    }
  }
  const original = variants.original, remaster = variants.remaster;
  for (const key of ['meshes', 'vertices', 'triangles', 'transformNodes', 'bounds', 'reviewLighting'])
    assert.deepEqual(remaster[key], original[key], 'visual remaster preserves ' + key);
  assert.deepEqual(remaster.captures.map(capture => capture.camera), original.captures.map(capture => capture.camera));
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(failedAssets, []);
  writeFileSync(`${output}/results.json`, JSON.stringify({ status: 'passed', variants, errors, consoleErrors, failedAssets,
    reusedOriginal: reuseOriginal ? { file: 'original-results.json', note: 'Original captures and metrics retained unchanged; only the revised remaster was rerendered.' } : null,
    limits: ['Standalone Babylon asset review; no game scene, quests, collisions, camera or global lighting modified.',
      'Five matching original/remaster angles require real visual inspection.',
      'Chromium/Linux SwiftShader software renderer; short warmed same-view comparison, no physical GPU benchmark.'] }, null, 2));
  console.log('PASS WESTBRIDGE: five matching angles and geometry/bounds/texture checks.');
} catch (error) {
  writeFileSync(`${output}/results.json`, JSON.stringify({ status: 'failed', error: String(error), variants, errors, consoleErrors, failedAssets }, null, 2));
  throw error;
} finally { await browser.close(); }
