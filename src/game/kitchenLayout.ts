import type { Obstacle } from './types';

/** Metres on the existing kitchen floor. Geometry and collision share these
 * footprints; height is measured from the floor to the furniture's top. */
export const KITCHEN_FURNITURE = {
  table: { x: 0, z: 18.7, width: 2.65, depth: 1.6, height: .80, tabletopY: .80, rotation: 0 },
  fridge: { x: -3.65, z: 21.9, width: 1.0, depth: .78, height: 1.95, rotation: 0 },
  stove: { x: -1.65, z: 22.15, width: .92, depth: .75, height: .90, rotation: 0 },
  backCabinetLeft: { x: -2.65, z: 22.2, width: .95, depth: .7, height: .90, rotation: 0 },
  backCabinetRight: { x: 1.65, z: 22.2, width: 5.2, depth: .7, height: .90, rotation: 0 },
  returnCabinet: { x: 4.27, z: 21.1, width: .62, depth: 1.5, height: .91, rotation: 0 },
  sideboard: { x: -4.45, z: 18.5, width: .65, depth: 2.25, height: .85, rotation: 0 },
  frontChair: { x: -.7, z: 17.65, width: .52, depth: .55, height: .94, rotation: 0 },
  rightChair: { x: 1.82, z: 18.7, width: .55, depth: .6, height: .94, rotation: Math.PI / 2 },
  suitcase: { x: 3.25, z: 15.6, width: .92, depth: .55, height: .58, rotation: 0 },
} as const;

/** Body roots stay on the floor. The seated father's height already includes
 * his chair; eye/interaction anchors remain useful when meshes are rebuilt. */
export const PARENT_ANCHORS = {
  mother: {
    position: { x: -1.55, y: 0, z: 18.95 }, yaw: 2.9, height: 1.66,
    eye: { x: -1.55, y: 1.55, z: 18.95 },
    interaction: { x: -1.55, y: 1.55, z: 18.95 },
    footprint: { width: .5, depth: .46 }, seated: false,
  },
  father: {
    position: { x: 1.28, y: 0, z: 19.85 }, yaw: 3.4, height: 1.48, seatY: .46,
    eye: { x: 1.28, y: 1.35, z: 19.85 },
    interaction: { x: 1.28, y: 1.35, z: 19.85 },
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
  })),
];
