/** The gate cannot skip the parents' conversation or its closing gesture. */
export function canBoardAtAirport(mission: string, completed: readonly string[]): boolean {
  return mission === 'airport-gate' && completed.includes('airport-farewell');
}

export const GARAGE_EXIT_TIMING = { visible: 1.05, fade: .85 } as const;
export function sampleGarageExit(seconds: number) {
  const elapsed = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const fade = Math.max(0, Math.min(1, (elapsed - GARAGE_EXIT_TIMING.visible) / GARAGE_EXIT_TIMING.fade));
  return { fade, finished: elapsed >= GARAGE_EXIT_TIMING.visible + GARAGE_EXIT_TIMING.fade };
}
export const AIRPORT_FAREWELL_DURATION = 2.1;
export function farewellGesture(seconds: number): number {
  const progress = Math.max(0, Math.min(1, seconds / AIRPORT_FAREWELL_DURATION));
  return Math.sin(progress * Math.PI);
}
