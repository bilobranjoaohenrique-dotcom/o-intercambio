import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { wbPoint, WB_DRIVE_ROUTE, WB_PARKED_CAR, WB_WALK_SPAWN, WB_WALK_ROUTE, WB_HOST_DOOR,
  WB_HOST_FENCES, WB_LOT_FENCES, WB_STATIC_SOLIDS, WB_HOST_APPROACH } = await import('../src/game/westbridgeLayout.ts');
const { move, floorHeight, isWalkable, surfaceAt } = await import('../src/game/westbridgeNavigation.ts');
const { PLAYER_RADIUS, circleOverlapsObstacle } = await import('../src/game/collision.ts');
const point2 = p => ({ x: p.x, z: p.z });

test('Westbridge: measured driveway route keeps finite, separated original-scale anchors', () => {
  assert.equal(WB_DRIVE_ROUTE.length, 15);
  assert.deepEqual(WB_DRIVE_ROUTE.at(-1), WB_PARKED_CAR);
  assert.ok(WB_DRIVE_ROUTE.every(p => [p.x, p.y, p.z].every(Number.isFinite)));
  const turn = WB_DRIVE_ROUTE.slice(6, 13), center = wbPoint(19.9, 0, -6.6);
  for (const p of turn) assert.ok(Math.abs(Math.hypot(p.x-center.x,p.z-center.z)-5)<1e-8);
  assert.ok(Math.hypot(WB_WALK_SPAWN.x-WB_PARKED_CAR.x,WB_WALK_SPAWN.z-WB_PARKED_CAR.z)>2);
  assert.ok(isWalkable(WB_WALK_SPAWN));
});

test('Westbridge: real exit-to-porch route clears original fences, lamps and the parked car', () => {
  const car = { x:WB_PARKED_CAR.x,z:WB_PARKED_CAR.z,halfWidth:.98,halfDepth:2.13 };
  let p=point2(WB_WALK_SPAWN);
  assert.ok(isWalkable(p,[car]));
  for (const target of WB_WALK_ROUTE.slice(1)) {
    let count=0;
    while (Math.hypot(target.x-p.x,target.z-p.z)>.03 && count++<300) {
      const length=Math.hypot(target.x-p.x,target.z-p.z), speed=Math.min(.05,length);
      p=move(p,(target.x-p.x)/length*speed,(target.z-p.z)/length*speed,[car]);
      assert.ok(isWalkable(p,[car]));
    }
    assert.ok(Math.hypot(target.x-p.x,target.z-p.z)<.03,'route reaches the next original path/porch anchor');
  }
  assert.ok(Math.hypot(p.x-WB_HOST_DOOR.x,p.z-WB_HOST_DOOR.z)<1.1);
  assert.equal(floorHeight(p),.371855); assert.equal(surfaceAt(p),'wood');
});

test('Westbridge: a long movement cannot tunnel through the facade, fence, trunk or dynamic car', () => {
  const doorStart=point2(WB_HOST_APPROACH), stopped=move(doorStart,0,-8);
  assert.ok(stopped.z>=-12.6757+PLAYER_RADIUS-.067);
  assert.ok(stopped.z<doorStart.z-.5);
  const fenceStart=point2(wbPoint(16.4,0,-5.9)), fenceStop=move(fenceStart,0,-7);
  assert.ok(fenceStop.z>=-7.015+PLAYER_RADIUS-.067);
  assert.ok(!WB_HOST_FENCES.some(o=>circleOverlapsObstacle(fenceStop,o)));
  const car={x:WB_PARKED_CAR.x,z:WB_PARKED_CAR.z,halfWidth:.98,halfDepth:2.13};
  const carStop=move(point2(WB_WALK_SPAWN),-9,0,[car]);
  assert.ok(carStop.x>=car.x+car.halfWidth+PLAYER_RADIUS-.067);
  const trunk=WB_STATIC_SOLIDS.find(o=>Math.abs(o.x-wbPoint(14.90005,0,-10.20775).x)<.01 && Math.abs(o.z+10.20775)<.01);
  assert.ok(trunk);
  const trunkStop=move({x:trunk.x,z:trunk.z+1},0,-3);
  assert.ok(trunkStop.z>trunk.z+trunk.halfDepth+PLAYER_RADIUS-.067);
});

test('Westbridge: floor heights follow road, curb, original path and porch treads', () => {
  for(const [sourceX,sourceZ,height] of [[0,0,.034],[20,-4.4,.1265],[10,-4.4,.1425],
    [24.9,-8.7,.144],[20,-10.7,.1715],[20,-10.95,.2777],[20,-11.7,.371855]])
    assert.ok(Math.abs(floorHeight(wbPoint(sourceX,0,sourceZ))-height)<1e-7);
  assert.equal(surfaceAt(wbPoint(0,0,0)),'asphalt');
});

test('Westbridge: invalid input is bounded; joined side-road stays connected and solid edges stop escape', () => {
  const start=point2(WB_WALK_SPAWN);
  assert.deepEqual(move(start,NaN,1),start); assert.deepEqual(move(start,1,Infinity),start);
  assert.deepEqual(move({x:NaN,z:0},1,0),start); assert.equal(floorHeight({x:NaN,z:0}),0);
  assert.equal(isWalkable({x:Infinity,z:0}),false);
  const junction=wbPoint(-32,0,-23), branch=move(junction,0,-3);
  assert.ok(branch.z<-25.8 && isWalkable(branch),'floor-union seam does not block the branch');
  const edge=move(wbPoint(68,0,0),-20,0);
  assert.ok(edge.x>=430+PLAYER_RADIUS-.067 && isWalkable(edge));
});

test('Westbridge: all ten measured neighbour fences stop a swept approach from the street', () => {
  assert.equal(WB_LOT_FENCES.length,10);
  for(const fence of WB_LOT_FENCES) {
    const toward=fence.z>0?1:-1;
    // This stays inside each 4.8m rail span and clears the source utility pole
    // immediately in front of the north fence centred at sourceX45.9.
    const start={x:fence.x+.75,z:fence.z-toward};
    assert.ok(isWalkable(start),'the actual street side of each fence is accessible');
    const stopped=move(start,0,toward*8);
    assert.ok(isWalkable(stopped));
    assert.ok(toward*(stopped.z-start.z)>.5,'movement reaches the fence instead of an unrelated blocker');
    assert.ok(toward*(stopped.z-fence.z)<=-fence.halfDepth-PLAYER_RADIUS+1e-7,
      'the complete circular footprint stays in front of the physical fence');
    assert.equal(circleOverlapsObstacle(stopped,fence),false);
  }
});

test('Westbridge: neighbour fence ends allow a real bypass and do not seal the host approach or driveway', () => {
  for(const fence of WB_LOT_FENCES) {
    const toward=fence.z>0?1:-1;
    const start={x:fence.x+fence.halfWidth+PLAYER_RADIUS+.3,z:fence.z-toward*.8};
    assert.ok(isWalkable(start),'free ground beyond the measured end post stays free');
    const end=move(start,0,toward*1.6);
    assert.ok(isWalkable(end));
    assert.ok(Math.abs(end.z-(fence.z+toward*.8))<1e-7,'only the visible fence footprint is solid');
  }
  for(const point of [wbPoint(20.0565,0,-6.4),wbPoint(20.0565,0,-8.1),wbPoint(24.9,0,-6.4)])
    assert.ok(isWalkable(point),'the original host front opening remains usable');
});
