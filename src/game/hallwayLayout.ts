import { HALL, ROOM, STAIRS } from './layout';
import type { Obstacle } from './types';

/** Only the connecting corridor changes. Legacy HALL bounds still describe
 * the existing kitchen aperture, whose geometry must remain untouched. */
export const HALLWAY = {
  minX: 1.15, maxX: 2.55, startZ: HALL.startZ, endZ: STAIRS.startZ,
  floor: ROOM.floor, ceiling: ROOM.ceiling,
} as const;
export const BOTTOM_LANDING = {
  minX: HALL.minX, maxX: HALL.maxX, startZ: STAIRS.endZ, endZ: HALL.endZ,
  floor: STAIRS.bottomY,
} as const;
export const HALLWAY_FURNITURE = {
  console: { x: 2.405, z: 5.75, width: .27, depth: .85, height: .86 },
} as const;
export const HALLWAY_OBJECTS = {
  switch: { x: 1.175, y: 4.23, z: 4.25 },
} as const;
/** Handrails and posts stand outside the .90m clear tread width. Their
 * physical inner faces coincide with the safe floor edges of the flight. */
export const STAIR_RAILS = [
  { x: STAIRS.minX - .035, z: (STAIRS.startZ + STAIRS.endZ) / 2,
    halfWidth: .035, halfDepth: (STAIRS.endZ - STAIRS.startZ) / 2 },
  { x: STAIRS.maxX + .035, z: (STAIRS.startZ + STAIRS.endZ) / 2,
    halfWidth: .035, halfDepth: (STAIRS.endZ - STAIRS.startZ) / 2 },
] as const satisfies readonly Obstacle[];
export const STAIR_POSTS = [
  { x: STAIRS.minX - .05, z: STAIRS.startZ - .07, width: .10, depth: .10, floor: STAIRS.topY, height: .98 },
  { x: STAIRS.maxX + .05, z: STAIRS.startZ - .07, width: .10, depth: .10, floor: STAIRS.topY, height: .98 },
  { x: STAIRS.minX - .05, z: STAIRS.endZ + .05, width: .10, depth: .10, floor: STAIRS.bottomY, height: .98 },
  { x: STAIRS.maxX + .05, z: STAIRS.endZ + .05, width: .10, depth: .10, floor: STAIRS.bottomY, height: .98 },
] as const;
export const HALLWAY_SOLIDS: readonly Obstacle[] = [
  ...Object.values(HALLWAY_FURNITURE).map(item => ({ x: item.x, z: item.z,
    halfWidth: item.width / 2, halfDepth: item.depth / 2 })),
  ...STAIR_RAILS,
  ...STAIR_POSTS.map(post => ({ x: post.x, z: post.z, halfWidth: post.width / 2, halfDepth: post.depth / 2 })),
];
