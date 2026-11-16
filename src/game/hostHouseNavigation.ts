import type { Point2 } from './layout';
import type { Obstacle } from './types';
import { PLAYER_RADIUS, circleOverlapsObstacle } from './collision';
import { HOST_HOUSE_GROUND, HOST_HOUSE_UPPER, HOST_HOUSE_GROUND_FLOORS, HOST_HOUSE_UPPER_FLOORS,
  HOST_HOUSE_STAIRS, HOST_HOUSE_SOLIDS, HOST_HOUSE_SPAWN, hhPoint, hostHouseStairHeight,
  withinHhRect, type HhRect } from './hostHouseLayout';

type Edge=readonly [number,number,number,number];
const EPS=1e-8,MAX_STEP=.22,BODY_HEIGHT=1.78;
const finite=(p:Point2)=>Number.isFinite(p.x)&&Number.isFinite(p.z);
function perimeter(rects:readonly HhRect[]):Edge[]{
  return rects.flatMap(rect=>{
    const edges:Edge[]=[];
    for(const [vertical,fixed,low,high,out]of[
      [true,rect.minX,rect.minZ,rect.maxZ,-1],[true,rect.maxX,rect.minZ,rect.maxZ,1],
      [false,rect.minZ,rect.minX,rect.maxX,-1],[false,rect.maxZ,rect.minX,rect.maxX,1],
    ]as const){
      let spans:[number,number][]=[[low,high]];
      for(const other of rects){
        if(other===rect)continue;
        const min=vertical?other.minX:other.minZ,max=vertical?other.maxX:other.maxZ;
        if(!(out<0?min<fixed-EPS&&max>=fixed-EPS:max>fixed+EPS&&min<=fixed+EPS))continue;
        const from=vertical?other.minZ:other.minX,to=vertical?other.maxZ:other.maxX;
        spans=spans.flatMap(([a,b])=>to<=a||from>=b?[[a,b]]:
          [...(from>a?[[a,from]as[number,number]]:[]),...(to<b?[[to,b]as[number,number]]:[])]);
      }
      for(const [a,b]of spans)if(b-a>EPS)edges.push(vertical?[fixed,a,fixed,b]:[a,fixed,b,fixed]);
    }
    return edges;
  });
}
function edgeDistanceSquared(p:Point2,[ax,az,bx,bz]:Edge){
  const dx=bx-ax,dz=bz-az,len=dx*dx+dz*dz;
  const t=len?Math.max(0,Math.min(1,((p.x-ax)*dx+(p.z-az)*dz)/len)):0;
  return (p.x-ax-t*dx)**2+(p.z-az-t*dz)**2;
}
const upperRects=[...HOST_HOUSE_UPPER_FLOORS,HOST_HOUSE_STAIRS.rect];
const groundEdges=perimeter(HOST_HOUSE_GROUND_FLOORS),upperEdges=perimeter(upperRects);
const inside=(rects:readonly HhRect[],p:Point2)=>rects.some(r=>withinHhRect(r,p));

/** A local elevation state resolves overlapping rooms without changing the
 * existing player's XZ navigation contract. Only accepted walking updates it;
 * querying floorHeight never teleports between storeys. */
export function createHostHouseNavigation(){
  let elevation=HOST_HOUSE_GROUND;
  function candidates(p:Point2):number[]{
    if(!finite(p))return[];
    if(withinHhRect(HOST_HOUSE_STAIRS.rect,p))return[hostHouseStairHeight(p)];
    const heights:number[]=[];
    if(inside(HOST_HOUSE_GROUND_FLOORS,p))heights.push(HOST_HOUSE_GROUND);
    if(inside(HOST_HOUSE_UPPER_FLOORS,p))heights.push(HOST_HOUSE_UPPER);
    return heights.sort((a,b)=>Math.abs(a-elevation)-Math.abs(b-elevation));
  }
  function fits(p:Point2,height:number,dynamic:readonly Obstacle[]){
    const edges=height<=HOST_HOUSE_GROUND+EPS?groundEdges:upperEdges;
    if(edges.some(edge=>edgeDistanceSquared(p,edge)<PLAYER_RADIUS**2-EPS))return false;
    if(HOST_HOUSE_SOLIDS.some(s=>height<s.maxY-EPS&&height+BODY_HEIGHT>s.minY+EPS&&circleOverlapsObstacle(p,s)))return false;
    return !dynamic.some(s=>circleOverlapsObstacle(p,s));
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
  function floorHeight(p:Point2){return candidates(p)[0]??HOST_HOUSE_GROUND;}
  function surfaceAt(p:Point2):'wood'|'concrete'{
    if(!finite(p))return'wood';const source=hhPoint(p.x,0,p.z).x;
    return source>53&&(p.z<35.8||p.z>38.2)&&!(elevation>1&&p.z>38.2)?'concrete':'wood';
  }
  return{move,floorHeight,surfaceAt,isWalkable,
    reset(level:'ground'|'upper'='ground'){elevation=level==='upper'?HOST_HOUSE_UPPER:HOST_HOUSE_GROUND;},
    get diagnostics(){return{elevation,level:elevation<=HOST_HOUSE_GROUND+EPS?'ground':elevation>=HOST_HOUSE_UPPER-EPS?'upper':'stairs',
      stairSteps:HOST_HOUSE_STAIRS.steps,bodyHeight:BODY_HEIGHT,maxStep:MAX_STEP};},
  };
}
export const hostHouseNavigation=createHostHouseNavigation();
