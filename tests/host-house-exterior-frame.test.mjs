import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const frame=await import('../src/game/hostHouseExteriorFrame.ts');
const {WB_HOST_DOOR,WB_MAILBOX,WB_PARKED_CAR}=await import('../src/game/westbridgeLayout.ts');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} versus ${b}`);
const vectorClose=(a,b)=>{for(const key of ['x','y','z'])close(a[key],b[key]);};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('host windows: actual neighbourhood positions keep metre distances and round-trip through the door frame',()=>{
 const points=[WB_HOST_DOOR,WB_MAILBOX,WB_PARKED_CAR,{x:480,y:6,z:17.86},{x:522,y:.144,z:-23}];
 for(const p of points){
  const mapped=frame.westbridgeToHostHouse(p),back=frame.hostHouseToWestbridge(mapped);
  for(const key of ['x','y','z'])close(back[key],p[key]);
 }
 for(const a of points)for(const b of points)
  close(distance(frame.westbridgeToHostHouse(a),frame.westbridgeToHostHouse(b)),distance(a,b));
 const entrance=frame.westbridgeToHostHouse(frame.HOST_HOUSE_EXTERIOR_FRAME.exteriorAnchor);
 vectorClose(entrance,frame.HOST_HOUSE_EXTERIOR_FRAME.interiorAnchor);
});

test('host windows: front faces the real street and rear faces the real back gardens without warping the world',()=>{
 vectorClose(frame.hostHouseDirectionToWestbridge({x:1,y:0,z:0}),{x:0,y:0,z:1});
 vectorClose(frame.hostHouseDirectionToWestbridge({x:-1,y:0,z:0}),{x:0,y:0,z:-1});
 const forward={x:.7,y:-.1,z:.4};
 assert.deepEqual(frame.westbridgeDirectionToHostHouse(frame.hostHouseDirectionToWestbridge(forward)),forward);
 assert.equal(frame.HOST_HOUSE_EXTERIOR_FRAME.scale,1);
 const housePose={x:751.94,y:5.45,z:41};
 const reference=frame.hostHouseCameraToWestbridge(housePose,{x:1,y:0,z:0});
 vectorClose(reference.forward,{x:0,y:0,z:1});
 close(reference.position.x,WB_HOST_DOOR.x-4);
 close(reference.position.z,WB_HOST_DOOR.z-.06);
});
