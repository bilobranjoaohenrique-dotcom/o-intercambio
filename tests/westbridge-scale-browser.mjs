import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import './register-typescript.mjs';
const { launchBrowser, snapshot, waitFrames, lookAt } = await import('./browser-helpers.mjs');
const { WB_WALK_SPAWN, WB_WALK_ROUTE, WB_HOST_DOOR } = await import('../src/game/westbridgeLayout.ts');

// A development-server-only interception exposes the existing controller to
// this harness. The application source and distributed game gain no setters.
// Fixed poses prove image comparison; real input below separately proves play.
const BASE = process.env.INTERCAMBIO_URL || 'http://127.0.0.1:5188';
const STAGE = process.env.WESTBRIDGE_SCALE_STAGE || 'after';
assert.ok(['before','after'].includes(STAGE));
const OUT = process.env.WESTBRIDGE_SCALE_OUT || '/tmp/westbridge-scale';
const RECORD = process.env.WESTBRIDGE_SCALE_RECORD || STAGE;
const CAPTURE_ONLY = process.env.WESTBRIDGE_SCALE_CAPTURE_ONLY === '1';
const ONLY_VIEWS = process.env.WESTBRIDGE_SCALE_VIEWS?.split(',');
mkdirSync(OUT, { recursive:true });
const views = [
  { id:'host-street', position:{x:479.9435,y:1.7765,z:-4.5}, yaw:Math.PI, pitch:-.1632, fov:1.05 },
  { id:'host-door', position:{x:479.9435,y:1.7765,z:-10.4}, yaw:Math.PI, pitch:-.06, fov:1.05 },
  { id:'cozy-door', position:{x:497,y:1.7095,z:-9.5}, yaw:Math.PI, pitch:-.12, fov:1.05 },
  { id:'ranch-street', position:{x:515,y:1.7765,z:-4.5}, yaw:Math.PI, pitch:-.12, fov:1.05 },
  { id:'mansion-street', position:{x:441,y:1.7765,z:-4.5}, yaw:Math.PI, pitch:-.12, fov:1.05 },
  { id:'neighbours', position:{x:490.5,y:1.7555,z:-5.1}, yaw:0, pitch:-.12, fov:1.05 },
];
const fixture={mission:'westbridge-explore',choice:'nervous',completed:['find-host','westbridge-ride']};
const errors=[],consoleErrors=[],failedAssets=[],pictures=[],movement=[];
if(STAGE==='before'&&process.env.WESTBRIDGE_SCALE_APPEND==='1')pictures.push(...JSON.parse(readFileSync(`${OUT}/before.json`,'utf8')).pictures);
let browser;
try {
  browser=await launchBrowser();
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  page.setDefaultTimeout(60000);
  await page.addInitScript(fixture=>{
    localStorage.setItem('o-intercambio.chapter1.checkpoint.v1',JSON.stringify(fixture));
    localStorage.setItem('o-intercambio.settings.v1',JSON.stringify({sensitivity:1,headBob:false,volume:0,subtitles:true,quality:'balanced',grain:false,performance:false}));
  },fixture);
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();let body=await response.text();
    const anchor='const breakfast = createBreakfastSeat';
    assert.ok(body.includes(anchor),'the real development entry point contains the existing player controller');
    body=body.replace(anchor,`window.__WESTBRIDGE_SCALE_QA__ = {
      pose(point,yaw,pitch,fov) { player.setMovementEnabled(false); player.teleport(point,yaw); camera.rotation.x=pitch; camera.fov=fov; player.adoptCameraPose(); player.setMovementEnabled(false); },
      walkFrom(point,yaw) { player.teleport(point,yaw); player.setMovementEnabled(true); },
      camera() { return { position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},yaw:camera.rotation.y,pitch:camera.rotation.x,fov:camera.fov }; }
    };\n${anchor}`);
    await route.fulfill({response,body});
  });
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)failedAssets.push(`${r.status()} ${r.url()}`);});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__INTERCAMBIO__&&document.getElementById('game')?.dataset.ready==='true',null,{timeout:240000});
  assert.ok(await page.evaluate(()=>!!window.__WESTBRIDGE_SCALE_QA__));
  await page.locator('#startGame').click();
  await page.waitForFunction(()=>window.__INTERCAMBIO__?.phase==='playing'&&window.__INTERCAMBIO__.chapterStage==='westbridge'&&window.__INTERCAMBIO__.westbridge.scenery.ready,null,{timeout:240000});
  await page.waitForFunction(()=>window.__INTERCAMBIO__.westbridge.scenery.allTexturesReady,null,{timeout:90000});
  for(const view of views){
    if(ONLY_VIEWS&&!ONLY_VIEWS.includes(view.id))continue;
    if(pictures.some(x=>x.id===view.id))continue;
    await page.evaluate(view=>window.__WESTBRIDGE_SCALE_QA__.pose(view.position,view.yaw,view.pitch,view.fov),view);
    await waitFrames(page,4);
    const camera=await page.evaluate(()=>window.__WESTBRIDGE_SCALE_QA__.camera());
    for(const key of ['x','y','z'])assert.ok(Math.abs(camera.position[key]-view.position[key])<1e-10);
    assert.equal(camera.yaw,view.yaw);assert.equal(camera.pitch,view.pitch);assert.equal(camera.fov,view.fov);
    const state=await snapshot(page),path=`${OUT}/${STAGE}-${view.id}.png`;
    assert.equal(state.westbridge.scenery.allTexturesReady,true);assert.equal(state.westbridge.scenery.foreignMeshesVisible,0);
    await page.screenshot({path});
    pictures.push({id:view.id,path,camera,scenery:state.westbridge.scenery});
    console.log('CAPTURE',path);
  }
  if(STAGE==='after'){
    const before=JSON.parse(readFileSync(`${OUT}/before.json`,'utf8'));
    for(const picture of pictures)assert.deepEqual(picture.camera,before.pictures.find(x=>x.id===picture.id).camera,'same exact eye position, rotation and FOV before/after');
  }
  if(STAGE==='after'&&!CAPTURE_ONLY){
    await page.evaluate(point=>window.__WESTBRIDGE_SCALE_QA__.walkFrom(point,Math.PI),WB_WALK_SPAWN);
    await waitFrames(page,3);
    for(const point of WB_WALK_ROUTE.slice(1)){
      for(let attempt=0;attempt<4;attempt++){
        const current=(await snapshot(page)).position;
        if(Math.hypot(current.x-point.x,current.z-point.z)<.17)break;
        await lookAt(page,{...point,y:current.y},.012);
        await page.keyboard.down('KeyW');
        try{await page.waitForFunction(point=>Math.hypot(window.__INTERCAMBIO__.position.x-point.x,window.__INTERCAMBIO__.position.z-point.z)<.13,point,{polling:'raf',timeout:90000});}
        finally{await page.keyboard.up('KeyW');}
        await waitFrames(page,2);
      }
      const reached=(await snapshot(page)).position;
      assert.ok(Math.hypot(reached.x-point.x,reached.z-point.z)<.17,'continuous real W reaches the waypoint');
      movement.push({action:'real WASD walking',target:point,position:(await snapshot(page)).position});
      console.log('WALK',JSON.stringify(movement.at(-1)));
    }
    await lookAt(page,WB_HOST_DOOR);
    const s=await snapshot(page);assert.equal(s.interaction,'wb-house-door');
    movement.push({action:'door reachable by real walking/raycast',position:s.position,interaction:s.interaction});
    await page.keyboard.down('KeyW');try{await waitFrames(page,25);}finally{await page.keyboard.up('KeyW');}
    await waitFrames(page,3);const blocked=(await snapshot(page)).position;
    await page.keyboard.down('KeyW');try{await waitFrames(page,6);}finally{await page.keyboard.up('KeyW');}
    const stopped=(await snapshot(page)).position;
    assert.ok(Math.hypot(stopped.x-blocked.x,stopped.z-blocked.z)<.025,'house wall blocks continued forward movement');
    movement.push({action:'house wall blocks real continued W',blocked,stopped});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(failedAssets,[]);
  const state=await snapshot(page);
  writeFileSync(`${OUT}/${RECORD}.json`,JSON.stringify({status:'passed',stage:STAGE,captureOnly:CAPTURE_ONLY,method:'Real Babylon.js game on Vite; uncommitted HTTP-only test injection fixes image poses. Movement evidence uses real mouse/WASD, separately from fixed captures.',pictures,movement,errors,consoleErrors,failedAssets,checkpoint:fixture,gpu:state.gpu},null,2));
  console.log('PASS',STAGE,'fixed eye-height comparisons and runtime checks');
}catch(error){
  writeFileSync(`${OUT}/${RECORD}-failure.json`,JSON.stringify({status:'failed',error:String(error),pictures,movement,errors,consoleErrors,failedAssets},null,2));
  throw error;
}finally{await browser?.close();}
