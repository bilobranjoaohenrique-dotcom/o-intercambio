import { registerHooks } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) specifier += '.ts';
  return next(specifier, context);
} });
const { KITCHEN_FURNITURE, KITCHEN_AUTHORED_FURNITURE, PARENT_ANCHORS, KITCHEN_SOLIDS,
  COMPACT_KITCHEN, BREAKFAST_SEAT, KITCHEN_ENTRY_DOOR } = await import('../src/game/kitchenLayout.ts');
const { HOME_RESUME_POSITION, KITCHEN_FRONT_PASSAGE } = await import('../src/game/livingRoomPlacement.ts');
const { LAUNDRY, LAUNDRY_ROUTE } = await import('../src/game/laundryLayout.ts');
const { PLAYER_RADIUS, isWalkable, moveWithCollisions, floorHeight } = await import('../src/game/collision.ts');
const near = (value, target) => assert.ok(Math.abs(value - target) < 1e-7, `${value} ≈ ${target}`);
function follow(from, targets) {
  let point = { ...from };
  assert.ok(isWalkable(point), 'the physical route starts in free space');
  for (const target of targets) {
    const start = { ...point }, length = Math.hypot(target.x - start.x, target.z - start.z);
    const steps = Math.max(1, Math.ceil(length / .04));
    for (let step = 0; step < steps; step++) {
      point = moveWithCollisions(point, (target.x - start.x) / steps, (target.z - start.z) / steps);
      assert.ok(isWalkable(point), 'the complete capsule remains in free space');
    }
    near(point.x, target.x); near(point.z, target.z);
  }
  return point;
}

test('cozinha compacta: preserva medidas dos móveis, pai sentado, mãe em pé e pegadas sólidas', () => {
  const fixedFatherChair = KITCHEN_SOLIDS.filter(obstacle => obstacle.x === PARENT_ANCHORS.father.position.x &&
    obstacle.z === PARENT_ANCHORS.father.position.z && obstacle.enabled === undefined);
  assert.equal(fixedFatherChair.length, 1, 'the existing father chair remains solid after his body leaves');
  assert.equal(fixedFatherChair[0].halfWidth, .47 / 2); assert.equal(fixedFatherChair[0].halfDepth, .46 / 2);
  assert.equal(fixedFatherChair[0].rotation, PARENT_ANCHORS.father.yaw);
  assert.equal(KITCHEN_SOLIDS.length, Object.keys(KITCHEN_FURNITURE).length + Object.keys(PARENT_ANCHORS).length + fixedFatherChair.length);
  for (const furniture of Object.values(KITCHEN_FURNITURE)) {
    assert.equal(isWalkable(furniture), false);
    assert.ok(KITCHEN_SOLIDS.some(obstacle => obstacle.x === furniture.x && obstacle.z === furniture.z &&
      obstacle.halfWidth === furniture.width / 2 && obstacle.halfDepth === furniture.depth / 2 &&
      obstacle.rotation === furniture.rotation), 'each authored furniture footprint is retained');
  }
  for (const parent of Object.values(PARENT_ANCHORS)) assert.equal(isWalkable(parent.position), false);
  assert.equal(KITCHEN_FURNITURE.table.tabletopY, .80);
  assert.equal(PARENT_ANCHORS.father.seatY, .46);
  assert.equal(PARENT_ANCHORS.father.seated, true); assert.equal(PARENT_ANCHORS.mother.seated, false);
  for (const [name, item] of Object.entries(KITCHEN_FURNITURE)) {
    for (const dimension of ['width', 'depth', 'height']) assert.equal(item[dimension], KITCHEN_AUTHORED_FURNITURE[name][dimension]);
  }
  assert.ok(isWalkable(BREAKFAST_SEAT.approach));
  assert.equal(isWalkable(BREAKFAST_SEAT.position), false, 'normal walking cannot enter the physical player chair');
  assert.equal(isWalkable({ x: 0, z: 17.0 }), false, 'the capsule stops before the actual table edge');
});

test('cozinha compacta: movimentos longos não atravessam mesa, cadeira, geladeira ou fogão girados', () => {
  const attempts = [
    { from: { x: 0, z: 16.3 }, dx: 0, dz: 1000, blocked: point => point.z <= 16.88 + 1e-7 },
    { from: BREAKFAST_SEAT.approach, dx: 0, dz: 1000, blocked: point => point.z <= 16.355 + 1e-7 },
    { from: { x: -1.75, z: 17.2 }, dx: -1000, dz: 0, blocked: point => point.x >= -1.87 - 1e-7 },
    { from: { x: -1.8, z: 19.2 }, dx: -1000, dz: 0, blocked: point => point.x >= -2.135 - 1e-7 },
  ];
  for (const attempt of attempts) {
    assert.ok(isWalkable(attempt.from));
    const end = moveWithCollisions(attempt.from, attempt.dx, attempt.dz);
    assert.ok(isWalkable(end)); assert.ok(attempt.blocked(end), JSON.stringify({ attempt, end }));
  }
});

test('cozinha compacta: portal da sala conecta até cadeira e ponto de levantar, sem reduzir a circulação', () => {
  const approach = follow({ x: 2.5, z: 14.15 }, [
    { x: 3.3, z: 14.15 }, { x: 3.5, z: 15.5 }, { x: 3.5, z: 16.25 },
    { x: 2.2, z: 16.25 }, BREAKFAST_SEAT.approach,
  ]);
  near(floorHeight(approach), 0);
  assert.ok(isWalkable(BREAKFAST_SEAT.stand));
  follow(BREAKFAST_SEAT.stand, [{ x: .2, z: 16.2 }, { x: 2.2, z: 16.25 }, { x: 3.5, z: 16.25 }]);
  assert.ok(isWalkable(HOME_RESUME_POSITION), 'the existing home checkpoint remains on clear kitchen floor');
});

test('cozinha compacta: novas paredes e limites retiram o vazio antigo sem abrir atalhos para fora', () => {
  near(COMPACT_KITCHEN.maxX - COMPACT_KITCHEN.minX, 7.1);
  near(COMPACT_KITCHEN.endZ - COMPACT_KITCHEN.coreStartZ, 5.35);
  for (const point of [{ x: -4, z: 18 }, { x: LAUNDRY.maxX + .3, z: 18 }, { x: 0, z: 22 }, { x: -4, z: 14 }, { x: 3.7, z: 11.94 }])
    assert.equal(isWalkable(point), false, JSON.stringify(point));
  const stopped = moveWithCollisions({ x: 3.5, z: 15.5 }, 1000, 0);
  assert.ok(stopped.x > COMPACT_KITCHEN.maxX - PLAYER_RADIUS,
    'the approved front passage extends beyond the compact kitchen footprint');
  assert.ok(stopped.x <= KITCHEN_FRONT_PASSAGE.maxX - PLAYER_RADIUS + 1e-7);
  assert.ok(isWalkable(stopped));
  follow(LAUNDRY_ROUTE.kitchen, [LAUNDRY_ROUTE.entrance, LAUNDRY_ROUTE.center,
    LAUNDRY_ROUTE.entrance, LAUNDRY_ROUTE.kitchen]);
  assert.equal(isWalkable(KITCHEN_ENTRY_DOOR), false, 'the separately added front door stays physically closed');
  assert.ok(isWalkable(KITCHEN_ENTRY_DOOR.approach));
  const entryStop = moveWithCollisions(KITCHEN_ENTRY_DOOR.approach, 0, -1000);
  assert.ok(isWalkable(entryStop));
  assert.ok(entryStop.z >= KITCHEN_ENTRY_DOOR.z + KITCHEN_ENTRY_DOOR.depth / 2 + PLAYER_RADIUS - 1e-7);
});
