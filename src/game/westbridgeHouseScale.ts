/** Metres measured from the supplied GLB, not guessed node scaling. */
export const WB_HOUSE_DOOR_HEIGHT = 2.03;
export const WB_HOST_DOOR_BASE = .40041622519493103;
export const WB_HOST_DOOR_SOURCE_HEIGHT = 1.7585157454013824;
export const WB_HOST_PORCH_SOURCE_CLEARANCE = 2.148;
export const WB_HOST_PORCH_CLEARANCE = 2.40;
export const WB_HOST_PORCH_RISE = WB_HOST_PORCH_CLEARANCE - WB_HOST_PORCH_SOURCE_CLEARANCE;
export const WB_RANCH_FLOOR = .065;
export const WB_RANCH_EAVE = 2.0228049755096436;
export const WB_RANCH_CLEARANCE = 2.60;
export const WB_RANCH_BODY_Y = WB_RANCH_CLEARANCE / (WB_RANCH_EAVE - WB_RANCH_FLOOR);
export const WB_MANSION_FLOOR = .2989;
export const WB_MANSION_SOURCE_STOREY = 1.4829;
export const WB_MANSION_STOREY = 2.40;
export const WB_MANSION_BODY_Y = WB_MANSION_STOREY / WB_MANSION_SOURCE_STOREY;

export type WbHouseFamily = 'host' | 'cozy' | 'ranch' | 'mansion';
export type WbHouseScaleSpec = {
  id: string; family: WbHouseFamily; x: number; z: number; facing: 1 | -1;
  bounds: readonly [number, number, number, number];
};
/** These envelopes contain architecture only: gardens, fences, mailboxes,
 * fountains, lamps, trees and road furniture stay in their original positions. */
export const WB_HOUSE_SCALE_SPECS: readonly WbHouseScaleSpec[] = [
  {id:'HOST_FAMILY_HOUSE_DANIEL_HELEN',family:'host',x:20.0565,z:-15.815,facing:1,bounds:[14.7,27.3,-19.5,-10.5]},
  ...([-57,3] as const).map(x=>({id:`south-cozy-${x}`,family:'cozy' as const,x,z:-15.875,facing:1 as const,bounds:[x-4.6,x+4.6,-19.6,-10.2] as const})),
  ...([-21,40] as const).map(x=>({id:`north-cozy-${x}`,family:'cozy' as const,x,z:15.875,facing:-1 as const,bounds:[x-4.6,x+4.6,10.2,19.6] as const})),
  ...([[-45,-29],[-15,-15],[40,-15]] as const).map(([x,z])=>({id:`south-ranch-${x}`,family:'ranch' as const,x,z,facing:1 as const,bounds:[x-6.4,x+6.4,z-2.8,z+3] as const})),
  ...([[-61,15],[-1,17],[60,16]] as const).map(([x,z])=>({id:`north-ranch-${x}`,family:'ranch' as const,x,z,facing:-1 as const,bounds:[x-6.4,x+6.4,z-3,z+2.8] as const})),
  {id:'south-mansion-59',family:'mansion',x:59,z:-17.86,facing:1,bounds:[52.7,65.3,-20.1,-14.3]},
  ...([-42,20] as const).map(x=>({id:`north-mansion-${x}`,family:'mansion' as const,x,z:17.86,facing:-1 as const,bounds:[x-6.3,x+6.3,14.3,20.1] as const})),
];
