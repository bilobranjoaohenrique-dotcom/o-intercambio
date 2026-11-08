import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames,
 waitPhase, walkTo, lookAt, faceYaw, aimInteraction } from './browser-helpers.mjs';
import { pushUntilBlocked } from './bedroom-route.mjs';

const { GARAGE, GARAGE_ROUTE:R, FAMILY_CAR, FAMILY_CAR_INTERACTION } = await import('../src/game/garageLayout.ts');
const { DOOR } = await import('../src/game/layout.ts');
const { isWalkable } = await import('../src/game/collision.ts');
const pictures=[],route=[];let browser,session,solids,blocked,pickup,ending;

async function move(page,point,tolerance=.11){
 await walkTo(page,point,{tolerance});const state=await snapshot(page);
 assert.equal(state.phase,'playing');assert.equal(state.chapterStage,'home');
 assert.ok(isWalkable(state.position),'the actual player stays on free physical floor');
 route.push({position:state.position,mission:state.chapterMission});
}
async function enterGarage(page){
 for(const point of [{x:3.5,z:16.25},{x:3.5,z:15.35},R.houseApproach,R.entrance])await move(page,point);
 assert.ok((await snapshot(page)).position.x>GARAGE.minX+.3);
}
async function returnToHouse(page){
 for(const point of [R.rearSouth,R.entrance,R.houseApproach,{x:3.5,z:14.2},{x:1.6,z:14.2},
  {x:1.6,z:12.6},{x:1.85,z:11.95},{x:1.85,z:4.6}])await move(page,point);
}
try{
 browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 // A real supported checkpoint avoids replaying the unchanged waking/cafe
 // scenes. No position, bag state or mission is assigned after game start.
 await context.addInitScript(()=>localStorage.setItem('o-intercambio.chapter1.checkpoint.v1',JSON.stringify({
  mission:'pack-suitcase',choice:'nervous',completed:['breakfast','talk-parents'],
 })));
 const page=await context.newPage(),errors=[],consoleErrors=[],failed=[];
 page.setDefaultTimeout(45000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url()}`);});
 session={page,errors,consoleErrors,failed,profile:'garage-balanced'};
 await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__INTERCAMBIO__&&document.getElementById('game')?.dataset.ready==='true',null,{timeout:90000});
 await page.locator('#startSettings').click();await page.locator('#quality').selectOption('balanced');
 await page.locator('#resume').click();await page.locator('#startGame').click();await waitPhase(page,'playing');
 assert.equal((await snapshot(page)).chapterMission,'pack-suitcase');
 assert.equal((await snapshot(page)).luggageCollected,false);

 console.log('GARAGE: walk from house, real environment/car captures and full circulation');
 await enterGarage(page);
 await lookAt(page,{x:7.4,y:1.15,z:13.6});await waitFrames(page,2);
 pictures.push(await capture(page,'garagem-visao-principal'));
 console.log('CAPTURE',pictures.at(-1).path);
 for(const point of [R.rear,R.frontNorth])await move(page,point,.08);
 await lookAt(page,{x:6.8,y:1.1,z:13.8});await waitFrames(page,2);
 pictures.push(await capture(page,'garagem-carro-detalhe'));
 console.log('CAPTURE',pictures.at(-1).path);
 for(const point of [R.frontSouth,R.rearSouth])await move(page,point,.08);

 console.log('GARAGE: actual collision stops and car blocked before luggage');
 await move(page,R.driver,.08);await faceYaw(page,Math.PI);
 const carBefore=(await snapshot(page)).position,carStop=await pushUntilBlocked(page);
 assert.ok(carBefore.z-carStop.z>.08);assert.ok(carStop.z>=FAMILY_CAR.z+FAMILY_CAR.width/2+.215);
 await move(page,R.frontSouth,.08);await faceYaw(page,Math.PI/2);
 const gateStop=await pushUntilBlocked(page);assert.ok(gateStop.x<=GARAGE.maxX-.215);
 await move(page,R.frontNorth,.08);await faceYaw(page,Math.PI);
 const wallStop=await pushUntilBlocked(page);assert.ok(wallStop.z>=GARAGE.minZ+.215);
 solids={carBefore,carStop,gateStop,wallStop};
 await move(page,R.frontSouth,.08);await move(page,R.driver,.08);
 await aimInteraction(page,'family-car',FAMILY_CAR_INTERACTION);
 assert.match(await page.locator('#interactionText').textContent(),/Entrar no carro/i);
 await page.keyboard.press('KeyE');await waitFrames(page,2);
 blocked=await snapshot(page);assert.equal(blocked.phase,'playing');assert.equal(blocked.chapterStage,'home');
 assert.equal(blocked.chapterMission,'pack-suitcase');assert.equal(blocked.luggageCollected,false);
 assert.match(await page.locator('#examine').textContent(),/Ainda preciso pegar minha mala/i);

 console.log('GARAGE: one real upstairs trip to collect the existing travel bag');
 await returnToHouse(page);
 const doorX=DOOR.hingeX+DOOR.width/2;
 if(!(await snapshot(page)).door.isOpen){
  await aimInteraction(page,'door',{x:doorX,y:4.4,z:DOOR.z});await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__INTERCAMBIO__.door.isOpen);
 }
 await move(page,{x:doorX,z:2.7},.09);
 await aimInteraction(page,'suitcase',{x:2.42,y:3.23,z:2.65});
 assert.match(await page.locator('#interactionText').textContent(),/Pegar bagagem/i);
 await page.keyboard.press('KeyE');await waitFrames(page,3);
 pickup=await snapshot(page);assert.equal(pickup.chapterMission,'enter-car');assert.equal(pickup.luggageCollected,true);
 assert.notEqual(pickup.interaction,'suitcase','the collected bag is no longer ray-pickable');

 console.log('GARAGE: return through the same house and use the existing airport transition');
 for(const point of [{x:doorX,z:4.6},{x:1.85,z:11.95},{x:1.6,z:12.6},{x:1.6,z:14.2},R.houseApproach,
  R.entrance,R.rearSouth,R.driver])await move(page,point);
 await aimInteraction(page,'family-car',FAMILY_CAR_INTERACTION);await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__INTERCAMBIO__.chapterStage==='car'||window.__INTERCAMBIO__.chapterStage==='airport');
 await page.waitForFunction(()=>window.__INTERCAMBIO__.chapterStage==='airport'&&window.__INTERCAMBIO__.phase==='playing',null,{timeout:90000});
 ending=await snapshot(page);assert.equal(ending.chapterMission,'airport-gate');assert.equal(ending.dialogueAudio,false);
 assert.deepEqual(ending.errors,[]);assertHealthy(session);
 writeFileSync('/tmp/o-intercambio-garage-results.json',JSON.stringify({status:'passed',pictures,route,solids,
  blocked:{position:blocked.position,mission:blocked.chapterMission,luggageCollected:blocked.luggageCollected},
  pickup:{position:pickup.position,mission:pickup.chapterMission,luggageCollected:pickup.luggageCollected},
  final:{phase:ending.phase,stage:ending.chapterStage,mission:ending.chapterMission},
  coverage:['physical house-to-garage connection','two actual garage/car captures','walking around all four sides of parked car',
   'solid car/gate/wall','car blocks departure before luggage','real upstairs walk and existing bag pickup',
   'physical return with collected bag','existing car-to-airport progression'],
  limits:['Captures require visual inspection.','One focused flow; no benchmark or new travel-scene test suite.'],
 },null,2));
 console.log('PASS GARAGE: connected scene, parked car, solids, real luggage pickup and guarded airport departure.');
}catch(error){
 if(session)await session.page.screenshot({path:'/tmp/o-intercambio-garage-failure.png'}).catch(()=>{});
 writeFileSync('/tmp/o-intercambio-garage-results.json',JSON.stringify({status:'failed',pictures,route,solids,
  error:String(error),state:session?await snapshot(session.page).catch(()=>null):null,
  consoleErrors:session?.consoleErrors,failedAssets:session?.failed},null,2));
 // Optional interactive recovery keeps the same browser and physical progress
 // available when a software-renderer input pulse needs adjustment.
 if(session&&process.env.INTERCAMBIO_DEBUG==='1'){
  console.error(error);
  const repl=(await import('node:repl')).start({prompt:'garage> '});
  repl.context.qa={...session,browser,snapshot,waitFrames,walkTo,lookAt,faceYaw,aimInteraction,capture,move,enterGarage,returnToHouse,R,GARAGE,FAMILY_CAR,FAMILY_CAR_INTERACTION,DOOR,route,pictures};
  await new Promise(resolve=>repl.once('exit',resolve));
 }
 throw error;
}finally{await browser?.close();}
