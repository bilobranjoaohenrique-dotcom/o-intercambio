import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { subtractHostGeometryBoxes } from './westbridgeHostOpenings';

type Point=readonly[number,number,number];
const EPS=1e-4;
function normal(a:Point,b:Point,c:Point):Point{
 const u=b.map((v,i)=>v-a[i]),v=c.map((w,i)=>w-a[i]);
 const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const length=Math.hypot(...n);return length?n.map(v=>v/length)as[number,number,number]:[0,0,0];
}
/** A01 provides closed, double-sided wall boxes. Their outward skin lies
 * 43–53mm outside the original blue siding. Keep the native inward faces and
 * every reveal, sill, window frame and interior partition instead. */
export function isHostHouseOutwardSkin(name:string,triangle:readonly Point[]):boolean{
 const [a,b,c]=triangle,n=normal(a,b,c);
 const plane=(axis:number,coordinate:number,sign:number)=>
  n[axis]*sign>.9999&&triangle.every(p=>Math.abs(p[axis]-coordinate)<EPS);
 // Window/door reveal pieces belong to the supplied interior and stay whole.
 if(/^ENV_/.test(name)&&!/_Janela_|_Vao_/.test(name)){
  if(/^ENV_[01]_0[012](?:[_.]|$)/.test(name))return plane(2,-12.68,1);
  if(/^ENV_[01]_03(?:[_.]|$)/.test(name))return plane(2,-18.96,-1);
  if(/^ENV_[01]_04(?:[_.]|$)/.test(name))return plane(0,15.38,-1);
  if(/^ENV_1_05(?:[_.]|$)/.test(name))return plane(0,23.08,1);
  if(/^ENV_0_06(?:[_.]|$)/.test(name))return plane(2,-13.15,1);
  if(/^ENV_0_07(?:[_.]|$)/.test(name))return plane(2,-18.48,-1);
  if(/^ENV_0_08(?:[_.]|$)/.test(name))return plane(0,26.78,1);
 }
 let outward:Point|undefined;
 if(name==='Bay_face_lateral')outward=[-.866906,0,.498471];
 if(name==='Bay_face_lateral.001')outward=[.857493,0,.514496];
 if(/^Bay_(peitoril|verga)_angular$/.test(name))outward=[-.581238,0,.813733];
 if(/^Bay_(peitoril|verga)_angular\.001$/.test(name))outward=[0,0,1];
 if(/^Bay_(peitoril|verga)_angular\.002$/.test(name))outward=[.572182,0,.820127];
 return !!outward&&n.reduce((sum,v,i)=>sum+v*outward![i],0)>.9999;
}

export type HostEnvelopePlane={normal:Point;limit:number};
/** Keep geometry at least 2cm behind the deepest blue base panels, not merely
 * behind the raised clapboard strips. Door/window reveal caps obey the same
 * envelope; the original exterior frames remain unchanged in Westbridge. */
export function hostHouseEnvelopePlanes(name:string):readonly HostEnvelopePlane[]{
 const p=(normal:Point,limit:number):HostEnvelopePlane=>({normal,limit});
 if(/^ENV_[01]_0[012](?:[_.]|$)/.test(name))return[p([0,0,1],-12.766502)];
 if(/^ENV_[01]_03(?:[_.]|$)/.test(name))return[p([0,0,-1],18.863602)];
 if(/^ENV_[01]_04(?:[_.]|$)/.test(name))return[p([-1,0,0],-15.473623)];
 if(/^ENV_1_05(?:[_.]|$)/.test(name))return[p([1,0,0],22.986979)];
 if(/^ENV_0_06(?:[_.]|$)/.test(name))return[p([0,0,1],-13.238586)];
 if(/^ENV_0_07(?:[_.]|$)/.test(name))return[p([0,0,-1],18.391520)];
 if(/^ENV_0_08(?:[_.]|$)/.test(name))return[p([1,0,0],26.763657)];
 if(/^Bay_(face_lateral|peitoril_angular|verga_angular)/.test(name))return[
  p([-.8682430187687553,0,.49613915422925325],-20.22997780428048),
  p([.8682438822582912,0,.49613764312038505],9.47424672709518),p([0,0,1],-12.058373947143555)];
 return[];
}
type Corner={source:Point;id?:number;values?:Record<string,number[]>};
function clipInsidePlanes(mesh:Mesh,planes:readonly HostEnvelopePlane[],originX:number){
 const old=mesh.getIndices(),position=mesh.getVerticesData(VertexBuffer.PositionKind);
 if(!old?.length||!position||!planes.length)return{removedTriangles:0,addedTriangles:0};
 const kinds=mesh.getVerticesDataKinds(),sizes=Object.fromEntries(kinds.map(k=>[k,mesh.getVertexBuffer(k)!.getSize()]));
 const data=Object.fromEntries(kinds.map(k=>[k,Array.from(mesh.getVerticesData(k)!)]));
 const world=mesh.computeWorldMatrix(true),corners:Corner[]=[];
 for(let i=0;i<position.length;i+=3){const p=Vector3.TransformCoordinates(Vector3.FromArray(position,i),world);corners.push({source:[originX-p.x,p.y,p.z],id:i/3});}
 const values=(c:Corner,k:string)=>c.values?.[k]??data[k].slice(c.id!*sizes[k],(c.id!+1)*sizes[k]);
 function mix(a:Corner,b:Corner,t:number):Corner{
  if(t<1e-8)return a;if(t>1-1e-8)return b;
  return{source:a.source.map((v,i)=>v+(b.source[i]-v)*t)as[number,number,number],values:Object.fromEntries(kinds.map(k=>{
   const av=values(a,k),bv=values(b,k),out=av.map((v,i)=>v+(bv[i]-v)*t);
   if(k===VertexBuffer.NormalKind||k===VertexBuffer.TangentKind){const n=Math.hypot(...out.slice(0,3));if(n)for(let i=0;i<3;i++)out[i]/=n;}
   return[k,out];
  }))};
 }
 const distance=(c:Corner,p:HostEnvelopePlane)=>c.source.reduce((sum,v,i)=>sum+v*p.normal[i],0)-p.limit;
 function clip(poly:Corner[],p:HostEnvelopePlane){
  if(poly.every(c=>distance(c,p)<=1e-7))return poly;
  const out:Corner[]=[];
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a,p),db=distance(b,p);
   if(da<=1e-7)out.push(a);
   if((da>1e-7&&db< -1e-7)||(da< -1e-7&&db>1e-7))out.push(mix(a,b,da/(da-db)));
  }return out;
 }
 const indices:number[]=[];let removedTriangles=0,addedTriangles=0;
 function index(c:Corner){if(c.id!==undefined)return c.id;const id=data[VertexBuffer.PositionKind].length/3;for(const k of kinds)data[k].push(...c.values![k]);c.id=id;return id;}
 for(let i=0;i<old.length;i+=3){const original=[corners[old[i]],corners[old[i+1]],corners[old[i+2]]];let poly=original;
  for(const plane of planes){poly=clip(poly,plane);if(poly.length<3)break;}
  if(poly.length===3&&poly.every((c,j)=>c===original[j])){indices.push(old[i],old[i+1],old[i+2]);continue;}
  removedTriangles++;
  for(let j=1;j<poly.length-1;j++){const a=poly[0],b=poly[j],c=poly[j+1],ab=b.source.map((v,k)=>v-a.source[k]),ac=c.source.map((v,k)=>v-a.source[k]);
   if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])<1e-10)continue;
   indices.push(index(a),index(b),index(c));addedTriangles++;
  }
 }
 if(removedTriangles){mesh.makeGeometryUnique();for(const k of kinds)mesh.setVerticesData(k,data[k],false,sizes[k]);mesh.setIndices(indices);mesh.refreshBoundingInfo();}
 return{removedTriangles,addedTriangles};
}
function isFloorOutwardFace(name:string,tri:readonly Point[]){
 if(!/^(Piso_|Laje_|Forro_)/.test(name))return false;
 const n=normal(tri[0],tri[1],tri[2]);if(Math.abs(n[1])>.01)return false;
 const plane=(axis:number,coord:number,sign:number)=>n[axis]*sign>.9999&&tri.every(p=>Math.abs(p[axis]-coord)<EPS);
 if(/garagem/.test(name))return plane(0,26.78,1)||plane(2,-18.48,-1)||plane(2,-13.15,1);
 if(name==='Piso_bay_window')return true;
 // Keep the main right shared riser at ground level; the garage and original
 // foundation cover it. Its exposed corner is handled separately below.
 return plane(0,15.38,-1)||plane(2,-18.96,-1)||plane(2,-12.68,1)||
  (name!=='Laje_terreo'&&plane(0,23.08,1));
}
/** Preserve native inside faces and floor tops; trim the complete outer ENV
 * slabs, including window/door caps, behind the approved blue facade. */
export function applyHostHouseEnvelope(meshes:readonly AbstractMesh[],originX=500){
 const changes:{name:string;material:string|null;outwardTriangles:number;cornerRemoved:number;cornerAdded:number;slabRemoved:number;slabAdded:number}[]=[];
 for(const mesh of meshes){
  if(!(mesh instanceof Mesh)||!mesh.getTotalVertices())continue;
  const name=mesh.name;if(!/^(ENV_|Bay_|Piso_|Laje_|Forro_)/.test(name))continue;
  const positions=mesh.getVerticesData(VertexBuffer.PositionKind),old=mesh.getIndices();if(!positions||!old?.length)continue;
  const world=mesh.computeWorldMatrix(true),source:Point[]=[];
  for(let i=0;i<positions.length;i+=3){const p=Vector3.TransformCoordinates(Vector3.FromArray(positions,i),world);source.push([originX-p.x,p.y,p.z]);}
  const indices:number[]=[];let outwardTriangles=0;
  for(let i=0;i<old.length;i+=3){const ids=[old[i],old[i+1],old[i+2]],tri=ids.map(id=>source[id]);
   if(isFloorOutwardFace(name,tri)||isHostHouseOutwardSkin(name,tri))outwardTriangles++;else indices.push(...ids);
  }
  if(outwardTriangles){mesh.makeGeometryUnique();mesh.setIndices(indices);}
  const slab=clipInsidePlanes(mesh,hostHouseEnvelopePlanes(name),originX);
  let cornerRemoved=0,cornerAdded=0;
  if(/^ENV_0_05(?:[_.]|$)/.test(name)){
   mesh.makeGeometryUnique();const result=subtractHostGeometryBoxes(mesh,[{min:[22.986979,.399,-13.238586],max:[23.50,2.901,-12.70]}],originX);
   cornerRemoved=result.removedTriangles;cornerAdded=result.addedTriangles;
  }
  if(outwardTriangles||slab.removedTriangles||cornerRemoved){mesh.refreshBoundingInfo();changes.push({name,material:mesh.material?.name??null,outwardTriangles,cornerRemoved,cornerAdded,slabRemoved:slab.removedTriangles,slabAdded:slab.addedTriangles});}
 }
 return{version:'a01-interior-envelope-clipped-2',changedMeshes:changes.length,
  outwardTrianglesRemoved:changes.reduce((n,c)=>n+c.outwardTriangles,0),
  sharedCornerRemoved:changes.reduce((n,c)=>n+c.cornerRemoved,0),sharedCornerAdded:changes.reduce((n,c)=>n+c.cornerAdded,0),
  exteriorSlabRemoved:changes.reduce((n,c)=>n+c.slabRemoved,0),exteriorSlabAdded:changes.reduce((n,c)=>n+c.slabAdded,0),
  sourceFilePreserved:true,inwardFacesPreserved:true,revealsPreserved:false,inwardRevealsPreserved:true,exteriorRevealSlabsClipped:true,
  floorTopsPreserved:true,changes};
}
