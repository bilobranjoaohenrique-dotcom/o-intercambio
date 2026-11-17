import type { Point3 } from './layout';
import { HOST_HOUSE_GROUND, HOST_HOUSE_ORIGIN_X } from './hostHouseLayout';
import { WB_HOST_DOOR } from './westbridgeLayout';
import { WB_HOST_DOOR_BASE } from './westbridgeHouseScale';

/** One rigid, metre-for-metre correspondence with the actual blue-house door.
 * The separate interior is deeper/wider than the supplied exterior; the world
 * is never stretched or rearranged to conceal that documented floorplan gap. */
export const HOST_HOUSE_EXTERIOR_FRAME = {
  exteriorAnchor: { x: WB_HOST_DOOR.x, y: WB_HOST_DOOR_BASE, z: WB_HOST_DOOR.z },
  interiorAnchor: { x: HOST_HOUSE_ORIGIN_X - 48, y: HOST_HOUSE_GROUND, z: 37 },
  rotationY: Math.PI / 2,
  scale: 1,
} as const;

export function westbridgeToHostHouse(point: Point3): Point3 {
  const { exteriorAnchor: a, interiorAnchor: b } = HOST_HOUSE_EXTERIOR_FRAME;
  return { x: b.x + point.z - a.z, y: b.y + point.y - a.y, z: b.z - point.x + a.x };
}

export function hostHouseToWestbridge(point: Point3): Point3 {
  const { exteriorAnchor: a, interiorAnchor: b } = HOST_HOUSE_EXTERIOR_FRAME;
  return { x: a.x - point.z + b.z, y: a.y + point.y - b.y, z: a.z + point.x - b.x };
}

/** Directions use the same quarter turn but never inherit anchor translation. */
export function westbridgeDirectionToHostHouse(direction: Point3): Point3 {
  return { x: direction.z, y: direction.y, z: -direction.x };
}

export function hostHouseDirectionToWestbridge(direction: Point3): Point3 {
  return { x: -direction.z, y: direction.y, z: direction.x };
}

/** Reference pose for comparing a window capture against the actual outdoor
 * scene. Both camera position and viewing direction use the inverse frame. */
export function hostHouseCameraToWestbridge(position: Point3, forward: Point3) {
  return { position: hostHouseToWestbridge(position), forward: hostHouseDirectionToWestbridge(forward) };
}
