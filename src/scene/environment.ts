import type {Scene} from '@babylonjs/core/scene';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight';
import {PointLight} from '@babylonjs/core/Lights/pointLight';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import {RenderTargetTexture} from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {ROOM,HALL,STAIRS,DOOR,OBJECTS} from '../game/layout';
import type {InteractionTarget} from '../game/types';
import {homeMaterials} from './textures';
import {HomeGeometry,bedroomProps} from './props';

/** Prototype 01 is an ordinary lived-in home on a warm morning. This module
 * owns only its 3D surfaces/lights and four optional room interactions. All
 * dimensions come from the same layout used by the independent controller. */
export function buildEnvironment(scene:Scene){
 const m=homeMaterials(scene),g=new HomeGeometry(scene),floor=ROOM.floor;
 const b=g.box.bind(g),c=g.cylinder.bind(g);
 const roomWidth=ROOM.maxX-ROOM.minX,roomDepth=ROOM.maxZ-ROOM.minZ,height=ROOM.ceiling-floor;
 // Interior limits stay free: wall thickness grows outwards from the layout.
 b('piso do quarto',roomWidth,.16,roomDepth,0,floor-.08,(ROOM.minZ+ROOM.maxZ)/2,m.floor);
 b('teto do quarto',roomWidth+.32,.14,roomDepth+.32,0,ROOM.ceiling+.07,(ROOM.minZ+ROOM.maxZ)/2,m.ceiling);
 b('parede norte',roomWidth+.32,height,.16,0,floor+height/2,ROOM.minZ-.08,m.plaster);
 b('parede leste',.16,height,roomDepth,ROOM.maxX+.08,floor+height/2,(ROOM.minZ+ROOM.maxZ)/2,m.plaster);
 const westWall=(name:string,z0:number,z1:number,y0:number,y1:number)=>b(name,.16,y1-y0,z1-z0,ROOM.minX-.08,(y0+y1)/2,(z0+z1)/2,m.plaster);
 westWall('parede a norte da janela',ROOM.minZ,-1.1,floor,ROOM.ceiling);
 westWall('parede a sul da janela',.4,ROOM.maxZ,floor,ROOM.ceiling);
 westWall('parede abaixo da janela',-1.1,.4,floor,4.0);
 westWall('verga da janela',-1.1,.4,5.25,ROOM.ceiling);
 const south=(name:string,x0:number,x1:number,y0:number,y1:number)=>b(name,x1-x0,y1-y0,.16,(x0+x1)/2,(y0+y1)/2,ROOM.maxZ+.08,m.plaster);
 south('parede sul à esquerda da porta',ROOM.minX,DOOR.hingeX,floor,ROOM.ceiling);
 south('parede sul à direita da porta',DOOR.hingeX+DOOR.width,ROOM.maxX,floor,ROOM.ceiling);
 south('parede acima da porta',DOOR.hingeX,DOOR.hingeX+DOOR.width,floor+DOOR.height,ROOM.ceiling);
 // Baseboards and narrow ceiling coving have actual depth and worn wood.
 for(const z of[ROOM.minZ+.018,ROOM.maxZ-.018]){
  if(z<0)b('rodapé norte',roomWidth,.085,.035,0,floor+.0425,z,m.darkWood);
  else{b('rodapé sul esquerdo',DOOR.hingeX-ROOM.minX,.085,.035,(DOOR.hingeX+ROOM.minX)/2,floor+.0425,z,m.darkWood);b('rodapé sul direito',ROOM.maxX-DOOR.hingeX-DOOR.width,.085,.035,(ROOM.maxX+DOOR.hingeX+DOOR.width)/2,floor+.0425,z,m.darkWood);}
 }
 for(const x of[ROOM.minX+.018,ROOM.maxX-.018]){b('rodapé lateral',.035,.085,roomDepth,x,floor+.0425,(ROOM.minZ+ROOM.maxZ)/2,m.darkWood);b('moldura do teto',.04,.035,roomDepth,x,ROOM.ceiling-.018,(ROOM.minZ+ROOM.maxZ)/2,m.ivory);}
 // The bedroom has a genuinely cut-out west window with a neighbourhood
 // behind it. Neither the view nor the furniture is a background photograph.
 for(const z of[-1.1,.4])b('batente vertical da janela',.095,1.34,.055,ROOM.minX+.015,4.625,z,m.ivory);
 for(const y of[4.0,5.25])b('batente horizontal da janela',.105,.055,1.55,ROOM.minX+.025,y,-.35,m.ivory);
 b('peitoril',.23,.055,1.65,ROOM.minX+.045,3.99,-.35,m.wood);
 b('montante central da janela',.055,1.2,.035,ROOM.minX+.035,4.625,-.35,m.ivory);
 b('travessa central da janela',.055,.033,1.45,ROOM.minX+.035,4.625,-.35,m.ivory);
 const glass=g.plane('vidro da janela',1.45,1.2,ROOM.minX-.01,4.625,-.35,m.glass,-Math.PI/2);glass.isPickable=false;glass.metadata.castShadow=false;
 g.rod('varão da cortina',{x:ROOM.minX+.16,y:5.36,z:-1.28},{x:ROOM.minX+.16,y:5.36,z:.57},.012,m.metal);
 for(const start of[-1.3,.29])g.cloth('cortina com pregas',12,16,(u,v)=>({x:ROOM.minX+.13+Math.cos(u*Math.PI*8)*.023,y:5.31-v*1.67+Math.sin(u*24)*.018,z:start+u*.39+Math.sin(v*3.5)*.012}),m.curtain);
 for(const z of[-1.2,-1.1,-1.0,.35,.45,.55])c('argola da cortina',.018,.028,.028,ROOM.minX+.16,5.34,z,m.metal,undefined,8);
 const props=bedroomProps(g,m);
 // Original posters and family pictures are ordinary framed paper surfaces.
 const northPoster=(name:string,x:number,y:number,w:number,h:number,index:number)=>{
  b(name+' moldura',w+.035,h+.035,.025,x,y,ROOM.minZ+.027,m.darkWood);
  g.plane(name,w,h,x,y,ROOM.minZ+.042,m.posters[index],Math.PI);
 };
 northPoster('pôster de astronomia',-1.22,4.89,.5,.7,0);
 northPoster('pôster de música',1.5,4.99,.55,.68,1);
 const mapFrame=b('moldura do mapa',.56,.75,.025,ROOM.maxX-.025,4.98,-2.05,m.darkWood);mapFrame.rotation.y=Math.PI/2;
 g.plane('mapa de lugares para conhecer',.52,.71,ROOM.maxX-.042,4.98,-2.05,m.posters[2],Math.PI/2);
 const cal=OBJECTS.calendar;
 b('folha e suporte do calendário',.4,.5,.022,cal.x,cal.y,cal.z,m.paper,'calendar');
 g.plane('calendário com o dia 13 marcado',.38,.48,cal.x,cal.y,cal.z+.014,m.calendar,Math.PI,'calendar');
 const photo=OBJECTS.photo,photoFrame=b('moldura da fotografia',.5,.365,.027,photo.x,photo.y,photo.z,m.darkWood,'photo');photoFrame.rotation.y=Math.PI/2;
 g.plane('fotografia com os pais',.445,.312,photo.x-.019,photo.y,photo.z,m.family,Math.PI/2,'photo');
 // Several little ordinary pictures make the room personal without adding
 // explanatory text or inventing another narrative scene.
 for(const[x,y,z]of[[-.9,4.48,ROOM.minZ+.04],[-1.65,4.38,ROOM.minZ+.04]] as const){b('pequena foto na parede',.18,.22,.012,x,y,z,m.paper);g.plane('lembrança da família',.16,.19,x,y,z+.008,m.family,Math.PI);}
 const switchPoint=OBJECTS.switch;
 b('placa do interruptor',.085,.125,.018,switchPoint.x,switchPoint.y,switchPoint.z,m.ivory,'switch');
 const rocker=b('tecla do interruptor',.047,.07,.015,switchPoint.x,switchPoint.y,switchPoint.z-.013,m.paper,'switch');
 // A plain flush ceiling fitting belongs to the beginning's normality.
 c('base da luminária do teto',.035,.29,.29,.1,ROOM.ceiling-.019,-.2,m.ivory);
 const bulbMaterial=m.material('difusor da luminária','#c8c8b3');
 const ceilingBulb=g.sphere('difusor fosco',.24,.072,.24,.1,ROOM.ceiling-.065,-.2,bulbMaterial);ceilingBulb.metadata.castShadow=false;
 // Residential hallway, closed side doors, a picture and the complete flight
 // of sixteen physical treads. The first tread is one rise below the landing.
 const hallW=HALL.maxX-HALL.minX,hallLength=HALL.endZ-HALL.startZ,hallX=(HALL.minX+HALL.maxX)/2;
 b('piso superior do corredor',hallW,.13,STAIRS.startZ-HALL.startZ,hallX,STAIRS.topY-.065,(HALL.startZ+STAIRS.startZ)/2,m.floor);
 b('teto do corredor',hallW+.32,.14,hallLength+.16,hallX,ROOM.ceiling+.07,(HALL.startZ+HALL.endZ)/2,m.ceiling);
 for(const x of[HALL.minX-.08,HALL.maxX+.08])b('parede do corredor',.16,ROOM.ceiling,hallLength,x,ROOM.ceiling/2,(HALL.startZ+HALL.endZ)/2,m.plaster);
 const rise=(STAIRS.topY-STAIRS.bottomY)/STAIRS.steps,depth=(STAIRS.endZ-STAIRS.startZ)/STAIRS.steps;
 for(let i=0;i<STAIRS.steps;i++){
  const y=STAIRS.topY-(i+1)*rise,z=STAIRS.startZ+(i+.5)*depth;
  b('degrau '+(i+1),hallW,Math.max(.032,y),depth,hallX,y-Math.max(.032,y)/2,z,m.wood);
  b('nariz do degrau '+(i+1),hallW,.026,.035,hallX,y-.007,z-depth/2+.008,m.darkWood);
 }
 b('patamar inferior',hallW,.13,HALL.endZ-STAIRS.endZ,hallX,STAIRS.bottomY-.065,(STAIRS.endZ+HALL.endZ)/2,m.floor);
 b('parede final do patamar',hallW+.32,ROOM.ceiling,.16,hallX,ROOM.ceiling/2,HALL.endZ+.08,m.plaster);
 for(const x of[HALL.minX+.06,HALL.maxX-.06])g.rod('corrimão da escada',{x,y:STAIRS.topY+.9,z:STAIRS.startZ-.15},{x,y:STAIRS.bottomY+.9,z:STAIRS.endZ-.05},.028,m.darkWood);
 for(const side of[-1,1])for(let i=0;i<4;i++){
  const z=STAIRS.startZ+.2+i*1.2,y=STAIRS.topY-Math.min(STAIRS.topY,(z-STAIRS.startZ)/(STAIRS.endZ-STAIRS.startZ)*STAIRS.topY)+.88,x=side<0?HALL.minX+.05:HALL.maxX-.05;
  g.rod('suporte do corrimão',{x,y:y-.22,z},{x:x+(side<0?.055:-.055),y,z},.008,m.metal);
 }
 for(const[left,z]of[[true,4.95],[false,5.08]] as const){
  const x=left?HALL.minX+.022:HALL.maxX-.022;
  b('porta lateral fechada',.035,2.05,.84,x,STAIRS.topY+1.025,z,m.wood);
  for(const zz of[z-.46,z+.46])b('batente lateral fechado',.052,2.14,.045,x+(left?.025:-.025),STAIRS.topY+1.07,zz,m.ivory);
  b('verga da porta fechada',.055,.05,.96,x+(left?.025:-.025),STAIRS.topY+2.14,z,m.ivory);
  const knob=g.cylinder('maçaneta lateral',.045,.035,.035,x+(left?.05:-.05),STAIRS.topY+1.0,z+.28,m.metal,undefined,8);knob.rotation.z=Math.PI/2;
 }
 const hallFrame=b('quadro do corredor',.025,.45,.61,HALL.maxX-.03,4.65,3.9,m.darkWood);g.plane('paisagem familiar no corredor',.55,.39,HALL.maxX-.047,4.65,3.9,m.posters[2],Math.PI/2);
 hallFrame.metadata.castShadow=false;
 c('luminária do corredor',.05,.24,.24,hallX,5.63,5.8,m.ivory);
 // The exterior is deliberately modest: gardens, low houses and real foliage
 // at a distance beyond the window, never an additional playable district.
 b('jardins do bairro',55,.15,65,-15,-.13,-4,m.grass);
 b('calçada do bairro',3,.025,55,-9,.004,-5,m.concrete);
 b('rua tranquila',3.7,.02,55,-11.9,.0,-5,m.rubber);
 const houseRoof=(name:string,x:number,z:number,w:number,d:number,h:number)=>{
  const mesh=new Mesh(name,scene),positions=[x-w/2,h,z-d/2,x+w/2,h,z-d/2,x,h+1.1,z-d/2,x-w/2,h,z+d/2,x+w/2,h,z+d/2,x,h+1.1,z+d/2],indices=[0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4],normals:number[]=[];
  for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.applyToMesh(mesh);g.add(mesh,m.brick);
 };
 for(const[x,z,w,d]of[[-19,-9,5,6],[-20,2.5,5.5,5.7],[-21,14,5.5,6],[-28,-19,7,7],[-29,6,6,7]] as const){
  b('casa vizinha',w,3.2,d,x,1.6,z,m.house);houseRoof('telhado vizinho',x,z,w+.45,d+.45,3.2);
  for(const zz of[z-d*.25,z+d*.25])b('janela do vizinho',.03,.85,.75,x+w/2+.02,1.85,zz,m.plastic);
  b('porta do vizinho',.035,1.9,.85,x+w/2+.022,.95,z,m.darkWood);
 }
 for(let i=0;i<11;i++){
  const x=-7.1-(i%3)*3.9,z=-19+i*4.7,h=3.3+(i%3)*.45;
  c('tronco no jardim',h,.12,.22,x,h/2,z,m.darkWood,undefined,7);
  g.sphere('copa de árvore ao longe',2.1,2.7,2.1,x,h+.25,z,i%2?m.leaf:m.leafShade);
 }
 // Reuse the same few StandardMaterial batches, without hiding interaction
 // meshes inside one whole-room picking target or adding per-frame geometry.
 const staticMeshes=g.merge();
 const ambient=new HemisphericLight('luz ambiente da manhã',new Vector3(0,1,0),scene);ambient.intensity=.9;ambient.diffuse=new Color3(1,.96,.87);ambient.groundColor=new Color3(.5,.47,.4);
 const sun=new DirectionalLight('sol pela janela',new Vector3(.8,-.72,.28).normalize(),scene);sun.position.set(-10,12,-5);sun.diffuse=new Color3(1,.9,.73);sun.intensity=.9;sun.shadowMinZ=.1;sun.shadowMaxZ=48;sun.shadowFrustumSize=22;
 const hallLight=new PointLight('luz doméstica do corredor',new Vector3(hallX,4.8,7.1),scene);hallLight.diffuse=new Color3(1,.88,.7);hallLight.intensity=.47;hallLight.range=12;
 const roomLight=new PointLight('luz do quarto',new Vector3(.1,5.36,-.2),scene);roomLight.diffuse=new Color3(1,.9,.73);roomLight.range=10;roomLight.intensity=.82;roomLight.setEnabled(false);
 const shadowGenerator=new ShadowGenerator(512,sun);shadowGenerator.bias=.0015;shadowGenerator.normalBias=.025;
 shadowGenerator.useBlurExponentialShadowMap=true;shadowGenerator.blurScale=2;shadowGenerator.blurKernel=8;
 const casterMaterials=new Set([m.plaster,m.ceiling,m.wood,m.darkWood,m.plastic,m.metal,m.linen,m.blanket,m.curtain,m.olive,m.clothes,m.navy]);
 for(const mesh of [...staticMeshes,...[...g.targets.values()].flat()])if(mesh.metadata?.castShadow&&casterMaterials.has(mesh.material as typeof m.wood))shadowGenerator.addShadowCaster(mesh);
 const shadowMap=shadowGenerator.getShadowMap()!;shadowMap.refreshRate=RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
 const refreshShadows=()=>shadowMap.resetRefreshCounter();
 let lightOn=false;
 function setRoomLight(on:boolean){lightOn=on;roomLight.setEnabled(on);rocker.rotation.x=on?-.14:.14;bulbMaterial.emissiveColor.set(on?.45:0,on?.4:0,on?.27:0);}
 setRoomLight(false);
 const targets:InteractionTarget[]=[
  {id:'suitcase',meshes:g.targets.get('suitcase')??[],label:()=> 'Examinar mala',execute:()=> 'Quase tudo pronto para a viagem.'},
  {id:'calendar',meshes:g.targets.get('calendar')??[],label:()=> 'Examinar calendário',execute:()=> 'Dia 13. A viagem está marcada.'},
  {id:'photo',meshes:g.targets.get('photo')??[],label:()=> 'Examinar fotografia',execute:()=> 'Vou sentir falta de casa.'},
  {id:'switch',meshes:g.targets.get('switch')??[],label:()=>lightOn?'Apagar luz':'Acender luz',execute:()=>{setRoomLight(!lightOn);return lightOn?'Luz acesa.':'Luz apagada.'}},
 ];
 return{targets,setRoomLight,get roomLightOn(){return lightOn;},shadowGenerator,refreshShadows,
  dispose(){shadowGenerator.dispose();ambient.dispose();sun.dispose();hallLight.dispose();roomLight.dispose();props.suitcasePivot.dispose();for(const mesh of [...staticMeshes,...[...g.targets.values()].flat()])if(!mesh.isDisposed())mesh.dispose();m.dispose();}};
}
