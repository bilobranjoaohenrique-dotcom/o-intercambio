import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import './register-typescript.mjs';
const { BASE, launchBrowser, snapshot, assertHealthy, capture, waitFrames, waitPhase,
  lookAt, faceYaw, aimInteraction, walkTo, hold, pause, setRange } = await import('./browser-helpers.mjs');
const { ARRIVAL_ROUTE, ARRIVAL_HOST } = await import('../src/game/arrivalLayout.ts');
const { wbPoint, WB_HOST_DOOR, WB_WALK_SPAWN, WB_WALK_ROUTE } = await import('../src/game/westbridgeLayout.ts');

const SAVE = 'o-intercambio.chapter1.checkpoint.v1';
const RESUME_RIDE = process.env.WESTBRIDGE_QA_RESUME_RIDE === '1';
const RESUME_EXPLORE = process.env.WESTBRIDGE_QA_RESUME_EXPLORE === '1';
const TERMINAL_EVIDENCE = '/tmp/o-intercambio-westbridge-game-first-terminal-and-ride.json';
const RIDE_EVIDENCE = '/tmp/o-intercambio-westbridge-game-ride-passed.json';
const COMPLETED = ['breakfast','talk-parents','pack-suitcase','enter-car','car-ready',
  'airport-farewell','airport-gate','plane-seat'];
const pictures = [], route = [], movement = [], reviewNotes = [];
let browser, context, session, terminal, welcome, seated, parked, walking, resumed, final, restart, performanceSample;
let observation, pausedRide, mutedAudio;
let reusedTerminal = false;
let reusedRide = false;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const driveOf = state => state.westbridge.drive;
function carPose(state) {
  const drive = driveOf(state);
  const position = drive.position ?? drive.pose?.position ?? state.westbridge.vehicle.position;
  const yaw = drive.yaw ?? drive.pose?.yaw ?? state.westbridge.vehicle.yaw;
  assert.ok(position && Number.isFinite(yaw), 'real car position and heading are exposed');
  return { position, yaw };
}
function relativeEye(state) {
  const {position,yaw}=carPose(state),dx=state.position.x-position.x,dz=state.position.z-position.z;
  return {x:dx*Math.cos(yaw)-dz*Math.sin(yaw),y:state.position.y-position.y,z:dx*Math.sin(yaw)+dz*Math.cos(yaw)};
}
const isParked = state => driveOf(state).parked === true || ['parked','outside','walking'].includes(driveOf(state).state);
function parentsRemainInBrazil(state) {
  assert.equal(state.family.location,'airport');assert.equal(state.family.actorCount,2);
  assert.equal(state.family.airportVisibleCount,0);assert.equal(state.family.carVisibleCount,0);
  assert.ok(state.family.parents.every(actor=>!actor.visible));
  assert.equal(state.dialogueAudio,false);assert.equal(state.audio.dialogueAudio,false);
}
function streetView(state) {
  assert.equal(state.chapterStage,'westbridge');
  assert.ok(['westbridge-ride','westbridge-explore','complete'].includes(state.chapterMission));
  const scenery=state.westbridge.scenery;
  assert.equal(scenery.active,true);assert.equal(scenery.loaded,true);assert.equal(scenery.ready,true);
  assert.equal(scenery.error,null);assert.equal(scenery.source,'/models/westbridge.glb');
  assert.equal(state.westbridge.vehicle.loaded,true);
  if(scenery.foreignMeshesVisible!==undefined)assert.equal(scenery.foreignMeshesVisible,0,'old sets are hidden locally');
  parentsRemainInBrazil(state);
}
async function move(page,point) {
  console.log('WESTBRIDGE WALK',JSON.stringify(point));
  const before=await snapshot(page);
  if(Math.hypot(before.position.x-point.x,before.position.z-point.z)>=.13){
    await lookAt(page,{...point,y:before.position.y},.012);
    await page.keyboard.down('KeyW');
    try{
      await page.waitForFunction(target=>Math.hypot(window.__INTERCAMBIO__.position.x-target.x,
        window.__INTERCAMBIO__.position.z-target.z)<.13,point,{polling:'raf',timeout:90000});
    }finally{await page.keyboard.up('KeyW');}
    await waitFrames(page,2);
  }
  const state=await snapshot(page);streetView(state);
  assert.equal(state.phase,'playing');assert.equal(state.chapterMission,'westbridge-explore');
  route.push({target:point,position:state.position});
}
async function lookInside(page,offset,pitch=.025) {
  // A moving car cannot be aimed using a fixed world-space point: that point
  // falls behind the seat while the software renderer processes mouse frames.
  // Apply physical mouse corrections against the current vehicle heading.
  const box=await page.locator('#game').boundingBox();
  let mouse={x:box.x+box.width/2,y:box.y+box.height/2},dragging=false;
  await page.mouse.move(mouse.x,mouse.y);await waitFrames(page,1);
  try{
    for(let attempt=0;attempt<12;attempt++){
      const s=await snapshot(page),current=wrap(s.rotation.yaw-carPose(s).yaw);
      assert.equal(s.phase,'playing');
      if(Math.abs(current-offset)<.035&&Math.abs(s.rotation.pitch-pitch)<.035)return;
      if(!s.input.pointerLocked&&!dragging){await page.mouse.down();dragging=true;}
      mouse.x+=Math.max(-180,Math.min(180,(offset-current)/s.input.mouseScale));
      mouse.y+=Math.max(-120,Math.min(120,(pitch-s.rotation.pitch)/s.input.mouseScale));
      await page.mouse.move(mouse.x,mouse.y);await waitFrames(page,1);
      if(!(await snapshot(page)).input.pointerLocked&&dragging){
        await page.mouse.up();dragging=false;mouse={x:box.x+box.width/2,y:box.y+box.height/2};
        await page.mouse.move(mouse.x,mouse.y);
      }
    }
    const s=await snapshot(page);
    assert.fail('rear-seat relative mouse aim did not converge: '+JSON.stringify({rotation:s.rotation,car:carPose(s),drive:s.westbridge.drive}));
  }finally{if(dragging)await page.mouse.up();}
}
async function observe(page) {
  await page.evaluate(()=>{
    const trace={stop:false,samples:[]};window.__WESTBRIDGE_QA__=trace;
    const sample=()=>{
      if(trace.stop)return;
      const s=window.__INTERCAMBIO__,w=s?.westbridge,d=w?.drive;
      if(s&&trace.samples.length<4000)trace.samples.push({phase:s.phase,stage:s.chapterStage,mission:s.chapterMission,
        fade:Number(document.getElementById('sceneFade').style.opacity),camera:s.position,
        position:d?.position??d?.pose?.position??w?.vehicle?.position,
        yaw:d?.yaw??d?.pose?.yaw??w?.vehicle?.yaw,elapsed:d?.elapsed,parked:d?.parked});
      requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
  });
}
async function stopObservation(page) {
  return page.evaluate(()=>{window.__WESTBRIDGE_QA__.stop=true;return window.__WESTBRIDGE_QA__;});
}
async function review(page,label) {
  if(process.env.INTERCAMBIO_VISUAL_REVIEW!=='1')return;
  await pause(page);
  const repl=(await import('node:repl')).start({prompt:`westbridge-${label}> `});
  repl.context.qa={...session,browser,snapshot,capture,waitFrames,waitPhase,lookAt,faceYaw,aimInteraction,
    pause,move,streetView,pictures,route,movement,reviewNotes,terminal,welcome,seated,parked,walking,resumed};
  repl.context.continueFlow=()=>repl.close();
  await new Promise(resolve=>repl.once('exit',resolve));
  if((await snapshot(page)).phase==='paused')await page.locator('#resume').click();
}
async function take(page,label) {
  await waitFrames(page,4);
  const picture=await capture(page,label);pictures.push(picture);console.log('CAPTURE',picture.path);
  await review(page,label);
}
async function startCheckpoint(page,url) {
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__INTERCAMBIO__&&
    (document.getElementById('game')?.dataset.ready==='true'||window.__INTERCAMBIO__.errors.length),null,{timeout:180000});
  assert.deepEqual((await snapshot(page)).errors,[]);
  await page.locator('#startGame').click();
  await page.waitForFunction(()=>window.__INTERCAMBIO__.phase==='playing'&&
    (window.__INTERCAMBIO__.chapterStage!=='westbridge'||window.__INTERCAMBIO__.westbridge.scenery.ready),null,{timeout:180000});
}
async function colliderProbe(page,target,accept,label) {
  await lookAt(page,target,.012);
  const before=await snapshot(page);
  await page.keyboard.down('KeyW');
  try {await waitFrames(page,28);}finally{await page.keyboard.up('KeyW');}
  await waitFrames(page,3);
  const after=await snapshot(page);streetView(after);
  assert.ok(accept(after.position),label+' stops the circular player footprint');
  const blocked=after.position;
  await page.keyboard.down('KeyW');
  try {await waitFrames(page,5);}finally{await page.keyboard.up('KeyW');}
  const stopped=await snapshot(page);
  assert.ok(Math.hypot(stopped.position.x-blocked.x,stopped.position.z-blocked.z)<.025,label+' cannot be walked through');
  movement.push({label,before:before.position,blocked,stopped:stopped.position});
}
async function stationaryPerformance(page) {
  return page.evaluate(async()=>{
    const timestamps=await new Promise(resolve=>{
      const values=[];let warm=5;
      function frame(t){
        if(warm>0)warm--;else values.push(t);
        if(values.length<31)requestAnimationFrame(frame);else resolve(values);
      }
      requestAnimationFrame(frame);
    });
    const intervals=timestamps.slice(1).map((value,index)=>value-timestamps[index]);
    const sorted=[...intervals].sort((a,b)=>a-b),mean=intervals.reduce((sum,value)=>sum+value,0)/intervals.length;
    // Read scene metadata after collecting timestamps, never in a sampled frame callback.
    const state=window.__INTERCAMBIO__,canvas=document.getElementById('game');
    return{method:'30 stationary RAF intervals after five warm frames; no diagnostic getters or captures in frame callbacks',
      samples:intervals.length,meanFrameMs:mean,p95FrameMs:sorted[Math.floor((sorted.length-1)*.95)],
      measuredFps:1000/mean,intervals,profile:state.settings.quality,internal:{width:canvas.width,height:canvas.height},
      gpu:state.gpu,preset:state.westbridge.scenery.timeOfDay,position:state.position,
      environment:'Chromium/Linux SwiftShader software renderer; not a physical GPU or mobile benchmark'};
  });
}

try {
  browser=await launchBrowser();context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  await context.addInitScript(({key,completed,resumeRide,resumeExplore})=>{
    if(!sessionStorage.getItem('westbridge-qa-initialized')){
      localStorage.setItem(key,JSON.stringify({mission:resumeExplore?'westbridge-explore':resumeRide?'westbridge-ride':'find-host',choice:'nervous',
        completed:resumeExplore?[...completed,'find-host','westbridge-ride']:resumeRide?[...completed,'find-host']:completed}));
      sessionStorage.setItem('westbridge-qa-initialized','1');
    }
  },{key:SAVE,completed:COMPLETED,resumeRide:RESUME_RIDE,resumeExplore:RESUME_EXPLORE});
  const page=await context.newPage(),errors=[],consoleErrors=[],failed=[],neighbourhoodRequests=[];page.setDefaultTimeout(45000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url()}`);});
  page.on('request',request=>{if(new URL(request.url()).pathname==='/models/westbridge.glb')neighbourhoodRequests.push(request.url());});
  session={page,errors,consoleErrors,failed,profile:'westbridge-game-balanced'};
  await startCheckpoint(page,BASE);
  if(RESUME_EXPLORE){
    const previous=JSON.parse(readFileSync(RIDE_EVIDENCE,'utf8'));
    assert.equal(previous.status,'trip-functional-passed');
    assert.equal(previous.walking.chapterMission,'westbridge-explore');
    terminal=previous.terminal;welcome=previous.welcome;seated=previous.seated;parked=previous.parked;
    pausedRide=previous.pausedRide;observation=previous.observation;
    pictures.push(...previous.pictures.filter(picture=>['westbridge-rear-seat','westbridge-window'].includes(picture.label)));
    reusedTerminal=true;reusedRide=true;
    console.log('WESTBRIDGE: supported exterior checkpoint; prior welcome, complete route, pause and real exit evidence retained');
  }else if(RESUME_RIDE){
    const previous=JSON.parse(readFileSync(TERMINAL_EVIDENCE,'utf8'));
    assert.equal(previous.terminal.chapterStage,'town');assert.equal(previous.terminal.chapterMission,'find-host');
    assert.equal(previous.welcome.dialogueSpeaker,'ANFITRIÃO');assert.equal(previous.seated.chapterStage,'westbridge');
    terminal=previous.terminal;welcome=previous.welcome;reusedTerminal=true;
    console.log('WESTBRIDGE: supported ride checkpoint; terminal welcome/lazy-load evidence retained');
    await observe(page);
  }else{
    terminal=await snapshot(page);
    assert.equal(terminal.chapterStage,'town');assert.equal(terminal.chapterMission,'find-host');
    assert.equal(terminal.westbridge.scenery.loaded,false,'Westbridge is not eagerly downloaded at startup');
    assert.deepEqual(neighbourhoodRequests,[],'the neighbourhood request is deferred until after the terminal welcome');
    console.log('WESTBRIDGE: existing terminal hosts and unchanged welcome');
    for(const point of ARRIVAL_ROUTE)await walkTo(page,point,{tolerance:.13,maxAttempts:75});
    await aimInteraction(page,'host',ARRIVAL_HOST);await page.keyboard.press('KeyE');await waitFrames(page,1);
    welcome=await snapshot(page);assert.equal(welcome.dialogueSpeaker,'ANFITRIÃO');
    assert.equal((await page.locator('#dialogueText').textContent()).trim(),'Você deve ser nosso novo estudante. Bem-vindo!');
    await observe(page);await page.keyboard.press('KeyE');
    await page.waitForFunction(()=>window.__INTERCAMBIO__.chapterStage==='westbridge'&&
      window.__INTERCAMBIO__.phase==='playing'&&window.__INTERCAMBIO__.westbridge.scenery.ready,null,{timeout:180000});
  }
  const baseProjection=terminal.plane.scenery.camera;
  if(!RESUME_EXPLORE){
  seated=await snapshot(page);streetView(seated);assert.equal(seated.chapterMission,'westbridge-ride');
  assert.equal(seated.westbridge.scenery.timeOfDay,'afternoon');
  assert.ok(neighbourhoodRequests.length>0);
  assert.equal(seated.westbridge.vehicle.interiorView,true);
  await take(page,'westbridge-rear-seat');

  console.log('WESTBRIDGE: seated mouse look, locked walking and paused route');
  const localBefore=relativeEye(await snapshot(page));
  for(const key of ['KeyW','KeyA']){
    await hold(page,key,130);const s=await snapshot(page);streetView(s);
    assert.ok(distance(relativeEye(s),localBefore)<.05,'walking does not leave the rear seat');
    movement.push({key,relativeEye:relativeEye(s),position:s.position});
  }
  await lookInside(page,-.85,.025);
  const windowView=await snapshot(page);assert.ok(Math.abs(wrap(windowView.rotation.yaw-carPose(windowView).yaw))>.4);
  await take(page,'westbridge-window');
  await pause(page);const stopped=await snapshot(page);await waitFrames(page,8);const still=await snapshot(page);
  assert.equal(driveOf(still).elapsed,driveOf(stopped).elapsed);
  assert.ok(distance(carPose(still).position,carPose(stopped).position)<1e-7);
  assert.equal(still.audio.paused,true);pausedRide={before:driveOf(stopped),after:driveOf(still)};
  await page.locator('#resume').click();await waitPhase(page,'playing');
  await page.waitForFunction(()=>{
    const d=window.__INTERCAMBIO__.westbridge.drive;
    return d.parked===true||['parked','outside','walking'].includes(d.state);
  },null,{timeout:240000});
  await waitFrames(page,2);
  parked=await snapshot(page);streetView(parked);assert.ok(isParked(parked));
  assert.equal(parked.chapterMission,'westbridge-ride');
  assert.equal(parked.audio.westbridge.vehicle.running,false);
  assert.equal(parked.audio.westbridge.mix.engineGain,0);
  assert.equal(parked.audio.westbridge.mix.tyreGain,0);
  await lookInside(page,-.32,0);
  assert.match((await page.locator('#interactionText').textContent()).trim(),/Sair.*carro/i);
  observation=await stopObservation(page);
  const visible=observation.samples.filter(s=>s.stage==='westbridge'&&s.fade<.99&&s.position);
  assert.ok(visible.length>12,'real route produces multiple visible positions');
  for(let i=1;i<visible.length;i++){
    assert.ok(distance(visible[i].position,visible[i-1].position)<1.5,'visible car route has no positional teleport');
    assert.ok(Math.abs(wrap(visible[i].yaw-visible[i-1].yaw))<.28,'car turns continuously');
  }
  assert.ok(distance(visible[0].position,visible.at(-1).position)>50,'car travels through the real neighbourhood');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__INTERCAMBIO__.chapterMission==='westbridge-explore'&&
    window.__INTERCAMBIO__.phase==='playing',null,{timeout:45000});
  walking=await snapshot(page);streetView(walking);assert.equal(walking.westbridge.vehicle.interiorView,false);
  assert.ok(distance(walking.position,WB_WALK_SPAWN)<.12,'exit adopts the safe exterior point beside the parked car');
  }else{
    walking=await snapshot(page);streetView(walking);assert.equal(walking.chapterMission,'westbridge-explore');
    assert.ok(isParked(walking));assert.equal(walking.westbridge.vehicle.interiorView,false);
    assert.ok(distance(walking.position,WB_WALK_SPAWN)<.15,'saved exterior checkpoint restores the safe point beside the parked car');
  }

  console.log('WESTBRIDGE: actual exterior view of the parked supplied car');
  await move(page,wbPoint(22.65,1.75,-5.9));await move(page,wbPoint(27.7,1.75,-5.9));
  await move(page,wbPoint(27.7,1.75,-4.8));
  await lookAt(page,wbPoint(23,1.8,-11.4));await take(page,'westbridge-parked');

  console.log('WESTBRIDGE: physical sidewalk, closed fence and house approach');
  await move(page,wbPoint(16.4,1.65,-5.9));
  await colliderProbe(page,wbPoint(16.4,1.65,-8),p=>p.z>=-6.83,'closed front fence');
  await move(page,wbPoint(16.4,1.65,-5.9));await move(page,wbPoint(20.0565,1.65,-5.9));
  await move(page,wbPoint(20.0565,1.8,-4.5));
  await lookAt(page,wbPoint(20.0565,3.5,-15));await take(page,'westbridge-house-day');
  for(const point of WB_WALK_ROUTE.slice(1))await move(page,point);
  await colliderProbe(page,{...WB_HOST_DOOR,z:WB_HOST_DOOR.z-.8,y:(await snapshot(page)).position.y},
    p=>p.z>=-12.49,'house front wall');

  console.log('WESTBRIDGE: master volume, saved walk state and night lighting');
  const originalVolume=(await snapshot(page)).settings.volume;
  await pause(page);if(await page.locator('#settingsPanel').isHidden())await page.locator('#openSettings').click();
  await setRange(page,'#volume',0);await page.locator('#resume').click();await waitFrames(page,5);
  mutedAudio=(await snapshot(page)).audio;assert.equal((await snapshot(page)).settings.volume,0);
  assert.equal(mutedAudio.masterGainTarget,0,'master volume really silences the audio graph');
  await pause(page);if(await page.locator('#settingsPanel').isHidden())await page.locator('#openSettings').click();
  await setRange(page,'#volume',originalVolume);await page.locator('#resume').click();await waitFrames(page,2);
  const checkpoint=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
  assert.equal(checkpoint.mission,'westbridge-explore');assert.equal(checkpoint.choice,'nervous');
  await startCheckpoint(page,BASE+'/?westbridgeLighting=night');
  resumed=await snapshot(page);streetView(resumed);assert.equal(resumed.chapterMission,'westbridge-explore');
  assert.equal(resumed.westbridge.scenery.timeOfDay,'night');
  assert.ok(isParked(resumed));assert.equal(resumed.westbridge.vehicle.interiorView,false);
  assert.ok(distance(resumed.position,WB_WALK_SPAWN)<.15);
  await colliderProbe(page,wbPoint(24.9,resumed.position.y,-7.55),p=>p.x>=476.20,'parked car side');
  await move(page,WB_WALK_SPAWN);
  await move(page,wbPoint(22.65,1.75,-5.9));await move(page,wbPoint(20.0565,1.75,-5.9));
  await move(page,wbPoint(20.0565,1.8,-4.5));
  await lookAt(page,wbPoint(20.0565,3.5,-15));await take(page,'westbridge-house-night');
  performanceSample=await stationaryPerformance(page);
  for(const point of WB_WALK_ROUTE.slice(1))await move(page,point);
  await aimInteraction(page,'wb-house-door',WB_HOST_DOOR);await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__INTERCAMBIO__.chapterMission==='complete',null,{timeout:45000});
  final=await snapshot(page);assert.equal(final.chapterStage,'westbridge');parentsRemainInBrazil(final);
  await waitPhase(page,'complete');await page.locator('#replay').click();await waitPhase(page,'opening');await waitFrames(page,3);
  restart=await snapshot(page);assert.equal(restart.chapterStage,'home');assert.equal(restart.westbridge.scenery.active,false);
  assert.deepEqual(restart.plane.scenery.camera,baseProjection,'leaving Westbridge restores the earlier camera projection');
  assert.equal(restart.family.location,'kitchen');assert.equal(restart.audio.westbridge.activeSources,0);
  assert.equal(restart.westbridge.hosts.location,'terminal','the same hosts return to their original terminal hierarchy on replay');
  assert.deepEqual(restart.errors,[]);assertHealthy(session);
  writeFileSync('/tmp/o-intercambio-westbridge-game-results.json',JSON.stringify({status:'passed',build:final.build,
    pictures,route,movement,reviewNotes,terminal,welcome,seated,parked,walking,resumed,final,restart,
    observation,pausedRide,mutedAudio,performanceSample,neighbourhoodRequests,reusedTerminal,reusedRide,
    reusedTerminalEvidence:reusedTerminal?TERMINAL_EVIDENCE:null,reusedRideEvidence:reusedRide?RIDE_EVIDENCE:null,
    errors,consoleErrors,failedAssets:failed,
    coverage:['existing terminal welcome continues into Westbridge only after being dismissed','lazy supplied neighbourhood loading',
      'real rear-seat look, locked translation, paused route and continuous drive to the home','parked exit, physical walking, fence and house collisions',
      'walking checkpoint reload and actual night preset','door interaction ends the chapter and replay restores the original home',
      'text-only dialogue, master volume and audio pause'],
    limits:[reusedRide?'The complete 32-second route, pause, parked engine and actual E exit were proved in the retained ride segment; the final exterior/night checks resume its saved walking checkpoint. The parked interior luminance gate was unsuitable for dark seatbacks, so final photo 3 is an exterior view.':reusedTerminal?'Terminal welcome and lazy-load evidence comes from the initial focal run; the corrected final ride starts at its supported checkpoint.':'Starts from the supported terminal find-host checkpoint; the house, Brazilian airport and flight were not replayed.',
      'Real screenshots require visual inspection. No camera or clock setters were used.',
      'Chromium/Linux SwiftShader software rendering; not a physical GPU or mobile benchmark.']},null,2));
  console.log('PASS WESTBRIDGE GAME: terminal welcome → drive → park → walk → door, checkpoint/night/replay.');
} catch(error) {
  console.error(error);
  if(session)await session.page.screenshot({path:'/tmp/o-intercambio-westbridge-game-failure.png'}).catch(()=>{});
  writeFileSync('/tmp/o-intercambio-westbridge-game-results.json',JSON.stringify({status:'failed',error:String(error),
    pictures,route,movement,reviewNotes,state:session?await snapshot(session.page).catch(()=>null):null,
    terminal,welcome,seated,parked,walking,resumed,final,observation,pausedRide,
    errors:session?.errors,consoleErrors:session?.consoleErrors,failedAssets:session?.failed},null,2));
  if(session&&process.env.INTERCAMBIO_DEBUG==='1'){
    const repl=(await import('node:repl')).start({prompt:'westbridge-debug> '});
    repl.context.qa={...session,browser,snapshot,capture,waitFrames,waitPhase,lookAt,faceYaw,aimInteraction,
      pause,move,streetView,pictures,route,movement,terminal,welcome,seated,parked,walking,resumed,final};
    repl.context.continueFlow=()=>repl.close();await new Promise(resolve=>repl.once('exit',resolve));
  }
  throw error;
} finally {await browser?.close();}
