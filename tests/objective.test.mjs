import { registerHooks } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) specifier += '.ts';
  return next(specifier, context);
} });
const { createBreakfastObjective } = await import('../src/game/objective.ts');
const { STAIRS } = await import('../src/game/layout.ts');
const finalStep = { x: 2, z: STAIRS.endZ - .05 };

test('objetivo: abertura pendente não conclui a missão mesmo sobre o último degrau', () => {
  const objective = createBreakfastObjective();
  assert.equal(objective.state, 'pending');
  assert.equal(objective.update(finalStep), false);
  assert.equal(objective.state, 'pending');
  objective.activate();
  assert.equal(objective.state, 'active');
});

test('objetivo: somente último degrau caminhável conclui e emite uma única transição', () => {
  const objective = createBreakfastObjective(); objective.activate();
  for (const point of [{ x: 2, z: STAIRS.startZ }, { x: 2, z: STAIRS.endZ - .4 },
    { x: -2, z: STAIRS.endZ }, { x: NaN, z: STAIRS.endZ }]) {
    assert.equal(objective.update(point), false);
    assert.equal(objective.state, 'active');
  }
  assert.equal(objective.update(finalStep), true);
  assert.equal(objective.state, 'complete');
  assert.equal(objective.update(finalStep), false);
  objective.activate();
  assert.equal(objective.state, 'complete', 'activation cannot grant a completed objective again');
  assert.equal(objective.update(finalStep), false);
});

test('objetivo: reiniciar retorna a pendente e permite outra conclusão após ativação', () => {
  const objective = createBreakfastObjective(); objective.activate();
  assert.equal(objective.update(finalStep), true);
  objective.reset();
  assert.equal(objective.state, 'pending');
  assert.equal(objective.update(finalStep), false);
  objective.activate();
  assert.equal(objective.update(finalStep), true);
  assert.equal(objective.update(finalStep), false);
});
