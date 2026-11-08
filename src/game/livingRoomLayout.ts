import type { Obstacle } from './types';

/** Ground-floor addition beside the preserved stair enclosure. All dimensions
 * are metres; the existing bedroom, flight and kitchen keep their own bounds. */
export const LIVING_ROOM = {
  minX: 2.67, maxX: 7.47, minZ: 8.05, maxZ: 11.85,
  floor: 0, ceiling: 2.6,
} as const;

/** A real .90m doorway in the kitchen's north wall. Its threshold fills only
 * the wall thickness between the new room and the existing kitchen floor. */
export const LIVING_ROOM_PORTAL = {
  minX: 3.25, maxX: 4.15, minZ: LIVING_ROOM.maxZ, maxZ: 12,
  floor: LIVING_ROOM.floor, height: 2.1,
} as const;

/** The alcove exposes the actual lower stair rail, without a second flight or
 * a walk-through opening onto the middle of the stairs. The wall above 2.6m
 * and the original bottom return remain in place. */
export const LIVING_ROOM_ALCOVE = {
  minX: 2.37, maxX: LIVING_ROOM.minX, minZ: 9.7, maxZ: 11.65,
  floor: LIVING_ROOM.floor, openingHeight: LIVING_ROOM.ceiling,
} as const;

/** Local furniture fronts point along +Z before Babylon Y rotation. These
 * oriented footprints are shared by the models and the circular player body. */
export const LIVING_ROOM_FURNITURE = {
  tvCabinet: { x: 4.80, z: 8.30, width: 1.90, depth: .50, height: 1.95, rotation: 0 },
  sofa: { x: 5.84, z: 11.18, width: 1.68, depth: .78, height: .88, rotation: Math.PI + .22 },
  armchair: { x: 3.15, z: 10.85, width: .70, depth: .72, height: .94, rotation: 2.49 },
  coffeeTable: { x: 4.90, z: 9.60, width: .95, depth: .60, height: .46, rotation: 0 },
  sideTable: { x: 3.10, z: 8.80, width: .42, depth: .40, height: .68, rotation: 0 },
} as const;

export const LIVING_ROOM_WINDOW = {
  x: LIVING_ROOM.maxX, y: 1.55, z: 9.30, width: 1.40, height: 1.20,
} as const;
export const LIVING_ROOM_FRONT_DOOR = {
  x: 6.20, z: LIVING_ROOM.minZ, width: .80, height: 2.10, thickness: .055,
} as const;
export const LIVING_ROOM_RUG = { x: 4.75, z: 10.05, width: 2.25, depth: 2.40 } as const;
export const LIVING_ROOM_OBJECTS = {
  tv: { x: 4.80, y: 1.10, z: 8.57 },
  phone: { x: 3.10, y: .76, z: 8.80 },
  photo: { x: 3.12, y: .90, z: 8.68 },
  frontDoor: { x: LIVING_ROOM_FRONT_DOOR.x, y: 1.02, z: LIVING_ROOM_FRONT_DOOR.z + .05 },
} as const;

export const LIVING_ROOM_SOLIDS: readonly Obstacle[] = Object.values(LIVING_ROOM_FURNITURE).map(item => ({
  x: item.x, z: item.z, halfWidth: item.width / 2, halfDepth: item.depth / 2, rotation: item.rotation,
}));

/** Small floor-supported props keep their own footprints without inflating the
 * five main furniture bounds. Leaves are soft; only the ceramic pot is solid. */
export const LIVING_ROOM_PROP_SOLIDS: readonly Obstacle[] = [
  { x: 3.16, z: 8.36, halfWidth: .15, halfDepth: .14 },
  { x: 7.12, z: 8.58, halfWidth: .144, halfDepth: .144 },
];

/** Existing masonry that the former, narrower floor perimeter hid from the
 * player. Keeping its real footprint prevents a shortcut through the bottom
 * return after the adjacent ground floor becomes accessible. */
export const PRESERVED_STAIR_RETURN: Obstacle = {
  x: 2.80, z: 11.74, halfWidth: .25, halfDepth: .06,
};
