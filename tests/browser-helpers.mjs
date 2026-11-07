import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';

export const BASE = process.env.INTERCAMBIO_URL || 'http://127.0.0.1:5180';
export const MOTHER_LINE = 'Ei, vem tomar café pra não se atrasar!';
export const snapshot = page => page.evaluate(() => structuredClone(window.__INTERCAMBIO__));
export async function launchBrowser() {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
}
export async function openScene(browser, profile = 'balanced', webgl1 = false) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => localStorage.removeItem('o-intercambio.chapter1.checkpoint.v1'));
  page.setDefaultTimeout(45000);
  const errors = [], consoleErrors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  await page.goto(BASE + (webgl1 ? '/?webgl=1' : '/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 90000 });
  await page.locator('#startGame').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#startGame').isEnabled(), true);
  assert.equal((await snapshot(page)).phase, 'ready');
  await page.locator('#startSettings').click();
  await page.locator('#quality').selectOption(profile);
  await page.locator('#resume').click();
  assert.equal((await snapshot(page)).settings.quality, profile);
  return { page, profile: webgl1 ? 'webgl1' : profile, errors, consoleErrors, failed };
}
export function assertHealthy(session) {
  assert.deepEqual(session.errors, [], `${session.profile}: uncaught browser errors`);
  assert.deepEqual(session.consoleErrors, [], `${session.profile}: shader or runtime console errors`);
  assert.deepEqual(session.failed, [], `${session.profile}: failed local assets`);
}
export async function waitFrames(page, count = 2) {
  const before = await page.locator('#game').getAttribute('data-frames');
  await page.waitForFunction(({ before, count }) => Number(document.getElementById('game')?.dataset.frames) >= before + count,
    { before: Number(before), count }, { timeout: 30000 });
}
export async function waitPhase(page, phase, timeout = 90000) {
  await page.waitForFunction(phase => window.__INTERCAMBIO__?.phase === phase, phase, { timeout });
}
export async function waitIntro(page, time) {
  await page.waitForFunction(time => window.__INTERCAMBIO__?.introTime >= time, time, { timeout: 90000 });
}
export async function startScene(page) {
  await page.locator('#startGame').click();
  await waitPhase(page, 'opening');
}
export async function finishOpening(page) {
  await waitPhase(page, 'playing');
  await page.locator('#objective').waitFor({ state: 'visible' });
  assert.match(await page.locator('#objective').textContent(), /Desça para o café/);
  const state = await snapshot(page);
  assert.equal(state.mission, 'active');
  assert.ok(Math.hypot(state.position.x + 1.25, state.position.z + 1.1) < .06,
    'the opening must release the player at the standing position');
  assert.ok(Math.abs(state.position.y - 4.65) < .06);
}
export async function capture(page, label, { black = false, uiOnly = false } = {}) {
  const path = `/tmp/o-intercambio-${label}.png`;
  const png = PNG.sync.read(await page.screenshot({ path }));
  let blackPixels = 0, total = 0;
  for (let y = Math.floor(png.height * .2); y < png.height * .7; y += 3)
    for (let x = Math.floor(png.width * .2); x < png.width * .8; x += 3) {
      const p = (y * png.width + x) * 4;
      total++; if (png.data[p] < 15 && png.data[p + 1] < 15 && png.data[p + 2] < 15) blackPixels++;
    }
  if (black) assert.ok(blackPixels / total > .97, `${label}: the eyes should really be closed in the captured image`);
  let raw = null;
  if (!black && !uiOnly) {
    // preserveDrawingBuffer is set by the game. This records its real internal
    // retro frame in addition to the native-resolution HTML/interface picture.
    const encoded = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
    const bytes = Buffer.from(encoded, 'base64'), frame = PNG.sync.read(bytes);
    const colours = new Set(); let visible = 0, warm = 0, samples = 0;
    for (let y = Math.floor(frame.height * .1); y < frame.height * .9; y += 3)
      for (let x = Math.floor(frame.width * .1); x < frame.width * .9; x += 3) {
        const p = (y * frame.width + x) * 4, r = frame.data[p], g = frame.data[p + 1], b = frame.data[p + 2];
        samples++; colours.add(`${r >> 3},${g >> 3},${b >> 3}`);
        if (r + g + b > 70) visible++;
        if (r > g * 1.025 && r > b * 1.05 && r > 25) warm++;
      }
    raw = { width: frame.width, height: frame.height, colours: colours.size, visible, warm, samples,
      path: `/tmp/o-intercambio-${label}-interno.png` };
    writeFileSync(raw.path, bytes);
    assert.ok(visible / samples > .2 && colours.size > 16,
      `${label}: the actual internal 3D frame must contain visible textured geometry: ${JSON.stringify(raw)}`);
  }
  return { label, path, native: { width: png.width, height: png.height }, blackRatio: blackPixels / total, raw };
}

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
/** Drive the real mouse. Each correction reads the resulting camera pose,
 * allowing both native Pointer Lock and the game's supported drag fallback. */
export async function lookAt(page, target, tolerance = .025) {
  const box = await page.locator('#game').boundingBox();
  let mouse = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(mouse.x, mouse.y); await waitFrames(page, 1);
  let dragging = false;
  try {
    for (let attempt = 0; attempt < 30; attempt++) {
      const state = await snapshot(page);
      assert.equal(state.phase, 'playing', 'look input is only sent during gameplay');
      const dx = target.x - state.position.x, dz = target.z - state.position.z;
      const desiredYaw = Math.atan2(dx, dz);
      const desiredPitch = Math.max(-1.25, Math.min(1.25, Math.atan2(state.position.y - target.y, Math.hypot(dx, dz))));
      const yaw = wrap(desiredYaw - state.rotation.yaw), pitch = desiredPitch - state.rotation.pitch;
      if (Math.abs(yaw) < tolerance && Math.abs(pitch) < tolerance) return;
      const scale = state.input.mouseScale;
      assert.ok(scale > 0 && Number.isFinite(scale));
      if (!state.input.pointerLocked && !dragging) {
        await page.mouse.down(); dragging = true;
      }
      const stepX = Math.max(-190, Math.min(190, yaw / scale));
      const stepY = Math.max(-150, Math.min(150, pitch / scale));
      mouse = { x: mouse.x + stepX, y: mouse.y + stepY };
      await page.mouse.move(mouse.x, mouse.y); await waitFrames(page, 1);
      const next = await snapshot(page);
      if (!next.input.pointerLocked && dragging) {
        // An unlocked drag must stay inside the client area. Re-anchor only
        // after releasing it; moving with the button up does not turn the view.
        await page.mouse.up(); dragging = false;
        mouse = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await page.mouse.move(mouse.x, mouse.y);
      }
    }
    assert.fail(`mouse could not aim at ${JSON.stringify(target)}: ${JSON.stringify(await snapshot(page))}`);
  } finally { if (dragging) await page.mouse.up(); }
}
export async function faceYaw(page, yaw, pitch = 0) {
  const state = await snapshot(page);
  const horizontal = 4;
  await lookAt(page, { x: state.position.x + Math.sin(yaw) * horizontal,
    z: state.position.z + Math.cos(yaw) * horizontal, y: state.position.y - Math.tan(pitch) * horizontal });
}
export async function hold(page, code, milliseconds) {
  await page.keyboard.down(code);
  try {
    await page.waitForTimeout(milliseconds);
    // A short wall-clock pulse can fall entirely between two frames on a
    // software renderer. Keep the physical key down until frames consume it.
    await waitFrames(page, 2);
  } finally { await page.keyboard.up(code); }
  await waitFrames(page, 2);
}
export async function walkTo(page, point, { tolerance = .16, maxAttempts = 45 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const state = await snapshot(page);
    assert.equal(state.phase, 'playing', `cannot walk toward ${JSON.stringify(point)} outside gameplay`);
    const distance = Math.hypot(point.x - state.position.x, point.z - state.position.z);
    if (distance < tolerance) return;
    await lookAt(page, { ...point, y: state.position.y }, .018);
    // Short input pulses keep steering accurate without assuming a machine's
    // frame rate. The next pass checks the actual resulting world position.
    await hold(page, 'KeyW', Math.max(55, Math.min(300, distance / 2.1 * 700)));
  }
  assert.fail(`physical route did not reach ${JSON.stringify(point)}: ${JSON.stringify((await snapshot(page)).position)}`);
}
export async function aimInteraction(page, id, point) {
  await lookAt(page, point);
  await page.waitForFunction(id => window.__INTERCAMBIO__?.interaction === id, id, { timeout: 15000 });
  await page.locator('#interaction').waitFor({ state: 'visible' });
}
export async function pause(page) {
  await page.keyboard.press('Escape');
  if ((await snapshot(page)).phase !== 'paused') await page.keyboard.press('Escape');
  await waitPhase(page, 'paused');
  await page.locator('#pauseMenu').waitFor({ state: 'visible' });
}
export async function setRange(page, selector, value) {
  const input = page.locator(selector), attributes = await input.evaluate(element => ({ min: Number(element.min), step: Number(element.step) || 1 }));
  await input.focus(); await page.keyboard.press('Home');
  const steps = Math.round((value - attributes.min) / attributes.step);
  assert.ok(steps >= 0 && steps <= 60);
  for (let index = 0; index < steps; index++) await page.keyboard.press('ArrowRight');
}
export async function benchmark(page, profile, seconds = 10) {
  await waitFrames(page, 3);
  const before = Number(await page.locator('#game').getAttribute('data-frames')), started = performance.now();
  await page.waitForTimeout(seconds * 1000);
  const measuredSeconds = (performance.now() - started) / 1000;
  const after = Number(await page.locator('#game').getAttribute('data-frames')), state = await snapshot(page);
  const dimensions = await page.locator('#game').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  assert.ok(after > before && state.perf.meanFrameMs > 0 && state.perf.p95FrameMs > 0);
  return { profile, renderer: state.renderer, webgl: state.webgl, environment: 'Chromium/SwiftShader, Linux, stationary camera, 1280×800 viewport',
    internal: dimensions, seconds: measuredSeconds, frames: after - before,
    measuredFps: Math.round((after - before) / measuredSeconds * 10) / 10, reported: state.perf };
}
