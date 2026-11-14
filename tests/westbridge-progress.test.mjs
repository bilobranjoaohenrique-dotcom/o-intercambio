import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {createChapterProgress}=await import('../src/game/narrative.ts');
const {parentsLocationForProgress}=await import('../src/game/parentsDeparture.ts');
const KEY='o-intercambio.chapter1.checkpoint.v1';
function storage(saved,run){
  const previous=globalThis.localStorage,values=new Map([[KEY,JSON.stringify(saved)]]);
  globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  try{return run(values);}finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
}
test('Westbridge: an old terminal-ending save continues the journey without discarding its story choice',()=>{
  storage({mission:'complete',choice:'nervous',completed:['talk-parents','pack-suitcase','plane-seat','find-host']},()=>{
    const progress=createChapterProgress();
    assert.equal(progress.mission,'westbridge-ride');assert.equal(progress.choice,'nervous');
    assert.ok(progress.completed.includes('pack-suitcase'));assert.ok(progress.completed.includes('find-host'));
    progress.advance('westbridge-explore');
    const restored=createChapterProgress();assert.equal(restored.mission,'westbridge-explore');
    assert.equal(restored.choice,'nervous');assert.ok(restored.completed.includes('westbridge-ride'));
    restored.advance('complete');assert.equal(createChapterProgress().mission,'complete');
  });
});
test('Westbridge: both new checkpoints keep the protagonist parents at their Brazilian airport',()=>{
  for(const mission of ['westbridge-ride','westbridge-explore'])storage({mission,choice:'excited',completed:['find-host']},()=>{
    const progress=createChapterProgress();assert.equal(progress.mission,mission);
    assert.equal(parentsLocationForProgress(progress.mission,progress.completed),'airport');
  });
});
test('Westbridge: restoring the active step never marks it complete',()=>{
  for(const mission of ['westbridge-ride','westbridge-explore'])storage({mission,choice:'nervous',completed:['find-host']},values=>{
    const progress=createChapterProgress();progress.advance(mission);
    assert.equal(progress.mission,mission);assert.deepEqual(progress.completed,['find-host']);
    const saved=JSON.parse(values.get(KEY));assert.equal(saved.mission,mission);
    assert.ok(!saved.completed.includes(mission));assert.equal(saved.choice,'nervous');
  });
});
