import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { GARAGE, GARAGE_ROUTE: R, FAMILY_CAR, GARAGE_SHELF } = await import('../src/game/garageLayout.ts');
const { canEnterFamilyCar, setTravelBagTaken } = await import('../src/game/garageProgress.ts');
const { createChapterProgress } = await import('../src/game/narrative.ts');
const { FURNITURE } = await import('../src/game/layout.ts');
const { isWalkable, floorHeight, moveWithCollisions } = await import('../src/game/collision.ts');

function follow(start, targets) {
 let point={...start};
 assert.ok(isWalkable(point));
 for(const target of targets){
  const dx=target.x-point.x,dz=target.z-point.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.025));
  for(let i=0;i<n;i++){point=moveWithCollisions(point,dx/n,dz/n);assert.ok(isWalkable(point));}
  assert.ok(Math.hypot(point.x-target.x,point.z-target.z)<1e-6,JSON.stringify({target,point}));
  assert.equal(floorHeight(point),0);
 }
 return point;
}
test('garagem: porta conecta a casa e permite circular pelos quatro lados do carro',()=>{
 const home={x:0,z:16.3};
 follow(home,[{x:3.5,z:16.25},{x:3.5,z:15.35},R.houseApproach,R.entrance,
  R.rear,R.frontNorth,R.frontSouth,R.rearSouth,R.entrance,R.houseApproach,
  {x:3.5,z:15.35},{x:3.5,z:16.25},home]);
 assert.ok(GARAGE.maxX-GARAGE.minX>=5.5);assert.ok(GARAGE.maxZ-GARAGE.minZ>=3.5);
});
test('garagem: carro, prateleira, paredes e portão continuam sólidos',()=>{
 assert.equal(isWalkable(FAMILY_CAR),false);assert.equal(isWalkable(GARAGE_SHELF),false);
 const car=moveWithCollisions(R.driver,0,-1000);
 assert.ok(isWalkable(car));assert.ok(car.z>=FAMILY_CAR.z+FAMILY_CAR.width/2+.215);
 const gate=moveWithCollisions(R.frontSouth,1000,0);
 assert.ok(isWalkable(gate));assert.ok(gate.x<=GARAGE.maxX-.215);
 const wall=moveWithCollisions(R.frontNorth,0,-1000);
 assert.ok(isWalkable(wall));assert.ok(wall.z>=GARAGE.minZ+.215);
});
test('garagem: só a missão da mala concluída libera o carro e desativa somente seu obstáculo',()=>{
 assert.equal(canEnterFamilyCar('pack-suitcase',['breakfast','talk-parents']),false);
 assert.equal(canEnterFamilyCar('enter-car',['breakfast','talk-parents']),false);
 assert.equal(canEnterFamilyCar('talk-parents',['pack-suitcase']),false);
 assert.equal(canEnterFamilyCar('enter-car',['breakfast','talk-parents','pack-suitcase']),true);
 try{
  setTravelBagTaken(false);assert.equal(isWalkable(FURNITURE.backpack),false);
  setTravelBagTaken(true);assert.equal(isWalkable(FURNITURE.backpack),true);
  assert.equal(isWalkable(FURNITURE.bed),false,'taking the bag does not disable the bedroom furniture');
 }finally{setTravelBagTaken(false);}
});
test('garagem: checkpoint antigo da mala e novo checkpoint de embarque são restaurados',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let stored;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:()=>stored,setItem:(_key,value)=>{stored=value;},removeItem:()=>{stored=null;},
 }});
 try{
  stored=JSON.stringify({mission:'pack-suitcase',choice:'nervous',completed:['breakfast','talk-parents']});
  const packing=createChapterProgress();assert.equal(packing.mission,'pack-suitcase');assert.equal(packing.choice,'nervous');
  assert.equal(canEnterFamilyCar(packing.mission,packing.completed),false);
  packing.advance('enter-car');
  const restored=createChapterProgress();assert.equal(restored.mission,'enter-car');
  assert.equal(canEnterFamilyCar(restored.mission,restored.completed),true);
 }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
});
