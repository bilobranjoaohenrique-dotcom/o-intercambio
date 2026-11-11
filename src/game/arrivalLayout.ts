import type { Obstacle } from './types';

/** Source GLB is in metres. Babylon's standard glTF root mirrors source X. */
export const ARRIVAL_MODEL = { source: '/models/chegada_intercambio.glb',
  position: { x: 86, y: 0, z: 0 }, yaw: 0 } as const;
export const arrivalPoint = (x: number, y: number, z: number) => ({ x: 86 - x, y, z });
export const ARRIVAL = { minX: 78.5, maxX: 93.65, minZ: -19.2, maxZ: -.38, floor: 0 } as const;
export const ARRIVAL_FLOORS = [ARRIVAL] as const;
export const ARRIVAL_SPAWN = { position: { x: 86, y: 1.65, z: -14.8 }, yaw: 0, pitch: .035 } as const;
export const ARRIVAL_HOST = { x: 85.75, y: 1.1, z: -.85 } as const;
export const ARRIVAL_POSTER = { x: 89.65, y: 1.82, z: -19.36 } as const;
export const ARRIVAL_ROUTE = [
  arrivalPoint(0, 1.65, -12), arrivalPoint(0, 1.65, -9),
  arrivalPoint(0, 1.65, -6), arrivalPoint(.25, 1.65, -2.65),
] as const;
const sourceBox = (minX: number, maxX: number, minZ: number, maxZ: number): Obstacle => ({
  x: 86 - (minX + maxX) / 2, z: (minZ + maxZ) / 2,
  halfWidth: (maxX - minX) / 2, halfDepth: (maxZ - minZ) / 2,
});
export const ARRIVAL_SOLIDS: readonly Obstacle[] = [
  sourceBox(-5.65, -1.8, -5.55, -4.25), // seated-bank-left
  sourceBox(2, 5.82, -5.55, -4.25), // seated-bank-right
  sourceBox(-5.65, -1.8, -8.35, -7.1), // seated-bank-left
  sourceBox(2, 5.82, -8.35, -7.1), // seated-bank-right
  sourceBox(-5.65, -1.8, -11.1, -9.85), // seated-bank-left
  sourceBox(2, 5.82, -11.1, -9.85), // seated-bank-right
  sourceBox(-4.6, -1.5, -13.45, -12.25), // rear-sofa-left
  sourceBox(2.4, 5.5, -13.45, -12.25), // rear-sofa-right
  sourceBox(-4.1, -1.05, -1.65, -0.45), // front-sofa-left
  sourceBox(4.1, 6.75, -2.6, -0.5), // front-sofa-right
  sourceBox(-3.05, -1.8, -3.47, -2.22), // front-table-left
  sourceBox(3.51, 4.77, -3.47, -2.22), // front-table-right
  sourceBox(-2.54, -1.28, -15.08, -13.83), // rear-table-left
  sourceBox(4.08, 5.33, -15.08, -13.83), // rear-table-right
  sourceBox(-5.69, 5.54, -17.77, -16.93), // rear-desk-row
  sourceBox(-4.62, 4.39, -18.75, -17.87), // rear-chair-row
  sourceBox(-0.72, -0.18, -1.1, -0.6), // daniel-host
  sourceBox(0.34, 0.86, -1.1, -0.6), // helen-host
  sourceBox(7.1, 7.79, -18.13, -16.28), // east-side-bench
  sourceBox(7.1, 7.79, -13.82, -11.97), // east-side-bench
  sourceBox(7.1, 7.79, -9.49, -7.64), // east-side-bench
  sourceBox(7.1, 7.79, -5.18, -3.33), // east-side-bench
];
