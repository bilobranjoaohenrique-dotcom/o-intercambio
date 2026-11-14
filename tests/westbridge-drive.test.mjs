import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {sampleWestbridgeDrive,createWestbridgeDrive,vehiclePoint,WB_DRIVE_SECONDS,WB_REAR_SEAT}=await import('../src/game/westbridgeDrive.ts');
const {WB_DRIVE_ROUTE}=await import('../src/game/westbridgeLayout.ts');
const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} ~= ${b}`);

test('Westbridge drive: authored path endpoints, smooth speed and continuous heading',()=>{
  const first=sampleWestbridgeDrive(0),last=sampleWestbridgeDrive(WB_DRIVE_SECONDS);
  for(const axis of ['x','y','z']){near(first.position[axis],WB_DRIVE_ROUTE[0][axis]);near(last.position[axis],WB_DRIVE_ROUTE.at(-1)[axis]);}
  near(first.speed,0);near(last.speed,0);assert.equal(first.parked,false);assert.equal(last.parked,true);
  assert.ok(first.totalDistance>80&&first.totalDistance<110);
  let previous=first;
  for(let time=.025;time<WB_DRIVE_SECONDS;time+=.025){
    const sample=sampleWestbridgeDrive(time);
    assert.ok(Math.hypot(sample.position.x-previous.position.x,sample.position.z-previous.position.z)<.15,'no position jumps');
    assert.ok(Math.abs(Math.atan2(Math.sin(sample.yaw-previous.yaw),Math.cos(sample.yaw-previous.yaw)))<.15,'no heading snaps');
    assert.ok(sample.speed>=0&&sample.speed<6);previous=sample;
  }
  assert.ok(sampleWestbridgeDrive(30).speed<sampleWestbridgeDrive(16).speed);
  for(const invalid of [NaN,Infinity,-Infinity,-10])assert.deepEqual(sampleWestbridgeDrive(invalid),first);
});

test('Westbridge drive: player keeps local mouse look, pauses without update and exits only parked',()=>{
  const camera={position:{x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}},rotation:{x:0,y:0,z:0},fov:1.13,minZ:.045};
  let movement=true,lookLimits=null,clears=0,adopts=0,interior=false,pose=null;
  const controls={setMovementEnabled(v){movement=v;},setLookLimits(v){lookLimits=v;},clearInput(){clears++;},adoptCameraPose(){adopts++;},
    applyExternalMotion(point,delta){camera.position.set(point.x,point.y,point.z);camera.rotation.y+=delta;return true;}};
  const vehicle={setPose(v){pose=v;},setInteriorView(v){interior=v;}};
  const drive=createWestbridgeDrive(camera,controls,vehicle);drive.enter();
  assert.equal(movement,false);assert.equal(interior,true);assert.equal(drive.exit(),false);
  near(drive.diagnostics.lookOffset,-.32);
  camera.rotation.y+=.63;camera.rotation.x=-.21;
  for(let i=0;i<150;i++)drive.update(.1);
  near(drive.diagnostics.lookOffset,.31);near(camera.rotation.x,-.21);assert.equal(adopts,1);assert.equal(clears,1);
  const paused=structuredClone(drive.diagnostics); // no timer lives inside the sequence
  for(const invalid of [NaN,0,-1,Infinity])drive.update(invalid);
  assert.deepEqual(drive.diagnostics,paused);
  for(let i=0;i<180;i++)drive.update(.1);
  assert.equal(drive.canExit,true);assert.equal(pose.parked,true);
  const expected=vehiclePoint(pose.position,pose.yaw,WB_REAR_SEAT);
  for(const axis of ['x','y','z'])near(camera.position[axis],expected[axis]);
  near(lookLimits.centerYaw,pose.yaw);assert.equal(drive.exit(),true);assert.equal(interior,false);assert.equal(lookLimits,null);
  near(camera.fov,1.13);near(camera.minZ,.045);assert.equal(drive.exit(),false);
});
