/** The existing travel bag is the only carryable item needed for this scene.
 * Its held state is restored from the chapter's completed packing objective. */
let travelBagTaken = false;
export const isTravelBagTaken = () => travelBagTaken;
export function setTravelBagTaken(value: boolean) { travelBagTaken = value; }
export function canEnterFamilyCar(mission: string, completed: readonly string[]): boolean {
  return mission === 'enter-car' && completed.includes('pack-suitcase');
}
