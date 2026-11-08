import type { Obstacle } from './types';
import type { Point2, Point3 } from './layout';
import { areParentsInKitchen } from './parentsDeparture';

/** Metres on the existing kitchen floor. Geometry and collision share these
 * footprints; height is measured from the floor to the furniture's top. */
export const KITCHEN_AUTHORED_FURNITURE = {
  table: { x: 0, z: 18.7, width: 2.65, depth: 1.6, height: .80, tabletopY: .80, rotation: 0 },
  fridge: { x: -3.65, z: 21.9, width: 1.0, depth: .78, height: 1.95, rotation: 0 },
  stove: { x: -1.65, z: 22.15, width: .92, depth: .75, height: .90, rotation: 0 },
  backCabinetLeft: { x: -2.65, z: 22.2, width: .95, depth: .7, height: .90, rotation: 0 },
  backCabinetRight: { x: 1.65, z: 22.2, width: 5.2, depth: .7, height: .90, rotation: 0 },
  returnCabinet: { x: 4.27, z: 21.1, width: .62, depth: 1.5, height: .91, rotation: 0 },
  sideboard: { x: -4.45, z: 18.5, width: .65, depth: 2.25, height: .85, rotation: 0 },
  frontChair: { x: -.7, z: 17.65, width: .52, depth: .55, height: .94, rotation: 0 },
  rightChair: { x: 1.82, z: 18.7, width: .55, depth: .6, height: .94, rotation: Math.PI / 2 },
} as const;

/** Existing pieces are relocated rigidly, never scaled to make the room fit. */
export const COMPACT_KITCHEN = { minX: -3.2, maxX: 3.9, startZ: 12, coreStartZ: 15.8, endZ: 21.15, floor: 0 } as const;
/** Closed door on the kitchen side, clearly left of the refrigerator in the
 * reference view. No new room or passage is built behind it. */
export const KITCHEN_ENTRY_DOOR = { x: -1.30, z: 15.95, width: .84, height: 2.10, depth: .06,
  apertureWidth: .90, apertureHeight: 2.14, approach: { x: -1.30, z: 16.40 } } as const;
export const KITCHEN_PLACEMENTS = {
  back: { from: { x: 0, z: 0 }, to: { x: -1.15, z: -1.65 }, yaw: 0 },
  left: { from: { x: -2.65, z: 22.1 }, to: { x: -2.68, z: 18.2 }, yaw: -Math.PI / 2 },
  table: { from: { x: 0, z: 0 }, to: { x: 0, z: -.8 }, yaw: 0 },
  sideboard: { from: { x: -4.45, z: 18.5 }, to: { x: 3.55, z: 18.1 }, yaw: Math.PI },
  return: { from: { x: 4.27, z: 21.1 }, to: { x: 3.55, z: 20.3 }, yaw: 0 },
} as const;
export type KitchenPlacement = typeof KITCHEN_PLACEMENTS[keyof typeof KITCHEN_PLACEMENTS];
export function placeKitchenPoint(point: Point2, placement: KitchenPlacement): Point2 {
  const x = point.x - placement.from.x, z = point.z - placement.from.z;
  return { x: placement.to.x + Math.cos(placement.yaw) * x + Math.sin(placement.yaw) * z,
    z: placement.to.z - Math.sin(placement.yaw) * x + Math.cos(placement.yaw) * z };
}
const placementFor = (key: keyof typeof KITCHEN_AUTHORED_FURNITURE): KitchenPlacement =>
  ['fridge', 'stove', 'backCabinetLeft'].includes(key) ? KITCHEN_PLACEMENTS.left :
  key === 'backCabinetRight' ? KITCHEN_PLACEMENTS.back : key === 'returnCabinet' ? KITCHEN_PLACEMENTS.return :
  key === 'sideboard' ? KITCHEN_PLACEMENTS.sideboard : KITCHEN_PLACEMENTS.table;
export const KITCHEN_FURNITURE = Object.fromEntries(Object.entries(KITCHEN_AUTHORED_FURNITURE).map(([key, item]) => {
  const placement = placementFor(key as keyof typeof KITCHEN_AUTHORED_FURNITURE);
  return [key, { ...item, ...placeKitchenPoint(item, placement), rotation: item.rotation + placement.yaw }];
})) as { [K in keyof typeof KITCHEN_AUTHORED_FURNITURE]: Omit<typeof KITCHEN_AUTHORED_FURNITURE[K], 'x' | 'z' | 'rotation'> & { x: number; z: number; rotation: number } };

/** Player-only seat movement can cross the designated chair's solid footprint;
 * ordinary walking remains outside it and the stand point is free floor. */
export const BREAKFAST_SEAT = {
  approach: { x: -.7, z: 16.20 } satisfies Point2,
  position: { x: -.7, y: 1.22, z: 16.85 } satisfies Point3,
  stand: { x: -.7, y: 1.65, z: 16.20 } satisfies Point3,
  lookTarget: { x: -.5, y: 1.42, z: 18.55 } satisfies Point3,
} as const;

/** Body roots stay on the floor. The seated father's height already includes
 * his chair; eye/interaction anchors remain useful when meshes are rebuilt. */
export const PARENT_ANCHORS = {
  mother: {
    position: { x: -1.55, y: 0, z: 18.25 }, yaw: 2.9, height: 1.66,
    eye: { x: -1.55, y: 1.55, z: 18.25 },
    interaction: { x: -1.55, y: 1.55, z: 18.25 },
    footprint: { width: .5, depth: .46 }, seated: false,
  },
  father: {
    position: { x: 1.28, y: 0, z: 19.05 }, yaw: 3.4, height: 1.48, seatY: .46,
    eye: { x: 1.28, y: 1.35, z: 19.05 },
    interaction: { x: 1.28, y: 1.35, z: 19.05 },
    footprint: { width: .65, depth: .85 }, seated: true,
  },
} as const;

/** Father includes his chair, so it must not be added as a second obstacle. */
export const KITCHEN_SOLIDS: readonly Obstacle[] = [
  ...Object.values(KITCHEN_FURNITURE).map(item => ({
    x: item.x, z: item.z, halfWidth: item.width / 2, halfDepth: item.depth / 2, rotation: item.rotation,
  })),
  ...Object.values(PARENT_ANCHORS).map(parent => ({
    x: parent.position.x, z: parent.position.z,
    halfWidth: parent.footprint.width / 2, halfDepth: parent.footprint.depth / 2, rotation: parent.yaw,
    enabled: areParentsInKitchen,
  })),
  // The father leaves, but his existing wooden chair stays in the kitchen.
  { x: PARENT_ANCHORS.father.position.x, z: PARENT_ANCHORS.father.position.z,
    halfWidth: .47 / 2, halfDepth: .46 / 2, rotation: PARENT_ANCHORS.father.yaw },
];
