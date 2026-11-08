import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { LAUNDRY, LAUNDRY_FURNITURE: F } = await import('../src/game/laundryLayout.ts');
const { GARAGE_ROUTE: G } = await import('../src/game/garageLayout.ts');
const { isWalkable, floorHeight, moveWithCollisions } = await import('../src/game/collision.ts');

function follow(start, targets) {
 let point={...start};assert.ok(isWalkable(point),JSON.stringify(point));
 for(const target of targets){
  const dx=target.x-point.x,dz=target.z-point.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.025));
  for(let i=0;i<n;i++)point=moveWithCollisions(point,dx/n,dz/n);
  assert.ok(Math.hypot(point.x-target.x,point.z-target.z)<1e-6,JSON.stringify({target,point}));
  assert.ok(isWalkable(point));assert.equal(floorHeight(point),0);
 }
 return point;
}
test('lavanderia: cozinha e garagem se conectam nos dois sentidos pelo piso real',()=>{
 const home={x:0,z:16.3};
 const path=[{x:3.5,z:16.25},{x:3.5,z:16.45},{x:4.65,z:16.45},{x:5.6,z:16.45},{x:5.6,z:15.12},G.driver];
 follow(home,[...path,...path.slice(0,-1).reverse(),home]);
 assert.ok(LAUNDRY.maxX-LAUNDRY.minX<=3.21);assert.ok(LAUNDRY.maxZ-LAUNDRY.minZ<=3.81);
});
test('lavanderia: tanque, lavadora, cesto e limites conservam colisões',()=>{
 for(const name of ['washer','sink','basket','bucket'])assert.equal(isWalkable(F[name]),false,name);
 const approach={x:5.5,z:F.washer.z};assert.ok(isWalkable(approach));
 const washerStop=moveWithCollisions(approach,1000,0);
 assert.ok(isWalkable(washerStop));assert.ok(washerStop.x<=F.washer.x-F.washer.width/2-.215);
 const wallStop=moveWithCollisions({x:5.3,z:18.1},0,1000);
 assert.ok(isWalkable(wallStop));assert.ok(wallStop.z<=LAUNDRY.maxZ-.215);
});
test('lavanderia: acesso anterior entre casa e garagem permanece livre',()=>{
 assert.equal(isWalkable({x:3.95,z:15.55}),true,'new north wall must not enter the old passage');
 const home={x:0,z:16.3};
 follow(home,[{x:3.5,z:16.25},{x:3.5,z:15.35},G.houseApproach,G.entrance,G.rearSouth,G.driver]);
});
