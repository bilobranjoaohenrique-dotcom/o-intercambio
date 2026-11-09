import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { clampLook, createPlaneSequence, PLANE_REFLECTIONS, PLANE_MINIMUM_SECONDS, PLANE_AUTO_SECONDS } = await import('../src/game/planeSequence.ts');
const { PLANE_SEAT, PLANE_WINDOW, PLANE_LOOK_LIMITS } = await import('../src/game/planeLayout.ts');

function fixture() {
  const camera = { position: { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } }, rotation: { x: 0, y: 0, z: 0 } };
  const control = { movement: true, clearInput() {}, adoptCameraPose() {}, setMovementEnabled(value) { this.movement = value; } };
  return { camera, control, sequence: createPlaneSequence(camera, control) };
}
function advanceUntil(sequence, predicate, limit = 1000) {
  for (let tick = 0; tick < limit && !predicate(); tick++) sequence.update(.1);
  assert.ok(predicate(), 'the short flight interaction must reach the expected state');
}
const point = camera => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z });

test('avião: olhar sentado respeita os limites sem mudar orientações válidas', () => {
  for (const yaw of [-100, -Math.PI, -1.7, 0, .8, 1.7, Math.PI, 100]) {
    for (const pitch of [-100, 100]) {
      const result = clampLook(yaw, pitch, PLANE_LOOK_LIMITS);
      assert.ok(result.yaw >= PLANE_LOOK_LIMITS.centerYaw + PLANE_LOOK_LIMITS.minYaw - 1e-12);
      assert.ok(result.yaw <= PLANE_LOOK_LIMITS.centerYaw + PLANE_LOOK_LIMITS.maxYaw + 1e-12);
      assert.ok(result.pitch >= PLANE_LOOK_LIMITS.minPitch && result.pitch <= PLANE_LOOK_LIMITS.maxPitch);
    }
  }
  const natural = clampLook(-.45, .02, PLANE_LOOK_LIMITS);
  assert.ok(Math.abs(natural.yaw + .45) < 1e-12); assert.equal(natural.pitch, .02);
});

test('avião: foco suave mostra duas reflexões e retorna à posição sentada', () => {
  const { camera, control, sequence } = fixture(); sequence.enter();
  assert.deepEqual(point(camera), PLANE_SEAT.position); assert.equal(control.movement, false);
  assert.equal(sequence.observe(), true); sequence.update(.3);
  assert.equal(sequence.moving, true);
  assert.notDeepEqual(point(camera), PLANE_SEAT.position);
  assert.notDeepEqual(point(camera), PLANE_WINDOW.focusPose.position);
  advanceUntil(sequence, () => sequence.state === 'window');
  assert.deepEqual(point(camera), PLANE_WINDOW.focusPose.position);
  assert.equal(sequence.subtitle, PLANE_REFLECTIONS[0]);
  advanceUntil(sequence, () => sequence.diagnostics.reflectionElapsed >= 4.3);
  assert.equal(sequence.subtitle, PLANE_REFLECTIONS[1]);
  assert.equal(sequence.canContinue, false, 'the first moment of reflection does not unlock arrival');
  advanceUntil(sequence, () => sequence.diagnostics.reflectionComplete);
  assert.equal(sequence.subtitle, null);
  assert.equal(sequence.returnToSeat(), true);
  advanceUntil(sequence, () => sequence.state === 'seat');
  assert.deepEqual(point(camera), PLANE_SEAT.position); assert.equal(control.movement, false);
});

test('avião: aguardar sozinho não pula a reflexão; saída exige o momento narrativo', () => {
  const { sequence } = fixture(); sequence.enter();
  for (let tick = 0; tick < (PLANE_AUTO_SECONDS + 1) * 10; tick++) sequence.update(.1);
  assert.equal(sequence.canContinue, false); assert.equal(sequence.autoContinue, false);
  sequence.enter(); sequence.observe();
  advanceUntil(sequence, () => sequence.diagnostics.reflectionComplete);
  assert.equal(sequence.canContinue, false, 'both texts precede the minimum contemplative interval');
  advanceUntil(sequence, () => sequence.diagnostics.elapsed >= PLANE_MINIMUM_SECONDS + .1);
  assert.equal(sequence.canContinue, true); assert.equal(sequence.autoContinue, false);
  advanceUntil(sequence, () => sequence.diagnostics.elapsed >= PLANE_AUTO_SECONDS + .1);
  assert.equal(sequence.autoContinue, true);
});
