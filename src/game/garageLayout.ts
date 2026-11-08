import type { Obstacle } from './types';

/** The garage shares only the ground-floor passage's outer wall. Its longer
 * axis points towards the street gate, preserving the furnished kitchen. */
export const GARAGE = { minX: 4.40, maxX: 10.10, minZ: 11.85, maxZ: 15.65, floor: 0, ceiling: 2.75 } as const;
export const GARAGE_WEST_FACE = 4.556;
export const GARAGE_DOOR = { x: GARAGE.minX, minZ: 14.25, maxZ: 15.25, height: 2.10 } as const;
export const FAMILY_CAR = { x: 7.25, y: 0, z: 13.75, yaw: Math.PI / 2,
  length: 3.80, width: 1.74, height: 1.45 } as const;
export const GARAGE_SHELF = { x: 5.12, z: 12.035, width: 1.10, depth: .33, height: 1.78 } as const;
export const GARAGE_SOLIDS: readonly Obstacle[] = [
  { x: FAMILY_CAR.x, z: FAMILY_CAR.z, halfWidth: FAMILY_CAR.length / 2, halfDepth: FAMILY_CAR.width / 2 },
  { x: GARAGE_SHELF.x, z: GARAGE_SHELF.z, halfWidth: GARAGE_SHELF.width / 2, halfDepth: GARAGE_SHELF.depth / 2 },
  // The internal leaf is fully folded back against the garage wall.
  { x: 4.62, z: 13.80, halfWidth: .025, halfDepth: .45 },
];
export const GARAGE_ROUTE = {
  houseApproach: { x: 3.65, z: 14.75 }, entrance: { x: 5.00, z: 14.75 },
  rear: { x: 5.00, z: 12.54 }, frontNorth: { x: 9.60, z: 12.54 },
  frontSouth: { x: 9.60, z: 15.12 }, rearSouth: { x: 5.00, z: 15.12 },
  driver: { x: 7.25, z: 15.12 },
} as const;
export const FAMILY_CAR_INTERACTION = { x: 7.25, y: .90, z: 14.57 } as const;
