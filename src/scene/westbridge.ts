import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Material } from '@babylonjs/core/Materials/material';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import '@babylonjs/loaders/glTF';
import type { InteractionTarget, Settings } from '../game/types';
import { createWestbridgeLighting, type WestbridgeTime } from './westbridgeLighting';
import { buildWestbridgeProps } from './westbridgeProps';
import { applyWestbridgeHouseScale } from './westbridgeHouseScale';
import { WB_HOST_DOOR } from '../game/westbridgeLayout';
import { WB_HOUSE_DOOR_HEIGHT } from '../game/westbridgeHouseScale';

const SOURCE='/models/westbridge.glb',ORIGIN_X=500;
const wp=(x:number,y:number,z:number)=>new Vector3(ORIGIN_X-x,y,z);

/** One streamed, reversible outdoor set. GLB node transforms, topology,
 * materials and UVs are retained; measured house heights are corrected locally. */
export function buildWestbridge(scene:Scene,options:{quality?:Settings['quality']}={}){
  // Identity world root lets the car and borrowed host actors use the measured
  // world-space route. Only the imported neighbourhood child is translated.
  const root=new TransformNode('Westbridge · bairro jogável',scene);root.setEnabled(false);
  const modelRoot=new TransformNode('Westbridge · origem do GLB preservado',scene);modelRoot.parent=root;modelRoot.position.x=ORIGIN_X;
  const oldLights=[...scene.lights],meshes:AbstractMesh[]=[],importedMeshes:AbstractMesh[]=[],extras:AbstractMesh[]=[];
  const ownMaterials:Material[]=[],windows:{material:PBRMaterial;host:boolean;day:Color3}[]=[];
  let active=false,loaded=false,disposed=false,error:string|null=null,loading:Promise<void>|null=null;
  let quality:Settings['quality']=options.quality??'balanced',timeOfDay:WestbridgeTime='afternoon';
  let container:AssetContainer|null=null,lighting:ReturnType<typeof createWestbridgeLighting>|null=null,props:ReturnType<typeof buildWestbridgeProps>|null=null;
  let houseScale:ReturnType<typeof applyWestbridgeHouseScale>|null=null;
  const hiddenForeign:AbstractMesh[]=[];
  const proxyMaterial=new StandardMaterial('Westbridge · referências invisíveis de interação',scene);proxyMaterial.disableLighting=true;
  function proxy(name:string,position:Vector3,size:[number,number,number]){
    const mesh=MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);
    mesh.parent=root;mesh.position.copyFrom(position);mesh.material=proxyMaterial;mesh.visibility=.001;mesh.isPickable=true;
    mesh.metadata={castShadow:false,westbridgeProxy:true};meshes.push(mesh);return mesh;
  }
  // These references exist before the global interaction registry is created.
  const door=proxy('Westbridge · entrada de Daniel e Helen',new Vector3(WB_HOST_DOOR.x,WB_HOST_DOOR.y,-12.60),[.93,WB_HOUSE_DOOR_HEIGHT,.055]);
  const mailbox=proxy('Westbridge · caixa de correio dos anfitriões',wp(27.2,1.12,-5.48),[.35,.36,.53]);
  const targets:InteractionTarget[]=[
    {id:'wb-house-door',meshes:[door],label:()=> 'Porta da casa dos anfitriões',execute:()=>undefined},
    {id:'wb-mailbox',meshes:[mailbox],label:()=> 'Examinar caixa de correio',execute:()=> 'A caixa de correio fica junto à entrada da garagem.'},
  ];
  function allMeshes(){return [...meshes,...extras];}
  function excludeOldLights(){const own=new Set(allMeshes());for(const light of oldLights){light.excludedMeshes=light.excludedMeshes.filter(mesh=>!own.has(mesh));light.excludedMeshes.push(...own);}}
  function restoreForeign(){for(const mesh of hiddenForeign)if(!mesh.isDisposed())mesh.setEnabled(true);hiddenForeign.length=0;}
  function applyWindows(){
    for(const window of windows){
      if(timeOfDay==='night')window.material.emissiveColor.set(window.host?.34:.09,window.host?.19:.061,window.host?.075:.032);
      else window.material.emissiveColor.copyFrom(window.day);
    }
    props?.setNight(timeOfDay==='night');
  }
  function setActive(value:boolean){
    if(disposed||value===active)return;
    if(value){
      for(const mesh of scene.meshes)if(mesh.isEnabled()&&!mesh.isDescendantOf(root)){
        hiddenForeign.push(mesh);mesh.setEnabled(false);
      }
      active=true;root.setEnabled(true);lighting?.setActive(true);
    }else{
      lighting?.setActive(false);active=false;root.setEnabled(false);restoreForeign();
    }
  }
  function ensureReady():Promise<void>{
    if(disposed)return Promise.reject(new Error('Westbridge já foi encerrado.'));
    if(loading)return loading;
    loading=LoadAssetContainerAsync(SOURCE,scene,{pluginExtension:'.glb',pluginOptions:{gltf:{animationStartMode:0}}}).then(asset=>{
      if(disposed){asset.dispose();return;}
      container=asset;
      const nodes=[...asset.transformNodes,...asset.meshes],all=new Set<TransformNode>(nodes);
      for(const node of nodes)if(!node.parent||!all.has(node.parent as TransformNode))node.parent=modelRoot;
      for(const node of nodes)if(node.name.includes('HOST_FAMILY_HOUSE_DANIEL_HELEN'))node.metadata={...node.metadata,hostFamilyHouse:true,landmark:'HOST_FAMILY_HOUSE_DANIEL_HELEN'};
      for(const mesh of asset.meshes)mesh.computeWorldMatrix(true);
      houseScale=applyWestbridgeHouseScale(asset.meshes,ORIGIN_X);
      for(const mesh of asset.meshes){
        if(!mesh.getTotalVertices())continue;
        mesh.isPickable=true;mesh.receiveShadows=true;
        mesh.metadata={...mesh.metadata,importedWestbridge:true,source:SOURCE,castShadow:!/Aggregate asphalt|concrete|lawn|road paint|Soil|Mulch|Water/i.test(mesh.name)};
        importedMeshes.push(mesh);mesh.computeWorldMatrix(true);
        if(/WindowGlow/.test(mesh.name)&&mesh.material instanceof PBRMaterial){
          const clone=mesh.material.clone(mesh.name+' · iluminação residencial local');
          if(clone){mesh.material=clone;ownMaterials.push(clone);windows.push({material:clone,host:mesh.name.includes('HOST_FAMILY_HOUSE_DANIEL_HELEN'),day:clone.emissiveColor.clone()});}
        }
      }
      for(const material of [...asset.materials,...ownMaterials])if('maxSimultaneousLights' in material)material.maxSimultaneousLights=4;
      for(const clip of asset.animationGroups)clip.stop(true);
      asset.addAllToScene();meshes.push(...importedMeshes);
      props=buildWestbridgeProps(scene,root);meshes.push(...props.meshes);
      lighting=createWestbridgeLighting(scene,root,quality);meshes.push(lighting.sky);
      lighting.setMeshes([...importedMeshes,...props.meshes]);lighting.setExtraMeshes(extras);lighting.setTimeOfDay(timeOfDay);
      excludeOldLights();applyWindows();lighting.setActive(active);loaded=true;
    }).catch(reason=>{error=String(reason?.message??reason);throw new Error('Não foi possível carregar Westbridge: '+error);});
    return loading;
  }
  return{
    root,meshes,targets,ensureReady,setActive,
    setExtraMeshes(values:AbstractMesh[]){
      const previous=new Set(extras);for(const light of oldLights)light.excludedMeshes=light.excludedMeshes.filter(mesh=>!previous.has(mesh));
      extras.length=0;extras.push(...values);for(const mesh of extras)mesh.receiveShadows=mesh.metadata?.westbridgeInterior!==true;
      lighting?.setExtraMeshes(extras);excludeOldLights();
    },
    setQuality(value:Settings['quality']){quality=value;lighting?.setQuality(value);},
    setTimeOfDay(value:WestbridgeTime){timeOfDay=value;lighting?.setTimeOfDay(value);applyWindows();},
    refreshShadows(){lighting?.refreshShadows();},
    animate(_time:number){/* Static sky, windows and shadow map need no per-frame rebuild. */},
    get obstacles(){return props?.obstacles??[];},
    get diagnostics(){return{active,loaded,ready:loaded&&!error,loading:!!loading&&!loaded,error,source:SOURCE,
      origin:{x:ORIGIN_X,y:0,z:0},sourceNodeTransformsPreserved:true,sourceGeometryPreserved:false,
      sourceAssetUnmodified:true,sourceTopologyPreserved:true,houseScale,
      importedMeshes:importedMeshes.length,vertices:importedMeshes.reduce((sum,mesh)=>sum+mesh.getTotalVertices(),0),
      triangles:importedMeshes.reduce((sum,mesh)=>sum+mesh.getTotalIndices()/3,0),
      materials:container?.materials.length??0,textures:container?.textures.length??0,
      allTexturesReady:container?.textures.every(texture=>texture.isReady())??false,
      props:props?.diagnostics??null,lighting:lighting?.diagnostics??null,extraMeshes:extras.length,
      foreignMeshesHidden:hiddenForeign.length,foreignMeshesVisible:active?scene.meshes.filter(mesh=>mesh.getTotalVertices()>0&&mesh.isEnabled()&&mesh.isVisible&&mesh.visibility>0&&!mesh.isDescendantOf(root)).length:null,
      loadedSelectively:true,hostHouse:'HOST_FAMILY_HOUSE_DANIEL_HELEN',timeOfDay};},
    dispose(){
      if(disposed)return;setActive(false);disposed=true;
      const own=new Set(allMeshes());for(const light of oldLights)light.excludedMeshes=light.excludedMeshes.filter(mesh=>!own.has(mesh));
      lighting?.dispose();props?.dispose();for(const material of ownMaterials)material.dispose(false,false);container?.dispose();
      root.dispose(false,false);proxyMaterial.dispose();
    },
  };
}
