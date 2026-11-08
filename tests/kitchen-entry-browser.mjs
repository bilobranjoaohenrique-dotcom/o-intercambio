import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  walkTo, lookAt, faceYaw, aimInteraction } from './browser-helpers.mjs';
import { pushUntilBlocked } from './bedroom-route.mjs';

const { KITCHEN_ENTRY_DOOR:D, KITCHEN_FURNITURE } = await import('../src/game/kitchenLayout.ts');
const { LIVING_ROOM_KITCHEN_PORTAL:portal } = await import('../src/game/livingRoomPlacement.ts');
const { isWalkable } = await import('../src/game/collision.ts');
const pictures=[],route=[];let browser,session,inspected,doorStop,portalCrossed;

async function move(page,point,tolerance=.10){
 await walkTo(page,point,{tolerance});
 const state=await snapshot(page);
 assert.equal(state.phase,'playing');assert.equal(state.chapterStage,'home');
 assert.equal(state.chapterMission,'talk-parents');assert.equal(state.dialogue,false);
 assert.ok(isWalkable(state.position));
 route.push({position:state.position,mission:state.chapterMission});
}
try{
 browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 await context.addInitScript(()=>localStorage.setItem('o-intercambio.chapter1.checkpoint.v1',JSON.stringify({mission:'talk-parents',choice:null,completed:['breakfast']})));
 const page=await context.newPage(),errors=[],consoleErrors=[],failed=[];page.setDefaultTimeout(45000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url()}`);});
 session={page,errors,consoleErrors,failed,profile:'kitchen-entry-balanced'};
 await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__INTERCAMBIO__&&document.getElementById('game')?.dataset.ready==='true',null,{timeout:90000});
 await page.locator('#startSettings').click();await page.locator('#quality').selectOption('balanced');
 await page.locator('#resume').click();await page.locator('#startGame').click();await waitPhase(page,'playing');
 assert.equal((await snapshot(page)).build,'chapter1-kitchen-entry-1');
 const fridge=KITCHEN_FURNITURE.fridge;
 const fridgeRight=fridge.x+Math.abs(Math.cos(fridge.rotation))*fridge.width/2+Math.abs(Math.sin(fridge.rotation))*fridge.depth/2;
 assert.ok(D.x-D.apertureWidth/2-.07>fridgeRight+.20,'the door frame must be clearly beside the refrigerator');

 console.log('KITCHEN ENTRY: approach and examine the closed kitchen door');
 for(const point of [{x:0,z:16.25},{x:-1.72,z:16.25},D.approach])await move(page,point);
 await aimInteraction(page,'kitchen-entry-door',{x:D.x,y:1.25,z:D.z});
 assert.match(await page.locator('#interactionText').textContent(),/Examinar porta/i);
 await page.keyboard.press('KeyE');await waitFrames(page,2);
 inspected=await snapshot(page);
 assert.equal(inspected.chapterMission,'talk-parents');assert.equal(inspected.chapterStage,'home');assert.equal(inspected.dialogue,false);
 assert.ok((await page.locator('#examine').textContent()).trim().length>0);
 await faceYaw(page,Math.PI);doorStop=await pushUntilBlocked(page);
 assert.ok(doorStop.z>=D.z+D.depth/2+.215,'the closed leaf must stop the physical capsule');
 assert.ok(doorStop.z<D.approach.z-.08,'the player must physically approach the door before stopping');

 console.log('KITCHEN ENTRY: actual full-height door capture');
 for(const point of [{x:-1.60,z:16.30},{x:-1.60,z:17.10}])await move(page,point,.08);
 await lookAt(page,{x:D.x,y:1.25,z:D.z});await waitFrames(page,2);
 pictures.push(await capture(page,'porta-principal-cozinha'));console.log('CAPTURE',pictures.at(-1).path);

 console.log('KITCHEN ENTRY: existing living-room passage remains traversable');
 for(const point of [{x:-1.72,z:16.25},{x:3.5,z:16.25},{x:3.5,z:14.2},{x:2.5,z:14.2}])await move(page,point);
 portalCrossed=await snapshot(page);
 assert.ok(portalCrossed.position.x<portal.minX-.20);
 for(const point of [{x:3.5,z:14.2},{x:3.5,z:16.25},{x:2.6,z:16.25},{x:2.6,z:19.8}])await move(page,point);
 await lookAt(page,{x:1.75,y:1.30,z:15.80});await waitFrames(page,2);
 pictures.push(await capture(page,'porta-principal-contexto'));console.log('CAPTURE',pictures.at(-1).path);
 const final=await snapshot(page);assertHealthy(session);assert.deepEqual(final.errors,[]);
 writeFileSync('/tmp/o-intercambio-kitchen-entry-results.json',JSON.stringify({status:'passed',build:final.build,pictures,route,
  door:D,doorStop,portalCrossed:{position:portalCrossed.position,mission:portalCrossed.chapterMission},
  final:{position:final.position,mission:final.chapterMission,stage:final.chapterStage,dialogue:final.dialogue},
  errors,consoleErrors,failedAssets:failed,
  coverage:['real approach and E examination','closed leaf stops the physical capsule','door frame clearly beside the refrigerator','existing living-room passage crossed in both directions','two actual final-position captures','mission and dialogue preserved'],
  limits:['Captures require visual inspection.','One focused Chromium/Linux SwiftShader flow; no benchmark or replay of other rooms.'],
 },null,2));
 console.log('PASS KITCHEN ENTRY: closed kitchen door beside the refrigerator and intact living-room passage.');
}catch(error){
 if(session)await session.page.screenshot({path:'/tmp/o-intercambio-kitchen-entry-failure.png'}).catch(()=>{});
 writeFileSync('/tmp/o-intercambio-kitchen-entry-results.json',JSON.stringify({status:'failed',error:String(error),pictures,route,doorStop,
  state:session?await snapshot(session.page).catch(()=>null):null,consoleErrors:session?.consoleErrors,failedAssets:session?.failed},null,2));
 if(session&&process.env.INTERCAMBIO_DEBUG==='1'){
  console.error(error);const repl=(await import('node:repl')).start({prompt:'entry> '});
  repl.context.qa={...session,browser,snapshot,waitFrames,faceYaw,lookAt,capture,walkTo,move,pushUntilBlocked,aimInteraction,pictures,route,D};
  await new Promise(resolve=>repl.once('exit',resolve));
 }
 throw error;
}finally{await browser?.close();}
