import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Obstacle } from '../game/types';
import { WB_BOUNDARY_POINTS, WB_PORCH_HEIGHT } from '../game/westbridgeLayout';
import { WB_HOST_PORCH_CLEARANCE } from '../game/westbridgeHouseScale';

const wp=(x:number,y:number,z:number)=>new Vector3(500-x,y,z);

/** Small authored clusters for the host street, not a random city population.
 * New static geometry is merged by material; leaves share one thin-instance. */
export function buildWestbridgeProps(scene:Scene,parent:TransformNode){
  const root=new TransformNode('Westbridge · objetos residenciais',scene);root.parent=parent;
  const materials:StandardMaterial[]=[],textures:DynamicTexture[]=[],parts:Mesh[]=[];
  let seed=194705;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function mat(name:string,color:string){const m=new StandardMaterial('Westbridge · '+name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.set(.035,.035,.032);materials.push(m);return m;}
  function painted(name:string,color:string,draw?:(c:CanvasRenderingContext2D)=>void){
    const m=mat(name,'#ffffff'),t=new DynamicTexture(name+' · textura original',256,scene,true,Texture.TRILINEAR_SAMPLINGMODE);
    const c=t.getContext() as unknown as CanvasRenderingContext2D;c.fillStyle=color;c.fillRect(0,0,256,256);
    for(let i=0;i<11000;i++){c.fillStyle=i%2?`rgba(230,221,197,${random()*.045})`:`rgba(20,28,25,${random()*.06})`;c.fillRect(random()*256,random()*256,1,1);}
    draw?.(c);t.update(false);m.diffuseTexture=t;textures.push(t);return m;
  }
  const plastic=painted('plástico verde usado','#42554b'),rubber=painted('borracha grafite','#292e2c'),steel=painted('metal fosco','#5a6461');
  const blue=painted('quadro da bicicleta','#465f69'),seat=mat('couro do selim','#393b34');
  const news=painted('jornal de bairro','#c7c2a9',c=>{
    c.fillStyle='#4b514d';c.font='bold 23px serif';c.fillText('WESTBRIDGE',12,30);c.font='11px serif';c.fillText('WEEKLY  •  LOCAL EDITION',14,47);
    c.fillRect(13,55,229,1);for(let col=0;col<3;col++)for(let line=0;line<27;line++){c.fillStyle=line%4?'#74796d':'#8c8e7b';c.fillRect(14+col*77,66+line*6,62-(line%5)*3,1);}
    c.fillStyle='#929987';c.fillRect(15,66,63,47);c.fillStyle='#717d6f';c.fillRect(20,88,52,20);
  });
  const grate=painted('grade do bueiro','#4c514d',c=>{
    c.strokeStyle='#777b70';c.lineWidth=5;c.strokeRect(4,4,248,248);
    c.fillStyle='#252c29';for(let x=22;x<245;x+=25)c.fillRect(x,18,12,220);
  });
  const barrierPaint=painted('sinalização municipal','#c8c5b1',c=>{
    c.fillStyle='#a05e37';for(let x=-256;x<512;x+=64){c.beginPath();c.moveTo(x,256);c.lineTo(x+34,256);c.lineTo(x+290,0);c.lineTo(x+256,0);c.fill();}
    c.fillStyle='#d7d1b8';c.fillRect(35,92,186,72);c.fillStyle='#3d4740';c.font='bold 21px sans-serif';c.textAlign='center';c.fillText('ROAD CLOSED',128,123);c.font='13px sans-serif';c.fillText('LOCAL ACCESS',128,147);
  });
  const lamp=mat('globo leitoso da varanda','#c5bda7');lamp.emissiveColor.set(.34,.23,.11);
  function register(mesh:Mesh,m:StandardMaterial,shadow=true){mesh.parent=root;mesh.material=m;mesh.isPickable=true;mesh.receiveShadows=true;mesh.metadata={castShadow:shadow,westbridgeProp:true};parts.push(mesh);return mesh;}
  function box(name:string,size:[number,number,number],p:Vector3,m:StandardMaterial){const mesh=register(MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene),m);mesh.position.copyFrom(p);return mesh;}
  function tube(name:string,a:Vector3,b:Vector3,r:number,m:StandardMaterial){return register(MeshBuilder.CreateTube(name,{path:[a,b],radius:r,tessellation:8,cap:Mesh.CAP_ALL},scene),m);}
  // One bin beside the garage, leaving the driveway and front path open.
  const bin=wp(28.05,.65,-12.45);
  const body=register(MeshBuilder.CreateCylinder('lixeira doméstica · corpo',{height:1.03,diameterTop:.70,diameterBottom:.57,tessellation:4},scene),plastic);
  body.position.copyFrom(bin);body.rotation.y=Math.PI/4;
  box('lixeira doméstica · tampa',[.74,.065,.74],bin.add(new Vector3(0,.55,0)),plastic);
  box('lixeira doméstica · alça',[.36,.04,.09],bin.add(new Vector3(0,.48,.37)),rubber);
  for(const offset of[-.26,.26]){
    const wheel=register(MeshBuilder.CreateCylinder('lixeira doméstica · roda',{height:.09,diameter:.17,tessellation:12},scene),rubber);
    wheel.position.copyFrom(bin.add(new Vector3(offset,-.46,.24)));wheel.rotation.z=Math.PI/2;
  }
  // Bicycle rests in the side yard, beyond the porch approach.
  const bike=wp(14.5,.40,-11.75),axle=.51;
  for(const dx of[-axle,axle]){
    const center=bike.add(new Vector3(dx,0,0));
    const tire=register(MeshBuilder.CreateTorus('bicicleta · pneu',{diameter:.66,thickness:.055,tessellation:20},scene),rubber);
    tire.position.copyFrom(center);tire.rotation.x=Math.PI/2;
    const rim=register(MeshBuilder.CreateTorus('bicicleta · aro',{diameter:.59,thickness:.016,tessellation:20},scene),steel);
    rim.position.copyFrom(center);rim.rotation.x=Math.PI/2;
    for(let i=0;i<8;i++){const angle=i*Math.PI/4;tube('bicicleta · raio',center,center.add(new Vector3(Math.cos(angle)*.28,Math.sin(angle)*.28,0)),.005,steel);}
  }
  const back=bike.add(new Vector3(-axle,0,0)),front=bike.add(new Vector3(axle,0,0)),crank=bike.add(new Vector3(-.04,.02,0)),saddle=bike.add(new Vector3(-.21,.45,0)),neck=bike.add(new Vector3(.31,.48,0));
  for(const [a,b]of[[back,saddle],[saddle,crank],[crank,back],[saddle,neck],[neck,crank],[front,neck]])tube('bicicleta · tubo do quadro',a,b,.022,blue);
  tube('bicicleta · guidão',neck,neck.add(new Vector3(.03,.12,0)),.018,steel);
  tube('bicicleta · manoplas',neck.add(new Vector3(.03,.12,-.18)),neck.add(new Vector3(.03,.12,.18)),.021,rubber);
  box('bicicleta · selim',[.25,.06,.16],saddle.add(new Vector3(-.02,.05,0)),seat);
  box('bicicleta · pedal',[.13,.04,.25],crank.add(new Vector3(0,-.04,0)),steel);
  const newspaper=box('jornal dobrado na varanda',[.40,.009,.27],wp(20.9,.382,-11.94),news);newspaper.rotation.y=-.22;
  for(const [x,z]of[[17.3,-4.36],[-8.6,4.36]]){
    const drain=box('bueiro junto ao meio-fio',[.72,.018,.38],wp(x,.148,z),grate);drain.metadata.castShadow=false;
  }
  const fixture=register(MeshBuilder.CreateCylinder('varanda · suporte da luminária',{height:.055,diameter:.23,tessellation:12},scene),steel);
  const porchCeiling=WB_PORCH_HEIGHT+WB_HOST_PORCH_CLEARANCE;
  // The enlarged original door trim leaves no central gap for the globe.
  // Refit the same lamp beside that trim, under the raised porch ceiling.
  fixture.position.copyFrom(wp(20.96,porchCeiling-.0275,-12.12));
  const globe=register(MeshBuilder.CreateSphere('varanda · luminária quente',{diameter:.18,segments:12},scene),lamp);globe.position.copyFrom(wp(20.96,porchCeiling-.10,-12.12));
  // The supplied model ends after this residential block. Physical municipal
  // barriers communicate the three street limits rather than an unseen wall.
  const boundaryObstacles:Obstacle[]=[];
  for(const [index,point]of WB_BOUNDARY_POINTS.entries()){
    const heading=index===2?0:Math.PI/2,along=new Vector3(Math.cos(heading),0,-Math.sin(heading));
    const rail=box('limite residencial · barreira',[8.0,.34,.14],new Vector3(point.x,.76,point.z),barrierPaint);rail.rotation.y=heading;
    for(const side of[-1,1]){
      const p=new Vector3(point.x,.43,point.z).add(along.scale(side*2.65));
      box('limite residencial · apoio',[.13,.86,.40],p,steel);
    }
    boundaryObstacles.push({x:point.x,z:point.z,halfWidth:4,halfDepth:.20,rotation:heading});
  }
  // Merge only the new decoration. Imported houses and their topology are never
  // merged, rewritten or frozen as part of this prop pass.
  const meshes:Mesh[]=[];
  for(const material of materials){const group=parts.filter(mesh=>mesh.material===material);if(!group.length)continue;
    const merged=Mesh.MergeMeshes(group,true,true,undefined,false,false);
    if(merged){merged.name='Westbridge · conjunto '+material.name;merged.parent=root;merged.material=material;merged.isPickable=true;merged.receiveShadows=true;merged.metadata={castShadow:material!==grate&&material!==news,westbridgeProp:true};meshes.push(merged);}
  }
  const leafTexture=new DynamicTexture('Westbridge · folha caída',64,scene,true,Texture.TRILINEAR_SAMPLINGMODE);
  leafTexture.hasAlpha=true;const lc=leafTexture.getContext() as unknown as CanvasRenderingContext2D;lc.clearRect(0,0,64,64);lc.fillStyle='#886b40';lc.beginPath();lc.moveTo(4,34);lc.bezierCurveTo(17,6,42,8,59,28);lc.bezierCurveTo(45,52,17,56,4,34);lc.fill();lc.strokeStyle='#b69b65';lc.lineWidth=1;lc.beginPath();lc.moveTo(5,34);lc.lineTo(58,28);lc.stroke();leafTexture.update(false);textures.push(leafTexture);
  const leafMat=mat('folhas caídas','#ffffff');leafMat.diffuseTexture=leafTexture;leafMat.useAlphaFromDiffuseTexture=true;leafMat.backFaceCulling=false;
  const leaves=MeshBuilder.CreatePlane('Westbridge · folhas nas bordas',{width:.18,height:.11,sideOrientation:Mesh.DOUBLESIDE},scene);leaves.parent=root;leaves.material=leafMat;leaves.isPickable=false;leaves.receiveShadows=true;leaves.metadata={castShadow:false,westbridgeProp:true};
  for(const [x,z]of[[13.1,-5.8],[13.5,-5.6],[13.8,-5.9],[14.1,-5.65],[14.7,-5.8],[15.2,-5.7],[16.1,-5.9],[17.5,-5.8],[26.7,-6.0],[27.1,-5.9],[27.6,-6.1],[28.2,-6.3],[28.8,-6.5],[29.1,-6.1]]){
    leaves.thinInstanceAdd(Matrix.Compose(new Vector3(.7+random()*.5,.7+random()*.5,1),Quaternion.FromEulerAngles(Math.PI/2,random()*6.28,0),wp(x,.13,z)));
  }
  leaves.thinInstanceRefreshBoundingInfo();meshes.push(leaves);
  const obstacles:Obstacle[]=[{x:bin.x,z:bin.z,halfWidth:.39,halfDepth:.39},{x:bike.x,z:bike.z,halfWidth:.92,halfDepth:.21},...boundaryObstacles];
  return{root,meshes,obstacles,setNight(night:boolean){lamp.emissiveColor.set(night?.82:.34,night?.51:.23,night?.23:.11);},
    get diagnostics(){return{clusters:4,meshes:meshes.length,thinLeaves:leaves.thinInstanceCount,boundaryMarkers:3,props:['bicycle','household-bin','porch-newspaper','storm-drains','porch-light','fallen-leaves','street-limit-barriers']};},
    dispose(){root.dispose(false,false);for(const material of materials)material.dispose(false,false);for(const texture of textures)texture.dispose();}};
}
