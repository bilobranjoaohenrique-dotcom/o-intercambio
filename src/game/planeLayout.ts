/** Compact economy cabin inside the existing chapter's plane zone. */
export const PLANE = { minX: 55.78, maxX: 60.22, minZ: -3.15, maxZ: 4.65, floor: 0, ceiling: 2.48 } as const;
export const PLANE_SEAT = { position: { x: 56.4, y: 1.18, z: -2 }, yaw: 0, pitch: .13 } as const;
export const PLANE_LOOK_LIMITS = { centerYaw: PLANE_SEAT.yaw, minYaw: -1.05, maxYaw: .85, minPitch: -.38, maxPitch: .30 } as const;
const windowTarget = { x: 55.80, y: 1.30, z: -1.07 } as const;
const focusPosition = { x: 56.03, y: 1.24, z: -1.25 } as const;
export const PLANE_WINDOW = {
  target: windowTarget,
  focusPose: { position: focusPosition,
    yaw: Math.atan2(windowTarget.x - focusPosition.x, windowTarget.z - focusPosition.z),
    pitch: -Math.atan2(windowTarget.y - focusPosition.y,
      Math.hypot(windowTarget.x - focusPosition.x, windowTarget.z - focusPosition.z)),
  },
} as const;
