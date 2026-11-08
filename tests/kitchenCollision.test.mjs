import { registerHooks } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) specifier += '.ts';
  return next(specifier, context);
} });
const { KITCHEN_FURNITURE, PARENT_ANCHORS, KITCHEN_SOLIDS } = await import('../src/game/kitchenLayout.ts');
const { KITCHEN, HALL, STAIRS, STANDING_POSE, CHAPTER_ZONES } = await import('../src/game/layout.ts');
const { PLAYER_RADIUS, isWalkable, moveWithCollisions, floorHeight, reachedBreakfast } = await import('../src/game/collision.ts');
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

test('cozinha: móveis e pais têm pegadas compartilhadas sólidas sem colisão duplicada da cadeira do pai', () => {
  assert.equal(KITCHEN_SOLIDS.length, Object.keys(KITCHEN_FURNITURE).length + Object.keys(PARENT_ANCHORS).length);
  for (const furniture of Object.values(KITCHEN_FURNITURE)) assert.equal(isWalkable(furniture), false);
  for (const parent of Object.values(PARENT_ANCHORS)) assert.equal(isWalkable(parent.position), false);
  assert.equal(KITCHEN_FURNITURE.table.tabletopY, .80);
  assert.equal(PARENT_ANCHORS.father.seatY, .46);
  assert.ok(isWalkable({ x: 0, z: 17.6 }), 'the clear standing space before the tabletop stays accessible');
  assert.equal(isWalkable({ x: 0, z: 17.75 }), false, 'the capsule touches the real front edge of the table');
  assert.equal(isWalkable({ x: -.7, z: 17.65 }), false, 'the front chair has its own smaller footprint');
});

test('cozinha: deslocamentos longos não atravessam mesa, eletrodomésticos, armários ou corpos', () => {
  const attempts = [
    { from: { x: 0, z: 16.7 }, dx: 0, dz: 4, blocked: point => point.z < 17.7 },
    { from: { x: 1.65, z: 20.9 }, dx: 0, dz: 3, blocked: point => point.z < 21.7 },
    { from: { x: 4.27, z: 19.8 }, dx: 0, dz: 3, blocked: point => point.z < 20.2 },
    { from: { x: -3.65, z: 20.5 }, dx: 0, dz: 3, blocked: point => point.z < 21.35 },
    { from: { x: -1.65, z: 20.5 }, dx: 0, dz: 3, blocked: point => point.z < 21.6 },
    { from: { x: -3.5, z: 18.5 }, dx: -2, dz: 0, blocked: point => point.x > -3.95 },
    { from: { x: -2.8, z: 18.95 }, dx: 2, dz: 0, blocked: point => point.x < -2 },
    { from: { x: 2.6, z: 20 }, dx: -2, dz: 0, blocked: point => point.x > 1.7 },
    { from: { x: 3, z: 18.7 }, dx: -2, dz: 0, blocked: point => point.x > 2.3 },
  ];
  for (const attempt of attempts) {
    assert.ok(isWalkable(attempt.from));
    const end = moveWithCollisions(attempt.from, attempt.dx, attempt.dz);
    assert.ok(isWalkable(end)); assert.ok(attempt.blocked(end), JSON.stringify({ attempt, end }));
  }
});

test('cozinha: descida liga o patamar à mãe e permite circular nos dois lados da mesa', () => {
  const approach = follow({ x: 1.975, z: STAIRS.endZ + .1 }, [
    { x: 1.975, z: 14.2 }, { x: 0, z: 16 }, { x: -1.6, z: 16 }, { x: -1.6, z: 17.9 },
  ]);
  near(floorHeight(approach), 0);
  assert.ok(Math.hypot(approach.x - PARENT_ANCHORS.mother.interaction.x,
    approach.z - PARENT_ANCHORS.mother.interaction.z) < 2.2, 'mother is reachable without entering her body');
  follow({ x: -2.3, z: 16.1 }, [{ x: -2.3, z: 20.8 }, { x: 2.4, z: 20.8 }, { x: 2.4, z: 16.1 }]);
  assert.ok(isWalkable({ x: 0, z: 14.2 }), 'the existing home checkpoint remains safe');
  assert.ok(isWalkable(STANDING_POSE.position), 'bedroom gameplay is preserved');
  assert.ok(reachedBreakfast({ x: 1.975, z: STAIRS.endZ - .05 }), 'the existing stair mission still triggers on its last tread');
  for (const zone of Object.values(CHAPTER_ZONES))
    assert.ok(isWalkable({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 }), 'later chapter floor bounds remain unchanged');
});

test('cozinha: parede da entrada segura a cápsula fora das duas passagens físicas', () => {
  // The new living-room aperture occupies x[3.25,4.15]. Keep these samples
  // on the preserved masonry rather than requiring that doorway to be solid.
  for (const x of [KITCHEN.minX + .8, 0, KITCHEN.maxX - .4]) {
    assert.equal(isWalkable({ x, z: KITCHEN.startZ + .02 }), false);
    assert.ok(isWalkable({ x, z: KITCHEN.startZ + PLAYER_RADIUS + .02 }));
    const end = moveWithCollisions({ x, z: 13.5 }, 0, -4);
    assert.ok(end.z >= KITCHEN.startZ + PLAYER_RADIUS - 1e-7);
    assert.ok(isWalkable(end));
  }
  const x = (HALL.minX + HALL.maxX) / 2;
  follow({ x, z: 11.5 }, [{ x, z: 13 }]);
});
