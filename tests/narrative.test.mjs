import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) specifier += '.ts';
  return next(specifier, context);
} });
const { createDialogue, createChapterProgress, breakfastConversation, breakfastChoices, missionLabels } = await import('../src/game/narrative.ts');

test('narrativa: escolhas são texto e liberam resposta, pista e próxima missão', () => {
  const dialogue=createDialogue(),progress=createChapterProgress();
  let selected=null;
  assert.equal(dialogue.start(breakfastConversation,breakfastChoices,choice=>{selected=choice;}),true);
  assert.equal(dialogue.current.speaker,'MÃE');
  dialogue.advance();assert.equal(dialogue.current.speaker,'PAI');
  assert.equal(dialogue.choices.length,3);
  dialogue.advance(1);assert.equal(selected.id,'nervous');
  progress.select(selected.id);progress.advance('pack-suitcase');
  assert.equal(progress.label,missionLabels['pack-suitcase']);
  assert.deepEqual(progress.completed,['breakfast']);
  assert.equal(dialogue.active,false);
});

test('narrativa: checkpoints avançam uma missão por interação', () => {
  const progress=createChapterProgress();
  for(const mission of ['talk-parents','pack-suitcase','airport-gate','plane-seat','find-host','complete'])
    progress.advance(mission);
  assert.equal(progress.mission,'complete');
  assert.deepEqual(progress.completed,['breakfast','talk-parents','pack-suitcase','airport-gate','plane-seat','find-host']);
  progress.reset();assert.equal(progress.mission,'breakfast');assert.deepEqual(progress.completed,[]);
});
