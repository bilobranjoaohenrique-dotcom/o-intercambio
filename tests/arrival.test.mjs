import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { ARRIVAL, ARRIVAL_SPAWN, ARRIVAL_ROUTE, ARRIVAL_SOLIDS, ARRIVAL_POSTER } = await import('../src/game/arrivalLayout.ts');
const { isWalkable, floorHeight, moveWithCollisions } = await import('../src/game/collision.ts');
const { CHAPTER_ZONES } = await import('../src/game/layout.ts');

test('arrival: spawn and central route reach the original conversation marker without crossing furniture', () => {
  let point = { ...ARRIVAL_SPAWN.position };
  assert.ok(isWalkable(point)); assert.equal(floorHeight(point), 0);
  for (const target of ARRIVAL_ROUTE) {
    const dx = target.x - point.x, dz = target.z - point.z;
    const count = Math.ceil(Math.hypot(dx, dz) / .025);
    for (let step = 0; step < count; step++) point = moveWithCollisions(point, dx / count, dz / count);
    assert.ok(Math.hypot(point.x - target.x, point.z - target.z) < 1e-6);
    assert.equal(floorHeight(point), 0);
  }
});

test('arrival: seats, hosts and outer walls are solid while the new floor remains separate from earlier sets', () => {
  for (const obstacle of ARRIVAL_SOLIDS) assert.equal(isWalkable(obstacle), false);
  assert.equal(isWalkable({ x: ARRIVAL.minX - .1, z: -8 }), false);
  assert.equal(isWalkable({ x: 86, z: ARRIVAL.maxZ + .1 }), false);
  const posterApproach = { x: ARRIVAL_POSTER.x + 1.3, z: -18.4 };
  assert.ok(isWalkable(posterApproach), 'the retained notice can be approached beside the chair row');
  assert.ok(Math.hypot(posterApproach.x - ARRIVAL_POSTER.x, posterApproach.z - ARRIVAL_POSTER.z) < 2.2);
  for (const [zone, other] of Object.entries(CHAPTER_ZONES)) {
    if (zone === 'town') continue;
    assert.ok(ARRIVAL.maxX < other.minX || ARRIVAL.minX > other.maxX || ARRIVAL.maxZ < other.minZ || ARRIVAL.minZ > other.maxZ);
  }
});
