import type { Point2 } from './layout';
import type { Obstacle } from './types';
import { PLAYER_RADIUS, circleOverlapsObstacle } from './collision';
import { WB_FLOORS, WB_STATIC_SOLIDS, WB_WALK_AREAS, WB_WALK_SPAWN, withinWbRect } from './westbridgeLayout';

const finite = (point: Point2) => Number.isFinite(point.x) && Number.isFinite(point.z);
type Edge = readonly [number, number, number, number];
const EPS = 1e-9;
// Exposed edges of the connected floor union only: the side-road mouth never
// gains an invisible crosswise wall at the overlapping rectangle boundary.
const floorEdges: readonly Edge[] = WB_WALK_AREAS.flatMap(rect => {
  const result: Edge[] = [];
  for (const [vertical, fixed, low, high, direction] of [
    [true, rect.minX, rect.minZ, rect.maxZ, -1], [true, rect.maxX, rect.minZ, rect.maxZ, 1],
    [false, rect.minZ, rect.minX, rect.maxX, -1], [false, rect.maxZ, rect.minX, rect.maxX, 1],
  ] as const) {
    let spans: [number, number][] = [[low, high]];
    for (const other of WB_WALK_AREAS) {
      if (other === rect) continue;
      const min = vertical ? other.minX : other.minZ, max = vertical ? other.maxX : other.maxZ;
      if (!(direction < 0 ? min < fixed - EPS && max >= fixed - EPS : max > fixed + EPS && min <= fixed + EPS)) continue;
      const from = vertical ? other.minZ : other.minX, to = vertical ? other.maxZ : other.maxX;
      spans = spans.flatMap(([a, b]) => to <= a || from >= b ? [[a, b]] :
        [...(from > a ? [[a, from] as [number, number]] : []), ...(to < b ? [[to, b] as [number, number]] : [])]);
    }
    for (const [a, b] of spans) if (b - a > EPS) result.push(vertical ? [fixed, a, fixed, b] : [a, fixed, b, fixed]);
  }
  return result;
});
function edgeDistanceSquared(point: Point2, [ax, az, bx, bz]: Edge) {
  const dx = bx - ax, dz = bz - az, lengthSquared = dx * dx + dz * dz;
  const along = lengthSquared ? Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.z - az) * dz) / lengthSquared)) : 0;
  return (point.x - ax - along * dx) ** 2 + (point.z - az - along * dz) ** 2;
}
export function isWalkable(point: Point2, dynamicObstacles: readonly Obstacle[] = []) {
  return finite(point) && WB_WALK_AREAS.some(rect => withinWbRect(rect, point)) &&
    floorEdges.every(edge => edgeDistanceSquared(point, edge) >= PLAYER_RADIUS ** 2 - EPS) &&
    !WB_STATIC_SOLIDS.some(obstacle => circleOverlapsObstacle(point, obstacle)) &&
    !dynamicObstacles.some(obstacle => circleOverlapsObstacle(point, obstacle));
}
/** Swept substeps and axis sliding use the existing circular player footprint. */
export function move(position: Point2, dx: number, dz: number, dynamicObstacles: readonly Obstacle[] = []): Point2 {
  if (!finite(position)) return { x: WB_WALK_SPAWN.x, z: WB_WALK_SPAWN.z };
  const result = { x: position.x, z: position.z };
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) return result;
  const length = Math.hypot(dx, dz);
  if (!length || !Number.isFinite(length)) return result;
  const scale = Math.min(1, 32 / length); dx *= scale; dz *= scale;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (PLAYER_RADIUS * .3)));
  const sx = dx / steps, sz = dz / steps;
  for (let step = 0; step < steps; step++) {
    const whole = { x: result.x + sx, z: result.z + sz };
    if (isWalkable(whole, dynamicObstacles)) { result.x = whole.x; result.z = whole.z; continue; }
    if (isWalkable({ x: result.x + sx, z: result.z }, dynamicObstacles)) result.x += sx;
    if (isWalkable({ x: result.x, z: result.z + sz }, dynamicObstacles)) result.z += sz;
  }
  return result;
}
export function floorHeight(position: Point2): number {
  if (!finite(position)) return 0;
  return WB_FLOORS.find(rect => withinWbRect(rect, position))?.height ?? -.015;
}
export function surfaceAt(position: Point2) {
  return finite(position) ? WB_FLOORS.find(rect => withinWbRect(rect, position))?.surface ?? 'grass' : 'grass';
}
export const westbridgeNavigation = { move, floorHeight, surfaceAt };
