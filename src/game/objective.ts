import { reachedBreakfast } from './collision';
import type { Point2 } from './layout';

export type BreakfastObjectiveState = 'pending' | 'active' | 'complete';

/** Prototype 01 has one objective, activated after the protagonist stands up. */
export function createBreakfastObjective() {
  let state: BreakfastObjectiveState = 'pending';
  return {
    reset() { state = 'pending'; },
    activate() { if (state === 'pending') state = 'active'; },
    update(point: Point2): boolean {
      if (state !== 'active' || !reachedBreakfast(point)) return false;
      state = 'complete';
      return true;
    },
    get state(): BreakfastObjectiveState { return state; },
  };
}
