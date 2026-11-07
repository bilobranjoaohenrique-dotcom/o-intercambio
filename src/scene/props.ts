import type {Scene} from '@babylonjs/core/scene';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {Vector3,Quaternion} from '@babylonjs/core/Maths/math.vector';
import type {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {FURNITURE,ROOM} from '../game/layout';
import type {HomeMaterials} from './textures';

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

export function bedroomProps(g:HomeGeometry,m:HomeMaterials){
 const floor=ROOM.floor,bed=FURNITURE.bed,desk=FURNITURE.desk,wardrobe=FURNITURE.wardrobe,shelf=FURNITURE.shelf,chair=FURNITURE.chair,suitcase=FURNITURE.suitcase,backpack=FURNITURE.backpack;
 const b=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,material:StandardMaterial,target?:string)=>g.box(name,w,h,d,x,y,z,material,target);
 // Single bed: wood frame, separate mattress, sagging cotton cover and pillow.
 b('estrutura da cama',bed.width,.18,bed.depth,bed.x,floor+.27,bed.z,m.darkWood);
 for(const x of[-1,1])for(const z of[-1,1])b('pé da cama',.065,.25,.065,bed.x+x*(bed.width/2-.08),floor+.125,bed.z+z*(bed.depth/2-.1),m.wood);
 b('cabeceira',bed.width+.035,.94,.055,bed.x,floor+.51,bed.z-bed.depth/2+.03,m.wood);
 for(let n=0;n<5;n++)b('ripa da cabeceira',.13,.72,.012,bed.x-.4+n*.2,floor+.56,bed.z-bed.depth/2+.065,m.darkWood);
 b('colchão',bed.width-.04,.22,bed.depth-.07,bed.x,floor+.43,bed.z,m.linen);
 g.cloth('lençol com pequenas dobras',12,18,(u,v)=>({x:bed.x+(u-.5)*(bed.width+.03),y:floor+.55+.009*Math.sin(u*32+v*7),z:bed.z+(v-.5)*(bed.depth-.02)}),m.linen,undefined,true);
 g.sphere('travesseiro de algodão',.74,.14,.38,bed.x,floor+.606,bed.z-.77,m.linen);
 g.cloth('cobertor desarrumado',14,18,(u,v)=>{const edge=Math.max(0,(Math.abs(u-.5)-.43)*4);return{x:bed.x+(u-.5)*(bed.width+.09)+Math.sin(v*10)*.015,y:floor+.57+Math.sin(v*11+u*9)*.018-edge*.26,z:bed.z-.25+v*1.28+Math.sin(u*17)*.035};},m.blanket,undefined,true);
 // Desk and practical study objects, all physically contained in its footprint.
 b('tampo da escrivaninha',desk.width,.045,desk.depth,desk.x,floor+desk.height-.0225,desk.z,m.wood);
 for(const x of[-1,1])for(const z of[-1,1])b('perna da escrivaninha',.045,desk.height-.05,.045,desk.x+x*(desk.width/2-.07),floor+(desk.height-.05)/2,desk.z+z*(desk.depth/2-.065),m.darkWood);
 b('saia da mesa',desk.width-.12,.14,.023,desk.x,floor+desk.height-.12,desk.z-desk.depth/2+.035,m.darkWood);
 const top=floor+desk.height;
 const laptopX=desk.x+.11,laptopZ=desk.z-.035;
 b('base do notebook',.39,.018,.28,laptopX,top+.012,laptopZ,m.plastic);
 const laptopLid=b('tampa do notebook aberta',.385,.245,.019,laptopX,top+.133,laptopZ-.127,m.plastic);laptopLid.rotation.x=-.13;
 const screen=g.plane('painel do notebook',.337,.195,laptopX,top+.139,laptopZ-.111,m.laptop,Math.PI);screen.rotation.x=.13;
 for(let row=0;row<4;row++)for(let col=0;col<11;col++)b('tecla do notebook',.023,.003,.017,laptopX-.145+col*.029,top+.023,laptopZ-.04+row*.025,m.rubber);
 b('barra de espaço',.11,.003,.015,laptopX,top+.024,laptopZ+.063,m.metal);b('touchpad',.095,.002,.04,laptopX,top+.023,laptopZ+.102,m.metal);
 g.sphere('mouse',.065,.029,.105,desk.x+.49,top+.025,desk.z+.08,m.plastic);
 b('mousepad',.2,.003,.22,desk.x+.49,top+.003,desk.z+.08,m.rubber);
 g.rod('fio do mouse',{x:desk.x+.49,y:top+.007,z:desk.z+.04},{x:laptopX+.19,y:top+.007,z:laptopZ-.06},.0025,m.plastic);
 for(let i=0;i<3;i++){const book=b('livro escolar',.19,.035,.27,desk.x-.65,top+.02+i*.036,desk.z-.04,m.bookColors[i]);book.rotation.y=(i-1)*.08;b('miolo do livro',.18,.024,.257,desk.x-.65,top+.02+i*.036,desk.z-.04,m.paper);}
 const notebook=b('caderno',.21,.012,.275,desk.x-.48,top+.01,desk.z+.12,m.bookColors[3]);notebook.rotation.y=.22;
 const doc=g.plane('confirmação do intercâmbio',.21,.287,desk.x-.27,top+.017,desk.z+.13,m.travel);doc.rotation.x=Math.PI/2;doc.rotation.y=.12;
 for(let i=0;i<3;i++){const pen=g.cylinder('caneta',.15,.006,.006,desk.x-.86+i*.022,top+.013,desk.z+.14,m.bookColors[i],undefined,6);pen.rotation.z=Math.PI/2;pen.rotation.y=.1+i*.11;}
 g.cylinder('porta canetas',.092,.062,.059,desk.x+.76,top+.046,desk.z-.19,m.metal);for(let i=0;i<4;i++){const pen=g.cylinder('caneta no copo',.14,.005,.005,desk.x+.75+i*.008,top+.105,desk.z-.19,m.bookColors[i%3],undefined,5);pen.rotation.z=(i-1.5)*.07;}
 g.cylinder('base da luminária',.014,.17,.17,desk.x-.84,top+.01,desk.z-.21,m.ivory);g.rod('haste da luminária',{x:desk.x-.84,y:top+.02,z:desk.z-.21},{x:desk.x-.87,y:top+.31,z:desk.z-.24},.012,m.metal);g.rod('braço da luminária',{x:desk.x-.87,y:top+.31,z:desk.z-.24},{x:desk.x-.68,y:top+.39,z:desk.z-.16},.011,m.metal);g.cylinder('cúpula da luminária',.15,.055,.18,desk.x-.68,top+.34,desk.z-.16,m.ivory,undefined,12);
 const clock=b('relógio digital',.19,.067,.062,desk.x+.78,top+.034,desk.z+.09,m.plastic);g.plane('mostrador 07:18',.16,.043,clock.position.x,clock.position.y,clock.position.z+.032,m.digital,Math.PI);
 // A worn office chair, with a real seat, backrest, spokes and small wheels.
 b('assento da cadeira',.48,.065,.46,chair.x,floor+.47,chair.z,m.clothes);const back=b('encosto da cadeira',.45,.4,.055,chair.x,floor+.73,chair.z+.22,m.clothes);back.rotation.x=.08;
 g.cylinder('coluna da cadeira',.39,.043,.05,chair.x,floor+.22,chair.z,m.metal,undefined,8);
 for(let n=0;n<5;n++){const a=n*Math.PI*2/5,x=chair.x+Math.cos(a)*.27,z=chair.z+Math.sin(a)*.27;g.rod('raio da cadeira',{x:chair.x,y:floor+.13,z:chair.z},{x,y:floor+.06,z},.018,m.plastic);const wheel=g.cylinder('rodinha',.045,.065,.065,x,floor+.04,z,m.rubber,undefined,8);wheel.rotation.z=Math.PI/2;}
 // Long wardrobe against the west wall, facing the room (+X).
 b('fundo do guarda-roupa',.025,wardrobe.height,wardrobe.depth,wardrobe.x-wardrobe.width/2+.0125,floor+wardrobe.height/2,wardrobe.z,m.darkWood);
 for(const z of[-1,1])b('lateral do guarda-roupa',wardrobe.width,wardrobe.height,.035,wardrobe.x,floor+wardrobe.height/2,wardrobe.z+z*(wardrobe.depth/2-.0175),m.wood);
 for(const y of[.035,.73,1.42,wardrobe.height-.035])b('prateleira do guarda-roupa',wardrobe.width,.035,wardrobe.depth,wardrobe.x,floor+y,wardrobe.z,m.wood);
 const faceX=wardrobe.x+wardrobe.width/2;
 b('porta fechada do roupeiro',.03,wardrobe.height-.055,.95,faceX,floor+wardrobe.height/2,wardrobe.z-.49,m.wood);
 b('porta entreaberta do roupeiro',.03,wardrobe.height-.055,.78,faceX-.065,floor+wardrobe.height/2,wardrobe.z+.6,m.wood);
 for(const z of[wardrobe.z-.08,wardrobe.z+.26])g.rod('puxador do guarda-roupa',{x:faceX+.023,y:floor+.98,z},{x:faceX+.023,y:floor+1.12,z},.009,m.metal);
 for(let i=0;i<6;i++)b('roupa dobrada no roupeiro',.45,.055,.19,wardrobe.x+.02,floor+.78+i*.055,wardrobe.z+.12,m.bookColors[i%5]);
 g.cloth('camisa visível no roupeiro',7,8,(u,v)=>({x:faceX-.09+Math.sin(u*24)*.012,y:floor+1.32+v*.55,z:wardrobe.z+.18+(u-.5)*.35}),m.clothes);
 // Canvas backpack and straps fit its independently specified collision box.
 const bag=g.sphere('mochila de lona',backpack.width,.45,backpack.depth,backpack.x,floor+.235,backpack.z,m.olive);bag.rotation.z=.05;
 b('bolso frontal da mochila',.25,.18,.055,backpack.x,floor+.18,backpack.z+.14,m.olive);
 for(const side of[-1,1])g.rod('alça da mochila',{x:backpack.x+side*.09,y:floor+.41,z:backpack.z-.12},{x:backpack.x+side*.12,y:floor+.08,z:backpack.z-.14},.016,m.brown);
 g.rod('pega da mochila',{x:backpack.x-.055,y:floor+.45,z:backpack.z},{x:backpack.x+.055,y:floor+.45,z:backpack.z},.012,m.brown);
 // East-wall bookcase, spines toward the room (-X).
 for(const z of[-1,1])b('lateral da estante',shelf.width,shelf.height,.027,shelf.x,floor+shelf.height/2,shelf.z+z*(shelf.depth/2-.013),m.wood);
 b('fundo da estante',.018,shelf.height,shelf.depth,shelf.x+shelf.width/2-.009,floor+shelf.height/2,shelf.z,m.darkWood);
 for(const y of[.06,.47,.88,1.27])b('tábua da estante',shelf.width,.035,shelf.depth,shelf.x,floor+y,shelf.z,m.wood);
 for(let row=0;row<3;row++)for(let i=0;i<7;i++){const h=.2+(i%3)*.035,z=shelf.z-.54+i*.115;const book=b('livro na estante',.32,h,.045,shelf.x-.05,floor+.08+row*.405+h/2,z,m.bookColors[(row+i)%5]);book.rotation.x=i%6===0?.09:0;b('etiqueta da lombada',.002,.015,.032,shelf.x-.212,floor+.08+row*.405+h*.7,z,m.paper);}
 b('caixa de papelão',.36,.2,.25,shelf.x,floor+1.4,shelf.z-.29,m.paper);b('álbum sobre a estante',.35,.035,.32,shelf.x,floor+1.32,shelf.z+.27,m.bookColors[1]);
 // Rolled travel clothes and documents sit inside a genuinely open suitcase.
 const target='suitcase',body=b('mala de viagem',suitcase.width,suitcase.height,suitcase.depth,suitcase.x,floor+suitcase.height/2,suitcase.z,m.navy,target);
 b('interior da mala',suitcase.width-.045,.015,suitcase.depth-.045,suitcase.x,floor+suitcase.height+.008,suitcase.z,m.clothes,target);
 const pivot=new TransformNode('dobradiça da tampa da mala',g.scene);pivot.position.set(suitcase.x,floor+suitcase.height-.005,suitcase.z+suitcase.depth/2);pivot.rotation.x=1.95;
 const suitcaseLid=b('tampa aberta da mala',suitcase.width,.035,suitcase.depth,0,0,-suitcase.depth/2,m.navy,target);suitcaseLid.parent=pivot;
 const lining=b('forro da tampa',suitcase.width-.035,.01,suitcase.depth-.035,0,-.022,-suitcase.depth/2,m.clothes,target);lining.parent=pivot;
 for(let i=0;i<3;i++)b('camiseta preparada para a viagem',.24,.045,.31,suitcase.x-.24+i*.23,floor+suitcase.height+.038,suitcase.z+.025,m.bookColors[(i+2)%5],target);
 for(const x of[-1,1])g.cylinder('rodinha da mala',.035,.055,.055,suitcase.x+x*(suitcase.width/2-.07),floor+.025,suitcase.z+.23,m.rubber,target,8);
 g.rod('alça da mala',{x:suitcase.x-.09,y:floor+.12,z:suitcase.z+suitcase.depth/2+.015},{x:suitcase.x+.09,y:floor+.12,z:suitcase.z+suitcase.depth/2+.015},.012,m.brown,target);
 body.metadata={...body.metadata,furniture:'suitcase'};
 // Low floor objects may be stepped over; no invisible full-height blockers.
 const carpet=b('tapete',2.05,.009,2.55,-.4,floor+.006,.05,m.rug);carpet.rotation.y=-.035;
 for(let i=0;i<2;i++){
  const x=bed.x+bed.width/2+.16+i*.15,z=bed.z+.75+i*.035;
  g.sphere('tênis usado',.12,.115,.26,x,floor+.065,z,m.clothes);b('sola do tênis',.12,.025,.265,x,floor+.02,z,m.rubber);
  const opening=g.cylinder('abertura do tênis',.004,.063,.063,x,floor+.115,z-.07,m.plastic,undefined,8);opening.scaling.z=.8;
  for(let n=0;n<4;n++)g.rod('cadarço',{x:x-.035,y:floor+.105-n*.005,z:z-.025+n*.028},{x:x+.035,y:floor+.105-n*.005,z:z-.012+n*.028},.002,m.ivory);
 }
 g.cylinder('lixeira',.3,.23,.18,desk.x+desk.width/2-.17,floor+.15,desk.z+.27,m.metal,undefined,12);g.cylinder('interior da lixeira',.006,.195,.195,desk.x+desk.width/2-.17,floor+.303,desk.z+.27,m.plastic,undefined,12);
 for(let n=0;n<3;n++)g.sphere('papel amassado',.085,.065,.07,desk.x+desk.width/2-.2+n*.025,floor+.31,desk.z+.25,m.paper);
 return{lampPosition:new Vector3(desk.x-.68,top+.29,desk.z-.16),suitcasePivot:pivot};
}
