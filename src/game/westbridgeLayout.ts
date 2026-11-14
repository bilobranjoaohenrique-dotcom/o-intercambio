import type { Point2, Point3 } from './layout';
import { EYE_HEIGHT } from './layout';
import type { Obstacle } from './types';

/** A container translation isolates the neighbourhood; authored nodes stay intact.
 * Babylon's default glTF handedness root mirrors source X, not source Z. */
export const WB_ORIGIN_X = 500;
export const wbPoint = (x: number, y: number, z: number): Point3 => ({ x: WB_ORIGIN_X - x, y, z });
export const WB_SOURCE = '/models/westbridge.glb';
export const WB_HOST_ID = 'HOST_FAMILY_HOUSE_DANIEL_HELEN';
export const WB_HOST_DOOR = wbPoint(20.0565, 1.28, -12.665);
export const WB_MAILBOX = wbPoint(27.2, 1.12, -5.48);
export const WB_PORCH_HEIGHT = .371855;
export const WB_HOST_APPROACH = wbPoint(20.0565, WB_PORCH_HEIGHT + EYE_HEIGHT, -11.7);
export const WB_PARKED_CAR = wbPoint(24.9, .144, -8.7);
export const WB_PARKED_YAW = Math.PI;
export const WB_WALK_SPAWN = wbPoint(22.65, .0595 + EYE_HEIGHT, -7.55);
export const WB_WALK_ROUTE: readonly Point3[] = [
  WB_WALK_SPAWN, wbPoint(20.0565, .1265 + EYE_HEIGHT, -7.55),
  wbPoint(20.0565, .1265 + EYE_HEIGHT, -10.4), WB_HOST_APPROACH,
];

// The route follows the south/eastbound lane, then a measured five-metre right
// turn into the original driveway. It is sampled densely enough for a smooth
// vehicle spline; no axis switch or visible world-space teleport is needed.
const road = (x: number) => wbPoint(x, .034, -1.6);
const turn = Array.from({ length: 6 }, (_, i) => {
  const angle = (i + 1) * Math.PI / 12;
  const x = 19.9 + 5 * Math.sin(angle), z = -6.6 + 5 * Math.cos(angle);
  const ramp = Math.max(0, Math.min(1, (-z - 3.15) / 1.8));
  const smooth = ramp * ramp * (3 - 2 * ramp);
  return wbPoint(x, .034 + .110 * smooth, z);
});
export const WB_DRIVE_ROUTE: readonly Point3[] = [
  road(-62), road(-42), road(-22), road(-2), road(14.9), road(17.4), road(19.9),
  ...turn, wbPoint(24.9, .144, -7.7), WB_PARKED_CAR,
];

export type WbRect = { minX: number; maxX: number; minZ: number; maxZ: number };
export const wbRect = (minX: number, maxX: number, minZ: number, maxZ: number): WbRect =>
  ({ minX: WB_ORIGIN_X - maxX, maxX: WB_ORIGIN_X - minX, minZ, maxZ });
export const wbBox = (minX: number, maxX: number, minZ: number, maxZ: number): Obstacle => {
  const rect = wbRect(minX, maxX, minZ, maxZ);
  return { x: (rect.minX + rect.maxX) / 2, z: (rect.minZ + rect.maxZ) / 2,
    halfWidth: (rect.maxX - rect.minX) / 2, halfDepth: (rect.maxZ - rect.minZ) / 2 };
};

/** One inhabited street and its existing side-road approach, before the raised
 * bridge. The scene can mark these three street ends with local road furniture. */
export const WB_WALK_AREAS: readonly WbRect[] = [
  wbRect(-72, 70, -24, 24), wbRect(-39, -25, -39.8, -4),
];
export const WB_BOUNDARY_POINTS = [wbPoint(-71.5, 0, 0), wbPoint(69.5, 0, 0), wbPoint(-32, 0, -39.2)] as const;

/** Compact footprints measured from the source components, not their broad
 * material-group bounds (which can span several separate buildings). */
export const WB_BUILDING_SOLIDS: readonly Obstacle[] = [
  wbBox(15.3829, 23.0779, -18.9544, -12.6757), // host main house
  wbBox(22.8175, 26.8546, -18.4823, -13.1478), // host garage
  wbBox(15.855, 18.357, -12.8409, -11.9912), // front bay
  wbBox(14.84, 15.5481, -17.3493, -16.1691), // chimney projection
  wbBox(-61.0274, -52.9726, -19.0397, -12.711),
  wbBox(-1.0274, 7.0274, -19.0397, -12.711),
  wbBox(-25.0274, -16.9726, 12.711, 19.0397),
  wbBox(35.9726, 44.0274, 12.711, 19.0397),
  wbBox(53.0681, 64.9319, -19.8011, -15.9226),
  wbBox(-47.9319, -36.0681, 15.9226, 19.8011),
  wbBox(14.0681, 25.9319, 15.9226, 19.8011),
  wbBox(-50.9441, -39.0737, -31.3237, -26.5542),
  wbBox(-20.9441, -9.0737, -17.3237, -12.5542),
  wbBox(34.0737, 45.9441, -17.3237, -12.5542),
  wbBox(-66.9441, -55.0737, 12.5542, 17.3237),
  wbBox(-6.8782, 4.9441, 14.5542, 19.3237),
  wbBox(54.1218, 65.9441, 13.5542, 18.3237),
];
export const WB_HOST_FENCES: readonly Obstacle[] = [
  wbBox(12.315, 17.285, -7.185, -7.015),
  wbBox(27.115, 29.685, -7.185, -7.015),
  wbBox(18.6639, 18.8527, -12.7701, -11.1414),
  wbBox(21.2604, 21.4492, -12.7701, -11.1414),
];
/** The other ten visible cedar fences, measured from mesh37/South_Lots and
 * mesh94/North_Lots. Each box covers 19 original rail/picket/end-post components,
 * including the .17m end posts, rather than blocking the entire garden lot. */
export const WB_LOT_FENCES: readonly Obstacle[] = [
  wbBox(-53.585, -48.615, -8.185, -8.015),
  wbBox(-41.585, -36.615, -22.185, -22.015),
  wbBox(-11.585, -6.615, -8.185, -8.015),
  wbBox(6.415, 11.385, -8.185, -8.015),
  wbBox(43.415, 48.385, -8.185, -8.015),
  wbBox(-57.585, -52.615, 8.015, 8.185),
  wbBox(-17.585, -12.615, 8.015, 8.185),
  wbBox(2.415, 7.385, 10.015, 10.185),
  wbBox(43.415, 48.385, 8.015, 8.185),
  wbBox(63.415, 68.385, 9.015, 9.185),
];
export const WB_HOST_PATH_LIGHTS: readonly Point3[] = [
  wbPoint(19.1, .44, -6.4), wbPoint(21.1, .44, -6.4),
  wbPoint(19.1, .44, -9), wbPoint(21.1, .44, -9),
];

// Source components at shin height: brown trunks/poles plus white hydrants and
// mailboxes. They are deliberately small blockers, not canopy-sized boxes.
const sourceSmallSolids: readonly (readonly [number, number, number, number])[] = [
  [-64.0000, 7.3075, 0.1462, 0.1425],
  [-44.0000, 7.3075, 0.1462, 0.1425],
  [-19.0000, 7.3075, 0.1462, 0.1425],
  [1.0000, 7.3075, 0.1462, 0.1425],
  [25.0000, 7.3075, 0.1462, 0.1425],
  [46.0000, 7.3075, 0.1462, 0.1425],
  [67.0000, 7.3075, 0.1462, 0.1425],
  [-63.4000, -9.5066, 0.1306, 0.1273],
  [-51.4000, -23.5066, 0.1306, 0.1274],
  [-21.4000, -9.5067, 0.1316, 0.1284],
  [-3.3999, -9.5065, 0.1284, 0.1253],
  [33.6000, -9.5084, 0.1652, 0.1610],
  [52.6001, -10.5086, 0.1714, 0.1672],
  [14.9001, -10.2078, 0.1536, 0.1498],
  [28.2001, -19.3099, 0.1962, 0.1914],
  [-67.3999, 9.4912, 0.1738, 0.1695],
  [-48.4000, 10.4933, 0.1327, 0.1295],
  [-27.3999, 9.4925, 0.1477, 0.1441],
  [-7.3999, 11.4909, 0.1803, 0.1758],
  [13.6000, 10.4909, 0.1803, 0.1758],
  [33.6000, 9.4929, 0.1406, 0.1372],
  [53.6001, 10.4910, 0.1765, 0.1722],
  [-64.0000, 5.8464, 0.1296, 0.1296],
  [-44.0000, 5.8464, 0.1296, 0.1296],
  [-24.0000, -5.5500, 0.1980, 0.1665],
  [-19.0000, 5.8464, 0.1296, 0.1296],
  [1.0000, 5.8464, 0.1296, 0.1296],
  [25.0000, 5.8464, 0.1296, 0.1296],
  [35.0000, 5.6500, 0.1980, 0.1665],
  [46.0000, 5.8464, 0.1296, 0.1296],
  [67.0000, 5.8464, 0.1296, 0.1296],
  [-50.8000, -5.4800, 0.1311, 0.2300],
  [-38.8000, -5.4800, 0.1311, 0.2300],
  [-8.8000, -5.4800, 0.1311, 0.2300],
  [9.2000, -5.4800, 0.1311, 0.2300],
  [46.2000, -5.4800, 0.1311, 0.2300],
  [65.2000, -5.4800, 0.1311, 0.2300],
  [27.2000, -5.4800, 0.1311, 0.2300],
  [-67.2000, 5.4800, 0.1311, 0.2300],
  [-48.2000, 5.4800, 0.1311, 0.2300],
  [-27.2000, 5.4800, 0.1311, 0.2300],
  [-7.2000, 5.4800, 0.1311, 0.2300],
  [13.8000, 5.4800, 0.1311, 0.2300],
  [33.8000, 5.4800, 0.1311, 0.2300],
  [53.8000, 5.4800, 0.1311, 0.2300],
];
export const WB_SMALL_SOLIDS: readonly Obstacle[] = [
  ...sourceSmallSolids.map(([x, z, halfWidth, halfDepth]) => ({ ...wbPoint(x, 0, z), halfWidth, halfDepth })),
  ...WB_HOST_PATH_LIGHTS.map(p => ({ x: p.x, z: p.z, halfWidth: .04, halfDepth: .04 })),
];
export const WB_STATIC_SOLIDS: readonly Obstacle[] = [...WB_BUILDING_SOLIDS, ...WB_HOST_FENCES, ...WB_LOT_FENCES, ...WB_SMALL_SOLIDS];

export type WbFloor = WbRect & { height: number; surface: 'asphalt' | 'concrete' | 'grass' | 'wood' };
const floor = (minX: number, maxX: number, minZ: number, maxZ: number, height: number, surface: WbFloor['surface']): WbFloor =>
  ({ ...wbRect(minX, maxX, minZ, maxZ), height, surface });
/** High treads come first. The existing player smooths eye height after walking. */
export const WB_FLOORS: readonly WbFloor[] = [
  floor(18.6403, 21.4728, -12.7111, -11.0942, WB_PORCH_HEIGHT, 'wood'),
  floor(19.4664, 20.6466, -11.1414, -10.8582, .2777, 'concrete'),
  floor(19.4664, 20.6466, -11.0942, -10.6221, .1715, 'concrete'),
  floor(23.175, 26.625, -12.53, -4.15, .144, 'concrete'),
  floor(19.4, 20.7, -11.55, -4.25, .1265, 'concrete'),
  floor(21.75, 23.95, -11.175, -10.125, .145, 'concrete'),
  floor(-76.5, 76.5, 4.2, 4.58, .1425, 'concrete'),
  floor(-76, -36.2, -4.58, -4.2, .1425, 'concrete'),
  floor(-27.8, 76, -4.58, -4.2, .1425, 'concrete'),
  floor(-76.5, 76.5, 4.58, 5.62, .1055, 'concrete'),
  floor(-76, -36.2, -5.62, -4.58, .1055, 'concrete'),
  floor(-27.8, 76, -5.62, -4.58, .1055, 'concrete'),
  floor(-37.55, -36.2, -39.8, -4.2, .1455, 'concrete'),
  floor(-27.8, -26.45, -39.8, -4.2, .1455, 'concrete'),
  floor(-76.5, 76.5, -4.2, 4.2, .034, 'asphalt'),
  floor(-36.2, -27.8, -39.8, -2, .034, 'asphalt'),
  floor(-72, 70, -24, -6.1, .0595, 'grass'),
  floor(-72, 70, 6.1, 24, .0595, 'grass'),
];
export const withinWbRect = (rect: WbRect, point: Point2) => point.x >= rect.minX && point.x <= rect.maxX && point.z >= rect.minZ && point.z <= rect.maxZ;
