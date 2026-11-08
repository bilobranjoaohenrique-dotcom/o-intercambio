import type {Scene} from '@babylonjs/core/scene';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import {RenderTargetTexture} from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {ROOM} from '../game/layout';
import type {InteractionTarget} from '../game/types';
import {homeMaterials} from './textures';
import {HomeGeometry} from './props';
import {buildBedroom} from './bedroom';
import {buildHallway} from './hallway';
import {HALLWAY} from '../game/hallwayLayout';
import {buildLivingRoom} from './livingRoom';
import {LIVING_ROOM_WORLD_OBJECTS} from '../game/livingRoomPlacement';
import {isTravelBagTaken} from '../game/garageProgress';

type LivingRoomCallbacks = {
 onTelevisionChange?:(on:boolean,position:{x:number;y:number;z:number})=>void;
 onTelevisionClick?:()=>void;
};

/** Independently lit bedroom and hallway sets share one connected home.
 * Their geometry stays separate from chapter progression and interaction rules. */
export function buildEnvironment(scene:Scene,callbacks:LivingRoomCallbacks={}){
 const m=homeMaterials(scene),g=new HomeGeometry(scene);
 const b=g.box.bind(g),c=g.cylinder.bind(g);
 const bedroom=buildBedroom(scene);
 const hallway=buildHallway(scene);
 const living=buildLivingRoom(scene);
 const setTelevision=(on:boolean)=>{living.setTV(on);callbacks.onTelevisionChange?.(on,LIVING_ROOM_WORLD_OBJECTS.tv);};
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
 const shadowGenerator=new ShadowGenerator(512,sun);shadowGenerator.bias=.0015;shadowGenerator.normalBias=.025;
 shadowGenerator.useBlurExponentialShadowMap=true;shadowGenerator.blurScale=2;shadowGenerator.blurKernel=8;
 const casterMaterials=new Set([m.plaster,m.ceiling,m.wood,m.darkWood,m.plastic,m.metal,m.linen,m.blanket,m.curtain,m.olive,m.clothes,m.navy]);
 for(const mesh of [...staticMeshes,...[...g.targets.values()].flat()])if(mesh.metadata?.castShadow&&casterMaterials.has(mesh.material as typeof m.wood))shadowGenerator.addShadowCaster(mesh);
 const shadowMap=shadowGenerator.getShadowMap()!;shadowMap.refreshRate=RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
 const refreshShadows=()=>shadowMap.resetRefreshCounter();
 // Local bedroom lighting never changes the preserved corridor or kitchen.
 for(const light of[ambient,sun])light.excludedMeshes.push(...bedroom.meshes,...hallway.meshes,...living.meshes);
 const targets:InteractionTarget[]=[
  {id:'suitcase',meshes:bedroom.targets.get('suitcase')??[],label:()=> 'Examinar mochila',execute:()=> 'Minha mochila. Quase tudo pronto para a viagem.'},
  {id:'calendar',meshes:bedroom.targets.get('calendar')??[],label:()=> 'Consultar calendário',execute:()=> '13 de junho. Hoje é o dia da viagem.'},
  {id:'photo',meshes:bedroom.targets.get('photo')??[],label:()=> 'Examinar fotografia',execute:()=> 'Nós três, antes de tudo mudar. Vou sentir falta de casa.'},
  {id:'hall-switch',meshes:hallway.targets.get('hall-switch')??[],label:()=>hallway.lightOn?'Apagar luz do corredor':'Acender luz do corredor',execute:()=>{hallway.setLight(!hallway.lightOn);return hallway.lightOn?'Luz do corredor acesa.':'Luz do corredor apagada.'}},
  {id:'switch',meshes:bedroom.targets.get('switch')??[],label:()=>bedroom.roomLightOn?'Apagar luz':'Acender luz',execute:()=>{bedroom.setRoomLight(!bedroom.roomLightOn);return bedroom.roomLightOn?'Luz acesa.':'Luz apagada.'}},
  {id:'living-tv',meshes:living.targets.get('living-tv')??[],label:()=>living.tvOn?'Desligar TV':'Ligar TV',execute:()=>{callbacks.onTelevisionClick?.();setTelevision(!living.tvOn);}},
  {id:'living-phone',meshes:living.targets.get('living-phone')??[],label:()=> 'Examinar telefone',execute:()=> 'Esse telefone está aqui desde que eu era pequeno.'},
  {id:'living-photo',meshes:living.targets.get('living-photo')??[],label:()=> 'Examinar fotografia',execute:()=> 'Essa foto foi tirada nas nossas últimas férias.'},
  {id:'living-exit',meshes:living.targets.get('living-exit')??[],label:()=> 'Tentar abrir a porta',execute:()=> 'Ainda tenho algumas coisas para resolver antes de sair.'},
 ];
 const syncTravelBag=()=>{for(const mesh of bedroom.targets.get('suitcase')??[])mesh.setEnabled(!isTravelBagTaken());bedroom.refreshShadows();};
 return{targets,setTelevision,syncTravelBag,setHallLight:hallway.setLight,setRoomLight:bedroom.setRoomLight,get roomLightOn(){return bedroom.roomLightOn;},shadowGenerator,
  // Only the preserved moving bedroom door invalidates these maps. Living-room
  // geometry is static and owns its one-time shadow refresh independently.
  refreshShadows(){refreshShadows();bedroom.refreshShadows();hallway.refreshShadows();},
  addDoorMeshes(meshes:readonly AbstractMesh[]){bedroom.addShadowMeshes(meshes);hallway.addDoorCasters(meshes);for(const light of[ambient,sun])light.excludedMeshes.push(...meshes);},
  get hallwayDiagnostics(){return{version:'corredor-referencia-1',lightOn:hallway.lightOn,meshes:hallway.meshes.length,width:HALLWAY.maxX-HALLWAY.minX,length:HALLWAY.endZ-HALLWAY.startZ};},
  get bedroomDiagnostics(){return{version:'quarto-referencia-1',meshes:bedroom.meshes.length,width:ROOM.maxX-ROOM.minX,depth:ROOM.maxZ-ROOM.minZ,height:ROOM.ceiling-ROOM.floor};},
  get livingRoomDiagnostics(){return{...living.diagnostics,tvOn:living.tvOn};},
  dispose(){setTelevision(false);living.dispose();bedroom.dispose();hallway.dispose();shadowGenerator.dispose();ambient.dispose();sun.dispose();for(const mesh of [...staticMeshes,...[...g.targets.values()].flat()])if(!mesh.isDisposed())mesh.dispose();m.dispose();}};
}
