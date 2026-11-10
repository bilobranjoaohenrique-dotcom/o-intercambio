/** Metres; Babylon's left-handed +Z points from the bedroom toward the stairs. */
export type Point2 = { x: number; z: number };
export type Point3 = Point2 & { y: number };
export const ROOM = { minX: -.15, maxX: 3.05, minZ: -.5, maxZ: 3.3, floor: 3, ceiling: 5.6 } as const;
export const HALL = { minX: .95, maxX: 3.05, startZ: 3.3, stairZ: 7.8, endZ: 12.1 } as const;
export const STAIRS = { minX: 1.4, maxX: 2.3, startZ: 7.8, endZ: 11.8, topY: 3, bottomY: 0, steps: 18 } as const;
export const KITCHEN = { minX: -4.8, maxX: 4.8, startZ: 12, endZ: 22.8, floor: 0 } as const;
export const CHAPTER_ZONES = {
  airport: { minX: 25.8, maxX: 34.5, minZ: -7.7, maxZ: 15.06 },
  plane: { minX: 52, maxX: 64, minZ: -6, maxZ: 6 },
  car: { minX: 40, maxX: 52, minZ: -6, maxZ: 6 },
  town: { minX: 80, maxX: 92, minZ: -6, maxZ: 6 },
} as const;
export const DOOR = { hingeX: 1.45, z: 3.3, width: .8, height: 2.1, thickness: .07, openAngle: -Math.PI / 2 } as const;
export const EYE_HEIGHT = 1.65;
export const BED_POSE = { position: { x: 2.51, y: 3.82, z: -.10 }, yaw: .05, pitch: -1.36, roll: .015 } as const;
export const STANDING_POSE = { position: { x: 1.68, y: 4.65, z: .9 }, yaw: -Math.PI, pitch: .08, roll: 0 } as const;
/** Solid footprints shared by modelling and capsule collision. Wall shelves
 * hang above head height; the central rug adds no invisible obstacle. */
export const FURNITURE = {
  bed: { x: 2.51, z: .65, width: .90, depth: 2, height: .56 },
  desk: { x: .85, z: -.15, width: 1.4, depth: .6, height: .77 },
  wardrobe: { x: .17, z: 1.7, width: .6, depth: 1.8, height: 2.22 },
  chair: { x: .85, z: .65, width: .52, depth: .56, height: .97 },
  bedside: { x: 2.7, z: 2.02, width: .46, depth: .42, height: .59 },
  backpack: { x: 2.42, z: 2.65, width: .34, depth: .27, height: .46 },
} as const;
export const OBJECTS = {
  calendar: { x: .75, y: 4.45, z: 3.245 },
  photo: { x: .53, y: 4.42, z: 1.55 },
  switch: { x: 2.42, y: 4.23, z: 3.245 },
  mother: { x: -1.2, y: 1.25, z: 17.3 },
} as const;
