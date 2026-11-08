import type { Point2, Point3 } from './layout';
import { EYE_HEIGHT, KITCHEN, STAIRS } from './layout';
import type { Obstacle } from './types';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LIVING_ROOM, LIVING_ROOM_FURNITURE, LIVING_ROOM_OBJECTS,
  LIVING_ROOM_SOLIDS, LIVING_ROOM_PROP_SOLIDS, LIVING_ROOM_WINDOW,
  LIVING_ROOM_FRONT_DOOR, LIVING_ROOM_RUG } from './livingRoomLayout';

/** The approved room stays authored in its original local coordinates. Only
 * this rigid placement changes: a half turn and translation put its former
 * kitchen aperture directly in front of the original last stair tread. */
export const LIVING_ROOM_PLACEMENT = { yaw: Math.PI, x: 5.55, y: 0, z: 23.85 } as const;

export function livingToWorld(point: Vector3): Point3;
export function livingToWorld<T extends Point2>(point: T): Omit<T, 'x' | 'z'> & Point2;
export function livingToWorld(point: Point2): Point2 | Point3 {
  const moved = { ...point, x: LIVING_ROOM_PLACEMENT.x - point.x, z: LIVING_ROOM_PLACEMENT.z - point.z };
  // Babylon vectors store coordinates behind non-enumerable getters. Never
  // depend on object spread for their Y coordinate (or return a fake Vector3).
  return 'y' in point && typeof point.y === 'number' ? { ...moved, y: point.y } : moved;
}
/** This half turn is its own inverse. Plain-layout dimensions are retained. */
export function worldToLiving(point: Vector3): Point3;
export function worldToLiving<T extends Point2>(point: T): Omit<T, 'x' | 'z'> & Point2;
export function worldToLiving(point: Point2): Point2 {
  return livingToWorld(point);
}
const movedSolid = (solid: Obstacle): Obstacle => ({
  ...livingToWorld(solid), rotation: (solid.rotation ?? 0) + LIVING_ROOM_PLACEMENT.yaw,
});

export const LIVING_ROOM_WORLD = {
  minX: LIVING_ROOM_PLACEMENT.x - LIVING_ROOM.maxX,
  maxX: LIVING_ROOM_PLACEMENT.x - LIVING_ROOM.minX,
  minZ: LIVING_ROOM_PLACEMENT.z - LIVING_ROOM.maxZ,
  maxZ: LIVING_ROOM_PLACEMENT.z - LIVING_ROOM.minZ,
  floor: LIVING_ROOM.floor, ceiling: LIVING_ROOM.ceiling,
} as const;
export const LIVING_ROOM_WORLD_FURNITURE = Object.fromEntries(
  Object.entries(LIVING_ROOM_FURNITURE).map(([name, item]) => [name, {
    ...livingToWorld(item), rotation: item.rotation + LIVING_ROOM_PLACEMENT.yaw,
  }]),
) as Record<keyof typeof LIVING_ROOM_FURNITURE,
  { x: number; z: number; width: number; depth: number; height: number; rotation: number }>;
export const LIVING_ROOM_WORLD_OBJECTS = Object.fromEntries(
  Object.entries(LIVING_ROOM_OBJECTS).map(([name, point]) => [name, livingToWorld(point)]),
) as Record<keyof typeof LIVING_ROOM_OBJECTS, Point3>;
export const LIVING_ROOM_WORLD_SOLIDS: readonly Obstacle[] = LIVING_ROOM_SOLIDS.map(movedSolid);
export const LIVING_ROOM_WORLD_PROP_SOLIDS: readonly Obstacle[] = LIVING_ROOM_PROP_SOLIDS.map(movedSolid);
export const LIVING_ROOM_WORLD_WINDOW = livingToWorld(LIVING_ROOM_WINDOW);
export const LIVING_ROOM_WORLD_FRONT_DOOR = livingToWorld(LIVING_ROOM_FRONT_DOOR);
export const LIVING_ROOM_WORLD_RUG = livingToWorld(LIVING_ROOM_RUG);

/** The original room aperture, now facing the final tread. The threshold is
 * the original kitchen wall thickness, without a sideways kitchen detour. */
export const LIVING_ROOM_ENTRY = {
  minX: STAIRS.minX, maxX: STAIRS.maxX, minZ: 11.85, maxZ: KITCHEN.startZ,
  floor: 0, height: 2.1,
} as const;
/** A new architectural joint in the formerly open stair-facing room side.
 * All approved furnishings remain in place; the 90cm opening lies between
 * the armchair and phone table rather than crossing either solid footprint. */
export const LIVING_ROOM_KITCHEN_PORTAL = {
  minX: LIVING_ROOM_WORLD.maxX, maxX: LIVING_ROOM_WORLD.maxX + .15,
  minZ: 13.75, maxZ: 14.65, floor: 0, height: 2.1,
} as const;
/** The kitchen's formerly empty front is partitioned around the living room.
 * Parents, cabinetry, table, TV and suitcase retain their original positions. */
export const KITCHEN_FRONT_PASSAGE = {
  minX: LIVING_ROOM_WORLD.maxX, maxX: KITCHEN.maxX,
  minZ: KITCHEN.startZ, maxZ: LIVING_ROOM_WORLD.maxZ,
} as const;
export const LIVING_ROOM_ROUTE: readonly Point2[] = [
  { x: 1.85, z: 11.94 }, { x: 1.60, z: 12.60 }, { x: 1.60, z: 14.15 },
  { x: 3.30, z: 14.15 }, { x: 3.50, z: 15.50 }, { x: 3.50, z: 16.25 },
  { x: 2.10, z: 16.25 },
];
/** Advanced home checkpoints already skipped the wake sequence. Keep their
 * mission/save intact and resume on clear kitchen floor beyond the new room. */
export const HOME_RESUME_POSITION = { x: 0, y: EYE_HEIGHT, z: 16.30 } as const;
