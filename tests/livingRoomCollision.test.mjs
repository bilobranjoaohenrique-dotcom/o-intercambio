import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { STAIRS, ROOM, STANDING_POSE } = await import('../src/game/layout.ts');
const local = await import('../src/game/livingRoomLayout.ts');
const { Vector3 } = await import('@babylonjs/core/Maths/math.vector.js');
const { livingToWorld, worldToLiving, LIVING_ROOM_WORLD: room, LIVING_ROOM_ENTRY: entry,
  LIVING_ROOM_KITCHEN_PORTAL: exit, LIVING_ROOM_WORLD_FURNITURE: furniture,
  LIVING_ROOM_WORLD_SOLIDS: solids, LIVING_ROOM_WORLD_PROP_SOLIDS: props,
  LIVING_ROOM_WORLD_FRONT_DOOR: door, LIVING_ROOM_ROUTE: route,
  HOME_RESUME_POSITION } = await import('../src/game/livingRoomPlacement.ts');
const { isWalkable, moveWithCollisions, floorHeight, circleOverlapsObstacle,
  reachedBreakfast, PLAYER_RADIUS } = await import('../src/game/collision.ts');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≈ ${expected}`);

function follow(from, targets) {
  let point = { ...from };
  assert.ok(isWalkable(point), `route starts in free space: ${JSON.stringify(point)}`);
  for (const target of targets) {
    const dx = target.x - point.x, dz = target.z - point.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .025));
    for (let step = 0; step < steps; step++) {
      point = moveWithCollisions(point, dx / steps, dz / steps);
      assert.ok(isWalkable(point), 'the whole body remains on physical floor');
      near(floorHeight(point), 0);
    }
    near(point.x, target.x); near(point.z, target.z);
  }
  return point;
}

test('sala: posição rígida conserva planta aprovada, dimensões e distâncias entre os móveis', () => {
  assert.deepEqual(local.LIVING_ROOM, { minX: 2.67, maxX: 6.87, minZ: 8.05, maxZ: 11.85, floor: 0, ceiling: 2.6 });
  near(room.minX, -1.32); near(room.maxX, 2.88); near(room.minZ, 12); near(room.maxZ, 15.8);
  near(room.maxX - room.minX, 4.2); near(room.maxZ - room.minZ, 3.8);
  near(room.ceiling - room.floor, 2.6);
  assert.equal(STAIRS.steps, 18); near(STAIRS.endZ, 11.8); near(ROOM.floor, 3);
  assert.ok(isWalkable(STANDING_POSE.position));
  const vector = new Vector3(4.8, 1.1, 8.57), moved = livingToWorld(vector), restoredVector = worldToLiving(new Vector3(moved.x, moved.y, moved.z));
  near(moved.y, 1.1); near(restoredVector.x, vector.x); near(restoredVector.y, vector.y); near(restoredVector.z, vector.z);
  for (const [name, item] of Object.entries(local.LIVING_ROOM_FURNITURE)) {
    const placed = furniture[name], restored = worldToLiving(placed);
    near(restored.x, item.x); near(restored.z, item.z);
    near(placed.width, item.width); near(placed.depth, item.depth); near(placed.height, item.height);
    near(placed.rotation - item.rotation, Math.PI);
    for (const [otherName, other] of Object.entries(local.LIVING_ROOM_FURNITURE))
      near(Math.hypot(item.x - other.x, item.z - other.z),
        Math.hypot(placed.x - furniture[otherName].x, placed.z - furniture[otherName].z));
  }
});

test('sala: último degrau desemboca diretamente no portal e a travessia chega à cozinha nos dois sentidos', () => {
  near(entry.minX, STAIRS.minX); near(entry.maxX, STAIRS.maxX);
  near(entry.minZ, 11.85); near(entry.maxZ, room.minZ);
  near(exit.maxZ - exit.minZ, .9); near(exit.minX, room.maxX);
  const bottom = route[0], end = follow(bottom, route.slice(1));
  const returned = follow(end, [...route.slice(0, -1).reverse()]);
  near(returned.x, bottom.x); near(returned.z, bottom.z);
  assert.ok(route[1].z >= room.minZ && route[1].x < room.maxX,
    'the first space after the last tread is the actual living room');
  for (const z of [14.12, 14.15, 14.18]) follow({ x: 1.6, z }, [{ x: 3.3, z }]);
});

test('sala: cinco móveis girados mantêm suas pegadas sólidas e resistem a movimentos longos', () => {
  assert.equal(solids.length, Object.keys(furniture).length);
  for (const item of Object.values(furniture)) assert.equal(isWalkable(item), false);
  const approaches = [
    { from: { x: 4.8, z: 8.99 }, dx: 0, dz: -1000, solid: solids[0] },
    { from: { x: 5.84, z: 10.1 }, dx: 0, dz: 1000, solid: solids[1] },
    { from: { x: 4.1, z: 10.5 }, dx: -1000, dz: 0, solid: solids[2] },
    { from: { x: 4.1, z: 9.6 }, dx: 1000, dz: 0, solid: solids[3] },
    { from: { x: 3.65, z: 9.2 }, dx: -1000, dz: 0, solid: solids[4] },
  ];
  for (const { from: localFrom, dx, dz, solid } of approaches) {
    const from = livingToWorld(localFrom);
    assert.ok(isWalkable(from));
    const end = moveWithCollisions(from, -dx, -dz);
    assert.ok(isWalkable(end)); assert.equal(circleOverlapsObstacle(end, solid), false);
    assert.ok(Math.hypot(end.x - from.x, end.z - from.z) < 1.3);
  }
});

test('sala: paredes, janela e porta bloqueada impedem saída e o antigo desvio não é mais chão jogável', () => {
  const front = moveWithCollisions(livingToWorld({ x: 6.1, z: 8.85 }), 0, 1000);
  assert.ok(isWalkable(front)); assert.ok(front.z <= room.maxZ - PLAYER_RADIUS + 1e-7);
  near(door.z, room.maxZ);
  const window = moveWithCollisions(livingToWorld({ x: 6.35, z: 9.4 }), -1000, 0);
  assert.ok(isWalkable(window)); assert.ok(window.x >= room.minX + PLAYER_RADIUS - 1e-7);
  for (const point of [{ x: 3.7, z: 11.94 }, { x: 4.3, z: 11.4 },
    { x: 3.7, z: 10 }, { x: -2, z: 14 }, { x: 2.95, z: 13 }, { x: 2.95, z: 15 }])
    assert.equal(isWalkable(point), false, JSON.stringify(point));
  const sideways = moveWithCollisions(route[0], 1000, 0);
  assert.ok(sideways.x <= entry.maxX - PLAYER_RADIUS + 1e-7,
    'the old landing-to-kitchen shortcut is closed by the real entry wall');
});

test('sala: apoio do abajur e vaso conservam colisão e o checkpoint avançado retoma em piso livre', () => {
  assert.equal(props.length, 2);
  for (const prop of props) assert.equal(isWalkable(prop), false);
  const lampFrom = livingToWorld({ x: 3.65, z: local.LIVING_ROOM_PROP_SOLIDS[0].z });
  const lamp = moveWithCollisions(lampFrom, 1000, 0);
  assert.ok(isWalkable(lamp)); assert.ok(lamp.x <= props[0].x - props[0].halfWidth - PLAYER_RADIUS + 1e-7);
  const potFrom = livingToWorld({ x: 6.1, z: local.LIVING_ROOM_PROP_SOLIDS[1].z });
  const pot = moveWithCollisions(potFrom, -1000, 0);
  assert.ok(isWalkable(pot)); assert.ok(pot.x >= props[1].x + props[1].halfWidth + PLAYER_RADIUS - 1e-7);
  assert.ok(isWalkable(HOME_RESUME_POSITION)); near(floorHeight(HOME_RESUME_POSITION), 0);
  follow(HOME_RESUME_POSITION, [{ x: 0, z: 16.9 }, { x: -1.6, z: 16.9 }, { x: -1.6, z: 17.9 }]);
});

test('sala: escada permanece protegida e a missão só conclui ao alcançar seu último piso físico', () => {
  for (const direction of [-1, 1]) {
    const end = moveWithCollisions({ x: 1.85, z: 10.5 }, direction * 1000, 0);
    assert.ok(end.x >= STAIRS.minX + PLAYER_RADIUS - 1e-7);
    assert.ok(end.x <= STAIRS.maxX - PLAYER_RADIUS + 1e-7);
    assert.ok(floorHeight(end) > 0);
  }
  assert.equal(reachedBreakfast({ x: 1.85, z: 11.5 }), false);
  assert.equal(reachedBreakfast({ x: 1.85, z: 11.75 }), true);
  assert.equal(reachedBreakfast(route[0]), true, 'the real landing retains its existing completion condition');
  assert.equal(reachedBreakfast(route[1]), false, 'the living room is not a new mission trigger');
});
