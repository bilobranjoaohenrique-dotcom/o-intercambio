import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const l=await import('../src/game/hostHouseLayout.ts');
const {createHostHouseNavigation}=await import('../src/game/hostHouseNavigation.ts');
const {circleOverlapsObstacle,PLAYER_RADIUS}=await import('../src/game/collision.ts');
const wb=await import('../src/game/westbridgeNavigation.ts');
const {WB_WALK_SPAWN}=await import('../src/game/westbridgeLayout.ts');
const p2=p=>({x:p.x,z:p.z});
const close=(a,b,message,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${message}: ${a} vs ${b}`);
const local=(x,z,y=.4)=>l.hhLocalPoint(x,y+1.65,z);
function follow(nav,start,points){
 let p=p2(start);const heights=[];
 for(const target of points){
  let tries=0;
  while(Math.hypot(target.x-p.x,target.z-p.z)>.018&&tries++<1200){
   const d=Math.hypot(target.x-p.x,target.z-p.z),step=Math.min(.025,d),before=nav.floorHeight(p);
   p=nav.move(p,(target.x-p.x)/d*step,(target.z-p.z)/d*step);
   const after=nav.floorHeight(p);assert.ok(Math.abs(after-before)<=.220001,'walking cannot jump through a storey');
   assert.ok(nav.isWalkable(p),'every accepted point clears actual walls and furniture');heights.push(after);
  }
  assert.ok(Math.hypot(target.x-p.x,target.z-p.z)<.025,'physical route reaches '+JSON.stringify({target,actual:p,nav:nav.diagnostics}));
 }
 return{position:p,heights};
}

test('host house A01: native neighbourhood origin, marker scale and the explicit garage fit are preserved',()=>{
 assert.equal(l.HOST_HOUSE_ORIGIN_X,500);assert.equal(l.HOST_HOUSE_YAW,Math.PI);
 close(l.HOST_HOUSE_SPAWN.x,479.94,'source door X maps once through handedness');
 close(l.HOST_HOUSE_SPAWN.y,2.05,'ground floor plus standing eye');
 close(l.HOST_HOUSE_SPAWN.z,-13.16,'source root translation applied exactly once');
 assert.deepEqual(l.HOST_HOUSE_EXIT_SIZE,[1.18,2.03,.055]);assert.equal(l.HOST_HOUSE_NODE_ADJUSTMENTS.length,0);
 assert.equal(l.HOST_HOUSE_SOLIDS.length,204,'211 marked meshes minus seven measuring-car components');
 assert.equal(l.HOST_HOUSE_SOLIDS.some(s=>s.name.startsWith('Carro_compacto_')),false);
 close(l.adjustHostHouseSourceX('ENV_0_08',27.12),26.78,'only outer garage wall fits the approved facade');
 close(l.adjustHostHouseSourceX('Piso_garagem',23.08),23.08,'shared garage edge stays fixed');
 close(l.adjustHostHouseSourceX('MOV_1_04_Cama solteiro_mesh',27.12),27.12,'unrelated source geometry never changes');
 assert.ok(createHostHouseNavigation().isWalkable(l.HOST_HOUSE_SPAWN));
});

test('host house A01: the furnished tour traverses all sixteen risers, both flights, bedroom and same return route',()=>{
 const nav=createHostHouseNavigation(),points=l.HOST_HOUSE_QA_TOUR.flatMap(s=>s.points);
 const forward=follow(nav,l.HOST_HOUSE_SPAWN,points);
 close(nav.floorHeight(forward.position),3.12,'upper bedroom floor');assert.equal(nav.diagnostics.level,'upper');
 const distinct=[...new Set(forward.heights.map(h=>h.toFixed(6)))];
 assert.equal(distinct.length,17,'ground plus sixteen independently traversed riser heights');
 const reverse=follow(nav,forward.position,[...points].reverse());
 close(nav.floorHeight(reverse.position),.4,'the U staircase returns to ground');assert.equal(nav.diagnostics.level,'ground');
 assert.ok(Math.hypot(reverse.position.x-l.HOST_HOUSE_SPAWN.x,reverse.position.z-l.HOST_HOUSE_SPAWN.z)<.025);
});

test('host house A01: height queries cannot change storey and low door colliders never block the upper floor',()=>{
 const nav=createHostHouseNavigation(),point=l.HOST_HOUSE_ROOM_POINTS.foyer;
 close(nav.floorHeight(point),.4,'foyer downstairs');const state=nav.diagnostics.elevation;
 nav.floorHeight(l.HOST_HOUSE_ROOM_POINTS.playerBedroom);assert.equal(nav.diagnostics.elevation,state);
 const door={...p2(point),halfWidth:.35,halfDepth:.15,minY:.4,maxY:2.43};
 assert.equal(nav.isWalkable(point,[door]),false,'closed ground door blocks ground body');
 nav.reset('upper');close(nav.floorHeight(point),3.12,'same XZ upstairs');
 assert.equal(nav.isWalkable(point,[door]),true,'the doorway below does not project an invisible upper obstacle');
 nav.reset();close(nav.floorHeight(point),.4,'entry reset restores ground floor');
});

test('host house A01: a high flight, upper guard and lateral divider prevent stair shortcuts and falls',()=>{
 const nav=createHostHouseNavigation(),under=local(3.54,-1.37);
 assert.ok(nav.isWalkable(under));const stopped=nav.move(under,0,-3);
 assert.ok(stopped.z>-14.33);close(nav.floorHeight(stopped),.4,'ground cannot enter the underside of the high return flight');
 nav.reset('upper');const gallery=local(2.52,-1.37,3.12);assert.ok(nav.isWalkable(gallery));
 const guard=nav.move(gallery,0,-4);assert.ok(guard.z>-14.30);
 close(nav.floorHeight(guard),3.12,'guard prevents walking into the low-flight void');
 const side=local(4.45,-2.65,3.12);assert.ok(nav.isWalkable(side));
 const lateral=nav.move(side,3,0);assert.ok(lateral.x<500-15.38-4.1);
 close(nav.floorHeight(lateral),3.12,'the divider prevents skipping sideways onto lower treads');
});

test('host house A01: the two upstairs room doors and bathroom clear the unchanged adult radius',()=>{
 for(const points of Object.values(l.HOST_HOUSE_UPPER_BRANCHES)){
  const nav=createHostHouseNavigation();nav.reset('upper');assert.ok(nav.isWalkable(points[0]));
  const end=follow(nav,points[0],points);close(nav.floorHeight(end.position),3.12,'upper branch keeps its floor');
 }
 assert.equal(PLAYER_RADIUS,.22);assert.equal(l.HOST_HOUSE_STAIRS.steps,16);
});

test('host house A01: the garage threshold steps down physically and its original closed outer gate blocks passage',()=>{
 const nav=createHostHouseNavigation();
 const kitchen=l.HOST_HOUSE_QA_TOUR[1].points;
 const ground=follow(nav,l.HOST_HOUSE_SPAWN,l.HOST_HOUSE_QA_TOUR.slice(0,2).flatMap(s=>s.points));
 const garage=follow(nav,ground.position,l.HOST_HOUSE_GARAGE_TOUR);
 close(nav.floorHeight(garage.position),.16,'garage floor');
 assert.ok(garage.heights.some(h=>Math.abs(h-.28)<1e-6),'the intermediate garage tread is actually crossed');
 assert.equal(nav.surfaceAt(garage.position),'concrete');
 const gateStart=local(9.4,-1.05,.16);const blocked=nav.move(gateStart,0,3);
 assert.ok(blocked.z<-13.35,'the preserved exterior garage gate stays shut');
 assert.ok(!circleOverlapsObstacle(blocked,l.HOST_HOUSE_GARAGE_GATE_SOLID));
 const back=follow(nav,garage.position,[...l.HOST_HOUSE_GARAGE_TOUR].reverse());
 close(nav.floorHeight(back.position),.4,'garage-to-kitchen return climbs both threshold risers');
});

test('host house A01: the open front door connects the interior, porch, existing steps and Westbridge without teleport',()=>{
 const nav=createHostHouseNavigation();
 const route=[l.HOST_HOUSE_SPAWN,l.hhPoint(20.06,2.05,-12.3),l.hhPoint(20.06,2.02,-11.7),
  l.hhPoint(20.06,1.93,-10.95),l.hhPoint(20.06,1.82,-10.7),l.hhPoint(20.06,1.78,-10.4),
  l.hhPoint(20.06,1.78,-7.55),l.hhPoint(20.06,1.78,-4.3),l.hhPoint(20.06,1.684,-3.8)];
 const out=follow(nav,l.HOST_HOUSE_SPAWN,route);
 assert.equal(nav.containsInterior(out.position),false);close(nav.floorHeight(out.position),wb.floorHeight(out.position),'original street floor');
 assert.ok(nav.containsInterior(l.HOST_HOUSE_ROOM_POINTS.living));assert.ok(nav.containsInterior(l.HOST_HOUSE_ROOM_POINTS.garage));
 assert.equal(nav.containsInterior(l.hhPoint(20.06,2,-11.7)),false,'porch is outside for checkpoint saves');
 const back=follow(nav,out.position,[...route].reverse());close(nav.floorHeight(back.position),.4,'normal walking returns through the same threshold');
 nav.reset('ground',WB_WALK_SPAWN);assert.equal(nav.isWalkable(WB_WALK_SPAWN),wb.isWalkable(WB_WALK_SPAWN));
 close(nav.floorHeight(WB_WALK_SPAWN),wb.floorHeight(WB_WALK_SPAWN),'unchanged neighbourhood fallback');
});

test('host house A01: sofa, shared wall and dynamic obstacles stop swept movement',()=>{
 const nav=createHostHouseNavigation(),probe=l.HOST_HOUSE_COLLISION_PROBE,solid=l.HOST_HOUSE_SOLIDS.find(s=>s.name===probe.solidName);
 const end=nav.move(probe.approach,(probe.target.x-probe.approach.x)*4,(probe.target.z-probe.approach.z)*4);
 assert.equal(circleOverlapsObstacle(end,solid),false);
 const wallStart=local(5.9,-3.3),wall=nav.move(wallStart,-12,0);
 assert.ok(wall.x>500-15.38-7.5,'shared wall cannot be crossed outside the garage doorway');
 const obstacle={x:l.HOST_HOUSE_SPAWN.x,z:l.HOST_HOUSE_SPAWN.z+.5,halfWidth:.3,halfDepth:.1};
 const stopped=nav.move(l.HOST_HOUSE_SPAWN,0,4,[obstacle]);assert.equal(circleOverlapsObstacle(stopped,obstacle),false);
});

test('host house A01: invalid movement stays bounded and local nonverbal surfaces preserve the current floor',()=>{
 const nav=createHostHouseNavigation(),start=p2(l.HOST_HOUSE_SPAWN);
 assert.deepEqual(nav.move(start,NaN,1),start);assert.deepEqual(nav.move(start,1,Infinity),start);
 assert.deepEqual(nav.move({x:NaN,z:0},1,0),start);assert.equal(nav.isWalkable({x:Infinity,z:0}),false);
 assert.equal(nav.surfaceAt(l.HOST_HOUSE_ROOM_POINTS.living),'wood');assert.equal(nav.surfaceAt(l.HOST_HOUSE_ROOM_POINTS.garage),'concrete');
 nav.reset('upper');assert.equal(nav.surfaceAt(l.HOST_HOUSE_ROOM_POINTS.playerBedroom),'wood');
 assert.equal(nav.diagnostics.playerRadius,.22);assert.equal(nav.diagnostics.bodyHeight,1.78);
});
