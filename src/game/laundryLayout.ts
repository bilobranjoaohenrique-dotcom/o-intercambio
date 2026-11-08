import type { Obstacle } from './types';

/** Compact service room beside the existing kitchen and south of the garage.
 * Only two exterior wall openings connect it to the approved rooms. */
export const LAUNDRY = { minX: 3.90, maxX: 7.10, minZ: 15.80, maxZ: 19.00, floor: 0, ceiling: 2.75 } as const;
export const LAUNDRY_KITCHEN_DOOR = { x: 3.90, minZ: 16.00, maxZ: 16.90, height: 2.10 } as const;
export const LAUNDRY_GARAGE_DOOR = { minX: 5.10, maxX: 6.10, minZ: 15.65, maxZ: 15.80, height: 2.10 } as const;
export const LAUNDRY_THRESHOLD = { minX: 5.10, maxX: 6.10, minZ: 15.65, maxZ: 15.80 } as const;
export const LAUNDRY_WEST_FACE = 4.056;
export const LAUNDRY_NORTH_FACE = 15.796;
export const LAUNDRY_FURNITURE = {
  sink: { x: 6.62, z: 16.92, width: .80, depth: .86, height: .88 },
  washer: { x: 6.62, z: 17.98, width: .70, depth: .75, height: 1.00 },
  basket: { x: 6.65, z: 18.62, width: .42, depth: .42, height: .53 },
  bucket: { x: 4.40, z: 18.62, width: .30, depth: .30, height: .30 },
  broom: { x: 4.22, z: 18.40, width: .24, depth: .14, height: 1.40 },
  cabinet: { x: 4.59, z: 16.00, width: .82, depth: .34, height: 2.22 },
  shelf: { x: 4.20, z: 17.54, width: .30, depth: .76, height: 1.92 },
} as const;
export const LAUNDRY_OPEN_LEAF = { x: 6.55, z: 15.95, halfWidth: .45, halfDepth: .025 } as const;
export const LAUNDRY_SOLIDS: readonly Obstacle[] = [
  ...Object.values(LAUNDRY_FURNITURE).map(item => ({ x: item.x, z: item.z, halfWidth: item.width / 2, halfDepth: item.depth / 2 })),
  LAUNDRY_OPEN_LEAF,
];
export const LAUNDRY_ROUTE = {
  kitchen: { x: 3.50, z: 16.45 }, entrance: { x: 4.65, z: 16.45 },
  center: { x: 5.60, z: 16.45 }, garage: { x: 5.60, z: 15.12 },
  viewing: { x: 4.85, z: 18.35 }, sinkApproach: { x: 5.85, z: 16.92 },
  washerApproach: { x: 5.90, z: 17.98 },
} as const;
