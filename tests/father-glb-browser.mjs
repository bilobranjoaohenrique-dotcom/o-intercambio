import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, lookAt, aimInteraction } from './browser-helpers.mjs';

const { BREAKFAST_SEAT, PARENT_ANCHORS } = await import('../src/game/kitchenLayout.ts');
const { CAR_PARENT_ANCHORS } = await import('../src/game/parentsDeparture.ts');
const { GARAGE_ROUTE: G, FAMILY_CAR_INTERACTION } = await import('../src/game/garageLayout.ts');
const { AIRPORT_PARENTS } = await import('../src/game/airportLayout.ts');
const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const SOURCE = '/models/pai_intercambio.glb';
const carOnly = process.env.INTERCAMBIO_FATHER_CAR_ONLY === '1';
const pictures = [], route = [], speech = [], lines = [], reviewNotes = [];
let browser, session, kitchen, afterBreakfast, car, airport, transferFrames;

const father = state => state.family.parents.find(parent => parent.speaker === 'PAI');
const mother = state => state.family.parents.find(parent => parent.speaker === 'MÃE');
const identity = state => state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId }));
const names = values => values.map(value => typeof value === 'string' ? value : value.name);
function model(state, pose) {
  const parent = father(state), other = mother(state), imported = parent.importedModel;
  assert.equal(state.family.actorCount, 2); assert.equal(state.family.parents.length, 2);
  assert.equal(parent.visible, true); assert.equal(other.visible, true);
  assert.equal(other.importedModel, null, 'the mother retains the existing procedural model');
  assert.ok(imported, 'the father exposes the actual GLB import status');
  assert.equal(imported.source, SOURCE); assert.equal(imported.loaded, true);
  assert.ok(imported.error == null || imported.error === '', String(imported.error));
  assert.equal(imported.pose, pose);
  assert.ok(imported.importedVisibleMeshes > 0); assert.equal(imported.proceduralVisibleMeshes, 0);
  assert.equal(imported.litMeshes, imported.importedVisibleMeshes, 'every visible imported mesh receives the active scene lighting');
  assert.equal(names(imported.clips).length, 7);
  for (const clip of ['Seated_Idle', 'Talk_Seated', 'Idle_Breathe', 'Talk_Gesture'])
    assert.ok(names(imported.clips).includes(clip), `the supplied ${clip} clip was preserved`);
  assert.ok(imported.materialCount >= 14); assert.ok(imported.textureCount >= 8);
  const morphNames = names(imported.morphs).map(name => name.split(':').at(-1));
  for (const morph of ['JawOpen', 'Smile']) assert.ok(morphNames.includes(morph));
  assert.equal(typeof imported.animation, 'string'); assert.ok(imported.animation.length > 0);
  const bounds = imported.bounds;
  const height = bounds.height ?? bounds.size?.y ??
    (bounds.maximum && bounds.minimum ? bounds.maximum.y - bounds.minimum.y :
      bounds.max && bounds.min ? bounds.max.y - bounds.min.y : NaN);
  assert.ok(Number.isFinite(height) && height > (pose === 'car' ? .75 : 1) && height < 2.2,
    `the father keeps a plausible human scale in metres: ${JSON.stringify(bounds)}`);
  if (pose === 'car') assert.ok(bounds.max.y <= 1.4, 'the driver fits below the existing car roof');
  return imported;
}
function atAnchor(state, location) {
  assert.equal(state.family.location, location);
  const pose = location === 'kitchen' ? 'kitchen' : location === 'car' ? 'car' : 'airport';
  model(state, pose);
  const anchor = location === 'kitchen' ? PARENT_ANCHORS.father : location === 'car' ? CAR_PARENT_ANCHORS.father : AIRPORT_PARENTS.father;
  assert.ok(Math.hypot(father(state).position.x - anchor.position.x, father(state).position.y - anchor.position.y,
    father(state).position.z - anchor.position.z) < .025, 'the existing father anchor is preserved');
  assert.equal(father(state).seated, location !== 'airport');
  assert.equal(mother(state).apron, location === 'kitchen');
}
async function move(page, point) {
  console.log('FATHER GLB WALK', JSON.stringify(point));
  await walkTo(page, point, { tolerance: .13 });
  const state = await snapshot(page); assert.equal(state.phase, 'playing');
  route.push({ position: state.position, mission: state.chapterMission });
}
async function sampleSpeech(page, speaker) {
  const samples = [];
  for (let i = 0; i < 4; i++) {
    await waitFrames(page, 1); const state = await snapshot(page), imported = model(state, 'kitchen');
    assert.equal(state.dialogueSpeaker, speaker); assert.equal(state.dialogueAudio, false);
    const jaw = imported.morphWeights.JawOpen;
    assert.ok(Number.isFinite(jaw));
    if (speaker === 'MÃE') assert.ok(jaw < .0001, 'the GLB father does not talk over the mother');
    else {
      assert.equal(imported.animation, 'Talk_Seated');
      assert.ok(mother(state).mouthOpen < .0001);
    }
    samples.push({ animation: imported.animation, frame: imported.frame, jaw, mouthOpen: father(state).mouthOpen });
  }
  if (speaker === 'PAI') {
    assert.ok(samples.some(sample => sample.jaw > .015), 'the imported JawOpen target actually opens');
    assert.ok(new Set(samples.map(sample => sample.jaw.toFixed(5))).size > 1);
    assert.ok(new Set(samples.map(sample => sample.frame.toFixed(3))).size > 1, 'the supplied talk clip advances on the game clock');
  }
  speech.push({ speaker, samples });
}
async function observeTransfer(page) {
  await page.evaluate(() => {
    const observation = { samples: [], stop: false }; window.__FATHER_GLB_QA__ = observation;
    function frame() {
      if (observation.stop) return;
      const state = window.__INTERCAMBIO__, father = state?.family.parents.find(parent => parent.speaker === 'PAI');
      if (state && observation.samples.length < 500) observation.samples.push({
        stage: state.chapterStage, phase: state.phase, location: state.family.location,
        fade: Number(document.getElementById('sceneFade').style.opacity),
        visible: father.visible, imported: father.importedModel,
        actors: state.family.parents.map(({ speaker, actorId, headId }) => ({ speaker, actorId, headId })),
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
async function review(page) {
  if (process.env.INTERCAMBIO_VISUAL_REVIEW !== '1') return;
  const repl = (await import('node:repl')).start({ prompt: 'father-visual> ' });
  repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt, aimInteraction,
    model, atAnchor, move, father, mother, identity, sampleSpeech, observeTransfer,
    pictures, route, speech, lines, reviewNotes, kitchen, afterBreakfast,
    BREAKFAST_SEAT, PARENT_ANCHORS, CAR_PARENT_ANCHORS, G, FAMILY_CAR_INTERACTION };
  await new Promise(resolve => {
    repl.context.continueFlow = () => { repl.close(); resolve(); };
    repl.once('exit', resolve);
  });
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(({ key, carOnly }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(carOnly
      ? { mission: 'enter-car', choice: 'nervous', completed: ['breakfast', 'talk-parents', 'pack-suitcase'] }
      : { mission: 'talk-parents', choice: null, completed: ['breakfast'] }));
  }, { key: SAVE, carOnly });
  const page = await context.newPage(), errors = [], consoleErrors = [], failed = [];
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  session = { page, errors, consoleErrors, failed, profile: 'father-glb-balanced' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 120000 });
  await page.locator('#startSettings').click(); await page.locator('#quality').selectOption('balanced');
  await page.locator('#resume').click(); await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  if (!carOnly) {
  kitchen = await snapshot(page); atAnchor(kitchen, 'kitchen');
  assert.equal(kitchen.chapterMission, 'talk-parents');

  console.log('FATHER GLB: existing kitchen dialogue and actual imported facial animation');
  await move(page, BREAKFAST_SEAT.approach);
  await aimInteraction(page, 'breakfast-chair', { ...BREAKFAST_SEAT.position, y: .5 });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.breakfast.state === 'seated' && window.__INTERCAMBIO__.dialogue);
  await sampleSpeech(page, 'MÃE');
  await page.keyboard.press('KeyE'); await waitFrames(page, 1); await sampleSpeech(page, 'PAI');
  await page.locator('#dialogueChoices button').first().click();
  for (let i = 0; i < 12 && (await snapshot(page)).dialogue; i++) {
    lines.push({ speaker: (await snapshot(page)).dialogueSpeaker, text: (await page.locator('#dialogueText').textContent()).trim() });
    await page.keyboard.press('KeyE'); await waitFrames(page, 1);
  }
  await page.waitForFunction(() => window.__INTERCAMBIO__.phase === 'playing' &&
    window.__INTERCAMBIO__.chapterMission === 'pack-suitcase' && window.__INTERCAMBIO__.breakfast.state === 'standing');
  afterBreakfast = await snapshot(page); atAnchor(afterBreakfast, 'kitchen');
  assert.deepEqual(identity(afterBreakfast), identity(kitchen));
  assert.ok(lines.some(line => /sobe lá e pega tua mala/.test(line.text)));
  assert.ok(lines.some(line => /não esquece o passaporte/.test(line.text)));
  await move(page, { x: 2.6, z: 16.25 }); await move(page, { x: 2.6, z: 18.5 });
  await lookAt(page, PARENT_ANCHORS.father.eye); await waitFrames(page, 2);
  pictures.push(await capture(page, 'novo-pai-glb-cozinha')); console.log('CAPTURE', pictures.at(-1).path);
  await review(page);

  console.log('FATHER GLB: focused reload into the existing luggage-complete checkpoint');
  // This is an isolated stage fixture, not a claim that the already-tested
  // upstairs suitcase route was replayed in this model-only check.
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ mission: 'enter-car', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase'] })), SAVE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__INTERCAMBIO__ && document.getElementById('game')?.dataset.ready === 'true', null, { timeout: 120000 });
  await page.locator('#startGame').click(); await waitPhase(page, 'playing');
  }
  car = await snapshot(page); atAnchor(car, 'car');
  assert.equal(car.chapterMission, 'enter-car'); assert.equal(car.luggageCollected, true);
  for (const point of [{ x: 3.5, z: 16.25 }, { x: 3.5, z: 15.35 }, G.houseApproach, G.entrance,
    G.rearSouth, G.frontSouth, { x: 9.65, z: 13.75 }]) await move(page, point);
  await lookAt(page, { x: 7.5, y: 1.1, z: 13.75 }); await waitFrames(page, 2);
  atAnchor(await snapshot(page), 'car');
  pictures.push(await capture(page, 'novo-pai-glb-carro')); console.log('CAPTURE', pictures.at(-1).path);
  if (carOnly) {
    car = await snapshot(page); atAnchor(car, 'car'); assert.deepEqual(car.errors, []); assertHealthy(session);
    writeFileSync('/tmp/o-intercambio-father-glb-car-results.json', JSON.stringify({ status: 'passed', build: car.build,
      pictures, route, car: { family: car.family, mission: car.chapterMission }, errors, consoleErrors, failedAssets: failed,
      coverage: ['late GLB import in luggage-complete checkpoint receives garage lighting',
        'father seated below the car roof with original embedded textures', 'mother and garage remain intact'],
      limits: ['Focused correction check only; the kitchen and automatic airport flow were not repeated.',
        'The car capture still requires actual visual inspection.'],
    }, null, 2));
    console.log('PASS FATHER GLB CAR: focused checkpoint restoration and actual front-of-car capture.');
  } else {
  for (const point of [G.frontSouth, G.driver]) await move(page, point);
  await aimInteraction(page, 'family-car', FAMILY_CAR_INTERACTION);
  assert.match(await page.locator('#interactionText').textContent(), /Entrar no carro/i);
  await observeTransfer(page); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterStage === 'airport' &&
    window.__INTERCAMBIO__.phase === 'playing' && window.__INTERCAMBIO__.dialogue, null, { timeout: 120000 });
  airport = await snapshot(page); atAnchor(airport, 'airport');
  assert.deepEqual(identity(airport), identity(car), 'the same imported father continues from the car into the existing airport');
  transferFrames = await page.evaluate(() => { window.__FATHER_GLB_QA__.stop = true; return window.__FATHER_GLB_QA__.samples; });
  for (const frame of transferFrames.filter(frame => frame.fade < .99)) {
    assert.equal(frame.visible, true); assert.equal(frame.imported.loaded, true); assert.equal(frame.imported.source, SOURCE);
  }
  pictures.push(await capture(page, 'novo-pai-glb-aeroporto')); console.log('CAPTURE', pictures.at(-1).path);
  assert.equal(airport.dialogueAudio, false); assert.deepEqual(airport.errors, []); assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-father-glb-results.json', JSON.stringify({ status: 'passed', build: airport.build,
    pictures, route, speech, lines, transferFrames, reviewNotes,
    kitchen: { family: kitchen.family, mission: kitchen.chapterMission },
    afterBreakfast: { family: afterBreakfast.family, mission: afterBreakfast.chapterMission },
    car: { family: car.family, mission: car.chapterMission },
    airport: { family: airport.family, mission: airport.chapterMission, position: airport.position },
    errors, consoleErrors, failedAssets: failed,
    coverage: ['latest GLB loaded with embedded materials, textures, clips and morphs',
      'existing kitchen position, seated conversation and real imported speech morph',
      'mother remains the original model', 'parents stay in the kitchen after breakfast',
      'driver pose and actual front-of-car capture', 'same imported father during automatic airport transition'],
    limits: ['Real captures require visual inspection.', 'One explicit stage-fixture reload skipped the previously tested upstairs luggage route.',
      'No repeated airport dialogue/gate route, FPS benchmark or physical GPU/Windows test.'],
  }, null, 2));
  console.log('PASS FATHER GLB: original scenes and dialogue with the replacement father in kitchen, car and airport.');
  }
} catch (error) {
  if (session) await session.page.screenshot({ path: '/tmp/o-intercambio-father-glb-failure.png' }).catch(() => {});
  writeFileSync(carOnly ? '/tmp/o-intercambio-father-glb-car-results.json' : '/tmp/o-intercambio-father-glb-results.json', JSON.stringify({ status: 'failed', error: String(error),
    pictures, route, speech, lines, transferFrames, state: session ? await snapshot(session.page).catch(() => null) : null,
    errors: session?.errors, consoleErrors: session?.consoleErrors, failedAssets: session?.failed }, null, 2));
  if (session && process.env.INTERCAMBIO_DEBUG === '1') {
    console.error(error); const repl = (await import('node:repl')).start({ prompt: 'father> ' });
    repl.context.qa = { ...session, browser, snapshot, capture, waitFrames, waitPhase, walkTo, lookAt, aimInteraction,
      model, atAnchor, move, father, mother, identity, sampleSpeech, observeTransfer,
      pictures, route, speech, lines, kitchen, afterBreakfast, car, airport, transferFrames,
      BREAKFAST_SEAT, PARENT_ANCHORS, CAR_PARENT_ANCHORS, G, FAMILY_CAR_INTERACTION };
    await new Promise(resolve => repl.once('exit', resolve));
  }
  throw error;
} finally { await browser?.close(); }
