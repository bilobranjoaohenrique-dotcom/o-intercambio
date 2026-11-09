import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames,
  walkTo, hold, faceYaw, aimInteraction, pause } from './browser-helpers.mjs';

const { AIRPORT_GATE, AIRPORT_ROUTE } = await import('../src/game/airportLayout.ts');
const { PLANE_SEAT, PLANE_WINDOW } = await import('../src/game/planeLayout.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const pictures = [], route = [], movement = [];
let browser, session, seated, windowView, returned, ending, boardingFrames, arrivalFrames;

function noParents(state) {
  assert.equal(state.family.parents.length, 2, 'the established parents remain in the chapter');
  assert.ok(state.family.parents.every(parent => !parent.visible), 'neither parent travels in the passenger cabin');
  assert.equal(state.family.airportVisibleCount, 0);
  assert.equal(state.family.carVisibleCount, 0);
}
function seatedView(state) {
  assert.equal(state.chapterStage, 'plane');
  assert.equal(state.chapterMission, 'plane-seat');
  assert.equal(state.dialogue, false); assert.equal(state.dialogueAudio, false);
  noParents(state);
  assert.equal(state.plane.scenery.active, true);
  assert.equal(state.plane.scenery.screenOn, false, 'the entertainment screen stays off');
  assert.equal(state.audio.ambience, 'plane');
}
async function observe(page) {
  await page.evaluate(() => {
    const observation = { samples: [], texts: [], stop: false }; window.__PLANE_QA__ = observation;
    function frame() {
      if (observation.stop) return;
      const state = window.__INTERCAMBIO__;
      if (state && observation.samples.length < 600) observation.samples.push({
        phase: state.phase, stage: state.chapterStage, mission: state.chapterMission,
        fade: Number(document.getElementById('sceneFade').style.opacity), position: state.position,
      });
      const subtitle = document.getElementById('subtitle');
      const text = !subtitle?.hidden ? document.getElementById('subtitleText')?.textContent?.trim() : '';
      if (text && observation.texts.at(-1) !== text) observation.texts.push(text);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
const stopObservation = page => page.evaluate(() => {
  window.__PLANE_QA__.stop = true; return window.__PLANE_QA__;
});
async function review(page) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  // Review the saved clean capture with the game's own pause menu freezing the
  // flight clock. No test hook accelerates or rewrites narrative time.
  await pause(page);
  const repl = (await import('node:repl')).start({ prompt: 'plane-visual> ' });
  repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, faceYaw, hold, aimInteraction,
    seatedView, noParents, observe, stopObservation, pictures, route, movement, PLANE_SEAT, PLANE_WINDOW };
  repl.context.continueFlow = () => repl.close();
  await new Promise(resolve => repl.once('exit', resolve));
  if ((await snapshot(page)).phase === 'paused') await page.locator('#resume').click();
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  // Start at a supported completed-goodbye checkpoint. This check does not
  // replay the house, luggage or nine airport lines, which were already tested.
  await context.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ mission: 'airport-gate', choice: 'nervous',
      completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car', 'car-ready', 'airport-farewell'] }));
  }, SAVE);
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'plane-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 120000 });
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click();
  await page.waitForFunction(() => window.__INTERCAMBIO__.phase === 'playing');
  assert.equal((await snapshot(page)).chapterMission, 'airport-gate');
  console.log('PLANE: existing gate boarding into the seated first-person cabin');
  for (const point of AIRPORT_ROUTE) {
    await walkTo(page, point, { tolerance: .13 }); route.push((await snapshot(page)).position);
  }
  await aimInteraction(page, 'gate', AIRPORT_GATE);
  assert.equal((await page.locator('#interactionText').textContent()).trim(), 'Embarcar');
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'plane' && window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 120000 });
  seated = await snapshot(page); seatedView(seated);
  boardingFrames = (await stopObservation(page)).samples;
  assert.ok(boardingFrames.find(frame => frame.stage === 'plane')?.fade >= .99, 'boarding hides the scene switch under black');
  assert.ok(Math.hypot(seated.position.x - PLANE_SEAT.position.x, seated.position.y - PLANE_SEAT.position.y,
    seated.position.z - PLANE_SEAT.position.z) < .02, 'the camera starts at the actual passenger seat');
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Aguarde a chegada ao destino.');
  pictures.push(await capture(page, 'aviao-visao-passageiro')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page);

  console.log('PLANE: normal mouse look works while walking stays locked');
  const heldPosition = (await snapshot(page)).position;
  for (const code of ['KeyW', 'KeyD']) {
    await hold(page, code, 160); const state = await snapshot(page); seatedView(state);
    assert.ok(Math.hypot(state.position.x - heldPosition.x, state.position.y - heldPosition.y,
      state.position.z - heldPosition.z) < .008, 'seated movement cannot enter the wall or seat');
    movement.push({ code, position: state.position });
  }
  await faceYaw(page, PLANE_SEAT.yaw - .45, .02);
  assert.ok(Math.abs((await snapshot(page)).rotation.yaw - seated.rotation.yaw) > .25, 'real mouse turns the seated camera');
  await faceYaw(page, PLANE_SEAT.yaw, PLANE_SEAT.pitch);
  const cloudBefore = JSON.stringify((await snapshot(page)).plane.scenery.cloudOffset);
  await waitFrames(page, 3);
  assert.notEqual(JSON.stringify((await snapshot(page)).plane.scenery.cloudOffset), cloudBefore, 'the view outside has real cloud-layer motion');

  console.log('PLANE: window focus, both on-screen reflections and return to seat');
  await aimInteraction(page, 'plane-window', PLANE_WINDOW.target);
  assert.match((await page.locator('#interactionText').textContent()).trim(), /Olhar pela janela/);
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.state === 'window', null, { timeout: 45000 });
  windowView = await snapshot(page); seatedView(windowView);
  assert.ok(Math.hypot(windowView.position.x - PLANE_WINDOW.focusPose.position.x,
    windowView.position.y - PLANE_WINDOW.focusPose.position.y, windowView.position.z - PLANE_WINDOW.focusPose.position.z) < .025,
    'the camera approaches the actual oval window smoothly');
  pictures.push(await capture(page, 'aviao-janela-asa-nuvens')); console.log('CAPTURE', pictures.at(-1).path);
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.reflectionComplete, null, { timeout: 90000 });
  const reflection = await stopObservation(page);
  assert.ok(reflection.samples.some(frame => Math.hypot(frame.position.x - heldPosition.x,
    frame.position.y - heldPosition.y, frame.position.z - heldPosition.z) > .01
    && Math.hypot(frame.position.x - PLANE_WINDOW.focusPose.position.x, frame.position.y - PLANE_WINDOW.focusPose.position.y,
      frame.position.z - PLANE_WINDOW.focusPose.position.z) > .01), 'the window approach contains intermediate camera poses');
  assert.ok(reflection.texts.some(text => text.includes('É estranho... Estou realmente indo.')));
  assert.ok(reflection.texts.some(text => text.includes('Tomara que tudo dê certo.')));
  assert.match((await page.locator('#interactionText').textContent()).trim(), /Voltar ao assento/);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.state === 'seat');
  returned = await snapshot(page); seatedView(returned);
  assert.ok(Math.hypot(returned.position.x - PLANE_SEAT.position.x, returned.position.y - PLANE_SEAT.position.y,
    returned.position.z - PLANE_SEAT.position.z) < .02);
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.canContinue, null, { timeout: 45000 });
  await page.waitForFunction(() => /Avançar para a chegada/.test(document.getElementById('interactionText')?.textContent ?? ''));
  console.log('PLANE: manual advance fades into the existing arrival stage');
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'town' && window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 120000 });
  arrivalFrames = (await stopObservation(page)).samples;
  assert.ok(arrivalFrames.some(frame => frame.stage === 'plane' && frame.fade > 0 && frame.fade < .99), 'arrival uses a gradual fade');
  assert.ok(arrivalFrames.find(frame => frame.stage === 'town')?.fade >= .99, 'the existing arrival set activates only under black');
  ending = await snapshot(page); assert.equal(ending.chapterMission, 'find-host');
  assert.equal(ending.dialogueAudio, false); assert.deepEqual(ending.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-plane-results.json', JSON.stringify({ status: 'passed', build: ending.build,
    pictures, route, movement, boardingFrames, arrivalFrames,
    seat: { position: seated.position, rotation: seated.rotation, plane: seated.plane, family: seated.family },
    window: { position: windowView.position, plane: windowView.plane },
    reflections: reflection.texts, returned: { position: returned.position, plane: returned.plane },
    final: { phase: ending.phase, stage: ending.chapterStage, mission: ending.chapterMission },
    errors, consoleErrors, failedAssets: failed,
    coverage: ['existing Gate 24 boarding into the seated first-person cabin', 'window at left and front-seat composition in actual captures',
      'normal mouse look and blocked translation', 'moving clouds with screen off', 'smooth window focus and two text-only reflections',
      'return to the seat and manual arrival advance', 'existing next-stage transition under a gradual fade', 'parents remain outside the cabin'],
    limits: ['Real captures require visual inspection.', 'One focused Chromium/Linux SwiftShader flow; no earlier-house replay or FPS benchmark.'],
  }, null, 2));
  console.log('PASS PLANE: boarding, seated camera, window reflection and existing arrival transition.');
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-plane-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-plane-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, route, movement, seated, windowView, returned, ending, boardingFrames, arrivalFrames,
    state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'plane> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, faceYaw, hold, aimInteraction,
      seatedView, noParents, observe, stopObservation, pictures, route, movement, PLANE_SEAT, PLANE_WINDOW,
      seated, windowView, returned, ending, boardingFrames, arrivalFrames };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
