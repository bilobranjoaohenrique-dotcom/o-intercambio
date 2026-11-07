import { CHAPTER_ZONES, DOOR, FURNITURE, HALL, KITCHEN, ROOM, STAIRS, type Point2 } from './layout';
import type { Obstacle } from './types';

export const PLAYER_RADIUS = .22;
const WALL_THICKNESS = .12;
const EPSILON = 1e-9;
const finitePoint = (point: Point2) => Number.isFinite(point.x) && Number.isFinite(point.z);
const box = (minX: number, maxX: number, minZ: number, maxZ: number): Obstacle => ({
  x: (minX + maxX) / 2, z: (minZ + maxZ) / 2,
  halfWidth: (maxX - minX) / 2, halfDepth: (maxZ - minZ) / 2,
});

/** Inner wall faces coincide with layout bounds. The bedroom's north wall has
 * a real opening; the moving leaf is supplied separately as an oriented box. */
export const staticObstacles: readonly Obstacle[] = [
  box(ROOM.minX - WALL_THICKNESS, ROOM.minX, ROOM.minZ, ROOM.maxZ),
  box(ROOM.maxX, ROOM.maxX + WALL_THICKNESS, ROOM.minZ, ROOM.maxZ),
  box(ROOM.minX, ROOM.maxX, ROOM.minZ - WALL_THICKNESS, ROOM.minZ),
  box(ROOM.minX, DOOR.hingeX, ROOM.maxZ, ROOM.maxZ + WALL_THICKNESS),
  box(DOOR.hingeX + DOOR.width, ROOM.maxX, ROOM.maxZ, ROOM.maxZ + WALL_THICKNESS),
  box(HALL.minX - WALL_THICKNESS, HALL.minX, HALL.startZ, HALL.endZ),
  box(HALL.maxX, HALL.maxX + WALL_THICKNESS, HALL.startZ, HALL.endZ),
  box(KITCHEN.minX, KITCHEN.minX + WALL_THICKNESS, KITCHEN.startZ, KITCHEN.endZ),
  box(KITCHEN.maxX - WALL_THICKNESS, KITCHEN.maxX, KITCHEN.startZ, KITCHEN.endZ),
  box(KITCHEN.minX, KITCHEN.maxX, KITCHEN.endZ, KITCHEN.endZ + WALL_THICKNESS),
  ...Object.values(FURNITURE).map(item => ({ x: item.x, z: item.z, halfWidth: item.width / 2, halfDepth: item.depth / 2 })),
];

/** Height of the physical tread below the player's feet, never a camera offset. */
export function floorHeight(point: Point2): number {
  if (Object.values(CHAPTER_ZONES).some(zone => point.x >= zone.minX && point.x <= zone.maxX && point.z >= zone.minZ && point.z <= zone.maxZ)) return 0;
  if (point.x >= KITCHEN.minX && point.x <= KITCHEN.maxX && point.z >= KITCHEN.startZ && point.z <= KITCHEN.endZ) return KITCHEN.floor;
  if (!Number.isFinite(point.z) || point.z < STAIRS.startZ) return ROOM.floor;
  if (point.z >= STAIRS.endZ) return STAIRS.bottomY;
  const tread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps;
  const step = Math.min(STAIRS.steps, Math.floor((point.z - STAIRS.startZ + EPSILON) / tread) + 1);
  return STAIRS.topY - (STAIRS.topY - STAIRS.bottomY) * step / STAIRS.steps;
}

const insideFloor = (point: Point2) => (
  point.x >= ROOM.minX && point.x <= ROOM.maxX && point.z >= ROOM.minZ && point.z <= ROOM.maxZ
) || (
  point.x >= HALL.minX && point.x <= HALL.maxX && point.z >= HALL.startZ && point.z <= HALL.endZ
) || (
  point.x >= KITCHEN.minX && point.x <= KITCHEN.maxX && point.z >= KITCHEN.startZ && point.z <= KITCHEN.endZ
) || Object.values(CHAPTER_ZONES).some(zone =>
  point.x >= zone.minX && point.x <= zone.maxX && point.z >= zone.minZ && point.z <= zone.maxZ
);
type Edge = readonly [number, number, number, number];
const floorEdges: readonly Edge[] = [
  [ROOM.minX, ROOM.minZ, ROOM.minX, ROOM.maxZ],
  [ROOM.maxX, ROOM.minZ, ROOM.maxX, ROOM.maxZ],
  [ROOM.minX, ROOM.minZ, ROOM.maxX, ROOM.minZ],
  [ROOM.minX, ROOM.maxZ, HALL.minX, ROOM.maxZ],
  [HALL.maxX, ROOM.maxZ, ROOM.maxX, ROOM.maxZ],
  [HALL.minX, HALL.startZ, HALL.minX, HALL.endZ],
  [HALL.maxX, HALL.startZ, HALL.maxX, HALL.endZ],
  [KITCHEN.minX, KITCHEN.endZ, KITCHEN.maxX, KITCHEN.endZ],
  [KITCHEN.minX, KITCHEN.startZ, KITCHEN.minX, KITCHEN.endZ],
  [KITCHEN.maxX, KITCHEN.startZ, KITCHEN.maxX, KITCHEN.endZ],
  ...Object.values(CHAPTER_ZONES).flatMap(zone => [
    [zone.minX, zone.minZ, zone.maxX, zone.minZ] as const,
    [zone.minX, zone.maxZ, zone.maxX, zone.maxZ] as const,
    [zone.minX, zone.minZ, zone.minX, zone.maxZ] as const,
    [zone.maxX, zone.minZ, zone.maxX, zone.maxZ] as const,
  ]),
];
function edgeDistanceSquared(point: Point2, [ax, az, bx, bz]: Edge) {
  const dx = bx - ax, dz = bz - az;
  const along = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.z - az) * dz) / (dx * dx + dz * dz)));
  return (point.x - ax - along * dx) ** 2 + (point.z - az - along * dz) ** 2;
}
export function circleOverlapsObstacle(point: Point2, obstacle: Obstacle, radius = PLAYER_RADIUS): boolean {
  if (!finitePoint(point) || !Number.isFinite(radius) || radius < 0) return true;
  if (![obstacle.x, obstacle.z, obstacle.halfWidth, obstacle.halfDepth, obstacle.rotation ?? 0].every(Number.isFinite) ||
    obstacle.halfWidth < 0 || obstacle.halfDepth < 0) return true;
  const angle = obstacle.rotation ?? 0, cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = point.x - obstacle.x, dz = point.z - obstacle.z;
  // Babylon Y rotation: local +X points toward (cos(angle), -sin(angle)).
  const localX = dx * cos - dz * sin, localZ = dx * sin + dz * cos;
  const gapX = Math.max(0, Math.abs(localX) - obstacle.halfWidth);
  const gapZ = Math.max(0, Math.abs(localZ) - obstacle.halfDepth);
  return gapX * gapX + gapZ * gapZ < radius * radius - EPSILON;
}

/** The whole circular footprint must stay on the connected room/hall floor. */
export function isWalkable(point: Point2, dynamicObstacles: readonly Obstacle[] = []): boolean {
  return finitePoint(point) && insideFloor(point) &&
    floorEdges.every(edge => edgeDistanceSquared(point, edge) >= PLAYER_RADIUS * PLAYER_RADIUS - EPSILON) &&
    !staticObstacles.some(obstacle => circleOverlapsObstacle(point, obstacle)) &&
    !dynamicObstacles.some(obstacle => circleOverlapsObstacle(point, obstacle));
}

/** Swept in short steps, then axis sliding. A large frame cannot tunnel through
 * the thin door, furniture or the outer wall. Inputs and source positions stay immutable. */
export function moveWithCollisions(position: Point2, dx: number, dz: number,
  dynamicObstacles: readonly Obstacle[] = []): Point2 {
  const result = { x: position.x, z: position.z };
  if (!finitePoint(position) || !Number.isFinite(dx) || !Number.isFinite(dz)) return result;
  const length = Math.hypot(dx, dz);
  if (!length || !Number.isFinite(length)) return result;
  // The scene is under sixteen metres long; bound malformed external input as
  // well as the amount of work without weakening the collision sweep.
  const scale = Math.min(1, 32 / length);
  dx *= scale; dz *= scale;
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

/** Complete on the last tread, with enough room for a natural final step. */
export function reachedBreakfast(point: Point2): boolean {
  const halfTread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps / 2;
  return isWalkable(point) && point.z >= STAIRS.endZ - halfTread && floorHeight(point) === STAIRS.bottomY;
}
