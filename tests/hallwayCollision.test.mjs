import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { ROOM, HALL, STAIRS, DOOR } = await import('../src/game/layout.ts');
const { HALLWAY, BOTTOM_LANDING, HALLWAY_FURNITURE, STAIR_POSTS } = await import('../src/game/hallwayLayout.ts');
const { PLAYER_RADIUS, isWalkable, moveWithCollisions, floorHeight, reachedBreakfast } = await import('../src/game/collision.ts');
const near = (value, expected, epsilon = 1e-7) => assert.ok(Math.abs(value - expected) < epsilon, `${value} ≈ ${expected}`);
const center = (STAIRS.minX + STAIRS.maxX) / 2;
const openDoor = { x: DOOR.hingeX, z: DOOR.z + DOOR.width / 2,
  halfWidth: DOOR.width / 2, halfDepth: DOOR.thickness / 2, rotation: DOOR.openAngle };

function walkRoute(from, targets) {
  let point = { ...from };
  assert.ok(isWalkable(point, [openDoor]));
  for (const target of targets) {
    const dx = target.x - point.x, dz = target.z - point.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .04));
    for (let step = 0; step < steps; step++) {
      point = moveWithCollisions(point, dx / steps, dz / steps, [openDoor]);
      assert.ok(isWalkable(point, [openDoor]), 'the complete circular body stays inside the connected floor');
    }
    near(point.x, target.x); near(point.z, target.z);
  }
  return point;
}

test('corredor: percurso contínuo de ida e volta pelos quatro encaixes sem alterar quarto ou degraus', () => {
  near(HALLWAY.maxX - HALLWAY.minX, 1.4);
  near(HALLWAY.endZ - HALLWAY.startZ, 4.5);
  near(STAIRS.maxX - STAIRS.minX, .9);
  assert.equal(STAIRS.steps, 18);
  near((STAIRS.topY - STAIRS.bottomY) / STAIRS.steps, 1 / 6);
  // Legacy dimensions stay intact; the living-room entry continues the same
  // clear stair width rather than moving the flight or upper hallway.
  near(HALL.minX, .95); near(HALL.maxX, 3.05);
  near(ROOM.maxZ, HALLWAY.startZ);
  near(HALLWAY.endZ, STAIRS.startZ); near(STAIRS.endZ, BOTTOM_LANDING.startZ);
  const from = { x: center, z: ROOM.maxZ - .5 };
  const path = [4.2, 6.7, STAIRS.startZ, 9.8, STAIRS.endZ, 12.4].map(z => ({ x: center, z }));
  const end = walkRoute(from, path);
  near(floorHeight(end), 0);
  const returned = walkRoute(end, [...path.slice(0, -1).reverse(), from]);
  near(floorHeight(returned), ROOM.floor);
});

test('corredor: aparador e postes são sólidos e deixam a passagem central utilizável', () => {
  const console = HALLWAY_FURNITURE.console;
  const before = { x: center, z: console.z };
  const blocked = moveWithCollisions(before, 1000, 0);
  assert.ok(isWalkable(blocked));
  assert.ok(blocked.x > before.x + .05, 'the body really moves toward the console');
  assert.ok(blocked.x <= console.x - console.width / 2 - PLAYER_RADIUS + 1e-7);
  const passed = walkRoute({ x: center, z: console.z - .9 }, [{ x: center, z: console.z + .9 }]);
  near(passed.z, console.z + .9);
  for (const post of STAIR_POSTS) assert.equal(isWalkable(post), false, 'a newel remains solid at its real footprint');
  assert.equal(isWalkable({ x: 1.5, z: 7.5 }), false, 'the top left newel protects its diagonal approach');
});

test('escada: corrimãos limitam movimentos longos e os espaços laterais não são pisos invisíveis', () => {
  for (const z of [8.2, 9.8, 11.4]) {
    for (const direction of [-1, 1]) {
      const end = moveWithCollisions({ x: center, z }, direction * 1000, 0);
      assert.ok(isWalkable(end));
      assert.ok(end.x >= STAIRS.minX + PLAYER_RADIUS - 1e-7);
      assert.ok(end.x <= STAIRS.maxX - PLAYER_RADIUS + 1e-7);
      near(end.z, z);
    }
    assert.equal(isWalkable({ x: HALLWAY.minX + .08, z }), false);
    assert.equal(isWalkable({ x: HALLWAY.maxX - .08, z }), false);
  }
  assert.ok(isWalkable({ x: center, z: 12.15 }), 'the original last tread opens directly into the living room');
  assert.equal(isWalkable({ x: 1.2, z: 12.15 }), false, 'the new room jamb closes the old sideways kitchen shortcut');
});

test('escada: objetivo permanece ativo até a parte final do último piso físico', () => {
  const tread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps;
  assert.equal(reachedBreakfast({ x: center, z: HALLWAY.endZ - .1 }), false);
  assert.equal(reachedBreakfast({ x: center, z: STAIRS.endZ - tread * 1.2 }), false);
  const earlyLast = { x: center, z: STAIRS.endZ - tread * .9 };
  near(floorHeight(earlyLast), 0);
  assert.equal(reachedBreakfast(earlyLast), false, 'reaching zero height alone must not complete the mission early');
  assert.equal(reachedBreakfast({ x: center, z: STAIRS.endZ - tread * .4 }), true);
  assert.equal(reachedBreakfast({ x: STAIRS.maxX + .1, z: STAIRS.endZ - tread * .4 }), false,
    'the last-step trigger must not accept a position outside the protected flight');
});
