import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import './register-typescript.mjs';
const { launchBrowser, snapshot, waitFrames, lookAt, aimInteraction, pause, capture, waitPhase } = await import('./browser-helpers.mjs');
const { WB_WALK_ROUTE, WB_WALK_SPAWN, WB_HOST_DOOR } = await import('../src/game/westbridgeLayout.ts');
const { HOST_HOUSE_SOURCE, HOST_HOUSE_SPAWN, HOST_HOUSE_EXIT, HOST_HOUSE_QA_TOUR,
  HOST_HOUSE_COLLISION_PROBE, HOST_HOUSE_SOLIDS, HOST_HOUSE_ROOM_POINTS, hhPoint } = await import('../src/game/hostHouseLayout.ts');

const BASE=process.env.INTERCAMBIO_URL||'http://127.0.0.1:5188';
const OUT=process.env.HOST_HOUSE_QA_OUT||'/tmp/host-house-qa';
const SAVE='o-intercambio.chapter1.checkpoint.v1';
mkdirSync(OUT,{recursive:true});
const fixture={mission:'westbridge-explore',choice:'nervous',completed:['breakfast','talk-parents','pack-suitcase',
  'enter-car','car-ready','airport-farewell','airport-gate','plane-seat','find-host','westbridge-ride']};
const errors=[],consoleErrors=[],failedAssets=[],requests=[],pictures=[],movement=[],checks=[];
let browser,page,entry,resumedInside,outside,resumedOutside,reentered,restart,paused;
const horizontal=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

function parentsRemainInBrazil(state){
  assert.equal(state.family.location,'airport');assert.equal(state.family.actorCount,2);
  assert.equal(state.family.kitchenVisibleCount,0);assert.equal(state.family.carVisibleCount,0);
  assert.equal(state.family.airportVisibleCount,0);assert.equal(state.dialogueAudio,false);
  assert.equal(state.audio.dialogueAudio,false);
}
function houseView(state){
  assert.equal(state.phase,'playing');assert.equal(state.chapterStage,'host-house');
  assert.equal(state.chapterMission,'host-house-explore');assert.equal(state.hostHouse.location,'inside');
  assert.equal(state.hostHouse.active,true);assert.equal(state.hostHouse.ready,true);
  assert.equal(state.hostHouse.source,HOST_HOUSE_SOURCE);assert.equal(state.hostHouse.allTexturesReady,true);
  assert.equal(state.hostHouse.foreignMeshesVisible,0);
  assert.equal(state.westbridge.scenery.active,false);assert.equal(state.dialogue,false);
  assert.deepEqual(state.errors,[]);parentsRemainInBrazil(state);
}
async function healthy(){
  assert.deepEqual(errors,[],'no uncaught browser errors');
  assert.deepEqual(consoleErrors,[],'no shader/runtime console errors');
  assert.deepEqual(failedAssets,[],'no failed assets');
}
async function startCurrent(expected){
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__INTERCAMBIO__&&document.getElementById('game')?.dataset.ready==='true',null,{timeout:240000});
  await page.locator('#startGame').click();
  await page.waitForFunction(stage=>window.__INTERCAMBIO__?.phase==='playing'&&window.__INTERCAMBIO__.chapterStage===stage,
    expected,{polling:'raf',timeout:240000});
  if(expected==='host-house')await page.waitForFunction(()=>window.__INTERCAMBIO__.hostHouse.allTexturesReady,null,{timeout:90000});
  await waitFrames(page,2);await healthy();
}
async function move(point,region='host-house'){
  const before=await snapshot(page);
  assert.equal(before.phase,'playing');assert.equal(before.chapterStage,region);
  if(horizontal(before.position,point)>=.13){
    await lookAt(page,{...point,y:before.position.y},.01);
    await page.keyboard.down('KeyW');
    try{await page.waitForFunction(point=>Math.hypot(window.__INTERCAMBIO__.position.x-point.x,
      window.__INTERCAMBIO__.position.z-point.z)<.13,point,{polling:'raf',timeout:90000});}
    finally{await page.keyboard.up('KeyW');}
    await waitFrames(page,2);
  }
  const state=await snapshot(page);assert.equal(state.chapterStage,region);
  assert.ok(horizontal(state.position,point)<.18,'real input reaches the measured waypoint');
  if(region==='host-house'){
    houseView(state);assert.ok(Math.abs(state.position.y-(state.hostHouse.navigation.elevation+1.65))<.07,
      'camera follows the accepted measured floor/stair elevation');
  }
  movement.push({action:'real W walking',region,target:point,position:state.position,navigation:state.hostHouse?.navigation});
  console.log('WALK',JSON.stringify(movement.at(-1)));
}
async function take(label,target){
  if(target)await lookAt(page,target);
  await waitFrames(page,3);houseView(await snapshot(page));
  const picture=await capture(page,label);pictures.push(picture);
  console.log('CAPTURE',picture.path);
}
async function stored(){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);}
async function keepW(frames){
  await page.keyboard.down('KeyW');try{await waitFrames(page,frames);}finally{await page.keyboard.up('KeyW');}
  await waitFrames(page,2);return(await snapshot(page)).position;
}
async function enterFromStreet(){
  for(const point of WB_WALK_ROUTE.slice(1))await move(point,'westbridge');
  await aimInteraction(page,'wb-house-door',WB_HOST_DOOR);await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__INTERCAMBIO__?.chapterStage==='host-house'&&window.__INTERCAMBIO__.phase==='playing',null,{timeout:240000});
  await page.waitForFunction(()=>window.__INTERCAMBIO__.hostHouse.allTexturesReady,null,{timeout:90000});
  await waitFrames(page,2);houseView(await snapshot(page));
}

try{
  browser=await launchBrowser();
  page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  page.setDefaultTimeout(60000);
  await page.addInitScript(({fixture,SAVE})=>{
    // Seed once per isolated tab; subsequent reloads exercise the actual save.
    if(!sessionStorage.getItem('host-house.qa.seeded')){
      localStorage.setItem(SAVE,JSON.stringify(fixture));
      localStorage.setItem('o-intercambio.settings.v1',JSON.stringify({sensitivity:1,headBob:false,volume:0,
        subtitles:true,quality:'balanced',grain:false,performance:false}));
      sessionStorage.setItem('host-house.qa.seeded','1');
    }
  },{fixture,SAVE});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)failedAssets.push(`${response.status()} ${response.url()}`);});
  page.on('request',request=>{if(request.url().includes(HOST_HOUSE_SOURCE))requests.push(request.url());});
  await startCurrent('westbridge');
  assert.equal(requests.length,0,'supplied house is not requested at startup or while walking outside');
  await enterFromStreet();entry=await snapshot(page);
  assert.equal(requests.length,1,'the house loads only when its entrance is used');
  assert.ok(horizontal(entry.position,HOST_HOUSE_SPAWN)<.08);
  let saved=await stored();assert.equal(saved.mission,'host-house-explore');assert.equal(saved.hostHouseLocation,'inside');
  assert.equal(saved.choice,'nervous');assert.ok(!saved.completed.includes('host-house-explore'));
  checks.push('real exterior-door E loads the supplied house without ending the chapter');
  await take('host-house-foyer',hhPoint(52,1.8,37));

  const reverseRoute=[HOST_HOUSE_SPAWN];
  for(const segment of HOST_HOUSE_QA_TOUR){
    for(const point of segment.points){await move(point);reverseRoute.push(point);}
    await take('host-house-'+segment.id,segment.lookAt);
    if(segment.id==='living-room'){
      // Face the sofa perpendicular to its front, so sliding along its side
      // cannot be mistaken for passing through its collider.
      const probe=HOST_HOUSE_COLLISION_PROBE,approach={...probe.approach,x:probe.target.x};
      await move(approach);await lookAt(page,{...probe.target,x:approach.x,y:approach.y},.003);
      const blocked=await keepW(12),stopped=await keepW(6),solid=HOST_HOUSE_SOLIDS.find(s=>s.name===probe.solidName);
      assert.ok(solid);assert.ok(horizontal(blocked,stopped)<.03,'sofa stops continued real W input');
      assert.ok(Math.abs(stopped.z-solid.z)>solid.halfDepth+.17,'the player stays outside the supplied sofa footprint');
      movement.push({action:'sofa blocks continued real W',solid:probe.solidName,blocked,stopped});
      await move(approach);await move(probe.approach);
    }
  }
  checks.push('real walking visits living room and kitchen, climbs the supplied staircase and reaches the player bedroom');
  await pause(page);const pauseBefore=(await snapshot(page)).position;await waitFrames(page,4);
  paused=await snapshot(page);assert.deepEqual(paused.position,pauseBefore);assert.equal(paused.phase,'paused');
  await page.locator('#resume').click();await waitPhase(page,'playing');houseView(await snapshot(page));
  checks.push('pause freezes movement inside the house');

  for(const point of [...reverseRoute].reverse()){
    await move(point);
    if(Math.abs(point.y-HOST_HOUSE_SPAWN.y)<.01&&horizontal(point,HOST_HOUSE_ROOM_POINTS.foyer)<.05)break;
  }
  await move(HOST_HOUSE_SPAWN);
  await aimInteraction(page,'host-house-exit',HOST_HOUSE_EXIT);
  const blocked=await keepW(10),stopped=await keepW(6);
  assert.ok(horizontal(blocked,stopped)<.03,'front wall/closed exit prevents walking out without interaction');
  movement.push({action:'closed exit blocks continued real W',blocked,stopped});
  await aimInteraction(page,'host-house-exit',HOST_HOUSE_EXIT);

  // Reload here proves the interior checkpoint, not a camera test hook.
  await startCurrent('host-house');resumedInside=await snapshot(page);houseView(resumedInside);
  assert.ok(horizontal(resumedInside.position,HOST_HOUSE_SPAWN)<.08);
  saved=await stored();assert.equal(saved.hostHouseLocation,'inside');assert.equal(saved.choice,'nervous');
  assert.ok(!saved.completed.includes('host-house-explore'));
  await aimInteraction(page,'host-house-exit',HOST_HOUSE_EXIT);await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__INTERCAMBIO__?.phase==='playing'&&window.__INTERCAMBIO__.chapterStage==='westbridge',null,{timeout:240000});
  await waitFrames(page,2);outside=await snapshot(page);
  assert.equal(outside.hostHouse.active,false);assert.equal(outside.hostHouse.location,'outside');
  assert.equal(outside.chapterMission,'host-house-explore');assert.equal(outside.westbridge.scenery.foreignMeshesVisible,0);
  assert.equal(outside.westbridge.drive.occupied,false);assert.equal(outside.westbridge.drive.parked,true);parentsRemainInBrazil(outside);
  saved=await stored();assert.equal(saved.hostHouseLocation,'outside');assert.ok(!saved.completed.includes('host-house-explore'));
  checks.push('reload restores the hall; E exits to the existing neighbourhood without completing house exploration');

  await startCurrent('westbridge');resumedOutside=await snapshot(page);
  assert.equal(resumedOutside.hostHouse.location,'outside');assert.equal(resumedOutside.chapterMission,'host-house-explore');
  assert.ok(horizontal(resumedOutside.position,WB_WALK_SPAWN)<.15);
  await enterFromStreet();reentered=await snapshot(page);houseView(reentered);
  checks.push('outside checkpoint reload and real-door reentry preserve the story choice and parked car');
  await pause(page);await page.locator('#restart').click();await waitPhase(page,'opening');await waitFrames(page,3);
  restart=await snapshot(page);assert.equal(restart.chapterStage,'home');assert.equal(restart.chapterMission,'breakfast');
  assert.equal(restart.hostHouse.active,false);assert.equal(restart.westbridge.scenery.active,false);
  assert.deepEqual(restart.plane.scenery.camera,{fov:1.13,minZ:.045,maxZ:95});
  assert.equal(restart.family.location,'kitchen');assert.equal(restart.audio.westbridge.activeSources,0);
  checks.push('restart restores the Brazilian bedroom, earlier navigation/visibility, camera projection and family state');
  await healthy();
  writeFileSync(`${OUT}/results.json`,JSON.stringify({status:'passed',checks,pictures,movement,entry,resumedInside,
    outside,resumedOutside,reentered,restart,paused,requests,errors,consoleErrors,failedAssets,
    method:'Real Babylon.js game; supported checkpoints seed the route, then mouse/WASD/E drive all movement and transitions. No camera, position or clock setters.',
    limits:['The previous home, Brazilian airport, flight and 32-second car trip were not repeated.',
      'Chromium/Linux SwiftShader software renderer; this is functional and visual QA, not a physical GPU/mobile FPS benchmark.']},null,2));
  console.log('PASS HOST HOUSE: real entrance → rooms/stairs → return → checkpoints → reentry → restart');
}catch(error){
  if(page)await page.screenshot({path:`${OUT}/failure.png`}).catch(()=>{});
  writeFileSync(`${OUT}/results.json`,JSON.stringify({status:'failed',error:String(error),checks,pictures,movement,
    state:page?await snapshot(page).catch(()=>null):null,entry,resumedInside,outside,resumedOutside,reentered,restart,
    requests,errors,consoleErrors,failedAssets},null,2));
  throw error;
}finally{await browser?.close();}
