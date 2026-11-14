import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { EYE_HEIGHT, STANDING_POSE, type Point2, type Point3 } from './layout';
import { floorHeight, moveWithCollisions } from './collision';
import type { Obstacle, Settings } from './types';
import { clampLook, type LookLimits } from './planeSequence';

export const LOOK_RADIANS_PER_PIXEL = .0024;
export const WALK_SPEED = 2.1;
export const RUN_SPEED = 3.25;
const MAX_PITCH = 1.43;
const MOVEMENT_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']);
export type PlayerNavigation = {
  move: typeof moveWithCollisions;
  floorHeight: typeof floorHeight;
};
const DEFAULT_NAVIGATION: PlayerNavigation = { move: moveWithCollisions, floorHeight };

/** Normalized local input in Babylon's left-handed XZ plane. */
export function movementVector(forward: number, right: number, yaw: number, speed: number): Point2 {
  if (![forward, right, yaw, speed].every(Number.isFinite)) return { x: 0, z: 0 };
  const scale = Math.max(1, Math.hypot(forward, right));
  return { x: (right * Math.cos(yaw) + forward * Math.sin(yaw)) * speed / scale,
    z: (forward * Math.cos(yaw) - right * Math.sin(yaw)) * speed / scale };
}

/** Acceleration is expressed in metres/second²; stopping stays brief and firm. */
export function approachVelocity(current: Point2, target: Point2, seconds: number): Point2 {
  if (!Number.isFinite(seconds) || seconds <= 0) return { ...current };
  const dx = target.x - current.x, dz = target.z - current.z, difference = Math.hypot(dx, dz);
  if (!difference) return { ...target };
  const stopping = Math.hypot(target.x, target.z) < Math.hypot(current.x, current.z);
  const amount = Math.min(1, (stopping ? 18 : 14) * seconds / difference);
  return { x: current.x + dx * amount, z: current.z + dz * amount };
}

export function createPlayer(canvas: HTMLCanvasElement, camera: UniversalCamera,
  settings: Settings | (() => Settings), getDynamicObstacles: () => readonly Obstacle[],
  onFootstep?: (running: boolean) => void) {
  const document = canvas.ownerDocument, window = document.defaultView;
  const readSettings = typeof settings === 'function' ? settings : () => settings;
  const keys = new Set<string>();
  let active = false, disposed = false;
  let movementEnabled = true;
  let lookLimits: LookLimits | null = null;
  let navigation: PlayerNavigation = DEFAULT_NAVIGATION;
  let position: Point2 = { x: camera.position.x, z: camera.position.z };
  let velocity: Point2 = { x: 0, z: 0 };
  let yaw = camera.rotation.y, pitch = camera.rotation.x, eyeY = camera.position.y;
  let bobPhase = 0, bob = 0, stepDistance = 0;
  let dragging = false, pointerId: number | null = null, dragX = 0, dragY = 0;

  function clearInput() {
    if (pointerId !== null) {
      try { canvas.releasePointerCapture(pointerId); } catch { /* Capture may already be gone after blur. */ }
    }
    keys.clear(); velocity = { x: 0, z: 0 }; dragging = false; pointerId = null;
  }
  function typing(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    return !!element && (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable);
  }
  function keyDown(event: KeyboardEvent) {
    if (!active || !movementEnabled || disposed || typing(event.target) || event.ctrlKey || event.metaKey || event.altKey || !MOVEMENT_CODES.has(event.code)) return;
    keys.add(event.code); event.preventDefault();
  }
  function keyUp(event: KeyboardEvent) { keys.delete(event.code); }
  function requestPointerLock() {
    if (disposed || document.pointerLockElement === canvas) return;
    try {
      const result = canvas.requestPointerLock?.();
      if (result && typeof result.catch === 'function') void result.catch(() => { /* Mouse dragging remains available. */ });
    } catch { /* Unsupported or denied Pointer Lock uses mouse dragging. */ }
  }
  function pointerDown(event: PointerEvent) {
    if (!active || disposed || event.button !== 0) return;
    dragging = true; pointerId = event.pointerId; dragX = event.clientX; dragY = event.clientY;
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Synthetic/unsupported pointer capture. */ }
    requestPointerLock();
  }
  function pointerUp(event: PointerEvent) {
    if (pointerId !== null && event.pointerId !== pointerId) return;
    dragging = false; pointerId = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* Already released by the browser. */ }
  }
  function mouseMove(event: MouseEvent) {
    if (!active || disposed || document.hidden) return;
    const locked = document.pointerLockElement === canvas;
    if (!locked && !dragging) return;
    const dx = locked ? event.movementX : event.clientX - dragX;
    const dy = locked ? event.movementY : event.clientY - dragY;
    dragX = event.clientX; dragY = event.clientY;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const configured = readSettings().sensitivity;
    const sensitivity = Number.isFinite(configured) ? Math.max(.05, Math.min(5, configured)) : 1;
    let moveYaw = dx * LOOK_RADIANS_PER_PIXEL * sensitivity, movePitch = dy * LOOK_RADIANS_PER_PIXEL * sensitivity;
    if(lookLimits){
      const offset=Math.atan2(Math.sin(yaw-lookLimits.centerYaw),Math.cos(yaw-lookLimits.centerYaw));
      const yawRoom=moveYaw<0?offset-lookLimits.minYaw:lookLimits.maxYaw-offset;
      const pitchRoom=movePitch<0?pitch-lookLimits.minPitch:lookLimits.maxPitch-pitch;
      moveYaw*=Math.min(1,Math.max(.1,yawRoom/.18));movePitch*=Math.min(1,Math.max(.1,pitchRoom/.14));
    }
    yaw += moveYaw;
    pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch + movePitch));
    if(lookLimits){const bounded=clampLook(yaw,pitch,lookLimits);yaw=bounded.yaw;pitch=bounded.pitch;}
    camera.rotation.y = yaw; camera.rotation.x = pitch;
  }
  function pointerLockChange() {
    if (document.pointerLockElement === canvas) dragging = false;
    else clearInput();
  }
  function visibilityChange() { if (document.hidden) clearInput(); }

  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
  document.addEventListener('mousemove', mouseMove);
  document.addEventListener('pointerup', pointerUp);
  document.addEventListener('pointercancel', pointerUp);
  document.addEventListener('pointerlockchange', pointerLockChange);
  document.addEventListener('visibilitychange', visibilityChange);
  canvas.addEventListener('pointerdown', pointerDown);
  window?.addEventListener('blur', clearInput);

  function setActive(enabled: boolean) {
    if (disposed) return;
    active = enabled;
    if (!enabled) {
      clearInput();
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    }
  }
  function adoptCameraPose() {
    if (disposed) return;
    position = { x: camera.position.x, z: camera.position.z };
    yaw = camera.rotation.y; pitch = camera.rotation.x; eyeY = camera.position.y;
    bob = 0; bobPhase = 0; stepDistance = 0; clearInput();
  }
  function activateFromCamera() {
    adoptCameraPose(); active = true;
  }
  function setMovementEnabled(enabled: boolean) {
    movementEnabled = enabled;
    adoptCameraPose();
  }
  function setLookLimits(limits: LookLimits | null){lookLimits=limits;}
  function setNavigation(next: PlayerNavigation | null) {
    if (disposed) return;
    navigation = next ?? DEFAULT_NAVIGATION;
    // Retain the current pose, but not held movement from another region's
    // floor and collision provider.
    adoptCameraPose();
  }
  function applyExternalMotion(point: Point3, yawDelta: number) {
    if (disposed || movementEnabled || ![point.x, point.y, point.z, yawDelta].every(Number.isFinite)) return false;
    // A moving seat translates the existing controller and turns its heading,
    // retaining the player's local look and any unlocked drag gesture.
    position = { x: point.x, z: point.z }; eyeY = point.y; yaw += yawDelta;
    camera.position.set(point.x, point.y, point.z);
    camera.rotation.y = yaw; camera.rotation.x = pitch;
    return true;
  }
  function reset() {
    setActive(false);
    navigation = DEFAULT_NAVIGATION;
    movementEnabled = true;
    lookLimits = null;
    position = { x: STANDING_POSE.position.x, z: STANDING_POSE.position.z };
    eyeY = STANDING_POSE.position.y; yaw = STANDING_POSE.yaw; pitch = STANDING_POSE.pitch;
    camera.position.set(position.x, eyeY, position.z);
    camera.rotation.set(pitch, yaw, STANDING_POSE.roll);
    bob = 0; bobPhase = 0; stepDistance = 0;
  }
  function teleport(point: Point3, heading = 0) {
    if (![point.x,point.y,point.z,heading].every(Number.isFinite)) return;
    clearInput(); position={x:point.x,z:point.z}; eyeY=point.y; yaw=heading; pitch=0;
    bob=0;bobPhase=0;stepDistance=0;
    camera.position.set(point.x,point.y,point.z);camera.rotation.set(0,heading,0);
  }
  function update(seconds: number) {
    if (!active || disposed || document.hidden || !Number.isFinite(seconds) || seconds <= 0) return;
    // Sitting only locks translation. Mouse look still uses the normal input,
    // and standing resumes from the final interpolated camera pose.
    if (!movementEnabled) {
      position = { x: camera.position.x, z: camera.position.z }; eyeY = camera.position.y;
      velocity = { x: 0, z: 0 }; bob = 0;
      return;
    }
    const dt = Math.min(.05, seconds);
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const target = movementVector(Number(keys.has('KeyW')) - Number(keys.has('KeyS')),
      Number(keys.has('KeyD')) - Number(keys.has('KeyA')), yaw, running ? RUN_SPEED : WALK_SPEED);
    velocity = approachVelocity(velocity, target, dt);
    const next = navigation.move(position, velocity.x * dt, velocity.z * dt, getDynamicObstacles());
    const travelled = Math.hypot(next.x - position.x, next.z - position.z);
    if (Math.abs(next.x - position.x) < 1e-6 && Math.abs(velocity.x) > .01) velocity.x = 0;
    if (Math.abs(next.z - position.z) < 1e-6 && Math.abs(velocity.z) > .01) velocity.z = 0;
    position = next;
    const smoothing = 1 - Math.exp(-22 * dt);
    eyeY += (navigation.floorHeight(position) + EYE_HEIGHT - eyeY) * smoothing;
    bobPhase += travelled * 7.5;
    const desiredBob = readSettings().headBob && travelled > .0001 ? Math.sin(bobPhase) * .008 : 0;
    bob += (desiredBob - bob) * (1 - Math.exp(-16 * dt));
    camera.position.set(position.x, eyeY + bob, position.z);
    camera.rotation.x = pitch; camera.rotation.y = yaw;
    camera.rotation.z *= 1 - Math.min(1, 12 * dt);
    stepDistance += travelled;
    const stride = running ? 1.05 : .85;
    if (stepDistance >= stride) { stepDistance %= stride; onFootstep?.(running); }
  }
  function dispose() {
    if (disposed) return;
    setActive(false); disposed = true;
    document.removeEventListener('keydown', keyDown);
    document.removeEventListener('keyup', keyUp);
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('pointerup', pointerUp);
    document.removeEventListener('pointercancel', pointerUp);
    document.removeEventListener('pointerlockchange', pointerLockChange);
    document.removeEventListener('visibilitychange', visibilityChange);
    canvas.removeEventListener('pointerdown', pointerDown);
    window?.removeEventListener('blur', clearInput);
  }
  return { update, setActive, activateFromCamera, adoptCameraPose, setMovementEnabled, setLookLimits, setNavigation, applyExternalMotion, reset, teleport, requestPointerLock, clearInput, dispose,
    get enabled() { return active && !disposed; },
    get position(): Point3 { return { x: camera.position.x, y: camera.position.y, z: camera.position.z }; } };
}
