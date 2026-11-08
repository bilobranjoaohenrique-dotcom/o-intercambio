import type {Scene} from '@babylonjs/core/scene';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {Vector3,Quaternion} from '@babylonjs/core/Maths/math.vector';
import type {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';

type V={x:number;y:number;z:number};
/** Small authored pieces are merged by material after furnishing. Optional
 * targets keep their real meshes separate for ray-based examination. */
export class HomeGeometry{
 readonly scene:Scene;
 readonly meshes:Mesh[]=[];
 readonly targets=new Map<string,Mesh[]>();
 private readonly batches=new Map<StandardMaterial,Mesh[]>();
 constructor(scene:Scene){this.scene=scene;}
 add(mesh:Mesh,material:StandardMaterial,target?:string,cast=true){
  mesh.material=material;mesh.isPickable=true;mesh.receiveShadows=true;mesh.metadata={environmentPart:mesh.name,castShadow:cast,interactionId:target??null};this.meshes.push(mesh);
  if(target){const list=this.targets.get(target)??[];list.push(mesh);this.targets.set(target,list);}else{const list=this.batches.get(material)??[];list.push(mesh);this.batches.set(material,list);}return mesh;
 }
 box(name:string,w:number,h:number,d:number,x:number,y:number,z:number,material:StandardMaterial,target?:string){const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);mesh.position.set(x,y,z);return this.add(mesh,material,target);}
 cylinder(name:string,height:number,top:number,bottom:number,x:number,y:number,z:number,material:StandardMaterial,target?:string,sides=10){const mesh=MeshBuilder.CreateCylinder(name,{height,diameterTop:top,diameterBottom:bottom,tessellation:sides},this.scene);mesh.position.set(x,y,z);return this.add(mesh,material,target);}
 sphere(name:string,w:number,h:number,d:number,x:number,y:number,z:number,material:StandardMaterial,target?:string){const mesh=MeshBuilder.CreateSphere(name,{diameter:1,segments:8},this.scene);mesh.scaling.set(w,h,d);mesh.position.set(x,y,z);mesh.convertToFlatShadedMesh();return this.add(mesh,material,target);}
 rod(name:string,a:V,b:V,r:number,material:StandardMaterial,target?:string){const start=new Vector3(a.x,a.y,a.z),end=new Vector3(b.x,b.y,b.z),direction=end.subtract(start),length=direction.length();const mesh=this.cylinder(name,length,r*2,r*2,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,material,target,6);direction.scaleInPlace(1/length);const up=Vector3.Up(),axis=Vector3.Cross(up,direction),dot=Vector3.Dot(up,direction);mesh.rotationQuaternion=axis.lengthSquared()>1e-8?Quaternion.RotationAxis(axis.normalize(),Math.acos(Math.max(-1,Math.min(1,dot)))):dot<0?Quaternion.RotationAxis(Vector3.Right(),Math.PI):Quaternion.Identity();return mesh;}
 plane(name:string,w:number,h:number,x:number,y:number,z:number,material:StandardMaterial,yaw=0,target?:string){const mesh=MeshBuilder.CreatePlane(name,{width:w,height:h},this.scene);mesh.position.set(x,y,z);mesh.rotation.y=yaw;return this.add(mesh,material,target,false);}
 cloth(name:string,cols:number,rows:number,point:(u:number,v:number)=>V,material:StandardMaterial,target?:string,flipWinding=false){
  const mesh=new Mesh(name,this.scene),positions:number[]=[],uvs:number[]=[],indices:number[]=[],normals:number[]=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){const u=col/cols,v=row/rows,p=point(u,v);positions.push(p.x,p.y,p.z);uvs.push(u,1-v);}
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;indices.push(a,c,b,b,c,d);}
  if(flipWinding)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uvs;data.applyToMesh(mesh);material.backFaceCulling=false;material.twoSidedLighting=true;return this.add(mesh,material,target);
 }
 merge(){
  const merged:Mesh[]=[];
  for(const[material,list]of this.batches){
   const alive=list.filter(mesh=>!mesh.isDisposed());if(!alive.length)continue;
   for(const mesh of alive)mesh.computeWorldMatrix(true);
   const pickable=alive.some(mesh=>mesh.isPickable),castShadow=material.alpha>=1&&alive.some(mesh=>mesh.metadata?.castShadow);
   const mesh=alive.length===1?alive[0]:Mesh.MergeMeshes(alive,true,true,undefined,false,false);
   if(!mesh)throw Error('Não foi possível preparar a geometria da casa.');
   mesh.name='casa · '+material.name;mesh.isPickable=pickable;mesh.receiveShadows=true;mesh.metadata={environmentBatch:true,material:material.name,castShadow};merged.push(mesh);
  }
  this.batches.clear();
  // An examined object can still have several materials. Bake its static
  // pieces by material AND interaction id; never merge it into the room.
  for(const[id,list]of this.targets){
   const groups=new Map<StandardMaterial,Mesh[]>(),result:Mesh[]=[];
   for(const mesh of list){const material=mesh.material as StandardMaterial,batch=groups.get(material)??[];batch.push(mesh);groups.set(material,batch);}
   for(const[material,batch]of groups){for(const mesh of batch)mesh.computeWorldMatrix(true);const castShadow=batch.some(mesh=>mesh.metadata?.castShadow),mesh=batch.length===1?batch[0]:Mesh.MergeMeshes(batch,true,true,undefined,false,false);if(!mesh)throw Error('Não foi possível preparar um objeto examinável.');mesh.name=id+' · '+material.name;mesh.isPickable=true;mesh.receiveShadows=true;mesh.metadata={interactionId:id,environmentPart:id,castShadow};result.push(mesh);}
   this.targets.set(id,result);
  }
  return merged;
 }
}
