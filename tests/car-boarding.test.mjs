import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { CAR_BACK_SEAT, FAMILY_CAR } = await import('../src/game/garageLayout.ts');
const { CAR_PARENT_ANCHORS, parentsLocationForProgress } = await import('../src/game/parentsDeparture.ts');
const { createChapterProgress, missionLabels } = await import('../src/game/narrative.ts');
const { canEnterFamilyCar } = await import('../src/game/garageProgress.ts');

test('embarque: olhos ficam dentro da cabine e atrás dos dois bancos dianteiros', () => {
  const seat = CAR_BACK_SEAT.position;
  const forward = { x: Math.sin(FAMILY_CAR.yaw), z: Math.cos(FAMILY_CAR.yaw) };
  const right = { x: Math.cos(FAMILY_CAR.yaw), z: -Math.sin(FAMILY_CAR.yaw) };
  const offset = { x: seat.x - FAMILY_CAR.x, z: seat.z - FAMILY_CAR.z };
  assert.ok(Math.abs(offset.x * forward.x + offset.z * forward.z) < FAMILY_CAR.length / 2 - .35);
  assert.ok(Math.abs(offset.x * right.x + offset.z * right.z) < FAMILY_CAR.width / 2 - .25);
  assert.ok(seat.y > 1.1 && seat.y < FAMILY_CAR.height - .08, 'eye is above the bench and below the roof');
  for (const parent of Object.values(CAR_PARENT_ANCHORS)) {
    const ahead = (parent.position.x - seat.x) * forward.x + (parent.position.z - seat.z) * forward.z;
    assert.ok(ahead > .6 && ahead < 1.3, 'both parents sit naturally in front of the protagonist');
  }
  assert.ok(Math.cos(CAR_BACK_SEAT.yaw - FAMILY_CAR.yaw) > .99, 'initial view faces the front seats');
});

test('embarque: checkpoint no banco traseiro conserva mala, escolha e pais no carro', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored = JSON.stringify({ mission: 'enter-car', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase'] });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => stored, setItem: (_key, value) => { stored = value; }, removeItem: () => { stored = null; },
  } });
  try {
    const progress = createChapterProgress();
    assert.equal(canEnterFamilyCar(progress.mission, progress.completed), true);
    progress.advance('car-ready');
    const restored = createChapterProgress();
    assert.equal(restored.mission, 'car-ready');
    assert.equal(restored.choice, 'nervous');
    assert.equal(restored.completed.filter(mission => mission === 'pack-suitcase').length, 1);
    assert.equal(parentsLocationForProgress(restored.mission, restored.completed), 'car');
    assert.equal(restored.completed.includes('airport-gate'), false, 'boarding does not complete the airport objective');
    assert.equal(restored.label, missionLabels['car-ready']);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
  }
});

test('embarque: pegar a mala é obrigatório e o checkpoint sentado não embarca novamente', () => {
  assert.equal(canEnterFamilyCar('enter-car', ['breakfast', 'talk-parents']), false);
  assert.equal(canEnterFamilyCar('pack-suitcase', ['breakfast', 'talk-parents', 'pack-suitcase']), false);
  assert.equal(canEnterFamilyCar('enter-car', ['breakfast', 'talk-parents', 'pack-suitcase']), true);
  assert.equal(canEnterFamilyCar('car-ready', ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car']), false);
  assert.notEqual(missionLabels['car-ready'], missionLabels['airport-gate']);
});
