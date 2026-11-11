import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
const { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  lookAt, aimInteraction, pause } = await import('./browser-helpers.mjs');
const { PLANE_WINDOW } = await import('../src/game/planeLayout.ts');
const { ARRIVAL_ROUTE, ARRIVAL_SPAWN, ARRIVAL_HOST } = await import('../src/game/arrivalLayout.ts');

const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const pictures = [], route = [], reviewNotes = [];
let browser, session, seated, arrival, hosts, final, transition;

function parentsStayInBrazil(state) {
  assert.equal(state.family.actorCount, 2);
  assert.equal(state.family.location, 'airport');
  assert.equal(state.family.airportVisibleCount, 0);
  assert.equal(state.family.carVisibleCount, 0);
  assert.ok(state.family.parents.every(parent => !parent.visible));
  assert.equal(state.dialogueAudio, false); assert.equal(state.audio.dialogueAudio, false);
}
function arrivalView(state) {
  assert.equal(state.chapterStage, 'town'); assert.equal(state.chapterMission, 'find-host');
  parentsStayInBrazil(state);
  const scenery = state.arrival.scenery;
  assert.equal(scenery.active, true); assert.equal(scenery.ready, true); assert.equal(scenery.loaded, true);
  assert.equal(scenery.error, null); assert.equal(scenery.source, '/models/chegada_intercambio.glb');
  assert.equal(scenery.hosts, 2); assert.equal(scenery.passengers, 6); assert.equal(scenery.npcs, 8);
  assert.equal(scenery.animationsActive, 8); assert.equal(scenery.protagonistMeshes, 0);
}
async function move(page, point) {
  console.log('ARRIVAL WALK', JSON.stringify(point));
  const before = await snapshot(page);
  if (Math.hypot(before.position.x - point.x, before.position.z - point.z) >= .12) {
    await lookAt(page, { ...point, y: before.position.y }, .009);
    await page.keyboard.down('KeyW');
    try {
      await page.waitForFunction(point => Math.hypot(window.__INTERCAMBIO__.position.x - point.x,
        window.__INTERCAMBIO__.position.z - point.z) < .12, point, { polling: 'raf', timeout: 60000 });
    } finally { await page.keyboard.up('KeyW'); }
    await waitFrames(page, 1);
  }
  const state = await snapshot(page); arrivalView(state); assert.equal(state.phase, 'playing');
  assert.ok(Math.hypot(state.position.x - point.x, state.position.z - point.z) < .20);
  route.push({ target: point, position: state.position });
}
async function observe(page) {
  await page.evaluate(() => {
    const observation = { samples: [], texts: [], stop: false }; window.__ARRIVAL_QA__ = observation;
    function frame() {
      if (observation.stop) return;
      const state = window.__INTERCAMBIO__;
      if (state && observation.samples.length < 2000) observation.samples.push({ phase: state.phase,
        stage: state.chapterStage, mission: state.chapterMission,
        fade: Number(document.getElementById('sceneFade').style.opacity), position: state.position });
      const subtitle = document.getElementById('subtitle');
      const text = !subtitle?.hidden ? document.getElementById('subtitleText')?.textContent?.trim() : '';
      if (text && observation.texts.at(-1) !== text) observation.texts.push(text);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
const stopObservation = page => page.evaluate(() => {
  window.__ARRIVAL_QA__.stop = true; return window.__ARRIVAL_QA__;
});
async function review(page, label) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  await pause(page);
  const repl = (await import('node:repl')).start({ prompt: `arrival-${label}> ` });
  repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, lookAt, aimInteraction,
    pause, move, arrivalView, parentsStayInBrazil, pictures, route, reviewNotes, seated, arrival, hosts,
    ARRIVAL_ROUTE, ARRIVAL_SPAWN, ARRIVAL_HOST };
  repl.context.continueFlow = () => repl.close();
  await new Promise(resolve => repl.once('exit', resolve));
  if ((await snapshot(page)).phase === 'paused') await page.locator('#resume').click();
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(key => localStorage.setItem(key, JSON.stringify({ mission: 'plane-seat', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car', 'car-ready', 'airport-farewell', 'airport-gate'] })), SAVE);
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'arrival-glb-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ &&
    (document.getElementById('game')?.dataset.ready === 'true' || window.__INTERCAMBIO__.errors.length), null, { timeout: 120000 });
  assert.deepEqual((await snapshot(page)).errors, []);
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  seated = await snapshot(page); assert.equal(seated.chapterStage, 'plane'); assert.equal(seated.chapterMission, 'plane-seat');
  parentsStayInBrazil(seated);
  console.log('ARRIVAL: existing window reflections and exit from plane');
  await aimInteraction(page, 'plane-window', PLANE_WINDOW.target);
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.state === 'window', null, { timeout: 45000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.reflectionComplete, null, { timeout: 90000 });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.state === 'seat');
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.canContinue, null, { timeout: 45000 });
  await page.waitForFunction(() => /Avançar para a chegada/.test(document.getElementById('interactionText')?.textContent ?? ''));
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'town' &&
    window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 120000 });
  transition = await stopObservation(page); arrival = await snapshot(page); arrivalView(arrival);
  assert.ok(transition.texts.some(text => text.includes('É estranho... Estou realmente indo.')));
  assert.ok(transition.texts.some(text => text.includes('Tomara que tudo dê certo.')));
  assert.ok(transition.samples.some(frame => frame.stage === 'plane' && frame.fade > 0 && frame.fade < .99));
  assert.ok(transition.samples.find(frame => frame.stage === 'town')?.fade >= .99);
  assert.ok(Math.hypot(arrival.position.x - ARRIVAL_SPAWN.position.x,
    arrival.position.y - ARRIVAL_SPAWN.position.y, arrival.position.z - ARRIVAL_SPAWN.position.z) < .03);
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Encontre sua família anfitriã');
  await waitFrames(page, 10); // Let the newly activated GLB's shaders finish before recording its pixels.
  pictures.push(await capture(page, 'chegada-glb-entrada')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'entrada');

  console.log('ARRIVAL: physical aisle to the supplied hosts');
  for (const point of ARRIVAL_ROUTE) await move(page, point);
  await aimInteraction(page, 'host', ARRIVAL_HOST);
  assert.match((await page.locator('#interactionText').textContent()).trim(), /Conversar.*anfitri/i);
  await lookAt(page, { ...ARRIVAL_HOST, y: 1.55 });
  hosts = await snapshot(page); pictures.push(await capture(page, 'chegada-glb-anfitrioes'));
  console.log('CAPTURE', pictures.at(-1).path); await review(page, 'anfitrioes');
  await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  assert.equal((await snapshot(page)).dialogueSpeaker, 'ANFITRIÃO');
  assert.equal((await page.locator('#dialogueText').textContent()).trim(), 'Você deve ser nosso novo estudante. Bem-vindo!');
  parentsStayInBrazil(await snapshot(page));
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterMission === 'complete', null, { timeout: 45000 });
  final = await snapshot(page); assert.equal(final.chapterStage, 'town'); parentsStayInBrazil(final);
  assert.deepEqual(final.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-arrival-glb-results.json', JSON.stringify({ status: 'passed', build: final.build,
    pictures, route, reviewNotes, transition, arrival: { position: arrival.position, scenery: arrival.arrival.scenery, family: arrival.family },
    hosts: { position: hosts.position, scenery: hosts.arrival.scenery },
    final: { phase: final.phase, stage: final.chapterStage, mission: final.chapterMission, familyLocation: final.family.location },
    errors, consoleErrors, failedAssets: failed,
    coverage: ['existing seated plane window reflections and real fade into arrival', 'supplied arrival GLB, two hosts and six seated passengers',
      'physical central aisle and original host interaction completing the chapter', 'parents remain at the Brazilian airport; text-only dialogue'],
    limits: ['Real captures require visual inspection.', 'Starts at the existing plane-seat checkpoint; no house or Brazilian airport replay.',
      'The optional back-wall poster was not revisited.', 'Chromium/Linux SwiftShader; no physical GPU or FPS benchmark.'],
  }, null, 2));
  console.log('PASS ARRIVAL GLB: plane exit, real model, walkable aisle and original host greeting.');
} catch (error) {
  console.error(error);
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-arrival-glb-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-arrival-glb-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, route, reviewNotes, transition, state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    const repl = (await import('node:repl')).start({ prompt: 'arrival-debug> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, lookAt, aimInteraction,
      pause, move, arrivalView, parentsStayInBrazil, pictures, route, reviewNotes, seated, arrival, hosts,
      ARRIVAL_ROUTE, ARRIVAL_SPAWN, ARRIVAL_HOST };
    repl.context.continueFlow = () => repl.close();
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
