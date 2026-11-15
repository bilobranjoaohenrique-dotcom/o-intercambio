import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { createChapterProgress } = await import('../src/game/narrative.ts');
const { parentsLocationForProgress } = await import('../src/game/parentsDeparture.ts');
const KEY = 'o-intercambio.chapter1.checkpoint.v1';
function storage(saved, run) {
  const previous = globalThis.localStorage, values = new Map();
  if (saved !== null) values.set(KEY, JSON.stringify(saved));
  globalThis.localStorage = { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key) };
  try { return run(values); }
  finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
}

test('host house: a save that previously ended at the entrance continues outside without discarding the choice', () => {
  const completed = ['pack-suitcase','find-host','westbridge-ride','westbridge-explore'];
  storage({ mission:'complete', choice:'nervous', completed }, values => {
    const progress = createChapterProgress();
    assert.equal(progress.mission,'host-house-explore');
    assert.equal(progress.hostHouseLocation,'outside');
    assert.equal(progress.choice,'nervous');
    assert.deepEqual(progress.completed,completed);
    progress.advance(progress.mission);
    const saved = JSON.parse(values.get(KEY));
    assert.equal(saved.hostHouseLocation,'outside');
    assert.ok(!saved.completed.includes('host-house-explore'));
    assert.equal(parentsLocationForProgress(progress.mission,progress.completed),'airport');
  });
});

test('host house: entering and leaving persist location without completing the exploration', () => {
  storage({ mission:'westbridge-explore', choice:'excited', completed:['pack-suitcase','find-host','westbridge-ride'] }, values => {
    const progress = createChapterProgress();
    progress.setHostHouseLocation('inside'); progress.advance('host-house-explore');
    const inside = createChapterProgress();
    assert.equal(inside.mission,'host-house-explore'); assert.equal(inside.hostHouseLocation,'inside');
    assert.equal(inside.choice,'excited'); assert.ok(inside.completed.includes('westbridge-explore'));
    assert.ok(!inside.completed.includes('host-house-explore'));
    inside.setHostHouseLocation('outside');
    const outside = createChapterProgress();
    assert.equal(outside.hostHouseLocation,'outside'); assert.equal(outside.mission,'host-house-explore');
    assert.equal(outside.choice,'excited'); assert.deepEqual(outside.completed,inside.completed);
    outside.setHostHouseLocation('inside');
    const saved = JSON.parse(values.get(KEY));
    assert.equal(saved.hostHouseLocation,'inside'); assert.equal(saved.mission,'host-house-explore');
    assert.ok(!saved.completed.includes('host-house-explore'));
  });
});

test('host house: malformed locations default inside and reset clears the new checkpoint state', () => {
  for (const location of [undefined,null,true,17,'garden',{},['outside']]) {
    storage({ mission:'host-house-explore', choice:'miss', completed:['westbridge-explore'], hostHouseLocation:location }, values => {
      const progress = createChapterProgress();
      assert.equal(progress.hostHouseLocation,'inside'); assert.equal(progress.choice,'miss');
      progress.setHostHouseLocation('outside'); progress.reset();
      assert.equal(progress.mission,'breakfast'); assert.equal(progress.hostHouseLocation,'inside');
      assert.equal(progress.choice,null); assert.deepEqual(progress.completed,[]); assert.equal(values.has(KEY),false);
    });
  }
});

test('host house: terminal-ending migration and genuinely completed house saves retain their established meanings', () => {
  storage({ mission:'complete', choice:'nervous', completed:['find-host'] }, () => {
    const progress = createChapterProgress(); assert.equal(progress.mission,'westbridge-ride'); assert.equal(progress.choice,'nervous');
  });
  storage({ mission:'complete', choice:'miss', completed:['find-host','westbridge-explore','host-house-explore'], hostHouseLocation:'outside' }, () => {
    const progress = createChapterProgress(); assert.equal(progress.mission,'complete'); assert.equal(progress.choice,'miss');
    assert.equal(progress.hostHouseLocation,'outside');
  });
});
