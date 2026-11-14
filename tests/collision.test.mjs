import { registerHooks } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) specifier += '.ts';
  return next(specifier, context);
} });
const { ROOM, HALL, STAIRS, DOOR, FURNITURE, STANDING_POSE } = await import('../src/game/layout.ts');
const { HALLWAY } = await import('../src/game/hallwayLayout.ts');
const { LAUNDRY, LAUNDRY_ROUTE } = await import('../src/game/laundryLayout.ts');
const { PLAYER_RADIUS, floorHeight, staticObstacles, isWalkable, moveWithCollisions,
  circleOverlapsObstacle, reachedBreakfast } = await import('../src/game/collision.ts');
const { movementVector, approachVelocity, WALK_SPEED, RUN_SPEED } = await import('../src/game/player.ts');
const doorCenter = DOOR.hingeX + DOOR.width / 2;
const near = (actual, expected, epsilon = 1e-7) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≈ ${expected}`);
const leaf = angle => ({ x: DOOR.hingeX + Math.cos(angle) * DOOR.width / 2,
  z: DOOR.z - Math.sin(angle) * DOOR.width / 2, halfWidth: DOOR.width / 2,
  halfDepth: DOOR.thickness / 2, rotation: angle });

test('física: pose final é caminhável e paredes/móveis usam as medidas do layout', () => {
  assert.ok(isWalkable(STANDING_POSE.position));
  for (const item of Object.values(FURNITURE)) {
    assert.equal(isWalkable(item), false);
    assert.ok(staticObstacles.some(obstacle => obstacle.x === item.x && obstacle.z === item.z &&
      obstacle.halfWidth === item.width / 2 && obstacle.halfDepth === item.depth / 2));
  }
  for (const point of [{ x: ROOM.minX + .1, z: 0 }, { x: ROOM.maxX - .1, z: 2 },
    { x: 0, z: ROOM.minZ + .1 }, { x: -1, z: ROOM.maxZ - .1 },
    { x: HALL.minX + .1, z: 5 }, { x: HALL.maxX - .1, z: 9 },
    { x: LAUNDRY.maxX + .3, z: 17 }, { x: 0, z: 6 }, { x: NaN, z: 0 }])
    assert.equal(isWalkable(point), false, `no floor escape at ${JSON.stringify(point)}`);
  assert.ok(isWalkable({ x: 4.7, z: 17 }), 'the approved laundry now occupies this formerly exterior point');
  assert.ok(isWalkable(LAUNDRY_ROUTE.entrance), 'the kitchen/laundry aperture is real connected floor');
  near(floorHeight({ x: 4.7, z: 17 }), LAUNDRY.floor);
  assert.equal(isWalkable({ x: doorCenter, z: DOOR.z }), true, 'the static wall leaves a physical doorway');
  assert.equal(isWalkable({ x: 2, z: HALL.endZ - .1 }), true, 'the stair landing now opens into the kitchen');
  assert.equal(isWalkable({ x: 2, z: 14 }), true, 'the kitchen floor is connected to the stair landing');
});

test('física: movimentos longos não atravessam paredes, cama ou folha fina fechada', () => {
  const start = { x: STANDING_POSE.position.x, z: STANDING_POSE.position.z };
  const original = { ...start };
  const bed = moveWithCollisions(start, 1000, 0);
  assert.deepEqual(start, original);
  assert.ok(isWalkable(bed));
  assert.ok(bed.x <= FURNITURE.bed.x - FURNITURE.bed.width / 2 - PLAYER_RADIUS + 1e-7);
  const wall = moveWithCollisions({ x: 1.2, z: 2.7 }, -1000, 0);
  assert.ok(isWalkable(wall)); assert.ok(wall.x >= ROOM.minX + PLAYER_RADIUS - 1e-7);
  const door = moveWithCollisions({ x: doorCenter, z: 2.7 }, 0, 1000, [leaf(0)]);
  assert.ok(isWalkable(door, [leaf(0)]));
  assert.ok(door.z <= DOOR.z - DOOR.thickness / 2 - PLAYER_RADIUS + 1e-7);
  for (const [dx, dz] of [[NaN, 1], [1, Infinity], [-Infinity, 0], [0, 0]])
    assert.deepEqual(moveWithCollisions(start, dx, dz), start);
});

test('física: círculo e OBB seguem o giro Babylon e a porta aberta libera a passagem', () => {
  for (const angle of [0, -.2, -.5, -Math.PI / 4, DOOR.openAngle]) {
    const obstacle = leaf(angle);
    assert.equal(circleOverlapsObstacle(obstacle, obstacle), true);
    const localInside = { x: obstacle.x + Math.cos(angle) * .4, z: obstacle.z - Math.sin(angle) * .4 };
    assert.equal(circleOverlapsObstacle(localInside, obstacle), true);
    const normalOutside = { x: obstacle.x + Math.sin(angle) * .4, z: obstacle.z + Math.cos(angle) * .4 };
    assert.equal(circleOverlapsObstacle(normalOutside, obstacle), false);
  }
  const partially = moveWithCollisions({ x: doorCenter, z: 2.7 }, 0, 2, [leaf(-Math.PI / 4)]);
  assert.ok(partially.z < 4, 'a visible partly open leaf remains solid');
  const open = moveWithCollisions({ x: doorCenter, z: 2.7 }, 0, 2, [leaf(DOOR.openAngle)]);
  near(open.z, 4.7); assert.ok(isWalkable(open, [leaf(DOOR.openAngle)]));
  const diagonal = { x: 1.1, z: 2.4, halfWidth: .7, halfDepth: .04, rotation: Math.PI / 4 };
  assert.equal(isWalkable({ x: 1.7, z: 3 }, [diagonal]), true,
    'the rotated leaf does not obstruct its entire enclosing world-axis rectangle');
});

test('física: desliza junto à parede sem atravessar quinas ou sair da união dos pisos', () => {
  let point = { x: 1.40, z: 4.1 };
  for (let i = 0; i < 90; i++) {
    const next = moveWithCollisions(point, -.035, .035);
    assert.ok(isWalkable(next));
    assert.ok(next.x >= HALLWAY.minX + PLAYER_RADIUS - 1e-7);
    assert.ok(next.z >= point.z);
    point = next;
  }
  assert.ok(point.z > 7, 'forward motion continues while the sideways component touches the wall');
  point = moveWithCollisions({ x: .9, z: 2.8 }, 0, 1.7);
  assert.ok(isWalkable(point));
  assert.ok(point.z < HALL.startZ, 'the hall cannot be entered through the wall beside the door');
});

test('física: dezoito pisos da escada coincidem com os degraus e último degrau conclui', () => {
  const tread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps;
  const rise = (STAIRS.topY - STAIRS.bottomY) / STAIRS.steps;
  near(floorHeight({ x: 2, z: STAIRS.startZ - .01 }), STAIRS.topY);
  let previous = STAIRS.topY;
  for (let index = 0; index < STAIRS.steps; index++) {
    const point = { x: 2, z: STAIRS.startZ + (index + .5) * tread };
    const height = floorHeight(point);
    near(height, STAIRS.topY - (index + 1) * rise);
    assert.ok(height < previous); assert.ok(isWalkable(point)); previous = height;
  }
  near(floorHeight({ x: 2, z: STAIRS.endZ + .1 }), 0);
  assert.equal(reachedBreakfast({ x: 2, z: STAIRS.endZ - tread - .01 }), false);
  assert.equal(reachedBreakfast({ x: 2, z: STAIRS.endZ + .05 }), true);
  assert.equal(reachedBreakfast({ x: -2, z: STAIRS.endZ + .05 }), false);
  const start = STAIRS.startZ - .3, travel = STAIRS.endZ + .15 - start;
  const down = moveWithCollisions({ x: 2, z: start }, 0, travel);
  assert.ok(reachedBreakfast(down)); near(floorHeight(down), 0);
  const up = moveWithCollisions(down, 0, -travel);
  near(up.z, start); near(floorHeight(up), 3);
});

test('física: rota cama–porta–corredor–último degrau é contínua com abertura real', () => {
  let point = { x: STANDING_POSE.position.x, z: STANDING_POSE.position.z };
  for (const target of [{ x: 1.68, z: 1.4 }, { x: doorCenter, z: 1.8 }, { x: doorCenter, z: 2.8 },
    { x: doorCenter, z: 4.6 }, { x: doorCenter, z: STAIRS.endZ + .1 }]) {
    const from = { ...point }, length = Math.hypot(target.x - from.x, target.z - from.z);
    const steps = Math.ceil(length / .04);
    for (let i = 0; i < steps; i++) {
      point = moveWithCollisions(point, (target.x - from.x) / steps, (target.z - from.z) / steps, [leaf(DOOR.openAngle)]);
      assert.ok(isWalkable(point, [leaf(DOOR.openAngle)]));
    }
    near(point.x, target.x); near(point.z, target.z);
  }
  assert.ok(reachedBreakfast(point));
});

test('movimento: diagonal tem a mesma velocidade, yaw orienta WASD e parada não flutua', () => {
  for (const speed of [WALK_SPEED, RUN_SPEED]) {
    near(Math.hypot(...Object.values(movementVector(1, 1, .7, speed))), speed);
    near(Math.hypot(...Object.values(movementVector(1, 0, .7, speed))), speed);
  }
  const forward = movementVector(1, 0, Math.PI / 2, WALK_SPEED);
  near(forward.x, WALK_SPEED); near(forward.z, 0);
  const right = movementVector(0, 1, Math.PI / 2, WALK_SPEED);
  near(right.x, 0); near(right.z, -WALK_SPEED);
  let velocity = { x: 0, z: 0 };
  for (let i = 0; i < 10; i++) velocity = approachVelocity(velocity, { x: WALK_SPEED, z: 0 }, .02);
  near(velocity.x, WALK_SPEED);
  for (let i = 0; i < 8; i++) velocity = approachVelocity(velocity, { x: 0, z: 0 }, .02);
  near(velocity.x, 0); near(velocity.z, 0);
});

// The matching room/hall right edge must not poison boundary distances with
// NaN. This also checks the realistic .8m aperture still clears the .44m body.
test('física: quarto compacto mantém proporções e corredor livre sem aresta NaN', () => {
  near(ROOM.maxX - ROOM.minX, 3.2);
  near(ROOM.maxZ - ROOM.minZ, 3.8);
  near(ROOM.ceiling - ROOM.floor, 2.6);
  near(DOOR.width, .8); near(DOOR.height, 2.1);
  near(FURNITURE.bed.width, .9); near(FURNITURE.bed.depth, 2);
  near(FURNITURE.desk.width, 1.4); near(FURNITURE.desk.depth, .6);
  near(FURNITURE.wardrobe.depth, 1.8); near(FURNITURE.wardrobe.width, .6);
  assert.equal(ROOM.maxX, HALL.maxX);
  for (const z of [.9, 1.2, 1.5, 1.8, 2.1, 2.5, 2.9, 3.3, 3.7, 4.5])
    assert.equal(isWalkable({ x: 1.8, z }, [leaf(DOOR.openAngle)]), true,
      `continuous clear aisle at z=${z}`);
});
