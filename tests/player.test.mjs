import { registerHooks } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) specifier += '.ts';
  return next(specifier, context);
} });
const { createPlayer, LOOK_RADIANS_PER_PIXEL } = await import('../src/game/player.ts');
const { STANDING_POSE, BED_POSE } = await import('../src/game/layout.ts');
const vector = point => ({ ...point, set(x, y, z) { this.x = x; this.y = y; this.z = z; } });
const pose = camera => ({ position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
  rotation: { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z } });
function event(type, properties = {}) { return Object.assign(new Event(type, { cancelable: true }), properties); }
function fixture() {
  const document = new EventTarget(); document.hidden = false; document.pointerLockElement = null;
  document.defaultView = new EventTarget();
  const canvas = new EventTarget(); canvas.ownerDocument = document;
  canvas.setPointerCapture = () => {}; canvas.releasePointerCapture = () => {};
  document.exitPointerLock = () => { document.pointerLockElement = null; document.dispatchEvent(event('pointerlockchange')); };
  canvas.requestPointerLock = () => { document.pointerLockElement = canvas; document.dispatchEvent(event('pointerlockchange')); };
  const camera = { position: vector(STANDING_POSE.position), rotation: vector({ x: 0, y: 0, z: 0 }) };
  const settings = { sensitivity: 1, headBob: false, volume: .7, subtitles: true,
    quality: 'balanced', grain: true, performance: false };
  let footsteps = 0;
  const player = createPlayer(canvas, camera, () => settings, () => [], () => { footsteps++; });
  return { document, canvas, camera, settings, player, get footsteps() { return footsteps; } };
}
const advance = (player, seconds) => { for (let i = 0; i < seconds * 60; i++) player.update(1 / 60); };

test('player: abertura e pausa não movem a câmera; ativação adota a pose final sem teleporte', () => {
  const { document, camera, player } = fixture();
  camera.position.set(BED_POSE.position.x, BED_POSE.position.y, BED_POSE.position.z);
  camera.rotation.set(BED_POSE.pitch, BED_POSE.yaw, BED_POSE.roll);
  const bed = pose(camera);
  document.dispatchEvent(event('keydown', { code: 'KeyW' })); advance(player, 5);
  assert.deepEqual(pose(camera), bed); assert.equal(player.enabled, false);
  camera.position.set(STANDING_POSE.position.x, STANDING_POSE.position.y, STANDING_POSE.position.z);
  camera.rotation.set(.01, .6, 0); const standing = pose(camera);
  player.activateFromCamera();
  assert.deepEqual(pose(camera), standing); assert.equal(player.enabled, true);
  player.update(0); assert.deepEqual(pose(camera), standing);
  document.dispatchEvent(event('keydown', { code: 'KeyW' })); advance(player, .5);
  assert.notDeepEqual(pose(camera).position, standing.position);
  player.setActive(false); const paused = pose(camera); advance(player, 3);
  assert.deepEqual(pose(camera), paused);
  player.setActive(true); advance(player, .5);
  assert.deepEqual(pose(camera), paused, 'held input is cleared when pausing');
  player.dispose();
});

test('player: Pointer Lock usa escala definida e sensibilidade muda imediatamente sem reorientar', () => {
  const { document, camera, settings, player } = fixture();
  camera.rotation.set(.1, .4, 0); player.activateFromCamera(); const initial = pose(camera);
  player.requestPointerLock(); assert.deepEqual(pose(camera), initial);
  document.dispatchEvent(event('mousemove', { movementX: 50, movementY: 20, clientX: 0, clientY: 0 }));
  assert.ok(Math.abs(camera.rotation.y - (.4 + 50 * LOOK_RADIANS_PER_PIXEL)) < 1e-9);
  settings.sensitivity = 2;
  document.dispatchEvent(event('mousemove', { movementX: 10, movementY: 10, clientX: 0, clientY: 0 }));
  assert.ok(Math.abs(camera.rotation.y - (.4 + 70 * LOOK_RADIANS_PER_PIXEL)) < 1e-9);
  document.dispatchEvent(event('mousemove', { movementX: 0, movementY: 100000, clientX: 0, clientY: 0 }));
  assert.ok(camera.rotation.x < Math.PI / 2 && camera.rotation.x > 1.3);
  player.setActive(false); const paused = pose(camera);
  document.dispatchEvent(event('mousemove', { movementX: 300, movementY: 20, clientX: 0, clientY: 0 }));
  assert.deepEqual(pose(camera), paused); player.dispose();
});

test('player: gesto de iniciar captura o mouse na abertura sem liberar movimento ou rotação', () => {
  const { document, canvas, camera, player } = fixture();
  camera.position.set(BED_POSE.position.x, BED_POSE.position.y, BED_POSE.position.z);
  camera.rotation.set(BED_POSE.pitch, BED_POSE.yaw, BED_POSE.roll);
  const opening = pose(camera);
  assert.equal(player.enabled, false);
  player.requestPointerLock();
  assert.equal(document.pointerLockElement, canvas, 'the start gesture captures before its browser activation expires');
  document.dispatchEvent(event('mousemove', { movementX: 300, movementY: 200, clientX: 0, clientY: 0 }));
  document.dispatchEvent(event('keydown', { code: 'KeyW' }));
  advance(player, 15);
  assert.deepEqual(pose(camera), opening);
  assert.equal(player.enabled, false, 'capturing the pointer cannot enable controls during the opening');
  player.dispose();
});

test('player: arrastar funciona sem Pointer Lock e não gira com mouse solto', () => {
  const { document, canvas, camera, player } = fixture();
  canvas.requestPointerLock = undefined; player.activateFromCamera();
  document.dispatchEvent(event('mousemove', { clientX: 100, clientY: 100 })); assert.equal(camera.rotation.y, 0);
  canvas.dispatchEvent(event('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 100 }));
  document.dispatchEvent(event('mousemove', { clientX: 140, clientY: 110 }));
  assert.ok(Math.abs(camera.rotation.y - 40 * LOOK_RADIANS_PER_PIXEL) < 1e-9);
  assert.ok(Math.abs(camera.rotation.x - 10 * LOOK_RADIANS_PER_PIXEL) < 1e-9);
  document.dispatchEvent(event('pointerup', { pointerId: 1 })); const released = pose(camera);
  document.dispatchEvent(event('mousemove', { clientX: 180, clientY: 140 }));
  assert.deepEqual(pose(camera), released); player.dispose();
});

test('player: frame longo, aba escondida e descarte não acumulam movimento nem input', () => {
  const { document, camera, player } = fixture();
  player.activateFromCamera(); document.dispatchEvent(event('keydown', { code: 'KeyW' }));
  const start = { ...player.position }; player.update(10);
  assert.ok(Math.hypot(player.position.x - start.x, player.position.z - start.z) <= .11);
  document.hidden = true; document.dispatchEvent(event('visibilitychange')); const hidden = pose(camera);
  advance(player, 10); assert.deepEqual(pose(camera), hidden);
  document.hidden = false; advance(player, .5); assert.deepEqual(pose(camera), hidden);
  player.dispose(); document.dispatchEvent(event('keydown', { code: 'KeyW' }));
  advance(player, 10); assert.deepEqual(pose(camera), hidden); assert.equal(player.enabled, false);
});

test('player: passos dependem de deslocamento físico e a opção de balanço permanece discreta', () => {
  const fixtureState = fixture(), { document, camera, settings, player } = fixtureState;
  player.activateFromCamera(); document.dispatchEvent(event('keydown', { code: 'KeyD' }));
  advance(player, 2); assert.equal(fixtureState.footsteps, 0, 'pressing into the nearby bed cannot play walking steps');
  document.dispatchEvent(event('keyup', { code: 'KeyD' })); player.clearInput();
  camera.position.set(STANDING_POSE.position.x, STANDING_POSE.position.y, STANDING_POSE.position.z); camera.rotation.set(0, 0, 0); player.activateFromCamera();
  settings.headBob = true; document.dispatchEvent(event('keydown', { code: 'KeyW' }));
  for (let i = 0; i < 60; i++) {
    player.update(1 / 60);
    assert.ok(Math.abs(camera.position.y - 4.65) <= .009, 'head bob stays under one centimetre');
  }
  assert.ok(fixtureState.footsteps > 0); player.dispose();
});
