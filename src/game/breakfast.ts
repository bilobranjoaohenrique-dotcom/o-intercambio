import type { Point3 } from './layout';

export type BreakfastState = 'standing' | 'sitting' | 'seated' | 'standing-up';
type Pose = { position: Point3; yaw: number; pitch: number };
type Camera = { position: Point3 & { set(x: number, y: number, z: number): unknown };
  rotation: { x: number; y: number; z: number } };
type Controls = { clearInput(): void; adoptCameraPose(): void; setMovementEnabled(value: boolean): void };
type Seat = { position: Point3; stand: Point3; lookTarget: Point3 };
const DURATION = 1.15;
const blend = (from: number, to: number, amount: number) => from + (to - from) * amount;

/** A short physical camera motion over the chair. No fade, scene switch,
 * protagonist body, or change to the normal walking collision is involved. */
export function createBreakfastSeat(camera: Camera, controls: Controls, seat: Seat) {
  let state: BreakfastState = 'standing', elapsed = 0;
  let from: Pose | null = null, to: Pose | null = null;
  function begin(next: 'sitting' | 'standing-up', point: Point3, faceParents: boolean) {
    controls.clearInput(); controls.setMovementEnabled(false);
    from = { position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      yaw: camera.rotation.y, pitch: camera.rotation.x };
    const dx = seat.lookTarget.x - point.x, dz = seat.lookTarget.z - point.z;
    const desired = Math.atan2(dx, dz);
    to = { position: { ...point },
      yaw: faceParents ? from.yaw + Math.atan2(Math.sin(desired - from.yaw), Math.cos(desired - from.yaw)) : from.yaw,
      pitch: faceParents ? -Math.atan2(seat.lookTarget.y - point.y, Math.hypot(dx, dz)) : from.pitch };
    state = next; elapsed = 0;
  }
  return {
    sit() { if (state !== 'standing') return false; begin('sitting', seat.position, true); return true; },
    stand() { if (state !== 'seated') return false; begin('standing-up', seat.stand, false); return true; },
    update(seconds: number): 'seated' | 'standing' | null {
      if (!from || !to || (state !== 'sitting' && state !== 'standing-up') || !Number.isFinite(seconds) || seconds <= 0) return null;
      elapsed = Math.min(DURATION, elapsed + Math.min(.1, seconds));
      const t = elapsed / DURATION, smooth = t * t * t * (10 + t * (-15 + 6 * t));
      camera.position.set(blend(from.position.x, to.position.x, smooth), blend(from.position.y, to.position.y, smooth), blend(from.position.z, to.position.z, smooth));
      camera.rotation.y = blend(from.yaw, to.yaw, smooth); camera.rotation.x = blend(from.pitch, to.pitch, smooth); camera.rotation.z = 0;
      controls.adoptCameraPose();
      if (elapsed < DURATION) return null;
      state = state === 'sitting' ? 'seated' : 'standing'; from = to = null;
      controls.setMovementEnabled(state === 'standing');
      return state;
    },
    reset() { state = 'standing'; elapsed = 0; from = to = null; controls.setMovementEnabled(true); },
    get state() { return state; },
    get diagnostics() { return { state, progress: from ? elapsed / DURATION : state === 'seated' ? 1 : 0 }; },
  };
}

/** Text has a bounded reading interval; waiting on a choice must not keep a
 * parent's jaw moving forever. Advancing a line cancels its interval at once. */
export function breakfastSpeechDuration(text: string): number {
  return Math.min(6, Math.max(2.2, 1.2 + text.length * .04));
}
