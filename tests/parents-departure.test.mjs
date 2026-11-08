import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { parentsLocationForProgress, CAR_PARENT_ANCHORS, setParentsLocationState } = await import('../src/game/parentsDeparture.ts');
const { createChapterProgress, schoolClue, missionLabels } = await import('../src/game/narrative.ts');
const { canEnterFamilyCar } = await import('../src/game/garageProgress.ts');
const { PARENT_ANCHORS, KITCHEN_FURNITURE } = await import('../src/game/kitchenLayout.ts');
const { isWalkable } = await import('../src/game/collision.ts');

test('despedida: missão salva determina uma única localização dos pais', () => {
  assert.equal(parentsLocationForProgress('breakfast', []), 'kitchen');
  assert.equal(parentsLocationForProgress('talk-parents', ['breakfast']), 'kitchen');
  assert.equal(parentsLocationForProgress('pack-suitcase', ['breakfast', 'talk-parents']), 'kitchen');
  for (const mission of ['enter-car', 'car-ready', 'airport-gate', 'plane-seat', 'find-host'])
    assert.equal(parentsLocationForProgress(mission, ['breakfast', 'talk-parents']), 'car');
  assert.equal(parentsLocationForProgress('talk-parents', ['breakfast', 'talk-parents']), 'kitchen');
  assert.equal(parentsLocationForProgress('pack-suitcase', ['breakfast', 'talk-parents', 'pack-suitcase']), 'car');
  assert.ok(CAR_PARENT_ANCHORS.father.position.z > CAR_PARENT_ANCHORS.mother.position.z,
    'the driver stays at the steering-wheel side of the parked car');
  assert.equal(CAR_PARENT_ANCHORS.father.yaw, CAR_PARENT_ANCHORS.mother.yaw);
});

test('despedida: recarga mantém os pais na cozinha até a mala ser coletada', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored = JSON.stringify({ mission: 'pack-suitcase', choice: 'excited', completed: ['breakfast', 'talk-parents'] });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => stored, setItem: (_key, value) => { stored = value; }, removeItem: () => { stored = null; },
  } });
  try {
    const progress = createChapterProgress();
    assert.equal(parentsLocationForProgress(progress.mission, progress.completed), 'kitchen');
    assert.equal(canEnterFamilyCar(progress.mission, progress.completed), false);
    progress.advance('enter-car');
    const restored = createChapterProgress();
    assert.equal(restored.mission, 'enter-car'); assert.equal(restored.choice, 'excited');
    assert.equal(parentsLocationForProgress(restored.mission, restored.completed), 'car');
    assert.equal(canEnterFamilyCar(restored.mission, restored.completed), true);
    assert.equal(restored.completed.filter(value => value === 'talk-parents').length, 1);
    restored.reset();
    assert.equal(parentsLocationForProgress(restored.mission, restored.completed), 'kitchen');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
  }
});

test('despedida: saem as colisões dos corpos e permanecem cadeira e mesa', () => {
  try {
    setParentsLocationState('kitchen');
    assert.equal(isWalkable(PARENT_ANCHORS.mother.position), false);
    setParentsLocationState('car');
    assert.equal(isWalkable(PARENT_ANCHORS.mother.position), true, 'the empty kitchen has no invisible mother');
    assert.equal(isWalkable(PARENT_ANCHORS.father.position), false, 'the existing empty chair remains solid');
    assert.equal(isWalkable(KITCHEN_FURNITURE.table), false);
  } finally { setParentsLocationState('kitchen'); }
});

test('despedida: falas finais e missões correspondem à mala e ao carro', () => {
  assert.deepEqual(schoolClue.slice(-2), [
    { speaker: 'MÃE', text: 'Filho, sobe lá e pega tua mala. Eu e teu pai vamos te esperar no carro, tá?' },
    { speaker: 'PAI', text: 'E vê se não esquece o passaporte!' },
  ]);
  assert.equal(missionLabels['pack-suitcase'], 'Suba e pegue sua mala');
  assert.equal(missionLabels['enter-car'], 'Vá até a garagem. Seus pais estão esperando.');
  assert.equal(canEnterFamilyCar('enter-car', ['breakfast', 'talk-parents']), false,
    'parents waiting in the car do not replace the suitcase requirement');
});
