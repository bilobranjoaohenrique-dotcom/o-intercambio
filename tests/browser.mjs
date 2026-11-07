import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { launchBrowser, openScene, assertHealthy, snapshot, waitPhase, waitIntro, startScene,
  finishOpening, capture, walkTo, aimInteraction } from './browser-helpers.mjs';

const browser=await launchBrowser();
let session=null;
const pictures=[];
const pressDialogue=async(page,count)=>{for(let i=0;i<count;i++){await page.keyboard.press('KeyE');await page.waitForTimeout(180);}};
try{
  session=await openScene(browser,'balanced');
  const {page}=session;
  await startScene(page);
  await waitIntro(page,4.8);
  await page.locator('#subtitle').waitFor({state:'visible'});
  assert.equal((await page.locator('#subtitleText').textContent()).trim(),'Ei, vem tomar café pra não se atrasar!');
  assert.equal((await snapshot(page)).dialogueAudio,false,'dialogue must not use audio');
  await finishOpening(page);pictures.push(await capture(page,'chapter-bedroom'));

  // Verify the door is a real collision, then open and cross it.
  await walkTo(page,{x:1.975,z:2.8});
  await page.keyboard.down('KeyW');await page.waitForTimeout(900);await page.keyboard.up('KeyW');
  assert.ok((await snapshot(page)).position.z<3.12,'the closed door blocks the player');
  await aimInteraction(page,'door',{x:1.975,y:4.65,z:3.3});
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__INTERCAMBIO__.door.isOpen);
  await walkTo(page,{x:1.975,z:4.6});
  await walkTo(page,{x:1.975,z:10.7});
  assert.equal((await snapshot(page)).chapterMission,'breakfast');
  await walkTo(page,{x:1.975,z:11.2});
  await page.waitForFunction(()=>window.__INTERCAMBIO__.chapterMission==='talk-parents');
  await walkTo(page,{x:1.4,z:15.5});
  await aimInteraction(page,'parents',{x:1.4,y:1.82,z:17.3});
  await page.keyboard.press('KeyE');
  await page.locator('#dialogueBox').waitFor({state:'visible'});
  await page.keyboard.press('KeyE'); // mother's greeting -> father's question
  await page.locator('#dialogueChoices button').first().click();
  await page.waitForFunction(()=>document.getElementById('dialogueText')?.textContent?.includes('Eu sabia'));
  await pressDialogue(page,4); // reply, conspiracy clue, mother's redirect and departure cue
  await page.waitForFunction(()=>window.__INTERCAMBIO__.chapterMission==='pack-suitcase');
  pictures.push(await capture(page,'chapter-breakfast'));

  // Pack and travel: fade, text-only goodbye, gate, flight, host family.
  await aimInteraction(page,'suitcase',{x:3.25,y:.45,z:15.6});
  await page.keyboard.press('KeyE');
  await waitPhase(page,'playing');
  await page.locator('#dialogueBox').waitFor({state:'visible'});
  await pressDialogue(page,2);
  await page.waitForFunction(()=>window.__INTERCAMBIO__.chapterMission==='airport-gate'&&!window.__INTERCAMBIO__.dialogue);
  await walkTo(page,{x:30,z:.4});
  await aimInteraction(page,'gate',{x:30,y:1.1,z:-1.8});
  await page.keyboard.press('KeyE');
  await waitPhase(page,'playing');
  await waitIntro(page,13.5).catch(()=>undefined);
  await aimInteraction(page,'seat',{x:56.5,y:1.5,z:-1.55});
  await page.keyboard.press('KeyE');
  await page.locator('#dialogueBox').waitFor({state:'visible'});
  await pressDialogue(page,3);
  await waitPhase(page,'playing');
  await waitIntro(page,13.5).catch(()=>undefined);
  await aimInteraction(page,'host',{x:86,y:1.82,z:0});
  await page.keyboard.press('KeyE');
  await page.locator('#dialogueBox').waitFor({state:'visible'});
  assert.match(await page.locator('#dialogueText').textContent(),/Bem-vindo/);
  await page.keyboard.press('Enter');
  await waitPhase(page,'complete');
  await page.locator('#endScreen').waitFor({state:'visible'});
  assert.match(await page.locator('#endScreen').textContent(),/Capítulo 1 concluído/i);
  pictures.push(await capture(page,'chapter-ending',{uiOnly:true}));
  const state=await snapshot(page);
  assert.equal(state.chapterMission,'complete');
  assert.deepEqual(state.errors,[]);
  assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-browser-results.json',JSON.stringify({status:'passed',pictures,renderer:state.renderer,webgl:state.webgl,meshes:state.meshes,vertices:state.vertices},null,2));
  console.log('VERIFIED: waking, physical door and stair collisions, breakfast choice, text-only dialogue, suitcase, airport, airplane and host-family ending.');
}catch(error){
  if(session)await session.page.screenshot({path:'/tmp/o-intercambio-browser-failure.png'}).catch(()=>{});
  writeFileSync('/tmp/o-intercambio-browser-results.json',JSON.stringify({pictures,error:String(error)},null,2));throw error;
}finally{await browser.close();}
