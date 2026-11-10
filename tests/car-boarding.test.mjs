import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { parentsLocationForProgress } = await import('../src/game/parentsDeparture.ts');
const { createChapterProgress, missionLabels } = await import('../src/game/narrative.ts');
const { canEnterFamilyCar } = await import('../src/game/garageProgress.ts');

test('viagem: checkpoint antigo do banco traseiro retoma a despedida no aeroporto', () => {
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
    assert.equal(restored.mission, 'airport-farewell');
    assert.equal(restored.choice, 'nervous');
    assert.equal(restored.completed.filter(mission => mission === 'pack-suitcase').length, 1);
    assert.equal(parentsLocationForProgress(restored.mission, restored.completed), 'airport');
    assert.equal(restored.completed.filter(mission => mission === 'car-ready').length, 1);
    assert.equal(restored.completed.includes('airport-gate'), false, 'boarding does not complete the airport objective');
    assert.equal(restored.label, missionLabels['airport-farewell']);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
  }
});

test('viagem: pegar a mala é obrigatório e a partida não pode ser repetida', () => {
  assert.equal(canEnterFamilyCar('enter-car', ['breakfast', 'talk-parents']), false);
  assert.equal(canEnterFamilyCar('pack-suitcase', ['breakfast', 'talk-parents', 'pack-suitcase']), false);
  assert.equal(canEnterFamilyCar('enter-car', ['breakfast', 'talk-parents', 'pack-suitcase']), true);
  assert.equal(canEnterFamilyCar('car-ready', ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car']), false);
  assert.notEqual(missionLabels['car-ready'], missionLabels['airport-gate']);
});
