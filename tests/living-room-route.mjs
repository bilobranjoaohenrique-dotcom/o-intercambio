import assert from 'node:assert/strict';
import './register-typescript.mjs';
import { DOOR, EYE_HEIGHT, STAIRS } from '../src/game/layout.ts';
import { aimInteraction, faceYaw, lookAt, snapshot, walkTo, waitFrames } from './browser-helpers.mjs';

const { LIVING_ROOM_ROUTE, LIVING_ROOM_WORLD } = await import('../src/game/livingRoomPlacement.ts');
const { isWalkable } = await import('../src/game/collision.ts');

/** Reach the original bottom landing using only the physical player controls.
 * The living-room suite starts from the real waking sequence, not a saved
 * checkpoint or a diagnostic setter. The existing last-tread mission trigger
 * remains the only way to complete the descent. */
export async function descendToLivingLanding(page, { onLastTread } = {}) {
  const doorX = DOOR.hingeX + DOOR.width / 2;
  const stairX = (STAIRS.minX + STAIRS.maxX) / 2;
  const tread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps;
  await walkTo(page, { x: 1.68, z: 2.25 }, { tolerance: .10 });
  await walkTo(page, { x: doorX, z: 2.73 }, { tolerance: .06 });
  await aimInteraction(page, 'door', { x: doorX, y: 4.4, z: DOOR.z });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__INTERCAMBIO__.door.isOpen);
  await walkTo(page, { x: stairX, z: 4.6 }, { tolerance: .08 });
  await walkTo(page, { x: stairX, z: STAIRS.startZ + (STAIRS.endZ - STAIRS.startZ) * .45 });
  const middle = await snapshot(page);
  assert.equal(middle.chapterMission, 'breakfast');
  assert.ok(middle.position.y > STAIRS.bottomY + EYE_HEIGHT + .4 &&
    middle.position.y < STAIRS.topY + EYE_HEIGHT - .25,
  'the real camera descends the preserved flight before the breakfast trigger');
  await walkTo(page, { x: stairX, z: STAIRS.endZ - tread * 1.5 }, { tolerance: .08 });
  assert.equal((await snapshot(page)).chapterMission, 'breakfast');
  if (onLastTread) {
    // Stop inside the last real tread, not at a later lateral viewpoint. This
    // remains a physical walk; the camera is never assigned coordinates.
    await walkTo(page, { x: stairX, z: STAIRS.endZ - tread * .43 }, { tolerance: .065 });
    await faceYaw(page, 0, .08); await waitFrames(page, 2);
    const last = await snapshot(page);
    assert.ok(last.position.z >= STAIRS.endZ - tread && last.position.z < STAIRS.endZ,
      `arrival capture must remain on the final physical tread: ${JSON.stringify(last.position)}`);
    const forwardYaw = Math.atan2(Math.sin(last.rotation.yaw), Math.cos(last.rotation.yaw));
    assert.ok(Math.abs(forwardYaw) < .025 && Math.abs(last.horizonTilt) < .003,
      'arrival shows the normal forward view of the descent, without a lateral camera turn');
    await onLastTread(last);
  }
  await walkTo(page, { x: stairX, z: STAIRS.endZ + .15 }, { tolerance: .08 });
  const landing = await snapshot(page);
  assert.ok(landing.position.z >= STAIRS.endZ - tread / 2);
  assert.ok(Math.abs(landing.position.y - STAIRS.bottomY - EYE_HEIGHT) < .06);
  await page.waitForFunction(() => window.__INTERCAMBIO__.chapterMission === 'talk-parents');
  assert.equal((await page.locator('#objectiveText').textContent()).trim(), 'Converse com seus pais');
  return { middle: middle.position, landing: landing.position, steps: STAIRS.steps };
}

/** The approved set now lies directly ahead of the unchanged flight. Every
 * chapter regression must traverse it before entering the existing kitchen. */
export async function crossLivingToKitchen(page, { recordPosition } = {}) {
  for (const point of LIVING_ROOM_ROUTE.slice(1)) {
    if (Math.abs(point.z - 14.15) < .001) await walkPrecisely(page, point);
    else await walkTo(page, point, { tolerance: .11 });
    const state = await snapshot(page);
    assert.equal(state.phase, 'playing', 'walking through the living room has no loading/teleport phase');
    assert.equal(state.chapterStage, 'home');
    assert.equal(state.chapterMission, 'talk-parents');
    assert.ok(Math.abs(state.position.y - EYE_HEIGHT) < .06, 'the ground floor remains physically level');
    recordPosition?.(state);
  }
}

/** Fine alignment through the preserved chair/table gap needs shorter input
 * than the general two-frame walking pulses on a software renderer. Approach
 * normally, then press W for one observed frame and let velocity settle. The
 * player's speed, camera pose and world coordinates are never assigned here. */
export async function walkPrecisely(page, point, tolerance = .03) {
  await walkTo(page, point, { tolerance: .18 });
  for (let attempt = 0; attempt < 45; attempt++) {
    const state = await snapshot(page);
    if (Math.hypot(point.x - state.position.x, point.z - state.position.z) < tolerance) return;
    assert.equal(state.phase, 'playing');
    await lookAt(page, { ...point, y: state.position.y }, .012);
    await waitFrames(page, 3);
    // Read before keydown: reading a new baseline after keydown can miss the
    // first movement frame and turn a one-frame nudge into a larger pulse.
    const before = Number(await page.locator('#game').getAttribute('data-frames'));
    await page.keyboard.down('KeyW');
    try {
      await page.waitForFunction(before => Number(document.getElementById('game')?.dataset.frames) > before,
        before, { timeout: 30000 });
    } finally { await page.keyboard.up('KeyW'); }
    await waitFrames(page, 3);
  }
  assert.fail(`fine physical input did not align with ${JSON.stringify(point)}: ${JSON.stringify((await snapshot(page)).position)}`);
}

export function insideLivingRoom(point, margin = 0) {
  return point.x >= LIVING_ROOM_WORLD.minX + margin && point.x <= LIVING_ROOM_WORLD.maxX - margin &&
    point.z >= LIVING_ROOM_WORLD.minZ + margin && point.z <= LIVING_ROOM_WORLD.maxZ - margin;
}

/** Test-side route planning reads the canonical collision map, then drives the
 * actual player over each segment. It is not a game navigation system and does
 * not move the player by script. A clearance margin avoids steering along the
 * exact tangent of a wall on a slow software renderer. */
export async function walkNavigable(page, point, bounds, { tolerance = .11 } = {}) {
  const start = (await snapshot(page)).position;
  const step = .10, margin = .045;
  // A collision assertion deliberately leaves the capsule tangent to a solid.
  // Permit the real starting footprint to back away before adding the extra
  // steering margin; never waive the game's actual body collision.
  const clear = p => isWalkable(p) && (Math.hypot(p.x - start.x, p.z - start.z) < .09 || [
    { x: p.x - margin, z: p.z }, { x: p.x + margin, z: p.z },
    { x: p.x, z: p.z - margin }, { x: p.x, z: p.z + margin },
  ].every(p => isWalkable(p)));
  const segment = (a, b) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .035));
    for (let at = 0; at <= count; at++)
      if (!clear({ x: a.x + (b.x - a.x) * at / count, z: a.z + (b.z - a.z) * at / count })) return false;
    return true;
  };
  assert.ok(clear(point), `requested real-camera viewpoint must have body clearance: ${JSON.stringify(point)}`);
  if (segment(start, point)) { await walkTo(page, point, { tolerance }); return; }
  const width = Math.floor((bounds.maxX - bounds.minX) / step) + 1;
  const depth = Math.floor((bounds.maxZ - bounds.minZ) / step) + 1;
  const nodes = new Map();
  for (let iz = 0; iz < depth; iz++) for (let ix = 0; ix < width; ix++) {
    const node = { x: bounds.minX + ix * step, z: bounds.minZ + iz * step, ix, iz, key: `${ix}:${iz}` };
    if (clear(node)) nodes.set(node.key, node);
  }
  const nearest = p => [...nodes.values()]
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
    .find(node => segment(p, node));
  const first = nearest(start), last = nearest(point);
  assert.ok(first && last, 'canonical floor map must provide a continuous connection to both camera viewpoints');
  const open = new Map([[first.key, 0]]), cost = new Map([[first.key, 0]]), parents = new Map();
  let reached = false;
  while (open.size) {
    const key = [...open].reduce((best, item) => item[1] < best[1] ? item : best)[0];
    open.delete(key);
    if (key === last.key) { reached = true; break; }
    const node = nodes.get(key);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const next = nodes.get(`${node.ix + dx}:${node.iz + dz}`);
      if (!next || !segment(node, next)) continue;
      const value = cost.get(key) + Math.hypot(dx, dz) * step;
      if (value >= (cost.get(next.key) ?? Infinity)) continue;
      cost.set(next.key, value); parents.set(next.key, key);
      open.set(next.key, value + Math.hypot(next.x - last.x, next.z - last.z));
    }
  }
  assert.ok(reached, `no physical route to requested viewpoint: ${JSON.stringify(point)}`);
  const route = [last];
  for (let key = last.key; parents.has(key); ) { key = parents.get(key); route.unshift(nodes.get(key)); }
  route.push(point);
  let from = start;
  for (let index = 0; index < route.length; ) {
    let end = route.length - 1;
    while (end > index && !segment(from, route[end])) end--;
    await walkTo(page, route[end], { tolerance });
    from = (await snapshot(page)).position; index = end + 1;
  }
}
