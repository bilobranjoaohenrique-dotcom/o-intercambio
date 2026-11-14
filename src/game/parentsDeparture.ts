import { FAMILY_CAR } from './garageLayout';

export type ParentsLocation = 'kitchen' | 'car' | 'airport';
const carSeat = (x: number) => ({
  position: { x: FAMILY_CAR.x + Math.cos(FAMILY_CAR.yaw) * x + Math.sin(FAMILY_CAR.yaw) * .10,
    y: 0, z: FAMILY_CAR.z - Math.sin(FAMILY_CAR.yaw) * x + Math.cos(FAMILY_CAR.yaw) * .10 },
  yaw: FAMILY_CAR.yaw,
});
export const CAR_PARENT_ANCHORS = { father: carSeat(-.365), mother: carSeat(.365) } as const;

/** Parent placement is derived from the existing saved quest, never a second
 * checkpoint that could disagree with the suitcase or repeat breakfast. */
export function parentsLocationForProgress(mission: string, completed: readonly string[]): ParentsLocation {
  if (['airport-farewell', 'airport-gate', 'plane-seat', 'find-host', 'westbridge-ride', 'westbridge-explore', 'complete'].includes(mission)) return 'airport';
  // Finishing breakfast only asks the player to pack. The parents stay at the
  // table until that objective is completed, including after a checkpoint load.
  return completed.includes('pack-suitcase') ||
    ['enter-car', 'car-ready'].includes(mission) ? 'car' : 'kitchen';
}
let location: ParentsLocation = 'kitchen';
export const areParentsInKitchen = () => location === 'kitchen';
export const getParentsLocation = () => location;
export function setParentsLocationState(value: ParentsLocation) { location = value; }
