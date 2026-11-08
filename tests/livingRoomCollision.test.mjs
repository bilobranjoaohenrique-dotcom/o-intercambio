import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { STAIRS, ROOM, KITCHEN, STANDING_POSE } = await import('../src/game/layout.ts');
const { LIVING_ROOM, LIVING_ROOM_PORTAL, LIVING_ROOM_ALCOVE, LIVING_ROOM_FURNITURE,
  LIVING_ROOM_FRONT_DOOR, LIVING_ROOM_OBJECTS, LIVING_ROOM_SOLIDS, LIVING_ROOM_PROP_SOLIDS,
  PRESERVED_STAIR_RETURN } = await import('../src/game/livingRoomLayout.ts');
const { isWalkable, moveWithCollisions, floorHeight, circleOverlapsObstacle,
  reachedBreakfast, PLAYER_RADIUS } = await import('../src/game/collision.ts');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≈ ${expected}`);

function follow(from, targets) {
  let point = { ...from };
  assert.ok(isWalkable(point), `route starts in free space: ${JSON.stringify(point)}`);
  for (const target of targets) {
    const dx = target.x - point.x, dz = target.z - point.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .04));
    for (let step = 0; step < steps; step++) {
      point = moveWithCollisions(point, dx / steps, dz / steps);
      assert.ok(isWalkable(point), 'the whole body remains on the physical floor');
    }
    near(point.x, target.x); near(point.z, target.z);
  }
  return point;
}

test('sala: adição térrea mantém dimensões, degraus e limites existentes', () => {
  near(LIVING_ROOM.maxX - LIVING_ROOM.minX, 4.2);
  near(LIVING_ROOM.maxZ - LIVING_ROOM.minZ, 3.8);
  near(LIVING_ROOM.ceiling - LIVING_ROOM.floor, 2.6);
  near(LIVING_ROOM_PORTAL.maxX - LIVING_ROOM_PORTAL.minX, .9);
  near(LIVING_ROOM_PORTAL.height, 2.1);
  near(LIVING_ROOM_PORTAL.minZ, LIVING_ROOM.maxZ);
  near(LIVING_ROOM_PORTAL.maxZ, KITCHEN.startZ);
  assert.equal(STAIRS.steps, 18);
  near(STAIRS.startZ, 7.8); near(STAIRS.endZ, 11.8);
  near(ROOM.floor, 3); near(KITCHEN.floor, 0);
  assert.ok(isWalkable(STANDING_POSE.position));
  // These have the same Z as upper/middle treads but belong to the new ground
  // floor. The former stair-height fallback must never lift their camera.
  for (const point of [{ x: 6.1, z: 8.85 }, { x: 4.1, z: 9 },
    { x: 4.1, z: 10.5 }, { x: 3.7, z: 11.4 }, { x: 3.7, z: 11.94 }]) {
    assert.ok(isWalkable(point)); near(floorHeight(point), 0);
  }
  const tread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps;
  near(floorHeight({ x: 1.85, z: STAIRS.startZ + tread / 2 }), 3 - 1 / 6);
});

test('sala: patamar–cozinha–portal–móveis têm circulação física de ida e volta', () => {
  const bottom = { x: 1.85, z: 11.94 };
  const path = [{ x: 1.85, z: 12.4 }, { x: 3.7, z: 12.4 }, { x: 3.7, z: 11.4 },
    { x: 4.3, z: 11.4 }, { x: 4.1, z: 10.4 }, { x: 4.1, z: 9 },
    { x: 4.8, z: 8.99 }, { x: 5.8, z: 8.99 }, { x: 6.1, z: 8.85 }, { x: 6.35, z: 9.4 }];
  const end = follow(bottom, path);
  near(floorHeight(end), 0);
  const returned = follow(end, [...path.slice(0, -1).reverse(), bottom]);
  near(returned.x, bottom.x); near(returned.z, bottom.z);
  follow({ x: 4.1, z: 9.0 }, [{ x: 3.65, z: 9.0 }, { x: 3.65, z: 9.2 }]);
  assert.ok(Math.hypot(3.65 - LIVING_ROOM_OBJECTS.phone.x, 9.2 - LIVING_ROOM_OBJECTS.phone.z) < 1,
    'the telephone can be reached without entering its table');
});

test('sala: móveis girados usam a pegada real e resistem a movimentos longos', () => {
  assert.equal(LIVING_ROOM_SOLIDS.length, Object.keys(LIVING_ROOM_FURNITURE).length);
  for (const furniture of Object.values(LIVING_ROOM_FURNITURE)) {
    assert.equal(isWalkable(furniture), false);
    assert.ok(LIVING_ROOM_SOLIDS.some(obstacle => obstacle.x === furniture.x && obstacle.z === furniture.z &&
      obstacle.rotation === furniture.rotation && obstacle.halfWidth === furniture.width / 2));
  }
  const approaches = [
    { from: { x: 4.8, z: 8.99 }, dx: 0, dz: -1000, solid: LIVING_ROOM_SOLIDS[0] },
    { from: { x: 5.84, z: 10.1 }, dx: 0, dz: 1000, solid: LIVING_ROOM_SOLIDS[1] },
    { from: { x: 4.1, z: 10.5 }, dx: -1000, dz: 0, solid: LIVING_ROOM_SOLIDS[2] },
    { from: { x: 4.1, z: 9.6 }, dx: 1000, dz: 0, solid: LIVING_ROOM_SOLIDS[3] },
    { from: { x: 3.65, z: 9.2 }, dx: -1000, dz: 0, solid: LIVING_ROOM_SOLIDS[4] },
  ];
  for (const { from, dx, dz, solid } of approaches) {
    assert.ok(isWalkable(from));
    const end = moveWithCollisions(from, dx, dz);
    assert.ok(isWalkable(end)); assert.equal(circleOverlapsObstacle(end, solid), false);
    assert.ok(Math.hypot(end.x - from.x, end.z - from.z) < 1.3, 'the visible surface stops a long move');
  }
});

test('sala: paredes, janela e porta bloqueada retêm a cápsula sem criar saída', () => {
  const door = LIVING_ROOM_FRONT_DOOR;
  const front = moveWithCollisions({ x: door.x - .1, z: 8.85 }, 0, -1000);
  assert.ok(isWalkable(front)); assert.ok(front.z >= LIVING_ROOM.minZ + PLAYER_RADIUS - 1e-7);
  const window = moveWithCollisions({ x: 6.35, z: 9.4 }, 1000, 0);
  assert.ok(isWalkable(window)); assert.ok(window.x <= LIVING_ROOM.maxX - PLAYER_RADIUS + 1e-7);
  for (const point of [{ x: 6.7, z: 7.9 }, { x: 7.1, z: 10 }, { x: 6, z: 12.2 },
    { x: 3.2, z: 11.94 }, { x: 4.2, z: 11.94 }]) assert.equal(isWalkable(point), false);
  assert.ok(isWalkable({ x: 3.7, z: 11.94 }), 'only the real .90m kitchen doorway is clear');
});

test('sala: apoio do abajur e vaso no chão bloqueiam sem reduzir a circulação', () => {
  assert.equal(LIVING_ROOM_PROP_SOLIDS.length, 2);
  const [lampSupport, plantPot] = LIVING_ROOM_PROP_SOLIDS;
  for (const prop of LIVING_ROOM_PROP_SOLIDS) assert.equal(isWalkable(prop), false);
  const lamp = moveWithCollisions({ x: 3.65, z: lampSupport.z }, -1000, 0);
  assert.ok(isWalkable(lamp));
  assert.ok(lamp.x >= lampSupport.x + lampSupport.halfWidth + PLAYER_RADIUS - 1e-7,
    'the support tabletop and legs stop the circular body before their real edge');
  const pot = moveWithCollisions({ x: 6.1, z: plantPot.z }, 1000, 0);
  assert.ok(isWalkable(pot));
  assert.ok(pot.x <= plantPot.x - plantPot.halfWidth - PLAYER_RADIUS + 1e-7,
    'the pot stays solid even during a long frame');
  follow({ x: 4.1, z: 9 }, [{ x: 3.65, z: 9 }, { x: 3.65, z: 9.2 }]);
  follow({ x: 5.8, z: 8.99 }, [{ x: 6.1, z: 8.85 }, { x: 6.35, z: 9.4 }]);
});

test('sala: alcova não permite atravessar corrimão nem o retorno de alvenaria', () => {
  near(LIVING_ROOM_ALCOVE.minX, 2.37);
  assert.equal(isWalkable(PRESERVED_STAIR_RETURN), false);
  const flight = { x: 1.85, z: 10.5 };
  const blocked = moveWithCollisions(flight, 1000, 0);
  assert.ok(blocked.x <= STAIRS.maxX - PLAYER_RADIUS + 1e-7);
  assert.ok(floorHeight(blocked) > 0, 'opening the adjacent wall does not teleport feet to the ground');
  const ground = moveWithCollisions({ x: 4.1, z: 10.5 }, -1000, 0);
  assert.ok(ground.x > STAIRS.maxX, 'the chair and the preserved guard prevent a mid-flight shortcut');
  near(floorHeight(ground), 0);
  const bottom = moveWithCollisions({ x: 2.8, z: 12.2 }, 0, -1000);
  assert.ok(isWalkable(bottom)); assert.ok(bottom.z >= 11.8 + PLAYER_RADIUS - 1e-7,
    'the existing jog remains solid after the new floor is added');
  assert.equal(reachedBreakfast({ x: 3.7, z: 11.78 }), false, 'the new room does not become a mission trigger');
  assert.equal(reachedBreakfast({ x: 1.85, z: 11.75 }), true, 'the last physical tread keeps the existing trigger');
});
