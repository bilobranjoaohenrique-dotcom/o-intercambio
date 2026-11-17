import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const l=await import('../src/game/hostHouseLayout.ts');
const {createHostHouseNavigation}=await import('../src/game/hostHouseNavigation.ts');
const {circleOverlapsObstacle,PLAYER_RADIUS}=await import('../src/game/collision.ts');
const p2=p=>({x:p.x,z:p.z});
const close=(a,b,message,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${message}: ${a} vs ${b}`);
function follow(nav,start,points){
 let p=p2(start);const heights=[];
 for(const target of points){
  let tries=0;
  while(Math.hypot(target.x-p.x,target.z-p.z)>.02&&tries++<1000){
   const d=Math.hypot(target.x-p.x,target.z-p.z),step=Math.min(.04,d),before=nav.floorHeight(p);
   p=nav.move(p,(target.x-p.x)/d*step,(target.z-p.z)/d*step);
   const after=nav.floorHeight(p);assert.ok(Math.abs(after-before)<=.220001,'walking cannot jump through a storey');
   assert.ok(nav.isWalkable(p),'every accepted point clears actual walls and furniture');heights.push(after);
  }
  assert.ok(Math.hypot(target.x-p.x,target.z-p.z)<.02,'physical route reaches '+JSON.stringify({target,actual:p,nav:nav.diagnostics}));
 }
 return{position:p,heights};
}

test('host house: metre-scale native floors, front door and source wardrobe correction stay explicit',()=>{
 close(l.HOST_HOUSE_SPAWN.y,2.04,'native floor plus standing eye');
 assert.equal(l.HOST_HOUSE_YAW,-Math.PI/2);assert.deepEqual(l.HOST_HOUSE_EXIT_SIZE,[.055,1.985,1.65]);
 assert.equal(l.HOST_HOUSE_NODE_ADJUSTMENTS.length,3);
 assert.ok(l.HOST_HOUSE_NODE_ADJUSTMENTS.every(x=>x.sourceDelta.z===1.45&&x.sourceDelta.x===0&&x.sourceDelta.y===0));
 const wardrobe=l.HOST_HOUSE_SOLIDS.find(x=>x.name==='furn_hosts_wardrobe_0');
 close(wardrobe.z-wardrobe.halfDepth,39.765,'wardrobe clears source doorway after the matching visual correction');
 const nav=createHostHouseNavigation();assert.ok(nav.isWalkable(l.HOST_HOUSE_SPAWN));
});

test('host house: real floor-plan tour reaches living room, kitchen, all 18 stairs and player bedroom, then returns',()=>{
 const nav=createHostHouseNavigation(),points=l.HOST_HOUSE_QA_TOUR.flatMap(s=>s.points);
 const forward=follow(nav,l.HOST_HOUSE_SPAWN,points);
 close(nav.floorHeight(forward.position),3.84,'upper bedroom floor');assert.equal(nav.diagnostics.level,'upper');
 const distinct=[...new Set(forward.heights.map(h=>h.toFixed(6)))];
 assert.equal(distinct.length,19,'ground plus eighteen independently traversed tread heights');
 const reverse=follow(nav,forward.position,[...points].reverse());
 close(nav.floorHeight(reverse.position),.39,'same physical staircase returns to ground');assert.equal(nav.diagnostics.level,'ground');
 assert.ok(Math.hypot(reverse.position.x-l.HOST_HOUSE_SPAWN.x,reverse.position.z-l.HOST_HOUSE_SPAWN.z)<.02);
});

test('host house: overlapping XZ rooms use accepted elevation, not a teleporting maximum-height map',()=>{
 const nav=createHostHouseNavigation(),point=l.HOST_HOUSE_ROOM_POINTS.foyer;
 close(nav.floorHeight(point),.39,'foyer downstairs');
 const state=nav.diagnostics.elevation;nav.floorHeight(l.hhPoint(55,0,37.475));
 assert.equal(nav.diagnostics.elevation,state,'height queries cannot change the active storey');
 nav.reset('upper');close(nav.floorHeight(point),3.84,'same XZ upstairs');
 nav.reset();close(nav.floorHeight(point),.39,'entry reset restores ground floor');
});

test('host house: lateral stair jumps and upper stairwell drops are blocked',()=>{
 const nav=createHostHouseNavigation(),under=l.hhPoint(55.5,0,36.4);
 assert.ok(nav.isWalkable(under));const stopped=nav.move(under,0,2);
 assert.ok(stopped.z<36.92);close(nav.floorHeight(stopped),.39,'cannot enter a high tread from the side');
 nav.reset('upper');const gallery=l.hhPoint(55.5,0,36.3);assert.ok(nav.isWalkable(gallery));
 const guard=nav.move(gallery,0,5);assert.ok(guard.z<=36.75-PLAYER_RADIUS+.067);
 close(nav.floorHeight(guard),3.84,'gallery guard prevents walking through the stairwell opening');
});

test('host house: all upper-room doorways and the utility passage clear the unchanged solid furniture',()=>{
 for(const points of Object.values(l.HOST_HOUSE_UPPER_BRANCHES)){
  const nav=createHostHouseNavigation();nav.reset('upper');assert.ok(nav.isWalkable(points[0]));
  const end=follow(nav,points[0],points);close(nav.floorHeight(end.position),3.84,'upper branch keeps its floor');
 }
 const nav=createHostHouseNavigation(),start=l.HOST_HOUSE_ROOM_POINTS.living;
 const utility=follow(nav,start,[l.hhPoint(52.5,2.04,39),l.hhPoint(52.5,2.04,40.8),l.hhPoint(53.5,2.04,40.8),l.HOST_HOUSE_ROOM_POINTS.utility]);
 close(nav.floorHeight(utility.position),.39,'utility remains downstairs');
 assert.equal(nav.surfaceAt(l.HOST_HOUSE_ROOM_POINTS.utility),'concrete');
});

test('host house: sofa, walls, outer perimeter and dynamic obstacles stop swept movement',()=>{
 const nav=createHostHouseNavigation(),probe=l.HOST_HOUSE_COLLISION_PROBE,solid=l.HOST_HOUSE_SOLIDS.find(s=>s.name===probe.solidName);
 const end=nav.move(probe.approach,(probe.target.x-probe.approach.x)*4,(probe.target.z-probe.approach.z)*4);
 assert.ok(end.z<39.739);assert.equal(circleOverlapsObstacle(end,solid),false);
 const wallStart=l.hhPoint(49,0,37),wall=nav.move(wallStart,0,20);assert.ok(wall.z<38.13);
 const perimeter=nav.move(l.HOST_HOUSE_SPAWN,10,0);assert.ok(perimeter.x<=800-48.13-PLAYER_RADIUS+.067);
 const obstacle={x:749.3,z:37.8,halfWidth:.25,halfDepth:.25};const stop=nav.move(l.HOST_HOUSE_ROOM_POINTS.foyer,0,4,[obstacle]);
 assert.equal(circleOverlapsObstacle(stop,obstacle),false);assert.ok(stop.z<37.8);
});

test('host house: bounded invalid input and nonverbal step surfaces do not leak a floor state',()=>{
 const nav=createHostHouseNavigation(),start=p2(l.HOST_HOUSE_SPAWN);
 assert.deepEqual(nav.move(start,NaN,1),start);assert.deepEqual(nav.move(start,1,Infinity),start);
 assert.deepEqual(nav.move({x:NaN,z:0},1,0),start);assert.equal(nav.isWalkable({x:Infinity,z:0}),false);
 assert.equal(nav.surfaceAt(l.HOST_HOUSE_ROOM_POINTS.living),'wood');assert.equal(nav.surfaceAt(l.HOST_HOUSE_ROOM_POINTS.kitchen),'concrete');
 assert.equal(nav.isWalkable(l.hhPoint(53,0,27)),false,'the separate garage has no authored internal opening and is not connected by an invisible portal');
});

test('host house renovation: new guest furniture blocks passage through it while the room approach stays open',()=>{
 const nav=createHostHouseNavigation();nav.reset('upper');
 const approach=l.hhPoint(50.4,0,34.15);assert.ok(nav.isWalkable(approach));
 const bed=l.HOST_HOUSE_SOLIDS.find(s=>s.name==='Guest_bed');assert.ok(bed);
 const stopped=nav.move(approach,0,-3);
 assert.equal(circleOverlapsObstacle(stopped,bed),false);
 assert.ok(stopped.z>=bed.z+bed.halfDepth+PLAYER_RADIUS-.001,'the actual new bed stops the player at its foot');
 const route=follow(nav,l.HOST_HOUSE_ROOM_POINTS.upperFrontRoom,[l.hhPoint(51.1,0,34.4),l.hhPoint(51.1,0,33.5)]);
 assert.ok(nav.isWalkable(route.position),'guest bed and writing table leave the centre route free');
 nav.reset('ground');const hutch=l.HOST_HOUSE_SOLIDS.find(s=>s.name==='dining_hutch');assert.ok(hutch);
 const diningApproach=l.hhPoint(51.7,0,32.2);assert.ok(nav.isWalkable(diningApproach));
 const end=nav.move(diningApproach,0,-2);
 assert.equal(circleOverlapsObstacle(end,hutch),false);
 assert.ok(end.z>hutch.z+hutch.halfDepth,'new wall hutch cannot be walked through');
 assert.ok(!l.HOST_HOUSE_SOLIDS.some(s=>s.name==='bookcase_tall.002'),'removed overlapping laundry shelf leaves no invisible blocker');
});

test('host house basement: ordinary ground route reaches the new closed door without entering an invented room',()=>{
 const nav=createHostHouseNavigation();
 const start=l.hhPoint(54.5,2.04,36.3);
 const route=follow(nav,start,[l.hhPoint(57.35,2.04,36.3),l.hhPoint(57.35,2.04,37)]);
 close(nav.floorHeight(route.position),.39,'basement approach remains on the ground floor');
 const solid=l.HOST_HOUSE_SOLIDS.find(s=>s.name==='HH_basement_door_closed');assert.ok(solid);
 const stopped=nav.move(route.position,-2,0);
 assert.equal(circleOverlapsObstacle(stopped,solid),false,'closed leaf stops the protagonist');
 assert.ok(stopped.x>solid.x,'player remains on the interior side of the door');
 assert.equal(nav.isWalkable(l.hhPoint(58.5,0,37)),false,'no new room or unbounded basement navigation added');
});
