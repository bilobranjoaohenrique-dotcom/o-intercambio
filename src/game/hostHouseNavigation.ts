import type { Point2 } from './layout';
import type { Obstacle } from './types';
import { PLAYER_RADIUS, circleOverlapsObstacle } from './collision';
import { WB_BUILDING_SOLIDS, WB_STATIC_SOLIDS } from './westbridgeLayout';
import { isWalkable as westbridgeIsWalkable, floorHeight as westbridgeFloorHeight,
  surfaceAt as westbridgeSurfaceAt } from './westbridgeNavigation';
import { HOST_HOUSE_GROUND, HOST_HOUSE_UPPER, HOST_HOUSE_GROUND_FLOORS, HOST_HOUSE_UPPER_FLOORS,
  HOST_HOUSE_APPROACH_FLOORS, HOST_HOUSE_STAIRS, HOST_HOUSE_SOLIDS, HOST_HOUSE_GARAGE_GATE_SOLID,
  HOST_HOUSE_SPAWN, hhLocalRect, hostHouseStairHeight, withinHhRect } from './hostHouseLayout';

const EPS=1e-6,MAX_STEP=.22,BODY_HEIGHT=1.78;
const finite=(p:Point2)=>Number.isFinite(p.x)&&Number.isFinite(p.z);
const localFloors=[...HOST_HOUSE_GROUND_FLOORS,...HOST_HOUSE_APPROACH_FLOORS];
const houseBody=[hhLocalRect(0,7.7,-6.28,0),hhLocalRect(.5,2.97,0,.7),hhLocalRect(7.7,11.4,-5.8,-.47)];
// These four old exterior envelopes enclosed the previously non-enterable blue
// house. All other neighbourhood buildings, fences, trunks and poles stay solid.
const replacedExterior=new Set(WB_BUILDING_SOLIDS.slice(0,4));
const neighbourhoodSolids=WB_STATIC_SOLIDS.filter(s=>!replacedExterior.has(s));
const ownSolids=[...HOST_HOUSE_SOLIDS,HOST_HOUSE_GARAGE_GATE_SOLID];
const usesHouse=(p:Point2)=>localFloors.some(r=>withinHhRect(r,p));
export const containsInterior=(p:Point2)=>finite(p)&&houseBody.some(r=>withinHhRect(r,p));
type HeightObstacle=Obstacle&{minY?:number;maxY?:number};
const blocksBody=(p:Point2,height:number,s:HeightObstacle)=>
  (s.maxY===undefined||height<s.maxY-EPS)&&(s.minY===undefined||height+BODY_HEIGHT>s.minY+EPS)&&circleOverlapsObstacle(p,s);

/** A01 shares the neighbourhood's actual origin. Only accepted movement changes
 * elevation: overlapping XZ rooms never switch storeys on a height query. */
export function createHostHouseNavigation(){
  let elevation=HOST_HOUSE_GROUND;
  function candidates(p:Point2):number[]{
    if(!finite(p))return[];
    if(!usesHouse(p))return[westbridgeFloorHeight(p)];
    const heights:number[]=[];
    const stair=hostHouseStairHeight(p);
    if(stair!==null)heights.push(stair);
    for(const floor of localFloors)if(withinHhRect(floor,p)){
      // The stair flights replace the floor directly below them, rather than
      // exposing an alternate ground-level route through a low stair underside.
      if(stair!==null&&floor.height===HOST_HOUSE_GROUND)continue;
      heights.push(floor.height);
      break;
    }
    for(const floor of HOST_HOUSE_UPPER_FLOORS)if(withinHhRect(floor,p)){heights.push(floor.height);break;}
    return [...new Set(heights)].sort((a,b)=>Math.abs(a-elevation)-Math.abs(b-elevation));
  }
  function fits(p:Point2,height:number,dynamic:readonly Obstacle[]){
    if(!usesHouse(p))return westbridgeIsWalkable(p,dynamic.filter(s=>{
      const d=s as HeightObstacle;return(d.maxY===undefined||height<d.maxY-EPS)&&(d.minY===undefined||height+BODY_HEIGHT>d.minY+EPS);
    }));
    if(neighbourhoodSolids.some(s=>circleOverlapsObstacle(p,s)))return false;
    if(ownSolids.some(s=>{
      // A tread/threshold may rise by one step under the capsule, while its
      // underside still blocks a character trying to enter below a high flight.
      if(s.support&&s.maxY<=height+MAX_STEP+EPS)return false;
      return blocksBody(p,height,s);
    }))return false;
    return !dynamic.some(s=>blocksBody(p,height,s));
  }
  function acceptedHeight(p:Point2,dynamic:readonly Obstacle[]):number|null{
    for(const h of candidates(p))if(Math.abs(h-elevation)<=MAX_STEP+EPS&&fits(p,h,dynamic))return h;
    return null;
  }
  function isWalkable(p:Point2,dynamic:readonly Obstacle[]=[]){return finite(p)&&acceptedHeight(p,dynamic)!==null;}
  function move(point:Point2,dx:number,dz:number,dynamic:readonly Obstacle[]=[]):Point2{
    if(!finite(point)){elevation=HOST_HOUSE_GROUND;return{x:HOST_HOUSE_SPAWN.x,z:HOST_HOUSE_SPAWN.z};}
    const result={x:point.x,z:point.z};if(!Number.isFinite(dx)||!Number.isFinite(dz))return result;
    const length=Math.hypot(dx,dz);if(!length||!Number.isFinite(length))return result;
    const limit=Math.min(1,32/length);dx*=limit;dz*=limit;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/(PLAYER_RADIUS*.3))),sx=dx/steps,sz=dz/steps;
    for(let step=0;step<steps;step++){
      for(const next of [{x:result.x+sx,z:result.z+sz},{x:result.x+sx,z:result.z},{x:result.x,z:result.z+sz}]){
        const h=acceptedHeight(next,dynamic);if(h===null)continue;
        result.x=next.x;result.z=next.z;elevation=h;break;
      }
    }
    return result;
  }
  function floorHeight(p:Point2){return candidates(p)[0]??elevation;}
  function surfaceAt(p:Point2){
    if(!finite(p))return'wood' as const;
    if(!usesHouse(p))return westbridgeSurfaceAt(p);
    if(elevation>HOST_HOUSE_GROUND+MAX_STEP)return'wood' as const;
    return localFloors.find(r=>withinHhRect(r,p))?.surface??'wood';
  }
  return{move,floorHeight,surfaceAt,isWalkable,containsInterior,
    reset(level:'ground'|'upper'='ground',point?:Point2){
      elevation=level==='upper'?HOST_HOUSE_UPPER:HOST_HOUSE_GROUND;
      if(point&&finite(point)&&level==='ground')elevation=candidates(point)[0]??HOST_HOUSE_GROUND;
    },
    get diagnostics(){return{elevation,level:elevation<=HOST_HOUSE_GROUND+EPS?'ground':elevation>=HOST_HOUSE_UPPER-EPS?'upper':'stairs',
      stairSteps:HOST_HOUSE_STAIRS.steps,bodyHeight:BODY_HEIGHT,maxStep:MAX_STEP,playerRadius:PLAYER_RADIUS,continuousWestbridge:true};},
  };
}
export const hostHouseNavigation=createHostHouseNavigation();
