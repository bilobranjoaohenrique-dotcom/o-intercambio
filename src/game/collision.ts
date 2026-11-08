import { CHAPTER_ZONES, DOOR, FURNITURE, ROOM, STAIRS, type Point2 } from './layout';
import { KITCHEN_SOLIDS, COMPACT_KITCHEN as KITCHEN, KITCHEN_ENTRY_DOOR } from './kitchenLayout';
import { HALLWAY, BOTTOM_LANDING, HALLWAY_SOLIDS } from './hallwayLayout';
import { PRESERVED_STAIR_RETURN } from './livingRoomLayout';
import { LIVING_ROOM_WORLD, LIVING_ROOM_ENTRY, LIVING_ROOM_KITCHEN_PORTAL,
  LIVING_ROOM_WORLD_SOLIDS, LIVING_ROOM_WORLD_PROP_SOLIDS,
  KITCHEN_FRONT_PASSAGE } from './livingRoomPlacement';
import type { Obstacle } from './types';
import { GARAGE, GARAGE_DOOR, GARAGE_WEST_FACE, GARAGE_SOLIDS } from './garageLayout';
import { isTravelBagTaken } from './garageProgress';
import { LAUNDRY, LAUNDRY_KITCHEN_DOOR, LAUNDRY_GARAGE_DOOR, LAUNDRY_THRESHOLD,
  LAUNDRY_WEST_FACE, LAUNDRY_SOLIDS } from './laundryLayout';

export const PLAYER_RADIUS = .22;
const WALL_THICKNESS = .12;
const EPSILON = 1e-9;
const finitePoint = (point: Point2) => Number.isFinite(point.x) && Number.isFinite(point.z);
const box = (minX: number, maxX: number, minZ: number, maxZ: number): Obstacle => ({
  x: (minX + maxX) / 2, z: (minZ + maxZ) / 2,
  halfWidth: (maxX - minX) / 2, halfDepth: (maxZ - minZ) / 2,
});

/** Inner wall faces coincide with layout bounds. The bedroom's doorway wall has
 * a real opening; the moving leaf is supplied separately as an oriented box. */
export const staticObstacles: readonly Obstacle[] = [
  box(ROOM.minX - WALL_THICKNESS, ROOM.minX, ROOM.minZ, ROOM.maxZ),
  box(ROOM.maxX, ROOM.maxX + WALL_THICKNESS, ROOM.minZ, ROOM.maxZ),
  box(ROOM.minX, ROOM.maxX, ROOM.minZ - WALL_THICKNESS, ROOM.minZ),
  box(ROOM.minX, DOOR.hingeX, ROOM.maxZ, ROOM.maxZ + WALL_THICKNESS),
  box(DOOR.hingeX + DOOR.width, ROOM.maxX, ROOM.maxZ, ROOM.maxZ + WALL_THICKNESS),
  box(HALLWAY.minX - WALL_THICKNESS, HALLWAY.minX, HALLWAY.startZ, STAIRS.endZ),
  box(HALLWAY.maxX, HALLWAY.maxX + WALL_THICKNESS, HALLWAY.startZ, STAIRS.endZ),
  box(BOTTOM_LANDING.minX - WALL_THICKNESS, BOTTOM_LANDING.minX, BOTTOM_LANDING.startZ, KITCHEN.startZ),
  box(BOTTOM_LANDING.maxX, BOTTOM_LANDING.maxX + WALL_THICKNESS, BOTTOM_LANDING.startZ, KITCHEN.startZ),
  box(LIVING_ROOM_WORLD.minX, LIVING_ROOM_ENTRY.minX, LIVING_ROOM_ENTRY.minZ, KITCHEN.startZ),
  box(LIVING_ROOM_ENTRY.maxX, KITCHEN_FRONT_PASSAGE.maxX, LIVING_ROOM_ENTRY.minZ, KITCHEN.startZ),
  box(KITCHEN.minX, KITCHEN.minX + WALL_THICKNESS, LIVING_ROOM_WORLD.maxZ, KITCHEN.endZ),
  box(KITCHEN.maxX - WALL_THICKNESS, KITCHEN.maxX, LIVING_ROOM_WORLD.maxZ, LAUNDRY_KITCHEN_DOOR.minZ),
  box(KITCHEN.maxX - WALL_THICKNESS, KITCHEN.maxX, LAUNDRY_KITCHEN_DOOR.maxZ, KITCHEN.endZ),
  box(KITCHEN_FRONT_PASSAGE.maxX - WALL_THICKNESS, KITCHEN_FRONT_PASSAGE.maxX, KITCHEN.startZ, GARAGE_DOOR.minZ),
  box(KITCHEN_FRONT_PASSAGE.maxX - WALL_THICKNESS, KITCHEN_FRONT_PASSAGE.maxX, GARAGE_DOOR.maxZ, LIVING_ROOM_WORLD.maxZ),
  box(KITCHEN.maxX, KITCHEN_FRONT_PASSAGE.maxX, LIVING_ROOM_WORLD.maxZ, LIVING_ROOM_WORLD.maxZ + WALL_THICKNESS),
  box(KITCHEN.minX, KITCHEN.maxX, KITCHEN.endZ, KITCHEN.endZ + WALL_THICKNESS),
  box(LIVING_ROOM_WORLD.minX - WALL_THICKNESS, LIVING_ROOM_WORLD.minX, LIVING_ROOM_WORLD.minZ, LIVING_ROOM_WORLD.maxZ),
  box(LIVING_ROOM_WORLD.maxX, LIVING_ROOM_KITCHEN_PORTAL.maxX, LIVING_ROOM_WORLD.minZ, LIVING_ROOM_KITCHEN_PORTAL.minZ),
  box(LIVING_ROOM_WORLD.maxX, LIVING_ROOM_KITCHEN_PORTAL.maxX, LIVING_ROOM_KITCHEN_PORTAL.maxZ, LIVING_ROOM_WORLD.maxZ),
  box(KITCHEN.minX, KITCHEN_ENTRY_DOOR.x - KITCHEN_ENTRY_DOOR.apertureWidth / 2, LIVING_ROOM_WORLD.maxZ, LIVING_ROOM_WORLD.maxZ + WALL_THICKNESS),
  box(KITCHEN_ENTRY_DOOR.x + KITCHEN_ENTRY_DOOR.apertureWidth / 2, LIVING_ROOM_WORLD.minX, LIVING_ROOM_WORLD.maxZ, LIVING_ROOM_WORLD.maxZ + WALL_THICKNESS),
  { x: KITCHEN_ENTRY_DOOR.x, z: KITCHEN_ENTRY_DOOR.z, halfWidth: KITCHEN_ENTRY_DOOR.width / 2, halfDepth: KITCHEN_ENTRY_DOOR.depth / 2 },
  box(LIVING_ROOM_WORLD.minX, LIVING_ROOM_KITCHEN_PORTAL.maxX, LIVING_ROOM_WORLD.maxZ, LIVING_ROOM_WORLD.maxZ + WALL_THICKNESS),
  ...Object.values(FURNITURE).map(item => ({ x: item.x, z: item.z, halfWidth: item.width / 2, halfDepth: item.depth / 2,
    ...(item === FURNITURE.backpack ? { enabled: () => !isTravelBagTaken() } : {}) })),
  ...HALLWAY_SOLIDS,
  ...KITCHEN_SOLIDS,
  ...LIVING_ROOM_WORLD_SOLIDS,
  ...LIVING_ROOM_WORLD_PROP_SOLIDS,
  PRESERVED_STAIR_RETURN,
  box(GARAGE.minX, GARAGE_WEST_FACE, GARAGE.minZ, GARAGE_DOOR.minZ),
  box(GARAGE.minX, GARAGE_WEST_FACE, GARAGE_DOOR.maxZ, GARAGE.maxZ),
  box(GARAGE.minX, GARAGE.maxX, GARAGE.minZ - WALL_THICKNESS, GARAGE.minZ),
  box(GARAGE.minX, LAUNDRY_GARAGE_DOOR.minX, GARAGE.maxZ, GARAGE.maxZ + WALL_THICKNESS),
  box(LAUNDRY_GARAGE_DOOR.maxX, GARAGE.maxX, GARAGE.maxZ, GARAGE.maxZ + WALL_THICKNESS),
  box(GARAGE.maxX, GARAGE.maxX + WALL_THICKNESS, GARAGE.minZ, GARAGE.maxZ),
  ...GARAGE_SOLIDS,
  box(LAUNDRY.minX, LAUNDRY_WEST_FACE, LAUNDRY.minZ, LAUNDRY_KITCHEN_DOOR.minZ),
  box(LAUNDRY.minX, LAUNDRY_WEST_FACE, LAUNDRY_KITCHEN_DOOR.maxZ, LAUNDRY.maxZ),
  box(GARAGE.minX, LAUNDRY_GARAGE_DOOR.minX, GARAGE.maxZ, LAUNDRY.minZ),
  box(LAUNDRY_GARAGE_DOOR.maxX, LAUNDRY.maxX, GARAGE.maxZ, LAUNDRY.minZ),
  box(LAUNDRY.minX, LAUNDRY.maxX, LAUNDRY.maxZ, LAUNDRY.maxZ + WALL_THICKNESS),
  box(LAUNDRY.maxX, LAUNDRY.maxX + WALL_THICKNESS, LAUNDRY.minZ, LAUNDRY.maxZ),
  ...LAUNDRY_SOLIDS,
];

/** Height of the physical tread below the player's feet, never a camera offset. */
export function floorHeight(point: Point2): number {
  if (point.x >= LAUNDRY.minX && point.x <= LAUNDRY.maxX && point.z >= LAUNDRY_THRESHOLD.minZ && point.z <= LAUNDRY.maxZ) return LAUNDRY.floor;
  if (point.x >= GARAGE.minX && point.x <= GARAGE.maxX && point.z >= GARAGE.minZ && point.z <= GARAGE.maxZ) return GARAGE.floor;
  if (Object.values(CHAPTER_ZONES).some(zone => point.x >= zone.minX && point.x <= zone.maxX && point.z >= zone.minZ && point.z <= zone.maxZ)) return 0;
  if (point.x >= KITCHEN.minX && point.x <= KITCHEN.maxX && point.z >= KITCHEN.startZ && point.z <= KITCHEN.endZ) return KITCHEN.floor;
  if (livingFloorRects.some(rect => containsPoint(rect, point))) return LIVING_ROOM_WORLD.floor;
  if (!Number.isFinite(point.z) || point.z < STAIRS.startZ) return ROOM.floor;
  if (point.z >= STAIRS.endZ) return STAIRS.bottomY;
  const tread = (STAIRS.endZ - STAIRS.startZ) / STAIRS.steps;
  const step = Math.min(STAIRS.steps, Math.floor((point.z - STAIRS.startZ + EPSILON) / tread) + 1);
  return STAIRS.topY - (STAIRS.topY - STAIRS.bottomY) * step / STAIRS.steps;
}

type FloorRect = { minX: number; maxX: number; minZ: number; maxZ: number };
const livingFloorRects: readonly FloorRect[] = [LIVING_ROOM_WORLD, LIVING_ROOM_ENTRY, LIVING_ROOM_KITCHEN_PORTAL];
const containsPoint = (rect: FloorRect, point: Point2) =>
  point.x >= rect.minX && point.x <= rect.maxX && point.z >= rect.minZ && point.z <= rect.maxZ;
const floorRects: readonly FloorRect[] = [
  ROOM,
  GARAGE,
  LAUNDRY,
  LAUNDRY_THRESHOLD,
  { minX: HALLWAY.minX, maxX: HALLWAY.maxX, minZ: HALLWAY.startZ, maxZ: HALLWAY.endZ },
  { minX: STAIRS.minX, maxX: STAIRS.maxX, minZ: STAIRS.startZ, maxZ: STAIRS.endZ },
  { minX: BOTTOM_LANDING.minX, maxX: BOTTOM_LANDING.maxX, minZ: BOTTOM_LANDING.startZ, maxZ: BOTTOM_LANDING.endZ },
  { minX: KITCHEN.minX, maxX: KITCHEN.maxX, minZ: LIVING_ROOM_WORLD.maxZ, maxZ: KITCHEN.endZ },
  KITCHEN_FRONT_PASSAGE,
  ...livingFloorRects,
  ...Object.values(CHAPTER_ZONES),
];
const insideFloor = (point: Point2) => floorRects.some(rect => containsPoint(rect, point));
type Edge = readonly [number, number, number, number];
// Only the exposed perimeter of the union is solid. Connection apertures have
// no crosswise edge, so the full capsule can pass through each real joint.
// Subtract covered intervals once at startup. Overlapping corner/threshold
// rectangles must not leave invisible edges across the new physical doorway.
const floorEdges: readonly Edge[] = floorRects.flatMap(rect => {
  const result: Edge[] = [];
  for (const [vertical, fixed, low, high, outward] of [
    [true, rect.minX, rect.minZ, rect.maxZ, -1],
    [true, rect.maxX, rect.minZ, rect.maxZ, 1],
    [false, rect.minZ, rect.minX, rect.maxX, -1],
    [false, rect.maxZ, rect.minX, rect.maxX, 1],
  ] as const) {
    let exposed: [number, number][] = [[low, high]];
    for (const other of floorRects) {
      if (other === rect) continue;
      const min = vertical ? other.minX : other.minZ;
      const max = vertical ? other.maxX : other.maxZ;
      const coversOutside = outward < 0 ? min < fixed - EPSILON && max >= fixed - EPSILON :
        max > fixed + EPSILON && min <= fixed + EPSILON;
      if (!coversOutside) continue;
      const from = vertical ? other.minZ : other.minX, to = vertical ? other.maxZ : other.maxX;
      exposed = exposed.flatMap(([a, b]) => {
        if (to <= a || from >= b) return [[a, b]];
        const parts: [number, number][] = [];
        if (from > a) parts.push([a, from]);
        if (to < b) parts.push([to, b]);
        return parts;
      });
    }
    for (const [a, b] of exposed) if (b - a > EPSILON)
      result.push(vertical ? [fixed, a, fixed, b] : [a, fixed, b, fixed]);
  }
  return result;
});
function edgeDistanceSquared(point: Point2, [ax, az, bx, bz]: Edge) {
  const dx = bx - ax, dz = bz - az;
  // Matching room/hall extents can produce a zero-length boundary segment.
  // Its endpoint still has a physical distance; dividing by zero would make
  // every position non-walkable through NaN comparisons.
  const squaredLength = dx * dx + dz * dz;
  if (squaredLength <= EPSILON) return (point.x - ax) ** 2 + (point.z - az) ** 2;
  const along = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.z - az) * dz) / squaredLength));
  return (point.x - ax - along * dx) ** 2 + (point.z - az - along * dz) ** 2;
}
export function circleOverlapsObstacle(point: Point2, obstacle: Obstacle, radius = PLAYER_RADIUS): boolean {
  if (!finitePoint(point) || !Number.isFinite(radius) || radius < 0) return true;
  if (obstacle.enabled?.() === false) return false;
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
  return ![LIVING_ROOM_WORLD, LIVING_ROOM_KITCHEN_PORTAL].some(rect => containsPoint(rect, point)) &&
    isWalkable(point) && point.z >= STAIRS.endZ - halfTread && floorHeight(point) === STAIRS.bottomY;
}
