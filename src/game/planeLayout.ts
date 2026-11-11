/** Authored cabin coordinates: glTF's handedness root is retained, then
 * the long aircraft is rotated so the supplied seat faces world +Z. */
export const PLANE_MODEL = { source: '/models/aviao_intercambio.glb',
  position: { x: 58, y: 0, z: -12.39 }, yaw: -Math.PI / 2 } as const;
export const PLANE_CAMERA = { fov: .7175413209450974, minZ: .035, maxZ: 8000 } as const;
export const PLANE = { minX: 54.84, maxX: 61.16, minZ: -30.9, maxZ: 24.8, floor: 0, ceiling: 2.49 } as const;
export const PLANE_SEAT = { position: { x: 55.42, y: 1.17, z: -2 }, yaw: .04335695, pitch: .13 } as const;
export const PLANE_LOOK_LIMITS = { centerYaw: PLANE_SEAT.yaw, minYaw: -1.55, maxYaw: .85, minPitch: -.38, maxPitch: .30 } as const;
// The nearest real oval gives the authored broadside wing view. Let the head
// turn left naturally, then lean slightly toward the inside of that opening.
const windowTarget = { x: 55.098, y: 1.10, z: -1.946641 } as const;
const focusPosition = { x: 55.28, y: 1.10, z: -1.96 } as const;
export const PLANE_WINDOW = {
  target: windowTarget,
  focusPose: { position: focusPosition,
    yaw: Math.atan2(windowTarget.x - focusPosition.x, windowTarget.z - focusPosition.z),
    pitch: -Math.atan2(windowTarget.y - focusPosition.y,
      Math.hypot(windowTarget.x - focusPosition.x, windowTarget.z - focusPosition.z)),
  },
} as const;
