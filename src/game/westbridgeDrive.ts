import type { Point3 } from './layout';
import type { LookLimits } from './planeSequence';
import { WB_DRIVE_ROUTE, WB_WALK_SPAWN } from './westbridgeLayout';

export const WB_DRIVE_SECONDS = 32;
export const WB_REAR_SEAT = { x: .38, y: 1.20, z: -.74 } as const;
export type WestbridgeDriveSample = {
  position: Point3; yaw: number; speed: number; progress: number;
  distance: number; totalDistance: number; parked: boolean;
};
const finite = (point: Point3) => [point.x, point.y, point.z].every(Number.isFinite);
const deltaAngle = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
type PathPoint = Point3 & { distance: number; yaw: number };
const paths = new WeakMap<readonly Point3[], PathPoint[]>();

function catmull(p0: Point3, p1: Point3, p2: Point3, p3: Point3, t: number): Point3 {
  const at = (key: keyof Point3) => .5 * (2*p1[key] + (-p0[key]+p2[key])*t +
    (2*p0[key]-5*p1[key]+4*p2[key]-p3[key])*t*t + (-p0[key]+3*p1[key]-3*p2[key]+p3[key])*t*t*t);
  return { x: at('x'), y: at('y'), z: at('z') };
}

/** An arc-length lookup prevents authored route spacing from changing speed.
 * No mesh or scene coordinates are modified by this sampler. */
function pathFor(route: readonly Point3[]) {
  const cached = paths.get(route); if (cached) return cached;
  if (route.length < 2 || !route.every(finite)) throw Error('Trajeto de Westbridge inválido.');
  const points: PathPoint[] = [];
  let distance = 0, lastYaw = 0;
  for (let segment = 0; segment < route.length-1; segment++) {
    const p0 = route[Math.max(0,segment-1)], p1 = route[segment], p2 = route[segment+1], p3 = route[Math.min(route.length-1,segment+2)];
    for (let step = segment ? 1 : 0; step <= 64; step++) {
      const point = catmull(p0,p1,p2,p3,step/64);
      const previous = points.at(-1);
      if (previous) distance += Math.hypot(point.x-previous.x,point.y-previous.y,point.z-previous.z);
      const before = catmull(p0,p1,p2,p3,Math.max(0,step/64-.0001));
      const after = catmull(p0,p1,p2,p3,Math.min(1,step/64+.0001));
      const heading = Math.atan2(after.x-before.x,after.z-before.z);
      const yaw = previous ? lastYaw+deltaAngle(heading,lastYaw) : heading;
      points.push({...point,distance,yaw});lastYaw=yaw;
    }
  }
  if (!(distance > .1)) throw Error('O trajeto não possui comprimento suficiente.');
  paths.set(route,points);return points;
}

/** The same game-time clock drives acceleration, the curved turn and braking.
 * Smoothstep distance gives zero speed at both endpoints, with no teleport. */
export function sampleWestbridgeDrive(seconds: number, route: readonly Point3[] = WB_DRIVE_ROUTE): WestbridgeDriveSample {
  const elapsed = Number.isFinite(seconds) ? clamp(seconds,0,WB_DRIVE_SECONDS) : 0;
  const progress = elapsed/WB_DRIVE_SECONDS, eased = progress*progress*(3-2*progress);
  const path = pathFor(route), totalDistance = path.at(-1)!.distance, distance = eased*totalDistance;
  let low=0,high=path.length-1;
  while (low<high) { const mid=(low+high)>>>1;if(path[mid].distance<distance)low=mid+1;else high=mid; }
  const b=path[low],a=path[Math.max(0,low-1)],span=b.distance-a.distance;
  const t=span>1e-9?(distance-a.distance)/span:0,mix=(x:number,y:number)=>x+(y-x)*t;
  return { position:{x:mix(a.x,b.x),y:mix(a.y,b.y),z:mix(a.z,b.z)}, yaw:mix(a.yaw,b.yaw),
    speed:6*progress*(1-progress)*totalDistance/WB_DRIVE_SECONDS,
    progress,distance,totalDistance,parked:elapsed>=WB_DRIVE_SECONDS };
}

export function vehiclePoint(position: Point3, yaw: number, local: Point3): Point3 {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return {x:position.x+local.x*c+local.z*s,y:position.y+local.y,z:position.z-local.x*s+local.z*c};
}
type Camera = { position: Point3 & {set(x:number,y:number,z:number):unknown};rotation:{x:number;y:number;z:number};fov:number;minZ:number };
type Controls = {
  setMovementEnabled(enabled:boolean):void;setLookLimits(limits:LookLimits|null):void;
  adoptCameraPose():void;clearInput():void;applyExternalMotion(point:Point3,yawDelta:number):boolean;
};
type Vehicle = {setPose(sample:WestbridgeDriveSample):void;setInteriorView(enabled:boolean):void};
const limits = (heading:number):LookLimits => ({centerYaw:heading,minYaw:-1.35,maxYaw:1.35,minPitch:-.55,maxPitch:.48});

/** First-person rear-seat control. The player owns mouse input throughout;
 * external motion adds only the vehicle's change of heading. */
export function createWestbridgeDrive(camera:Camera,controls:Controls,vehicle:Vehicle) {
  let active=false,elapsed=0,sample=sampleWestbridgeDrive(0);
  let savedProjection:{fov:number;minZ:number}|null=null;
  const rearWorld=()=>vehiclePoint(sample.position,sample.yaw,WB_REAR_SEAT);
  function restoreProjection() {
    if(savedProjection){camera.fov=savedProjection.fov;camera.minZ=savedProjection.minZ;savedProjection=null;}
    controls.setLookLimits(null);
  }
  return {
    enter(parked=false) {
      if(!savedProjection)savedProjection={fov:camera.fov,minZ:camera.minZ};
      elapsed=parked?WB_DRIVE_SECONDS:0;sample=sampleWestbridgeDrive(elapsed);active=true;
      vehicle.setPose(sample);vehicle.setInteriorView(true);
      const position=rearWorld();camera.position.set(position.x,position.y,position.z);
      camera.rotation.x=.035;camera.rotation.y=sample.yaw-.32;camera.rotation.z=0;
      camera.fov=1.02;camera.minZ=.025;
      controls.adoptCameraPose();controls.setMovementEnabled(false);controls.setLookLimits(limits(sample.yaw));controls.clearInput();
    },
    update(seconds:number) {
      if(!active||!Number.isFinite(seconds)||seconds<=0)return;
      const previous=sample;elapsed=Math.min(WB_DRIVE_SECONDS,elapsed+Math.min(.1,seconds));sample=sampleWestbridgeDrive(elapsed);
      vehicle.setPose(sample);controls.setLookLimits(limits(sample.yaw));
      controls.applyExternalMotion(rearWorld(),deltaAngle(sample.yaw,previous.yaw));
      camera.rotation.z=0;
    },
    exit() {
      if(!active||!sample.parked)return false;
      active=false;vehicle.setInteriorView(false);restoreProjection();return true;
    },
    stop() { active=false;vehicle.setInteriorView(false);restoreProjection(); },
    get canExit(){return active&&sample.parked;},
    get exitPosition(){return {...WB_WALK_SPAWN};},
    get diagnostics(){return {active,occupied:active,elapsed,duration:WB_DRIVE_SECONDS,...sample,position:{...sample.position},
      rearSeatWorld:rearWorld(),lookOffset:deltaAngle(camera.rotation.y,sample.yaw),pitch:camera.rotation.x,
      canExit:active&&sample.parked};},
  };
}
