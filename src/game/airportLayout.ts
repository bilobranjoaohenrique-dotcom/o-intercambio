import type { Obstacle } from './types';

/** The departure lounge occupies the existing chapter airport footprint. */
export const AIRPORT = { minX: 24, maxX: 36, minZ: -6, maxZ: 6, floor: 0, ceiling: 3.8 } as const;
export const AIRPORT_ARRIVAL = { position: { x: 30, y: 1.65, z: -2.8 }, yaw: 0, pitch: .19 } as const;
export const AIRPORT_PARENTS = {
  father: { position: { x: 29.66, y: 0, z: -1.55 }, yaw: Math.PI },
  mother: { position: { x: 30.30, y: 0, z: -1.55 }, yaw: Math.PI },
} as const;
export const AIRPORT_GATE = { x: 33.9, y: 1.1, z: 4.55 } as const;
export const AIRPORT_ROUTE = [
  { x: 31.6, z: -3.3 }, { x: 31.6, z: .25 }, { x: 33.9, z: .25 },
  { x: 33.9, z: 2.9 }, { x: 33.9, z: 4.1 },
] as const;
export const AIRPORT_SOLIDS: readonly Obstacle[] = [
  // Seats remain on the left; the family and the queue leave a generous route.
  ...[-.05, 2.15, 4.15].map(z => ({ x: 26.65, z, halfWidth: 1.72, halfDepth: .43 })),
  { x: 35.2, z: 3.5, halfWidth: .60, halfDepth: .43 },
  { x: 32.1, z: 2.7, halfWidth: .21, halfDepth: .18 },
  { x: 32.4, z: 2.63, halfWidth: .16, halfDepth: .10 },
  ...[24.25, 31.95, 35.77].map(x => ({ x, z: 5.66, halfWidth: .16, halfDepth: .24 })),
  ...[32.78, 35.03].map(x => ({ x, z: 4.75, halfWidth: .09, halfDepth: .175 })),
  ...[32.84, 34.98].map(x => ({ x, z: 5.3, halfWidth: .05, halfDepth: .52 })),
  { x: 33.91, z: 5.88, halfWidth: 1.05, halfDepth: .04 },
  ...[32.85, 34.95].flatMap(x => [1.30, 2.45, 3.62].map(z => ({ x, z, halfWidth: .065, halfDepth: .065 }))),
  { x: AIRPORT_PARENTS.father.position.x, z: AIRPORT_PARENTS.father.position.z, halfWidth: .27, halfDepth: .22 },
  { x: AIRPORT_PARENTS.mother.position.x, z: AIRPORT_PARENTS.mother.position.z, halfWidth: .24, halfDepth: .22 },
];
