import { PLANE_SEAT, PLANE_WINDOW } from './planeLayout';
import type { Point3 } from './layout';

export type LookLimits = { centerYaw: number; minYaw: number; maxYaw: number; minPitch: number; maxPitch: number };
export function clampLook(yaw: number, pitch: number, limits: LookLimits) {
  const offset = Math.atan2(Math.sin(yaw - limits.centerYaw), Math.cos(yaw - limits.centerYaw));
  return { yaw: limits.centerYaw + Math.max(limits.minYaw, Math.min(limits.maxYaw, offset)),
    pitch: Math.max(limits.minPitch, Math.min(limits.maxPitch, pitch)) };
}
type Pose = { position: Point3; yaw: number; pitch: number };
type Camera = { position: Point3 & { set(x:number,y:number,z:number):unknown }; rotation: {x:number;y:number;z:number} };
type Controls = { adoptCameraPose():void; setMovementEnabled(value:boolean):void; clearInput():void };
export const PLANE_REFLECTIONS = ['É estranho... Estou realmente indo.', 'Tomara que tudo dê certo.'] as const;
export const PLANE_MINIMUM_SECONDS = 12;
export const PLANE_AUTO_SECONDS = 60;
const MOVE_SECONDS = .9;

/** A seat-local camera motion and a short reflection use the existing clock,
 * subtitles and input controller. No walking or passenger body is introduced. */
export function createPlaneSequence(camera: Camera, controls: Controls) {
  let state: 'seat'|'focusing'|'window'|'returning' = 'seat';
  let elapsed = 0, reflectionElapsed: number | null = null, movementTime = 0;
  let from: Pose | null = null, to: Pose | null = null;
  function apply(pose: Pose) {
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.rotation.x=pose.pitch;camera.rotation.y=pose.yaw;camera.rotation.z=0;controls.adoptCameraPose();
  }
  function move(next:'focusing'|'returning', target:Pose) {
    from={position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},yaw:camera.rotation.y,pitch:camera.rotation.x};
    to=target;movementTime=0;state=next;controls.clearInput();controls.setMovementEnabled(false);
  }
  const completed = () => reflectionElapsed !== null && reflectionElapsed >= 8;
  return {
    enter() { state='seat';elapsed=0;reflectionElapsed=null;from=to=null;apply(PLANE_SEAT);controls.setMovementEnabled(false); },
    observe() { if(state!=='seat')return false;move('focusing',PLANE_WINDOW.focusPose);return true; },
    returnToSeat() { if(state!=='window')return false;move('returning',PLANE_SEAT);return true; },
    update(seconds:number) {
      if(!Number.isFinite(seconds)||seconds<=0)return;
      const dt=Math.min(.1,seconds);elapsed+=dt;
      if(reflectionElapsed!==null)reflectionElapsed+=dt;
      if(!from||!to)return;
      movementTime=Math.min(MOVE_SECONDS,movementTime+dt);
      const t=movementTime/MOVE_SECONDS,s=t*t*(3-2*t),mix=(a:number,b:number)=>a+(b-a)*s;
      apply({position:{x:mix(from.position.x,to.position.x),y:mix(from.position.y,to.position.y),z:mix(from.position.z,to.position.z)},
        yaw:from.yaw+Math.atan2(Math.sin(to.yaw-from.yaw),Math.cos(to.yaw-from.yaw))*s,pitch:mix(from.pitch,to.pitch)});
      if(movementTime>=MOVE_SECONDS){state=state==='focusing'?'window':'seat';from=to=null;if(state==='window'&&reflectionElapsed===null)reflectionElapsed=0;}
    },
    get moving(){return state==='focusing'||state==='returning';},
    get state(){return state;},
    get subtitle(){return reflectionElapsed===null?null:reflectionElapsed<3.8?PLANE_REFLECTIONS[0]:reflectionElapsed<4.2?null:reflectionElapsed<8?PLANE_REFLECTIONS[1]:null;},
    get canContinue(){return completed()&&elapsed>=PLANE_MINIMUM_SECONDS;},
    get autoContinue(){return completed()&&elapsed>=PLANE_AUTO_SECONDS;},
    get diagnostics(){return{state,elapsed,reflectionElapsed,reflectionComplete:completed(),canContinue:completed()&&elapsed>=PLANE_MINIMUM_SECONDS,autoContinue:completed()&&elapsed>=PLANE_AUTO_SECONDS};},
  };
}
