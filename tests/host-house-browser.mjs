import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import './register-typescript.mjs';
const { launchBrowser, snapshot, waitFrames, lookAt, pause, capture, waitPhase } = await import('./browser-helpers.mjs');
const { WB_WALK_ROUTE, WB_WALK_SPAWN, WB_HOST_DOOR, WB_HOST_APPROACH } = await import('../src/game/westbridgeLayout.ts');
const { HOST_HOUSE_SOURCE, HOST_HOUSE_SPAWN, HOST_HOUSE_EXIT, HOST_HOUSE_QA_TOUR,
  HOST_HOUSE_UPPER_BRANCHES, HOST_HOUSE_GARAGE_TOUR, HOST_HOUSE_ROOM_POINTS, hhLocalPoint } = await import('../src/game/hostHouseLayout.ts');

const BASE=process.env.INTERCAMBIO_URL||'http://127.0.0.1:5188';
const OUT=process.env.HOST_HOUSE_QA_OUT||'/tmp/a01-browser-qa';
const SAVE='o-intercambio.chapter1.checkpoint.v1';
mkdirSync(OUT,{recursive:true});
const fixture={mission:'westbridge-explore',choice:'nervous',completed:['breakfast','talk-parents','pack-suitcase',
  'enter-car','car-ready','airport-farewell','airport-gate','plane-seat','find-host','westbridge-ride']};
const errors=[],consoleErrors=[],failedAssets=[],requests=[],pictures=[],movement=[],checks=[];
let browser,page,entry,resumedInside,outside,resumedOutside,reentered,restart,paused;
const horizontal=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const doorIds=['wb-house-door','host-house-exit'];

function parentsRemainInBrazil(state){
  assert.equal(state.family.location,'airport');assert.equal(state.family.actorCount,2);
  assert.equal(state.family.kitchenVisibleCount,0);assert.equal(state.family.carVisibleCount,0);
  assert.equal(state.family.airportVisibleCount,0);assert.equal(state.dialogueAudio,false);
  assert.equal(state.audio.dialogueAudio,false);
}
function neighbourhoodView(state,stage='host-house'){
  assert.equal(state.phase,'playing');assert.equal(state.chapterStage,stage);
  assert.equal(state.hostHouse.active,true);assert.equal(state.hostHouse.ready,true);
  assert.equal(state.hostHouse.source,HOST_HOUSE_SOURCE);assert.equal(state.hostHouse.allTexturesReady,true);
  assert.equal(state.hostHouse.foreignMeshesVisible,0);
  assert.equal(state.westbridge.scenery.active,true);assert.equal(state.dialogue,false);
  assert.deepEqual(state.errors,[]);parentsRemainInBrazil(state);
  if(stage==='host-house')assert.equal(state.chapterMission,'host-house-explore');
}
function houseView(state){neighbourhoodView(state);assert.equal(state.hostHouse.location,'inside');}
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
  await page.waitForFunction(()=>window.__INTERCAMBIO__.hostHouse.allTexturesReady&&window.__INTERCAMBIO__.westbridge.scenery.allTexturesReady,null,{timeout:90000});
  await waitFrames(page,2);await healthy();
}
async function move(point,region='host-house',tolerance=.10){
  let state=await snapshot(page);assert.equal(state.phase,'playing');assert.equal(state.chapterStage,region);
  let attempts=0;
  while(horizontal(state.position,point)>tolerance&&attempts++<4){
    await lookAt(page,{...point,y:state.position.y},.006);await page.keyboard.down('KeyW');
    try{await page.waitForFunction(({point,tolerance})=>Math.hypot(window.__INTERCAMBIO__.position.x-point.x,
      window.__INTERCAMBIO__.position.z-point.z)<tolerance,{point,tolerance},{polling:'raf',timeout:90000});}
    finally{await page.keyboard.up('KeyW');}
    await waitFrames(page,3);state=await snapshot(page);
  }
  movement.push({action:'real W walking',region,target:point,position:state.position,navigation:state.hostHouse?.navigation,
    attempts,distance:horizontal(state.position,point)});console.log('WALK',JSON.stringify(movement.at(-1)));
  assert.ok(horizontal(state.position,point)<.28,'real input reaches the measured area after correcting a delayed key-up');
  assert.equal(state.chapterStage,region);
  if(region==='host-house'){
    neighbourhoodView(state);assert.ok(Math.abs(state.position.y-(state.hostHouse.navigation.elevation+1.65))<.10,
      'camera follows the accepted measured floor/stair elevation');
  }
}
async function follow(points,region='host-house'){
  for(const point of points)await move(point,region);
}
async function take(label,target){
  if(target)await lookAt(page,target);
  await waitFrames(page,3);neighbourhoodView(await snapshot(page));
  const picture=await capture(page,label);pictures.push(picture);console.log('CAPTURE',picture.path);
}
async function stored(){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);}
async function keepW(frames){
  await page.keyboard.down('KeyW');try{await waitFrames(page,frames);}finally{await page.keyboard.up('KeyW');}
  await waitFrames(page,2);return(await snapshot(page)).position;
}
async function aimDoor(){
  for(const [dx,dy]of[[0,0],[.2,0],[-.2,0],[0,.25],[0,-.25]]){
    await lookAt(page,{x:HOST_HOUSE_EXIT.x+dx,y:HOST_HOUSE_EXIT.y+dy,z:HOST_HOUSE_EXIT.z},.012);
    await waitFrames(page,2);
    if(doorIds.includes((await snapshot(page)).interaction))return;
  }
  assert.fail('the actual door/proxy must be reachable by the centre ray');
}
async function interactDoor(open){
  await aimDoor();const beforeState=await snapshot(page),before=beforeState.position;
  await page.keyboard.press('KeyE');
  await page.waitForFunction(open=>window.__INTERCAMBIO__?.phase==='playing'&&
    window.__INTERCAMBIO__.chapterStage==='host-house'&&window.__INTERCAMBIO__.hostHouse.doorOpen===open,open,{timeout:90000});
  await waitFrames(page,2);const after=await snapshot(page);
  assert.ok(horizontal(before,after.position)<.002,'E opens/closes the fitted door without teleporting the player');
  if(open&&beforeState.chapterStage==='westbridge'&&before.y<1.9){
    assert.ok(Math.abs(after.position.y-before.y)<.03,'E from the lower approach preserves eye height');
    assert.ok(Math.abs(after.hostHouse.navigation.elevation-(before.y-1.65))<.02,'E starts navigation at the actual lower floor');
  }
  neighbourhoodView(after);
  movement.push({action:open?'real E opens front door without teleport':'real E closes front door without teleport',before,position:after.position});
}
async function enterFromStreet(){
  await follow(WB_WALK_ROUTE.slice(1,2),'westbridge');
  await move({...WB_WALK_ROUTE[2],z:WB_HOST_DOOR.z+2.165},'westbridge');
  await interactDoor(true);
  await move(WB_HOST_APPROACH);await move(HOST_HOUSE_SPAWN);houseView(await snapshot(page));
}

try{
  browser=await launchBrowser();
  page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  page.setDefaultTimeout(60000);
  await page.addInitScript(({fixture,SAVE})=>{
    // Seed one supported checkpoint; reloads then exercise the game's saves.
    if(!sessionStorage.getItem('host-house.a01.qa.seeded')){
      localStorage.setItem(SAVE,JSON.stringify(fixture));
      localStorage.setItem('o-intercambio.settings.v1',JSON.stringify({sensitivity:1,headBob:false,volume:0,
        subtitles:true,quality:'balanced',grain:false,performance:false}));
      sessionStorage.setItem('host-house.a01.qa.seeded','1');
    }
  },{fixture,SAVE});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)failedAssets.push(`${response.status()} ${response.url()}`);});
  page.on('request',request=>{if(request.url().includes(HOST_HOUSE_SOURCE))requests.push(request.url());});
  await startCurrent('westbridge');neighbourhoodView(await snapshot(page),'westbridge');
  assert.equal(requests.length,1,'the fitted interior is ready with Westbridge before its window reveals are visible');
  await enterFromStreet();entry=await snapshot(page);
  let saved=await stored();assert.equal(saved.mission,'host-house-explore');assert.equal(saved.hostHouseLocation,'inside');
  assert.equal(saved.choice,'nervous');assert.ok(!saved.completed.includes('host-house-explore'));
  checks.push('real exterior-door E opens the original fitted door without horizontal movement; real W crosses the threshold into A01');
  await take('host-house-a01-entrance',HOST_HOUSE_EXIT);

  const reverseRoute=[HOST_HOUSE_SPAWN];
  for(const segment of HOST_HOUSE_QA_TOUR){
    for(const point of segment.points){await move(point);reverseRoute.push(point);}
    if(segment.id==='living-room'||segment.id==='player-bedroom')await take('host-house-a01-'+segment.id,segment.lookAt);
  }
  houseView(await snapshot(page));
  assert.ok(Math.abs((await snapshot(page)).hostHouse.navigation.elevation-3.12)<.01,'the measured U staircase reaches the upper floor');
  checks.push('real walking visits living/kitchen/dining and climbs the U staircase into the player bedroom');

  // Return only to the upper landing, then exercise both other doorways.
  for(const point of [...HOST_HOUSE_QA_TOUR.at(-1).points].reverse()){
    await move(point);
    if(horizontal(point,HOST_HOUSE_ROOM_POINTS.upperLanding)<.03)break;
  }
  for(const points of Object.values(HOST_HOUSE_UPPER_BRANCHES)){
    await follow(points);houseView(await snapshot(page));await follow([...points].reverse());
  }
  checks.push('the upper landing connects to the hosts bedroom and bathroom using real movement');
  await pause(page);const pauseBefore=(await snapshot(page)).position;await waitFrames(page,4);
  paused=await snapshot(page);assert.deepEqual(paused.position,pauseBefore);assert.equal(paused.phase,'paused');
  await page.locator('#resume').click();await waitPhase(page,'playing');houseView(await snapshot(page));
  checks.push('pause freezes movement inside the fitted house');

  // Pick up the recorded return route at the same upper landing.
  const reversed=[...reverseRoute].reverse();
  const landingIndex=reversed.findIndex(point=>horizontal(point,HOST_HOUSE_ROOM_POINTS.upperLanding)<.03);
  assert.ok(landingIndex>=0,'measured return route contains the upper landing');
  await follow(reversed.slice(landingIndex));await move(HOST_HOUSE_SPAWN);
  assert.ok(Math.abs((await snapshot(page)).hostHouse.navigation.elevation-.4)<.01,'the same physical stairs return to ground level');
  const kitchenApproach=[HOST_HOUSE_SPAWN,hhLocalPoint(5.1,2.05,-.48),hhLocalPoint(5.1,2.05,-4.7),HOST_HOUSE_ROOM_POINTS.kitchen];
  await follow(kitchenApproach);
  const garagePoints=HOST_HOUSE_GARAGE_TOUR;
  await follow(garagePoints);houseView(await snapshot(page));
  assert.ok(Math.abs((await snapshot(page)).hostHouse.navigation.elevation-.16)<.01,'garage access uses the two small authored height changes');
  await take('host-house-a01-garage',hhLocalPoint(10.8,1.3,-1.2));
  await follow([...garagePoints].reverse());await follow([...kitchenApproach].reverse());await move(HOST_HOUSE_SPAWN);
  checks.push('real descent and the interior garage passage preserve the measured floor levels and car clearance');

  // Reload here proves an actual inside checkpoint, with no camera hooks.
  await startCurrent('host-house');resumedInside=await snapshot(page);houseView(resumedInside);
  assert.ok(horizontal(resumedInside.position,HOST_HOUSE_SPAWN)<.08);
  saved=await stored();assert.equal(saved.hostHouseLocation,'inside');assert.equal(saved.choice,'nervous');
  assert.ok(!saved.completed.includes('host-house-explore'));
  await move(WB_HOST_APPROACH);outside=await snapshot(page);
  neighbourhoodView(outside);assert.equal(outside.hostHouse.location,'outside');
  assert.equal(outside.westbridge.drive?.occupied??false,false);parentsRemainInBrazil(outside);
  saved=await stored();assert.equal(saved.hostHouseLocation,'outside');assert.ok(!saved.completed.includes('host-house-explore'));
  checks.push('reload restores the A01 hall; real W walks back to the same exterior without a fade or teleport');

  await interactDoor(false);await aimDoor();
  const blocked=await keepW(20),stopped=await keepW(8);
  assert.ok(horizontal(blocked,stopped)<.03,'the closed original front door stops continued real W');
  assert.ok(stopped.z>HOST_HOUSE_EXIT.z,'the closed leaf keeps the player outside');
  movement.push({action:'closed fitted door blocks continued real W',blocked,stopped});
  await interactDoor(true);await move(HOST_HOUSE_SPAWN);houseView(await snapshot(page));
  await move(WB_HOST_APPROACH);await move(WB_WALK_ROUTE[2]);
  outside=await snapshot(page);assert.equal(outside.hostHouse.location,'outside');
  checks.push('E closes the real door with collision and opens it again; W reenters and leaves continuously');

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
  checks.push('restart restores the Brazilian bedroom, earlier camera projection, visibility and family state');
  await healthy();
  writeFileSync(`${OUT}/results.json`,JSON.stringify({status:'passed',checks,pictures,movement,entry,resumedInside,
    outside,resumedOutside,reentered,restart,paused,requests,errors,consoleErrors,failedAssets,
    method:'Real Babylon.js game; one supported checkpoint seeds the route, then mouse/WASD/E drive all movement and door operations. No camera, position or clock setters.',
    limits:['The previous home, Brazilian airport, flight and car trip were not repeated.',
      'Chromium/Linux SwiftShader software renderer; functional and visual QA, not a physical GPU/mobile FPS benchmark.']},null,2));
  console.log('PASS HOST HOUSE A01: door → rooms/U-stairs → garage → continuous exit → checkpoints → reentry → restart');
}catch(error){
  if(page)await page.screenshot({path:`${OUT}/failure.png`}).catch(()=>{});
  writeFileSync(`${OUT}/results.json`,JSON.stringify({status:'failed',error:String(error),checks,pictures,movement,
    state:page?await snapshot(page).catch(()=>null):null,entry,resumedInside,outside,resumedOutside,reentered,restart,
    requests,errors,consoleErrors,failedAssets},null,2));
  throw error;
}finally{await browser?.close();}
