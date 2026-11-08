import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import './register-typescript.mjs';
import { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase, faceYaw, lookAt, walkTo } from './browser-helpers.mjs';

const { LAUNDRY, LAUNDRY_FURNITURE:F } = await import('../src/game/laundryLayout.ts');
const { GARAGE, GARAGE_ROUTE:G } = await import('../src/game/garageLayout.ts');
const { isWalkable } = await import('../src/game/collision.ts');
const pictures=[],route=[];let browser,session,solids;

// Reuse the game's established real mouse/W route driver. Short pulses keep
// free-space approaches accurate even when browser protocol latency is high.
async function move(page,point){
 await walkTo(page,point,{tolerance:.14});
 const state=await snapshot(page);
 assert.equal(state.phase,'playing');assert.equal(state.chapterStage,'home');
 assert.equal(state.chapterMission,'talk-parents');assert.equal(state.dialogue,false);
 assert.ok(isWalkable(state.position),'the real capsule remains on usable floor');
 route.push({position:state.position,mission:state.chapterMission});
}
async function pressAgainst(page,code){
 let previous=(await snapshot(page)).position,travel=0,still=0;
 await page.keyboard.down(code);
 try{
  for(let i=0;i<60;i++){
   await waitFrames(page,2);const p=(await snapshot(page)).position;
   const step=Math.hypot(p.x-previous.x,p.z-previous.z);travel+=step;previous=p;
   still=travel>.05&&step<.002?still+1:0;if(still>=2)return p;
  }
  assert.fail('the physical key did not reach the expected solid');
 }finally{await page.keyboard.up(code);await waitFrames(page,2);}
}
try{
 browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 await context.addInitScript(()=>localStorage.setItem('o-intercambio.chapter1.checkpoint.v1',JSON.stringify({mission:'talk-parents',choice:null,completed:['breakfast']})));
 const page=await context.newPage(),errors=[],consoleErrors=[],failed=[];page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
 session={page,errors,consoleErrors,failed,profile:'laundry-balanced'};
 await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__INTERCAMBIO__&&document.getElementById('game')?.dataset.ready==='true',null,{timeout:90000});
 await page.locator('#startSettings').click();await page.locator('#quality').selectOption('balanced');
 await page.locator('#resume').click();await page.locator('#startGame').click();await waitPhase(page,'playing');
 assert.deepEqual((await snapshot(page)).laundry.bounds,LAUNDRY);
 await faceYaw(page,0);
 console.log('LAUNDRY: actual kitchen-to-laundry entry, room capture and furniture collisions');
 for(const p of [{x:3.5,z:16.25},{x:3.5,z:16.45},{x:4.65,z:16.45},{x:4.95,z:18.15}])await move(page,p);
 await lookAt(page,{x:6.6,y:1.28,z:17.1});await waitFrames(page,2);
 pictures.push(await capture(page,'lavanderia-visao-principal'));console.log('CAPTURE',pictures.at(-1).path);
 await faceYaw(page,0);
 await move(page,{x:5.5,z:F.washer.z});await faceYaw(page,0);const washerStop=await pressAgainst(page,'KeyD');
 assert.ok(washerStop.x<=F.washer.x-F.washer.width/2-.215);
 await move(page,{x:5.3,z:F.sink.z});await faceYaw(page,0);const sinkStop=await pressAgainst(page,'KeyD');
 assert.ok(sinkStop.x<=F.sink.x-F.sink.width/2-.215);
 await move(page,{x:5.3,z:18.1});await faceYaw(page,0);const wallStop=await pressAgainst(page,'KeyW');
 assert.ok(wallStop.z<=LAUNDRY.maxZ-.215);solids={washerStop,sinkStop,wallStop};
 console.log('LAUNDRY: through the real doorway to the existing garage and return');
 for(const p of [{x:5.6,z:18.0},{x:5.6,z:16.45},{x:5.6,z:15.12},G.driver])await move(page,p);
 assert.ok((await snapshot(page)).position.z<GARAGE.maxZ-.22);
 for(const p of [{x:5.6,z:15.12},{x:5.6,z:17.4},{x:5.85,z:18.6}])await move(page,p);
 await lookAt(page,{x:4.55,y:1.25,z:17.7});await waitFrames(page,2);
 pictures.push(await capture(page,'lavanderia-armario-cozinha'));console.log('CAPTURE',pictures.at(-1).path);
 await faceYaw(page,0);
 for(const p of [{x:5.6,z:16.5},{x:4.65,z:16.5},{x:3.5,z:16.5},{x:3.5,z:16.25},{x:0,z:16.3}])await move(page,p);
 const final=await snapshot(page);assertHealthy(session);assert.deepEqual(final.errors,[]);
 assert.equal(final.breakfast.state,'standing');assert.equal(final.chapterMission,'talk-parents');
 writeFileSync('/tmp/o-intercambio-laundry-results.json',JSON.stringify({status:'passed',build:final.build,pictures,route,solids,
  final:{position:final.position,mission:final.chapterMission,stage:final.chapterStage,dialogue:final.dialogue},
  coverage:['real kitchen/laundry/garage walking in both directions','two actual room/doorway captures','washer, sink and wall stop the physical capsule','existing mission and dialogue preserved'],
  limits:['Captures require visual inspection.','Single focused flow on Chromium/SwiftShader; no performance benchmark or other room suite.'],
 },null,2));
 console.log('PASS LAUNDRY: connected room, actual object/collision captures and unchanged narrative.');
}catch(error){
 if(session)await session.page.screenshot({path:'/tmp/o-intercambio-laundry-failure.png'}).catch(()=>{});
 writeFileSync('/tmp/o-intercambio-laundry-results.json',JSON.stringify({status:'failed',error:String(error),pictures,route,solids,
  state:session?await snapshot(session.page).catch(()=>null):null,consoleErrors:session?.consoleErrors,failedAssets:session?.failed},null,2));
 if(session&&process.env.INTERCAMBIO_DEBUG==='1'){
  console.error(error);const repl=(await import('node:repl')).start({prompt:'laundry> '});
  repl.context.qa={...session,browser,snapshot,waitFrames,faceYaw,lookAt,capture,move,pressAgainst,pictures,route,LAUNDRY,F,G,GARAGE};
  await new Promise(resolve=>repl.once('exit',resolve));
 }
 throw error;
}finally{await browser?.close();}
