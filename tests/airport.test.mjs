import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { airportGoodbye, createDialogue, createChapterProgress, missionLabels } = await import('../src/game/narrative.ts');
const { canBoardAtAirport, sampleGarageExit, farewellGesture, AIRPORT_FAREWELL_DURATION } = await import('../src/game/airportProgress.ts');
const { AIRPORT, AIRPORT_ARRIVAL, AIRPORT_PARENTS, AIRPORT_GATE, AIRPORT_ROUTE, AIRPORT_SOLIDS } = await import('../src/game/airportLayout.ts');
const { isWalkable, floorHeight, moveWithCollisions } = await import('../src/game/collision.ts');

export const AIRPORT_LINES = [
  { speaker: 'MÃE', text: 'Meu filho... parece que foi ontem que você era pequeno.' },
  { speaker: 'VOCÊ', text: 'Mãe, não começa...' },
  { speaker: 'MÃE', text: 'Eu sei, eu sei. É que vou sentir muita saudade.' },
  { speaker: 'PAI', text: 'Você vai viver uma experiência incrível. Aproveita cada momento.' },
  { speaker: 'VOCÊ', text: 'Vou tentar.' },
  { speaker: 'PAI', text: 'E lembra de uma coisa: não importa o que acontecer, você sempre pode contar com a gente.' },
  { speaker: 'MÃE', text: 'Me liga assim que chegar, tá? Não esquece.' },
  { speaker: 'VOCÊ', text: 'Pode deixar. Amo vocês.' },
  { speaker: 'MÃE', text: 'A gente também te ama.' },
];

test('aeroporto: despedida usa as nove falas textuais e conclui somente após a última', () => {
  assert.deepEqual(airportGoodbye, AIRPORT_LINES);
  const dialogue = createDialogue();
  assert.equal(dialogue.start(airportGoodbye), true);
  for (let index = 0; index < AIRPORT_LINES.length; index++) {
    assert.deepEqual(dialogue.current, AIRPORT_LINES[index]);
    assert.deepEqual(dialogue.choices, []);
    assert.equal(dialogue.advance().done, index === AIRPORT_LINES.length - 1);
  }
  assert.equal(dialogue.active, false);
});

test('aeroporto: corredor até o portão 24 é caminhável e os assentos e pais permanecem sólidos', () => {
  let point = { x: AIRPORT_ARRIVAL.position.x, z: AIRPORT_ARRIVAL.position.z };
  assert.ok(isWalkable(point)); assert.equal(floorHeight(point), 0);
  for (const target of AIRPORT_ROUTE) {
    const dx = target.x - point.x, dz = target.z - point.z;
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .025));
    for (let step = 0; step < count; step++) {
      point = moveWithCollisions(point, dx / count, dz / count);
      assert.ok(isWalkable(point)); assert.equal(floorHeight(point), 0);
    }
    assert.ok(Math.hypot(point.x - target.x, point.z - target.z) < 1e-6);
  }
  assert.ok(Math.hypot(point.x - AIRPORT_GATE.x, point.z - AIRPORT_GATE.z) < 1.2, 'route reaches the boarding interaction');
  assert.equal(isWalkable(AIRPORT_SOLIDS[0]), false, 'metal benches have a solid footprint');
  for (const parent of Object.values(AIRPORT_PARENTS)) assert.equal(isWalkable(parent.position), false);
  assert.equal(isWalkable({ x: AIRPORT.maxX + .1, z: 0 }), false, 'the small terminal cannot be left through its walls');
});

test('aeroporto: abertura fica visível antes do preto e o gesto termina antes de liberar o embarque', () => {
  assert.equal(sampleGarageExit(0).fade, 0);
  assert.equal(sampleGarageExit(.5).fade, 0, 'the gate starts opening before screen fade');
  assert.equal(sampleGarageExit(.5).finished, false);
  assert.deepEqual(sampleGarageExit(100), { fade: 1, finished: true });
  assert.equal(farewellGesture(0), 0);
  assert.ok(farewellGesture(AIRPORT_FAREWELL_DURATION / 2) > .9);
  assert.ok(Math.abs(farewellGesture(AIRPORT_FAREWELL_DURATION)) < 1e-6, 'the closing gesture settles before walking resumes');
});

test('aeroporto: missão antiga sem despedida volta à conversa e não libera o portão', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => JSON.stringify({ mission: 'airport-gate', choice: 'excited',
      completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car'] }),
    setItem: () => {}, removeItem: () => {},
  } });
  try {
    const old = createChapterProgress();
    assert.equal(old.mission, 'airport-farewell');
    assert.equal(old.completed.includes('airport-farewell'), false);
    assert.equal(canBoardAtAirport(old.mission, old.completed), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
  }
  assert.equal(canBoardAtAirport('airport-farewell', ['pack-suitcase']), false);
  assert.equal(canBoardAtAirport('airport-gate', ['pack-suitcase']), false);
  assert.equal(canBoardAtAirport('airport-gate', ['airport-farewell']), true);
  assert.equal(canBoardAtAirport('plane-seat', ['airport-farewell']), false);
});

test('aeroporto: checkpoint distingue conversa pendente de acesso ao embarque', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let saved = JSON.stringify({ mission: 'airport-farewell', choice: 'nervous',
    completed: ['breakfast', 'talk-parents', 'pack-suitcase', 'enter-car', 'car-ready'] });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => saved, setItem: (_key, value) => { saved = value; }, removeItem: () => { saved = null; },
  } });
  try {
    const before = createChapterProgress();
    assert.equal(before.mission, 'airport-farewell');
    assert.equal(before.completed.includes('airport-farewell'), false);
    assert.equal(before.choice, 'nervous');
    before.advance('airport-gate');
    const after = createChapterProgress();
    assert.equal(after.mission, 'airport-gate');
    assert.equal(after.completed.filter(mission => mission === 'airport-farewell').length, 1);
    assert.equal(after.label, 'Dirija-se ao portão de embarque.');
    assert.notEqual(missionLabels['airport-farewell'], missionLabels['airport-gate']);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
  }
});
