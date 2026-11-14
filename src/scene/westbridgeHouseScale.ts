import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { WB_HOUSE_SCALE_SPECS, WB_HOUSE_DOOR_HEIGHT, WB_HOST_DOOR_BASE,
  WB_HOST_DOOR_SOURCE_HEIGHT, WB_HOST_PORCH_SOURCE_CLEARANCE, WB_HOST_PORCH_CLEARANCE,
  WB_HOST_PORCH_RISE, WB_RANCH_FLOOR, WB_RANCH_EAVE, WB_RANCH_BODY_Y,
  WB_MANSION_FLOOR, WB_MANSION_BODY_Y, type WbHouseScaleSpec } from '../game/westbridgeHouseScale';

type Bounds = {min:number[];max:number[]};
type Part = Bounds & {vertices:number[];size:number[];center:number[]};
type Affine = {a:number;b:number;kind:string;roof?:boolean;door?:boolean;garage?:boolean;porch?:boolean};
const corrected = new WeakSet<Mesh>();
const architecture = /^(BrickTan|BrickTanDark|Cream|CreamShade|Gold|Iron|PaintBlue|PaintGreen|PaintOrange|PaintRed|PaintRedDark|PaintYellow|RoofShingle|SidingBlue|Stone|StoneDark|WindowGlow|Wood|WoodDark)(\.|$)/;
const near=(a:number,b:number,tolerance=.015)=>Math.abs(a-b)<tolerance;
const identity:Affine={a:1,b:0,kind:'unchanged'};
const transform=(a:number,base:number,targetBase=base,kind='body'):Affine=>({a,b:targetBase-a*base,kind});
const bodyY=(family:string,y:number)=>family==='ranch'?WB_RANCH_FLOOR+Math.max(0,y-WB_RANCH_FLOOR)*WB_RANCH_BODY_Y:
  family==='mansion'?WB_MANSION_FLOOR+Math.max(0,y-WB_MANSION_FLOOR)*WB_MANSION_BODY_Y:y;

/** Connected islands are recovered by welded positions plus triangle indices.
 * The asset batches many houses into each material mesh, so scaling a node
 * would incorrectly move entire streets, gardens and neighbouring lots. */
function components(positions:Float64Array,indices:ArrayLike<number>):Part[]{
  const count=positions.length/3,parent=Int32Array.from({length:count},(_,i)=>i),weld=new Map<string,number>();
  function find(v:number):number{let n=v;while(parent[n]!==n)n=parent[n];while(parent[v]!==v){const next=parent[v];parent[v]=n;v=next;}return n;}
  function join(a:number,b:number){a=find(a);b=find(b);if(a!==b)parent[b]=a;}
  for(let i=0;i<count;i++){
    const key=[positions[i*3],positions[i*3+1],positions[i*3+2]].map(v=>Math.round(v*1e4)).join(',');
    const first=weld.get(key);if(first===undefined)weld.set(key,i);else join(first,i);
  }
  for(let i=0;i<indices.length;i+=3){join(indices[i],indices[i+1]);join(indices[i+1],indices[i+2]);}
  const groups=new Map<number,Part>();
  for(let i=0;i<count;i++){
    const id=find(i);let part=groups.get(id);
    if(!part){part={vertices:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],size:[],center:[]};groups.set(id,part);}
    part.vertices.push(i);for(let axis=0;axis<3;axis++){part.min[axis]=Math.min(part.min[axis],positions[i*3+axis]);part.max[axis]=Math.max(part.max[axis],positions[i*3+axis]);}
  }
  for(const p of groups.values()){p.size=p.max.map((v,i)=>v-p.min[i]);p.center=p.max.map((v,i)=>(v+p.min[i])/2);}
  return [...groups.values()];
}

/** Original planar texture derivative along world Y. The existing split UV
 * vertices keep each facade/reveal chart separate. Horizontal header faces
 * have zero derivative and retain their authored UVs when translated. */
function verticalUVGradient(positions:Float64Array,indices:ArrayLike<number>,uv:ArrayLike<number>,selected:Map<number,number>){
  const gradients=new Map<number,{u:number;v:number;weight:number}>();
  for(let k=0;k<indices.length;k+=3){
    const ids=[indices[k],indices[k+1],indices[k+2]];if(!ids.some(i=>selected.has(i)))continue;
    const p=ids.map(i=>Vector3.FromArray(positions,i*3)),e=p[1].subtract(p[0]),f=p[2].subtract(p[0]);
    const ee=Vector3.Dot(e,e),ef=Vector3.Dot(e,f),ff=Vector3.Dot(f,f),det=ee*ff-ef*ef;if(det<1e-12)continue;
    const a=(ff*e.y-ef*f.y)/det,b=(ee*f.y-ef*e.y)/det,weight=Math.sqrt(det);
    const du=a*(uv[ids[1]*2]-uv[ids[0]*2])+b*(uv[ids[2]*2]-uv[ids[0]*2]);
    const dv=a*(uv[ids[1]*2+1]-uv[ids[0]*2+1])+b*(uv[ids[2]*2+1]-uv[ids[0]*2+1]);
    for(const i of ids)if(selected.has(i)){
      const g=gradients.get(i)??{u:0,v:0,weight:0};g.u+=du*weight;g.v+=dv*weight;g.weight+=weight;gradients.set(i,g);
    }
  }
  return gradients;
}

function houseFor(part:Part,host:boolean){
  return WB_HOUSE_SCALE_SPECS.find(h=>(h.family==='host')===host&&part.center[0]>=h.bounds[0]&&part.center[0]<=h.bounds[1]&&part.center[2]>=h.bounds[2]&&part.center[2]<=h.bounds[3]);
}
function doorAffine(h:WbHouseScaleSpec,p:Part,material:string):Affine|null{
  const [x,,z]=p.center;
  if(h.family==='host'&&Math.abs(x-20.0565)<.71&&z> -12.82&&z< -12.50&&p.max[1]<2.41&&p.min[1]>.38&&p.size[0]<1.35)
    return {...transform(WB_HOUSE_DOOR_HEIGHT/WB_HOST_DOOR_SOURCE_HEIGHT,WB_HOST_DOOR_BASE,WB_HOST_DOOR_BASE,'door'),door:true};
  if(h.family==='cozy'&&Math.abs(x-h.x)<.8&&Math.abs(z-h.facing*-12.8)<.24&&p.max[1]<3.02&&p.size[0]<1.6&&(/PaintBlue|Wood|Gold/.test(material))){
    // Include the leaf, raised panels, handle and the three connected jambs.
    // Nearby shutters sit outside this narrow door envelope.
    return {...transform(WB_HOUSE_DOOR_HEIGHT/2.3589040338993073,.38143834471702576,.38143834471702576,'door'),door:true};
  }
  if(h.family==='ranch'){
    const doorX=h.x-h.facing*.89875,doorZ=h.z+h.facing*1.31;
    if(Math.abs(x-doorX)<.57&&Math.abs(z-doorZ)<.22&&p.max[1]<1.76&&p.size[0]<1.25){
      const base=.1363644003868103,height=1.3436355888843536;
      return {...transform(WB_HOUSE_DOOR_HEIGHT/height,base,bodyY(h.family,base),'door'),door:true};
    }
    if(/^Cream\./.test(material)&&p.size[0]>3.20&&p.size[0]<3.27&&near(p.size[1],1.5305)&&p.min[1]<.1)
      return {...transform(2.15/p.size[1],p.min[1],bodyY(h.family,p.min[1]),'garage'),garage:true};
  }
  if(h.family==='mansion'&&Math.abs(x-h.x)<.68&&Math.abs(z-h.facing*-15.88)<.19&&p.max[1]<1.73&&p.size[0]<1.31&&/Stone|WoodDark|WindowGlow/.test(material)){
    return {...transform(WB_HOUSE_DOOR_HEIGHT/1.135,.2989,.2989,'door'),door:true};
  }
  return null;
}
function partAffine(h:WbHouseScaleSpec,p:Part,material:string):Affine{
  const door=doorAffine(h,p,material);if(door)return door;
  if(h.family==='host'){
    if(/^Cream\./.test(material)&&near(p.size[1],WB_HOST_PORCH_SOURCE_CLEARANCE)&&p.size[0]<.22&&p.min[1]>.36&&p.min[1]<.39)
      return {...transform(WB_HOST_PORCH_CLEARANCE/p.size[1],p.min[1],p.min[1],'porch-support'),porch:true};
    if(p.center[0]>18.4&&p.center[0]<21.7&&p.center[2]> -12.82&&p.center[2]< -10.8&&p.min[1]>2.45&&p.max[1]<3.4)
      return {a:1,b:WB_HOST_PORCH_RISE,kind:'porch-roof',roof:true,porch:true};
    return identity;
  }
  if(h.family==='cozy')return identity;
  if(h.family==='ranch'){
    const rise=bodyY(h.family,WB_RANCH_EAVE)-WB_RANCH_EAVE;
    if(/^RoofShingle/.test(material)||(p.min[1]>1.9&&p.max[1]>3.4&&p.size[0]<1&&p.size[2]<1))
      return {a:1,b:rise,kind:'roof-and-chimney',roof:true};
    return transform(WB_RANCH_BODY_Y,WB_RANCH_FLOOR,WB_RANCH_FLOOR);
  }
  // The white mansion has three short central storeys and two short wing
  // storeys. Translate each roof by its own eave rise; never stretch its pitch.
  const central=Math.abs(p.center[0]-h.x)<2.8;
  const porchRoof=/^Stone\./.test(material)&&p.size[0]>4.5&&p.size[0]<4.75&&near(p.min[1],3.2591)&&p.size[2]>1.4;
  const eave=central&&!porchRoof?4.7422:3.2592;
  const roof=(/^StoneDark/.test(material)&&p.min[1]>3.3)||
    (p.min[1]>4.60&&p.max[1]>6&&p.size[0]<1&&p.size[2]<1)||
    (/^Stone\./.test(material)&&(Math.abs(p.min[1]-eave)<.025||porchRoof)&&p.size[1]<.32);
  if(roof)return {a:1,b:bodyY(h.family,eave)-eave,kind:'roof-and-chimney',roof:true};
  return transform(WB_MANSION_BODY_Y,WB_MANSION_FLOOR,WB_MANSION_FLOOR);
}

export function applyWestbridgeHouseScale(meshes:readonly AbstractMesh[],originX=500){
  const houses=WB_HOUSE_SCALE_SPECS.map(spec=>({id:spec.id,family:spec.family,xzScale:1,bodyScaleY:spec.family==='ranch'?WB_RANCH_BODY_Y:spec.family==='mansion'?WB_MANSION_BODY_Y:1,
    components:0,changedVertices:0,doors:[] as {sourceHeight:number;height:number;factorY:number;base:number}[],garages:[] as {sourceHeight:number;height:number;factorY:number}[],
    roofComponents:0,porchSupports:0,sourceBounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},correctedBounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]}}));
  let changedMeshes=0,changedVertices=0;
  const doorwayUVReprojection={selectedVertices:0,adjustedVertices:0,adjustedCoordinates:0,
    channels:[] as {mesh:string;channel:string;selectedVertices:number;adjustedVertices:number;adjustedCoordinates:number}[]};
  for(const abstract of meshes){
    if(!(abstract instanceof Mesh)||corrected.has(abstract))continue;
    const mesh=abstract,[group,material='']=mesh.name.split(' · '),host=group==='HOST_FAMILY_HOUSE_DANIEL_HELEN';
    if((!host&&group!=='South_Lots'&&group!=='North_Lots')||!architecture.test(material))continue;
    const positions=mesh.getVerticesData(VertexBuffer.PositionKind),indices=mesh.getIndices(),normals=mesh.getVerticesData(VertexBuffer.NormalKind);
    if(!positions||!indices)continue;
    const world=mesh.computeWorldMatrix(true).clone(),inverse=Matrix.Invert(world),normalToWorld=Matrix.Transpose(inverse),normalToLocal=Matrix.Transpose(world);
    const source=new Float64Array(positions.length),next=Float32Array.from(positions),nextNormals=normals?Float32Array.from(normals):null;
    for(let i=0;i<positions.length;i+=3){const p=Vector3.TransformCoordinates(Vector3.FromArray(positions,i),world);source[i]=originX-p.x;source[i+1]=p.y;source[i+2]=p.z;}
    let changed=0;const revealShift=new Map<number,number>();
    for(const part of components(source,indices)){
      const house=houseFor(part,host);if(!house)continue;
      const record=houses.find(h=>h.id===house.id)!,affine=partAffine(house,part,material);
      record.components++;if(affine.roof)record.roofComponents++;if(affine.porch&&affine.kind==='porch-support')record.porchSupports++;
      const leaf=affine.door&&((house.family==='host'&&material.startsWith('PaintRed')&&part.size[1]>1.7)||
        (house.family==='cozy'&&material.startsWith('PaintBlue')&&part.size[1]>2.3)||
        (house.family==='ranch'&&material.startsWith('PaintRed')&&part.size[1]>1.3)||
        (house.family==='mansion'&&material.startsWith('WoodDark')&&part.size[1]>1.1));
      if(leaf)record.doors.push({sourceHeight:part.size[1],height:part.size[1]*affine.a,factorY:affine.a,base:affine.a*part.min[1]+affine.b});
      if(affine.garage)record.garages.push({sourceHeight:part.size[1],height:part.size[1]*affine.a,factorY:affine.a});
      for(const v of part.vertices){
        const i=v*3,y=source[i+1],floor=house.family==='ranch'?WB_RANCH_FLOOR:house.family==='mansion'?WB_MANSION_FLOOR:-Infinity;
        // Ground and foundations below a house's floor remain pinned.
        let a=affine.a,b=affine.b;
        if(affine.kind==='body'&&y<=floor){a=1;b=0;}
        // The cozy doorway reveal is welded into the whole Cream wall. Its
        // upper reveal vertices were previously hidden by the wood header;
        // leaving them behind exposes a detached-looking cap after resizing.
        // Only the top of this measured opening follows the door. The bottom,
        // wall silhouette, neighbouring windows and all X/Z stay untouched.
        const frontZ=source[i+2]*house.facing;
        if(house.family==='cozy'&&/^Cream\./.test(material)&&Math.abs(source[i]-house.x)<.648&&
          frontZ> -12.942&&frontZ< -12.7108&&near(y,2.769109,.0001)){
          a=WB_HOUSE_DOOR_HEIGHT/2.3589040338993073;b=.38143834471702576*(1-a);
          revealShift.set(v,a*y+b-y);
        }
        // Keep the mansion's arched transom below the next floor. Its short
        // door leaf grows while the upper arch rejoins the corrected wall.
        if(house.family==='mansion'&&affine.door&&y>1.4339){
          const top=1.7191,leafTop=WB_MANSION_FLOOR+WB_HOUSE_DOOR_HEIGHT;
          a=(bodyY(house.family,top)-leafTop)/(top-1.4339);b=leafTop-a*1.4339;
        }
        const newY=a*y+b;
        for(let axis=0;axis<3;axis++){
          record.sourceBounds.min[axis]=Math.min(record.sourceBounds.min[axis],source[i+axis]);record.sourceBounds.max[axis]=Math.max(record.sourceBounds.max[axis],source[i+axis]);
          const value=axis===1?newY:source[i+axis];record.correctedBounds.min[axis]=Math.min(record.correctedBounds.min[axis],value);record.correctedBounds.max[axis]=Math.max(record.correctedBounds.max[axis],value);
        }
        if(Math.abs(newY-y)<1e-7)continue;
        const p=Vector3.TransformCoordinates(new Vector3(originX-source[i],newY,source[i+2]),inverse);
        // X/Z are deliberately copied untouched from the authored buffer.
        next[i+1]=p.y;
        if(nextNormals&&normals){
          const n=Vector3.TransformNormal(Vector3.FromArray(normals,i),normalToWorld);n.y/=a;
          const local=Vector3.TransformNormal(n,normalToLocal).normalize();nextNormals[i]=local.x;nextNormals[i+1]=local.y;nextNormals[i+2]=local.z;
        }
        changed++;record.changedVertices++;
      }
    }
    if(changed){
      doorwayUVReprojection.selectedVertices+=revealShift.size;
      const adjustedUVVertices=new Set<number>();
      for(const channel of [VertexBuffer.UVKind,VertexBuffer.UV2Kind]){
        const uv=mesh.getVerticesData(channel);if(!uv||!revealShift.size)continue;
        const gradients=verticalUVGradient(source,indices,uv,revealShift),nextUV=Float32Array.from(uv);
        let vertices=0,coordinates=0;
        for(const [v,deltaY]of revealShift){
          const g=gradients.get(v);if(!g||!g.weight)continue;let moved=false;
          for(const [axis,sum]of [g.u,g.v].entries()){
            const slope=sum/g.weight;if(Math.abs(slope)<1e-7)continue;
            const i=v*2+axis;nextUV[i]=uv[i]+deltaY*slope;
            if(nextUV[i]!==uv[i]){coordinates++;moved=true;}
          }
          if(moved){vertices++;adjustedUVVertices.add(v);}
        }
        if(coordinates)mesh.setVerticesData(channel,nextUV,false);
        doorwayUVReprojection.adjustedCoordinates+=coordinates;
        doorwayUVReprojection.channels.push({mesh:mesh.name,channel,selectedVertices:revealShift.size,adjustedVertices:vertices,adjustedCoordinates:coordinates});
      }
      doorwayUVReprojection.adjustedVertices+=adjustedUVVertices.size;
      mesh.setVerticesData(VertexBuffer.PositionKind,next,false);if(nextNormals)mesh.setVerticesData(VertexBuffer.NormalKind,nextNormals,false);mesh.refreshBoundingInfo();mesh.computeWorldMatrix(true);changedMeshes++;changedVertices+=changed;
    }
    corrected.add(mesh);
  }
  return {version:'measured-house-proportions-1',units:'metres',houses:houses.filter(h=>h.components>0),changedMeshes,changedVertices,
    sourceAssetUnmodified:true,sourceNodeTransformsPreserved:true,topologyPreserved:true,uvsPreserved:doorwayUVReprojection.adjustedCoordinates===0,
    originalUVsPreservedExceptDoorwayReprojection:true,doorwayUVReprojection,materialsPreserved:true,
    xzPreserved:true,groundPreserved:true,roofPitchPreserved:true,doorHeight:WB_HOUSE_DOOR_HEIGHT,
    hostPorchClearance:WB_HOST_PORCH_CLEARANCE,hostPorchRise:WB_HOST_PORCH_RISE};
}
