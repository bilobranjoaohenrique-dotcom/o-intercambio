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
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {ROOM,HALL,STAIRS,KITCHEN} from '../game/layout';
import type {InteractionTarget} from '../game/types';
import {homeMaterials} from './textures';
import {HomeGeometry} from './props';
import {buildBedroom} from './bedroom';

/** The bedroom is a separate, reference-led set; the connected hallway and
 * stairs retain their shared physical layout and the existing chapter flow. */
export function buildEnvironment(scene:Scene){
 const m=homeMaterials(scene),g=new HomeGeometry(scene);
 const b=g.box.bind(g),c=g.cylinder.bind(g);
 const bedroom=buildBedroom(scene);
 // Residential hallway, closed side doors, a picture and the complete flight
 // of sixteen physical treads. The first tread is one rise below the landing.
 const hallW=HALL.maxX-HALL.minX,hallLength=HALL.endZ-HALL.startZ,hallX=(HALL.minX+HALL.maxX)/2;
 b('piso superior do corredor',hallW,.13,STAIRS.startZ-HALL.startZ,hallX,STAIRS.topY-.065,(HALL.startZ+STAIRS.startZ)/2,m.floor);
 b('teto do corredor',hallW+.32,.14,hallLength+.16,hallX,ROOM.ceiling+.07,(HALL.startZ+HALL.endZ)/2,m.ceiling);
 // Recess the hallway's end caps behind the bedroom wall thickness. A cap
 // at startZ was coplanar with its inner face and produced a pale flickering
 // strip above the calendar when viewed from the window.
 const hallWallStart=HALL.startZ+.121;
 for(const x of[HALL.minX-.08,HALL.maxX+.08])b('parede do corredor',.16,ROOM.ceiling,HALL.endZ-hallWallStart,x,ROOM.ceiling/2,(hallWallStart+HALL.endZ)/2,m.plaster);
 const rise=(STAIRS.topY-STAIRS.bottomY)/STAIRS.steps,depth=(STAIRS.endZ-STAIRS.startZ)/STAIRS.steps;
 for(let i=0;i<STAIRS.steps;i++){
  const y=STAIRS.topY-(i+1)*rise,z=STAIRS.startZ+(i+.5)*depth;
  b('degrau '+(i+1),hallW,Math.max(.032,y),depth,hallX,y-Math.max(.032,y)/2,z,m.wood);
  b('nariz do degrau '+(i+1),hallW,.026,.035,hallX,y-.007,z-depth/2+.008,m.darkWood);
 }
 b('patamar inferior',hallW,.13,HALL.endZ-STAIRS.endZ,hallX,STAIRS.bottomY-.065,(STAIRS.endZ+HALL.endZ)/2,m.floor);
 // The landing opens into the kitchen. Side wall returns frame the doorway.
 b('parede final do patamar à esquerda',.55,ROOM.ceiling,.16,HALL.minX+.27,ROOM.ceiling/2,HALL.endZ+.08,m.plaster);
 b('parede final do patamar à direita',.55,ROOM.ceiling,.16,HALL.maxX-.27,ROOM.ceiling/2,HALL.endZ+.08,m.plaster);
 b('verga da entrada da cozinha',1.05,1.02,.16,hallX,ROOM.ceiling-.51,HALL.endZ+.08,m.plaster);
 b('piso de ligação da cozinha',KITCHEN.maxX-KITCHEN.minX,.14,.42,0,-.07,KITCHEN.startZ+.02,m.floor);
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
 c('luminária do corredor',.05,.24,.24,hallX,ROOM.ceiling-.07,5.8,m.ivory);
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
 const shadowGenerator=new ShadowGenerator(512,sun);shadowGenerator.bias=.0015;shadowGenerator.normalBias=.025;
 shadowGenerator.useBlurExponentialShadowMap=true;shadowGenerator.blurScale=2;shadowGenerator.blurKernel=8;
 const casterMaterials=new Set([m.plaster,m.ceiling,m.wood,m.darkWood,m.plastic,m.metal,m.linen,m.blanket,m.curtain,m.olive,m.clothes,m.navy]);
 for(const mesh of [...staticMeshes,...[...g.targets.values()].flat()])if(mesh.metadata?.castShadow&&casterMaterials.has(mesh.material as typeof m.wood))shadowGenerator.addShadowCaster(mesh);
 const shadowMap=shadowGenerator.getShadowMap()!;shadowMap.refreshRate=RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
 const refreshShadows=()=>shadowMap.resetRefreshCounter();
 // Local bedroom lighting never changes the preserved corridor or kitchen.
 for(const light of[ambient,sun,hallLight])light.excludedMeshes.push(...bedroom.meshes);
 const targets:InteractionTarget[]=[
  {id:'suitcase',meshes:bedroom.targets.get('suitcase')??[],label:()=> 'Examinar mochila',execute:()=> 'Minha mochila. Quase tudo pronto para a viagem.'},
  {id:'calendar',meshes:bedroom.targets.get('calendar')??[],label:()=> 'Consultar calendário',execute:()=> '13 de junho. Hoje é o dia da viagem.'},
  {id:'photo',meshes:bedroom.targets.get('photo')??[],label:()=> 'Examinar fotografia',execute:()=> 'Nós três, antes de tudo mudar. Vou sentir falta de casa.'},
  {id:'switch',meshes:bedroom.targets.get('switch')??[],label:()=>bedroom.roomLightOn?'Apagar luz':'Acender luz',execute:()=>{bedroom.setRoomLight(!bedroom.roomLightOn);return bedroom.roomLightOn?'Luz acesa.':'Luz apagada.'}},
 ];
 return{targets,setRoomLight:bedroom.setRoomLight,get roomLightOn(){return bedroom.roomLightOn;},shadowGenerator,
  refreshShadows(){refreshShadows();bedroom.refreshShadows();},
  addDoorMeshes(meshes:readonly AbstractMesh[]){bedroom.addShadowMeshes(meshes);for(const light of[ambient,sun,hallLight])light.excludedMeshes.push(...meshes);},
  get bedroomDiagnostics(){return{version:'quarto-referencia-1',meshes:bedroom.meshes.length,width:ROOM.maxX-ROOM.minX,depth:ROOM.maxZ-ROOM.minZ,height:ROOM.ceiling-ROOM.floor};},
  dispose(){bedroom.dispose();shadowGenerator.dispose();ambient.dispose();sun.dispose();hallLight.dispose();for(const mesh of [...staticMeshes,...[...g.targets.values()].flat()])if(!mesh.isDisposed())mesh.dispose();m.dispose();}};
}
