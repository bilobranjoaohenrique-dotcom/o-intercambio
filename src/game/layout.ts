/** Metres; Babylon's left-handed +Z points from the bedroom toward the stairs. */
export type Point2 = { x: number; z: number };
export type Point3 = Point2 & { y: number };
export const ROOM = { minX: -3.2, maxX: 3.2, minZ: -3.1, maxZ: 3.3, floor: 3, ceiling: 5.7 } as const;
export const HALL = { minX: .95, maxX: 3.05, startZ: 3.3, stairZ: 6.4, endZ: 12.1 } as const;
export const STAIRS = { startZ: 6.4, endZ: 11.2, topY: 3, bottomY: 0, steps: 16 } as const;
export const KITCHEN = { minX: -4.8, maxX: 4.8, startZ: 12, endZ: 22.8, floor: 0 } as const;
export const CHAPTER_ZONES = {
  airport: { minX: 24, maxX: 36, minZ: -6, maxZ: 6 },
  plane: { minX: 52, maxX: 64, minZ: -6, maxZ: 6 },
  town: { minX: 80, maxX: 92, minZ: -6, maxZ: 6 },
} as const;
export const DOOR = { hingeX: 1.45, z: 3.3, width: 1.05, height: 2.13, thickness: .07, openAngle: -Math.PI / 2 } as const;
export const EYE_HEIGHT = 1.65;
export const BED_POSE = { position: { x: -2.15, y: 3.86, z: -1.95 }, yaw: .05, pitch: -1.36, roll: .015 } as const;
export const STANDING_POSE = { position: { x: -1.25, y: 4.65, z: -1.1 }, yaw: 2.1, pitch: .08, roll: 0 } as const;
export const FURNITURE = {
  bed: { x: -2.15, z: -1.4, width: 1.12, depth: 2.3, height: .54 },
  desk: { x: 1.02, z: -2.59, width: 2.04, depth: .7, height: .79 },
  wardrobe: { x: -2.8, z: 1.48, width: .64, depth: 2.0, height: 2.13 },
  shelf: { x: 2.83, z: -.6, width: .55, depth: 1.4, height: 1.3 },
  chair: { x: .99, z: -1.6, width: .58, depth: .58, height: .94 },
  suitcase: { x: .44, z: 1.4, width: .82, depth: .55, height: .24 },
  backpack: { x: -2.02, z: 2.5, width: .38, depth: .31, height: .48 },
} as const;
export const OBJECTS = {
  calendar: { x: -.35, y: 4.48, z: -3.045 },
  photo: { x: 3.14, y: 4.38, z: 1.1 },
  switch: { x: 2.86, y: 4.23, z: 3.245 },
  mother: { x: -1.2, y: 1.25, z: 17.3 },
} as const;
