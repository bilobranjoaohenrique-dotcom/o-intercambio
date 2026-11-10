import type { Obstacle } from './types';

/** Keep the authored metre scale. The loader mirrors source X; this wrapper
 * rotates the long terminal along world Z, away from the other chapter sets. */
export const AIRPORT_MODEL = { source: '/models/aeroporto_intercambio.glb',
  position: { x: 30, y: -.20, z: 0 }, yaw: Math.PI / 2 } as const;
export const airportPoint = (x: number, y: number, z: number) => ({ x: 30 + z, y: y - .20, z: x });
const floorRect = (minX: number, maxX: number, minZ: number, maxZ: number) =>
  ({ minX: 30 + minZ, maxX: 30 + maxZ, minZ: minX, maxZ: maxX });
export const AIRPORT = { minX: 25.8, maxX: 34.5, minZ: -7.7, maxZ: 15.06, floor: 0, ceiling: 5.48 } as const;
export const AIRPORT_FLOORS = [
  floorRect(-7.7, 7.7, -4.2, 4.5),
  floorRect(7.65, 9.35, 1.65, 2.75),
  floorRect(9.27, 15.06, -3.88, 4.12),
] as const;
export const AIRPORT_ARRIVAL = { position: { x: 33.1, y: 1.65, z: -.5 }, yaw: -Math.PI / 2, pitch: .12 } as const;
export const AIRPORT_PARENTS = {
  father: { position: { x: 31.55, y: 0, z: -.84 }, yaw: Math.PI / 2 },
  mother: { position: { x: 31.55, y: 0, z: -.16 }, yaw: Math.PI / 2 },
} as const;
export const AIRPORT_GATE = airportPoint(15.02, 1.30, 2.12);
export const AIRPORT_FLIGHT_BOARD = airportPoint(-4.85, 3.71, .186);
// Waypoints follow the actual passage to Gate 24.
export const AIRPORT_ROUTE = [
  airportPoint(2.3, .20, 3.1), airportPoint(4.8, .20, 3.0), airportPoint(7.0, .20, 3.0),
  airportPoint(7.0, .20, 2.24),
  airportPoint(9.7, .20, 2.24), airportPoint(12.2, .20, 2.24),
  airportPoint(12.2, .20, 3.65), airportPoint(14.5, .20, 3.65), airportPoint(14.55, .20, 2.12),
] as const;
const sourceBox = (minX: number, maxX: number, minZ: number, maxZ: number): Obstacle => ({
  x: 30 + (minZ + maxZ) / 2, z: (minX + maxX) / 2,
  halfWidth: (maxZ - minZ) / 2, halfDepth: (maxX - minX) / 2,
});
export const AIRPORT_SOLIDS: readonly Obstacle[] = [
  // Collision footprints measured from the supplied terminal, not its combined
  // material meshes, whose bounds would close the real passage.
  sourceBox(-7.1, -4.35, 2.8, 3.4), // check-in bench
  sourceBox(-8, 8, -4.54, -4.2), // checkin-back
  sourceBox(-8.08, -7.7, -4.21, 4.53), // checkin-left
  sourceBox(-8, 8, 4.5, 4.65), // checkin-front
  sourceBox(7.7, 8.05, -4.21, 1.65), // checkin-right-before-door
  sourceBox(7.7, 8.05, 2.75, 4.53), // checkin-right-after-door
  sourceBox(7.95, 9.3, 1.49, 1.6), // connector-lower-side
  sourceBox(7.95, 9.3, 2.88, 2.99), // connector-upper-side
  sourceBox(9.24, 15.22, -3.925, -3.785), // Parede lateral-0
  sourceBox(9.24, 15.22, 4.03, 4.17), // Parede lateral.001-0
  sourceBox(9.19, 9.33, -3.88, 1.56), // Parede posterior-0
  sourceBox(9.19, 9.33, 2.92, 4.12), // Parede posterior.001-0
  sourceBox(15.06, 15.31, -3.88, 4.12), // lounge-window-wall
  sourceBox(-5.3, -3.9, -1.55, -0.7), // checkin-counter-0
  sourceBox(-3.2, -1.8, -1.55, -0.7), // checkin-counter-1
  sourceBox(-1.1, 0.3, -1.55, -0.7), // checkin-counter-2
  sourceBox(1.0, 2.4, -1.55, -0.7), // checkin-counter-3
  sourceBox(3.1, 4.5, -1.55, -0.7), // checkin-counter-4
  sourceBox(-5.6, 5.55, -2.86, -2.2), // conveyor-0
  sourceBox(-3.9, -3.2, -2.26, -1.54), // conveyor-1
  sourceBox(-1.8, -1.1, -2.26, -1.54), // conveyor-2
  sourceBox(0.3, 1.0, -2.26, -1.54), // conveyor-3
  sourceBox(2.4, 3.1, -2.26, -1.54), // conveyor-4
  sourceBox(4.5, 5.2, -2.26, -1.54), // conveyor-5
  sourceBox(-7.71, -7.09, -1.92, -1.28), // kiosk-0
  sourceBox(-7.71, -7.09, -0.92, -0.28), // kiosk-1
  sourceBox(-7.71, -7.09, 0.08, 0.72), // kiosk-2
  sourceBox(-7.1, -4.35, 2.8, 3.4), // checkin-seats
  sourceBox(-3.58, 4.99, 0.265, 0.33499999999999996), // queue-belt-0
  sourceBox(-4.99, 3.58, 1.115, 1.1849999999999998), // queue-belt-1
  sourceBox(-3.58, 4.99, 1.965, 2.035), // queue-belt-2
  sourceBox(-5.1000000000000005, -4.8, 0.12999999999999998, 0.47), // queue-post-0
  sourceBox(4.8, 5.1000000000000005, 0.9799999999999999, 1.3199999999999998), // queue-post-1
  sourceBox(-5.1000000000000005, -4.8, 1.83, 2.17), // queue-post-2
  sourceBox(-7.45, -7.15, 1.11, 1.49), // Coluna estrutural-0
  sourceBox(-7.45, -7.15, -2.51, -2.13), // Coluna estrutural.001-0
  sourceBox(7.15, 7.45, 1.11, 1.49), // Coluna estrutural.002-0
  sourceBox(7.15, 7.45, -2.51, -2.13), // Coluna estrutural.003-0
  sourceBox(9.469999999999999, 10.59, -3.305, 0.665), // lounge-seat-row-0
  sourceBox(11.32, 12.440000000000001, -3.305, 0.665), // lounge-seat-row-1
  sourceBox(13.17, 14.290000000000001, -3.305, 0.665), // lounge-seat-row-2
  sourceBox(13.56, 13.9, 0.77, 1.11), // charging-table-0
  sourceBox(11.71, 12.049999999999999, 0.77, 1.11), // charging-table-1
  sourceBox(9.860000000000001, 10.2, 0.77, 1.11), // charging-table-2
  sourceBox(10.78, 11.379999999999999, 3.09, 4.05), // boarding-sign-adjusted
  sourceBox(6.87, 7.53, -3.08, -2.14), // checkin-luggage-0
  sourceBox(6.87, 7.53, -2.58, -1.64), // checkin-luggage-1
  sourceBox(5.69, 6.66, 1.02, 2.13), // checkin-luggage-2
  sourceBox(-4.7, -4.2, 2.91, 3.29), // checkin-luggage-3
  sourceBox(-4.08, -3.62, 3.01, 3.39), // checkin-luggage-4
  sourceBox(4.37, 4.73, 0.47, 0.97), // checkin-luggage-5
  sourceBox(12.69425, 13.06575, -1.50747, -1.02053), // bags_dark_wood-0
  sourceBox(12.50062, 12.95938, 0.55194, 0.98806), // bags_navy_light-0
  sourceBox(10.85172, 11.20828, -2.66447, -2.2155299999999998), // bags_signal_yellow-0
  sourceBox(-4.87, -4.39, -2.17, -1.69), // npc_checkin_01
  sourceBox(1.46, 1.94, -2.17, -1.69), // npc_checkin_02
  sourceBox(13.4, 13.88, 0.63, 1.1099999999999999), // npc_embarque_01
  sourceBox(3.6900000000000004, 4.17, 0.54, 1.02), // npc_passageiro_bagagem
  sourceBox(-6.390000000000001, -5.91, 0.73, 1.21), // npc_passageiro_caminhada
  { x: AIRPORT_PARENTS.father.position.x, z: AIRPORT_PARENTS.father.position.z, halfWidth: .22, halfDepth: .27 },
  { x: AIRPORT_PARENTS.mother.position.x, z: AIRPORT_PARENTS.mother.position.z, halfWidth: .22, halfDepth: .24 },
];
