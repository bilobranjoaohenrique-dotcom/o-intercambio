import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { launchBrowser, openScene, assertHealthy, snapshot, waitFrames, waitPhase, waitIntro,
  startScene, finishOpening, capture, lookAt, faceYaw, hold, walkTo, aimInteraction, pause, setRange,
  benchmark, MOTHER_LINE } from './browser-helpers.mjs';

const requested = (process.env.INTERCAMBIO_PROFILES || 'balanced,low,high,webgl1').split(',');
const profiles = ['balanced', 'low', 'high', 'webgl1'].filter(profile => requested.includes(profile));
assert.ok(profiles.length, 'select a supported graphics profile');
const pictures = [], benchmarkResults = [], results = [];
const browser = await launchBrowser(); let current;
const record = async (page, label, options) => pictures.push(await capture(page, label, options));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

async function opening(page, prefix, detailed) {
  console.log('STAGE', prefix, 'opening');
  await startScene(page);
  if (detailed) {
    await waitIntro(page, .15);
    const before = await snapshot(page);
    await page.keyboard.down('KeyW'); await page.keyboard.down('Shift');
    await page.waitForTimeout(550);
    await page.keyboard.up('KeyW'); await page.keyboard.up('Shift');
    const after = await snapshot(page);
    assert.equal(after.phase, 'opening');
    assert.ok(distance(before.position, after.position) < .001, 'WASD/sprint cannot move the sleeping protagonist');
    await record(page, `${prefix}-01-preto`, { black: true });
    await waitIntro(page, 2.65);
    await record(page, `${prefix}-02-primeira-abertura`);
    await waitIntro(page, 3.95);
    await record(page, `${prefix}-03-piscada`, { black: true });
    await waitIntro(page, 4.9);
    await page.locator('#subtitle').waitFor({ state: 'visible' });
    assert.equal((await page.locator('#subtitle').textContent()).replace(/\s+/g, ' ').trim(), `MÃE: ${MOTHER_LINE}`);
    assert.equal((await snapshot(page)).voice.provisional, true);
    await page.waitForFunction(() => window.__INTERCAMBIO__?.voice?.played === true, null, { timeout: 15000 });
    await record(page, `${prefix}-04-mae-e-teto`);
    await waitIntro(page, 9.7);
    await record(page, `${prefix}-05-sentando`);
  }
  await finishOpening(page);
  await record(page, `${prefix}-06-quarto-em-pe`);
  const state = await snapshot(page);
  assert.ok(state.introTime === 13.5 && state.position.y > 4.5 && state.position.y < 4.8);
  assert.equal(state.door.isOpen, false); assert.equal(state.mission, 'active');
  assert.equal(await page.locator('#objective').isVisible(), true);
}

async function examineRoom(page) {
  console.log('STAGE', 'balanced', 'examinations');
  // Each route is through the real controller. Only observation uses the
  // read-only diagnostic; the test cannot teleport or alter a mission flag.
  await walkTo(page, { x: .44, z: -.1 });
  await aimInteraction(page, 'suitcase', { x: .44, y: 3.2, z: 1.4 });
  await page.keyboard.press('KeyE');
  await page.locator('#examine').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#examine').textContent(), 'Quase tudo pronto para a viagem.');
  await record(page, 'balanced-mala');
  await walkTo(page, { x: -.6, z: -1.45 });
  await aimInteraction(page, 'calendar', { x: -.35, y: 4.48, z: -3.045 });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.examined.includes('calendar'));
  await record(page, 'balanced-calendario');
  await walkTo(page, { x: 1.9, z: .4 });
  await aimInteraction(page, 'photo', { x: 3.14, y: 4.38, z: 1.1 });
  await page.keyboard.press('KeyE');
  assert.equal(await page.locator('#examine').textContent(), 'Vou sentir falta de casa.');
  await record(page, 'balanced-fotografia');
  await walkTo(page, { x: 2.4, z: 1.7 });
  await aimInteraction(page, 'switch', { x: 2.86, y: 4.23, z: 3.245 });
  const light = (await snapshot(page)).light;
  await page.keyboard.press('KeyE');
  await page.waitForFunction(before => window.__INTERCAMBIO__.light !== before, light);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(before => window.__INTERCAMBIO__.light === before, light);
  assert.deepEqual((await snapshot(page)).examined.sort(), ['calendar', 'photo', 'suitcase']);
}

async function useDoor(page, prefix, detailed) {
  console.log('STAGE', prefix, 'door');
  await walkTo(page, { x: 1.975, z: .2 });
  await walkTo(page, { x: 1.975, z: 2.8 });
  await faceYaw(page, 0);
  await hold(page, 'KeyW', 900);
  const blocked = await snapshot(page);
  assert.ok(blocked.position.z <= 3.075 && blocked.position.z > 2.8,
    'the closed physical door must stop the player before its plane');
  await aimInteraction(page, 'door', { x: 1.975, y: 4.65, z: 3.3 });
  assert.match(await page.locator('#interactionText').textContent(), /Abrir porta/i);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => Math.abs(window.__INTERCAMBIO__.door.angle) > .15 && Math.abs(window.__INTERCAMBIO__.door.angle) < 1.45);
  if (detailed) await record(page, `${prefix}-porta-girando`);
  await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen === true);
  if (detailed) {
    // Back off before closing so the protective sweep can complete safely.
    await faceYaw(page, 0); await hold(page, 'KeyS', 320);
    await aimInteraction(page, 'door', { x: 1.45, y: 4.65, z: 3.825 });
    assert.match(await page.locator('#interactionText').textContent(), /Fechar porta/i);
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => Math.abs(window.__INTERCAMBIO__.door.angle) < .025);
    await faceYaw(page, 0); await hold(page, 'KeyW', 700);
    assert.ok((await snapshot(page)).position.z <= 3.075, 'closing restores the physical obstruction');
    await aimInteraction(page, 'door', { x: 1.975, y: 4.65, z: 3.3 });
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen === true);
  }
  await faceYaw(page, 0); await record(page, `${prefix}-porta-aberta`);
  await walkTo(page, { x: 1.975, z: 4.6 });
  const hallway = await snapshot(page);
  assert.ok(hallway.position.z > 4.3 && Math.abs(hallway.position.y - 4.65) < .08);
  assert.equal(hallway.mission, 'active');
  await record(page, `${prefix}-corredor`);
}

async function settingsAndPause(page) {
  console.log('STAGE', 'balanced', 'settings');
  await pause(page);
  const before = await snapshot(page);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW');
  const frozen = await snapshot(page);
  assert.deepEqual(frozen.position, before.position); assert.equal(frozen.introTime, before.introTime);
  await page.locator('#openSettings').click();
  await setRange(page, '#sensitivity', 1.45);
  await setRange(page, '#volume', .4);
  await page.locator('#headBob').uncheck();
  await page.locator('#grain').uncheck();
  await page.locator('#subtitles').check();
  await page.locator('#performance').check();
  const expected = (await snapshot(page)).settings;
  assert.equal(expected.sensitivity, 1.45); assert.equal(expected.volume, .4);
  assert.equal(expected.headBob, false); assert.equal(expected.performance, true);
  await record(page, 'balanced-configuracoes', { uiOnly: true });
  await page.locator('#resume').click(); await waitPhase(page, 'playing');
  assert.equal((await snapshot(page)).input.mouseScale, .0024 * 1.45);
  return expected;
}

async function descend(page, prefix) {
  console.log('STAGE', prefix, 'stairs');
  await walkTo(page, { x: 1.975, z: 7.8 });
  const middle = await snapshot(page);
  assert.ok(middle.position.y < 4.4 && middle.position.y > 2.5, 'eye height must follow the actual stair descent');
  assert.equal(middle.phase, 'playing'); assert.equal(middle.mission, 'active');
  await record(page, `${prefix}-escada-meio`);
  await walkTo(page, { x: 1.975, z: 10.7 });
  const penultimate = await snapshot(page);
  assert.equal(penultimate.phase, 'playing', 'the hallway and upper treads cannot complete the objective');
  assert.equal(penultimate.mission, 'active');
  assert.ok(penultimate.position.y < 2.4 && penultimate.position.z < 11.05);
  await record(page, `${prefix}-antes-ultimo-degrau`);
  await faceYaw(page, 0);
  await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(() => ['ending', 'complete'].includes(window.__INTERCAMBIO__.phase), null, { timeout: 30000 });
  } finally { await page.keyboard.up('KeyW'); }
  const complete = await snapshot(page);
  assert.ok(complete.position.z >= 11.05 && complete.position.x >= 1.1 && complete.position.x <= 2.9);
  assert.ok(Math.abs(complete.position.y - 1.65) < .13, 'the final tread reaches the lower-floor eye height');
  assert.equal(complete.mission, 'complete');
  await waitPhase(page, 'complete'); await page.locator('#endScreen').waitFor({ state: 'visible' });
  assert.match(await page.locator('#endScreen').textContent(), /Fim do Protótipo 01 — O Despertar/);
  await record(page, `${prefix}-fim`, { uiOnly: true });
}

try {
  for (const profile of profiles) {
    current = await openScene(browser, profile === 'webgl1' ? 'low' : profile, profile === 'webgl1');
    const { page } = current, detailed = profile === 'balanced';
    await opening(page, profile, detailed);
    if (profile === 'webgl1') assert.equal((await snapshot(page)).webgl, 1);
    console.log('STAGE', profile, 'benchmark-standing');
    benchmarkResults.push(await benchmark(page, profile));
    console.log('MEASURED', profile, JSON.stringify(benchmarkResults.at(-1)));
    if (detailed) {
      await faceYaw(page, 0); const before = await snapshot(page);
      await hold(page, 'KeyA', 800); const bed = await snapshot(page);
      assert.ok(bed.position.x >= -1.395 && Math.abs(bed.position.z - before.position.z) < .05,
        'the bed collision blocks lateral walking into the mattress');
      await walkTo(page, { x: -1.25, z: .2 });
      await examineRoom(page);
      console.log('STAGE', 'balanced', 'room-perspectives');
      await walkTo(page, { x: 2.1, z: 2 });
      await lookAt(page, { x: -1.6, y: 4.2, z: -1.3 });
      await record(page, 'balanced-quarto-completo');
      // Go below the suitcase's front edge before crossing the room. The
      // camera viewpoints are reached through walking and mouse input only.
      await walkTo(page, { x: 2.1, z: .2 });
      await walkTo(page, { x: 0, z: .2 });
      await walkTo(page, { x: 0, z: .5 });
      await lookAt(page, { x: .7, y: 3.96, z: -2.59 });
      await record(page, 'balanced-mesa');
      await walkTo(page, { x: 0, z: .2 });
      await walkTo(page, { x: 2.1, z: .2 });
      await walkTo(page, { x: 2.4, z: 2.6 });
      await faceYaw(page, Math.PI / 2); await hold(page, 'KeyW', 750);
      assert.ok((await snapshot(page)).position.x <= 3.005, 'the room wall cannot be crossed');
      await useDoor(page, profile, true);
      const expectedSettings = await settingsAndPause(page);
      await descend(page, profile);
      await page.locator('#replay').click(); await waitPhase(page, 'opening');
      assert.equal((await snapshot(page)).examined.length, 0);
      assert.equal((await snapshot(page)).light, false);
      assert.equal((await snapshot(page)).door.angle, 0);
      await record(page, 'balanced-repetir-preto', { black: true });
      await waitIntro(page, 1); await pause(page);
      const pausedIntro = (await snapshot(page)).introTime;
      await page.waitForTimeout(600); assert.equal((await snapshot(page)).introTime, pausedIntro);
      await page.locator('#restart').click(); await waitPhase(page, 'opening');
      assert.ok((await snapshot(page)).introTime < .5, 'Restart replays the waking scene from the beginning');
      await page.reload();
      await page.waitForFunction(() => document.getElementById('game')?.dataset.ready === 'true');
      assert.deepEqual((await snapshot(page)).settings, expectedSettings, 'preferences survive a real reload');
      assert.equal((await snapshot(page)).phase, 'ready');
    } else {
      if (profile === 'low') {
        await walkTo(page, { x: -1.25, z: .2 });
        await useDoor(page, profile, false);
        assert.equal((await snapshot(page)).examined.length, 0, 'optional objects are not prerequisites for leaving');
        await descend(page, profile);
      }
    }
    const state = await snapshot(page);
    assert.deepEqual(state.errors, []); assertHealthy(current);
    results.push({ profile, status: 'passed', renderer: state.renderer, webgl: state.webgl,
      voice: state.voice, meshes: state.meshes, vertices: state.vertices });
    console.log('PASS', profile, JSON.stringify(results.at(-1)));
    await page.close(); current = null;
  }
  writeFileSync('/tmp/o-intercambio-browser-results.json', JSON.stringify({ results, performance: benchmarkResults, pictures }, null, 2));
  console.log('MEASURED', JSON.stringify(benchmarkResults));
  console.log('VERIFIED: opening, mother caption/audio file, real movement/collision, physical door, optional objects, staircase ending, pause/restart/settings and actual scene images.');
} catch (error) {
  if (current) await current.page.screenshot({ path: '/tmp/o-intercambio-browser-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-browser-results.json', JSON.stringify({ results, performance: benchmarkResults, pictures, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
