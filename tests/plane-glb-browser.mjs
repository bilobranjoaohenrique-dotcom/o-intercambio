import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
const { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  lookAt, hold, faceYaw, aimInteraction, pause } = await import('./browser-helpers.mjs');
const { AIRPORT_GATE, AIRPORT_ROUTE } = await import('../src/game/airportLayout.ts');
const { PLANE_SEAT, PLANE_WINDOW, PLANE_LOOK_LIMITS, PLANE_CAMERA } = await import('../src/game/planeLayout.ts');

const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const cabinOnly = process.env.INTERCAMBIO_CABIN_ONLY === '1';
const pictures = [], route = [], movement = [], reviewNotes = [];
let browser, session, initial, baseProjection, seated, windowView, returned, final, boarding, reflection, arrival;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

function parentsStayInBrazil(state) {
  assert.equal(state.family.actorCount, 2); assert.equal(state.family.location, 'airport');
  assert.ok(state.family.parents.every(parent => !parent.visible));
  assert.equal(state.family.airportVisibleCount, 0); assert.equal(state.family.carVisibleCount, 0);
  assert.equal(state.dialogueAudio, false); assert.equal(state.audio.dialogueAudio, false);
}
function seatedView(state) {
  assert.equal(state.chapterStage, 'plane'); assert.equal(state.chapterMission, 'plane-seat');
  assert.equal(state.dialogue, false); parentsStayInBrazil(state);
  const model = state.plane.scenery;
  assert.equal(model.active, true); assert.equal(model.ready, true); assert.equal(model.loaded, true);
  assert.equal(model.source, '/models/aviao_intercambio.glb'); assert.equal(model.error, null);
  assert.equal(model.cameraOverrideActive, true);
  for (const key of ['fov', 'minZ', 'maxZ']) assert.ok(Math.abs(model.camera[key] - PLANE_CAMERA[key]) < 1e-9);
  assert.equal(model.foreignMeshesVisible, 0, 'other chapter geometry cannot appear beyond the plane windows');
  assert.ok(model.outsideMeshesHidden > 0, 'the live global home scenery is isolated during flight');
  if (model.screenOn !== undefined) assert.equal(model.screenOn, false);
  if (model.passengers !== undefined) assert.ok(Number.isInteger(model.passengers) && model.passengers >= 0);
  assert.equal(state.audio.ambience, 'plane');
}
async function moveToGate(page, point) {
  console.log('CABIN GLB WALK', JSON.stringify(point));
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
  const state = await snapshot(page);
  assert.equal(state.phase, 'playing'); assert.equal(state.chapterMission, 'airport-gate');
  assert.ok(Math.hypot(state.position.x - point.x, state.position.z - point.z) < .20);
  route.push({ target: point, position: state.position });
}
async function observe(page) {
  await page.evaluate(() => {
    const observation = { samples: [], texts: [], stop: false }; window.__CABIN_GLB_QA__ = observation;
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
  window.__CABIN_GLB_QA__.stop = true; return window.__CABIN_GLB_QA__;
});
async function review(page, label) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  await pause(page);
  const repl = (await import('node:repl')).start({ prompt: `cabin-glb-${label}> ` });
  repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, lookAt,
    hold, faceYaw, aimInteraction, pause, moveToGate, seatedView, parentsStayInBrazil,
    observe, stopObservation, pictures, route, movement, reviewNotes, initial, seated, windowView,
    returned, boarding, reflection, AIRPORT_GATE, PLANE_SEAT, PLANE_WINDOW, PLANE_LOOK_LIMITS };
  repl.context.continueFlow = () => repl.close();
  await new Promise(resolve => repl.once('exit', resolve));
  if ((await snapshot(page)).phase === 'paused') await page.locator('#resume').click();
}
async function probeLookBounds(page) {
  const box = await page.locator('#game').boundingBox();
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y); await waitFrames(page, 1);
  const dragging = !(await snapshot(page)).input.pointerLocked;
  if (dragging) await page.mouse.down();
  try { await page.mouse.move(center.x - 500, center.y + 200); }
  finally { if (dragging) await page.mouse.up(); }
  await waitFrames(page, 2);
  const state = await snapshot(page), offset = wrap(state.rotation.yaw - PLANE_LOOK_LIMITS.centerYaw);
  assert.ok(offset >= PLANE_LOOK_LIMITS.minYaw - .01 && offset <= PLANE_LOOK_LIMITS.maxYaw + .01);
  assert.ok(state.rotation.pitch >= PLANE_LOOK_LIMITS.minPitch - .01 && state.rotation.pitch <= PLANE_LOOK_LIMITS.maxPitch + .01);
  movement.push({ kind: 'physical-mouse-bounds', rotation: state.rotation });
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(({ key, cabinOnly }) => localStorage.setItem(key, JSON.stringify({
    mission: cabinOnly ? 'plane-seat' : 'airport-gate', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car', 'car-ready', 'airport-farewell',
      ...(cabinOnly ? ['airport-gate'] : [])] })), { key: SAVE, cabinOnly });
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'plane-glb-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ &&
    (document.getElementById('game')?.dataset.ready === 'true' || window.__INTERCAMBIO__.errors.length), null, { timeout: 120000 });
  assert.deepEqual((await snapshot(page)).errors, []);
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); baseProjection = (await snapshot(page)).plane.scenery.camera;
  await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  initial = await snapshot(page); assert.equal(initial.chapterMission, cabinOnly ? 'plane-seat' : 'airport-gate');

  if (!cabinOnly) {
    console.log('CABIN GLB: real Gate 24 boarding');
    const approachGate = { x: AIRPORT_GATE.x, z: AIRPORT_GATE.z - .7 };
    for (const point of [...AIRPORT_ROUTE.slice(0, 5), approachGate]) await moveToGate(page, point);
    await aimInteraction(page, 'gate', AIRPORT_GATE);
    assert.equal((await page.locator('#interactionText').textContent()).trim(), 'Embarcar');
    await observe(page); await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'plane' &&
      window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 120000 });
    boarding = await stopObservation(page);
    assert.ok(boarding.samples.find(frame => frame.stage === 'plane')?.fade >= .99);
  } else boarding = { skipped: true, reason: 'Focused plane-seat fixture after a separately verified Gate 24 flow.' };
  seated = await snapshot(page); seatedView(seated);
  assert.ok(Math.hypot(seated.position.x - PLANE_SEAT.position.x, seated.position.y - PLANE_SEAT.position.y,
    seated.position.z - PLANE_SEAT.position.z) < .03);
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Aguarde a chegada ao destino.');
  const dx = PLANE_WINDOW.target.x - seated.position.x, dz = PLANE_WINDOW.target.z - seated.position.z;
  assert.ok(Math.cos(PLANE_SEAT.yaw) * dx - Math.sin(PLANE_SEAT.yaw) * dz < 0, 'the interaction window lies left of the passenger');
  assert.ok(Math.hypot(dx, dz, PLANE_WINDOW.target.y - seated.position.y) <= 2.2);
  await waitFrames(page, 10);
  pictures.push(await capture(page, 'aviao-glb-assento')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'assento');

  console.log('CABIN GLB: responsive seated look and blocked walking');
  const heldPosition = (await snapshot(page)).position;
  for (const code of ['KeyW', 'KeyA']) {
    await hold(page, code, 160); const state = await snapshot(page); seatedView(state);
    assert.ok(Math.hypot(state.position.x - heldPosition.x, state.position.y - heldPosition.y,
      state.position.z - heldPosition.z) < .008);
    movement.push({ code, position: state.position });
  }
  await probeLookBounds(page);
  await faceYaw(page, PLANE_SEAT.yaw, PLANE_SEAT.pitch);

  console.log('CABIN GLB: window focus, both existing text reflections and return');
  await aimInteraction(page, 'plane-window', PLANE_WINDOW.target);
  assert.match((await page.locator('#interactionText').textContent()).trim(), /Olhar pela janela/);
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.state === 'window', null, { timeout: 45000 });
  windowView = await snapshot(page); seatedView(windowView);
  assert.ok(Math.hypot(windowView.position.x - PLANE_WINDOW.focusPose.position.x,
    windowView.position.y - PLANE_WINDOW.focusPose.position.y, windowView.position.z - PLANE_WINDOW.focusPose.position.z) < .03);
  await waitFrames(page, 3);
  pictures.push(await capture(page, 'aviao-glb-janela')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page, 'janela');
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.reflectionComplete, null, { timeout: 90000 });
  reflection = await stopObservation(page);
  assert.ok(reflection.texts.some(text => text.includes('É estranho... Estou realmente indo.')));
  assert.ok(reflection.texts.some(text => text.includes('Tomara que tudo dê certo.')));
  assert.ok(reflection.samples.some(frame => Math.hypot(frame.position.x - heldPosition.x, frame.position.y - heldPosition.y,
    frame.position.z - heldPosition.z) > .01 && Math.hypot(frame.position.x - PLANE_WINDOW.focusPose.position.x,
      frame.position.y - PLANE_WINDOW.focusPose.position.y, frame.position.z - PLANE_WINDOW.focusPose.position.z) > .01));
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.state === 'seat');
  returned = await snapshot(page); seatedView(returned);
  assert.ok(Math.hypot(returned.position.x - PLANE_SEAT.position.x, returned.position.y - PLANE_SEAT.position.y,
    returned.position.z - PLANE_SEAT.position.z) < .03);
  await page.waitForFunction(() => window.__INTERCAMBIO__.plane.flight.canContinue, null, { timeout: 45000 });
  await page.waitForFunction(() => /Avançar para a chegada/.test(document.getElementById('interactionText')?.textContent ?? ''));
  await observe(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'town' &&
    window.__INTERCAMBIO__.phase === 'playing', null, { timeout: 120000 });
  arrival = await stopObservation(page); final = await snapshot(page);
  assert.ok(arrival.samples.some(frame => frame.stage === 'plane' && frame.fade > 0 && frame.fade < .99));
  assert.ok(arrival.samples.find(frame => frame.stage === 'town')?.fade >= .99);
  assert.equal(final.chapterMission, 'find-host'); parentsStayInBrazil(final);
  assert.equal(final.arrival.scenery.source, '/models/chegada_intercambio.glb');
  assert.equal(final.arrival.scenery.ready, true); assert.equal(final.arrival.scenery.hosts, 2);
  assert.equal(final.arrival.scenery.npcs, 8);
  assert.equal(final.plane.scenery.cameraOverrideActive, false);
  assert.equal(final.plane.scenery.outsideMeshesHidden, 0, 'the saved global mesh states are released on exit');
  assert.deepEqual(final.plane.scenery.camera, baseProjection, 'arrival restores the pre-flight camera projection');
  assert.deepEqual(final.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-plane-glb-results.json', JSON.stringify({ status: 'passed', build: final.build, cabinOnly,
    pictures, route, movement, reviewNotes, boarding, reflection, arrival,
    seat: { position: seated.position, rotation: seated.rotation, scenery: seated.plane.scenery },
    window: { position: windowView.position, rotation: windowView.rotation, scenery: windowView.plane.scenery },
    returned: { position: returned.position, scenery: returned.plane.scenery },
    final: { phase: final.phase, stage: final.chapterStage, mission: final.chapterMission, arrival: final.arrival.scenery,
      camera: final.plane.scenery.camera, cameraOverrideActive: final.plane.scenery.cameraOverrideActive,
      outsideMeshesHidden: final.plane.scenery.outsideMeshesHidden },
    errors, consoleErrors, failedAssets: failed,
    coverage: [cabinOnly ? 'existing plane-seat checkpoint; prior Gate 24 flow recorded separately' : 'real Gate 24 boarding into the supplied cabin', 'actual seated and window captures',
      'physical mouse look within limits and blocked walking', 'smooth window focus and both original text reflections',
      'return to the seat and gradual exit into the existing arrival GLB', 'parents remain at the Brazilian airport',
      'only cabin geometry remains visible in flight; camera projection and saved mesh states are restored on exit'],
    limits: ['Captures require actual visual inspection.',
      cabinOnly ? 'Focused plane-seat checkpoint after a separately recorded boarding check; no airport, house, car or farewell replay.' :
        'One focused airport-gate checkpoint; no house, car or farewell replay.',
      'Authored exterior features are inspected in real frames; moving clouds are not assumed from the old procedural scene.',
      'Chromium/Linux SwiftShader; no physical GPU or FPS benchmark.'],
  }, null, 2));
  console.log(`PASS CABIN GLB: ${cabinOnly ? 'plane-seat fixture' : 'Gate 24'}, new cabin, window reflections and arrival.`);
} catch (error) {
  console.error(error);
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-plane-glb-failure.png' }).catch(() => {});
  writeFileSync('/tmp/o-intercambio-plane-glb-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, route, movement, reviewNotes, seated, windowView, returned, boarding, reflection, arrival,
    state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    const repl = (await import('node:repl')).start({ prompt: 'cabin-glb-debug> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, lookAt, hold,
      faceYaw, aimInteraction, pause, moveToGate, seatedView, parentsStayInBrazil, observe, stopObservation,
      pictures, route, movement, reviewNotes, initial, seated, windowView, returned, boarding, reflection, arrival,
      AIRPORT_GATE, PLANE_SEAT, PLANE_WINDOW, PLANE_LOOK_LIMITS };
    repl.context.continueFlow = () => repl.close();
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
