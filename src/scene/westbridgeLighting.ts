import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import type { Settings } from '../game/types';
import { WB_HOST_PORCH_CLEARANCE } from '../game/westbridgeHouseScale';
import { WB_PORCH_HEIGHT } from '../game/westbridgeLayout';

export type WestbridgeTime = 'afternoon' | 'night';
const point = (x: number, y: number, z: number) => new Vector3(500-x,y,z);

/** This rig is owned by one streamed set. Global scene state is restored when
 * the player leaves it; no home, airport or cabin material/light is changed. */
export function createWestbridgeLighting(scene: Scene, parent: TransformNode, initialQuality: Settings['quality']) {
  let active=false, quality=initialQuality, timeOfDay:WestbridgeTime='afternoon';
  let staticMeshes:AbstractMesh[]=[], extraMeshes:AbstractMesh[]=[], shadow:ShadowGenerator|null=null;
  const ambient=new HemisphericLight('Westbridge · céu difuso',new Vector3(0,1,0),scene);
  const sun=new DirectionalLight('Westbridge · sol baixo',new Vector3(-.60,-.40,-.50).normalize(),scene);
  // The host facade faces +Z. Light from the street warms that facade and
  // places the static shadow frustum over its real driveway/porch footprint.
  sun.position.set(535,42,40);sun.shadowMinZ=.1;sun.shadowMaxZ=350;sun.shadowFrustumSize=180;
  const porch=new PointLight('Westbridge · varanda dos anfitriões',point(20.96,WB_PORCH_HEIGHT+WB_HOST_PORCH_CLEARANCE-.11,-12.1),scene);
  // Measured source diffuser centres: X1/X25, Y5.7236, Z4.2624. Emit just
  // below the real housings instead of lighting an empty point between poles.
  const streetA=new PointLight('Westbridge · poste da esquina',point(1,5.65,4.2624),scene);
  const streetB=new PointLight('Westbridge · poste dos anfitriões',point(25,5.65,4.2624),scene);
  const lamps=[porch,streetA,streetB];
  for(const lamp of lamps){lamp.diffuse=new Color3(1,.73,.43);lamp.range=lamp===porch?9:23;}
  const lights=[ambient,sun,...lamps];for(const light of lights)light.setEnabled(false);
  const skyTexture=new DynamicTexture('Westbridge · gradiente pintado do céu',{width:512,height:256},scene,false,Texture.BILINEAR_SAMPLINGMODE);
  skyTexture.wrapU=Texture.WRAP_ADDRESSMODE;skyTexture.wrapV=Texture.CLAMP_ADDRESSMODE;
  const skyMaterial=new StandardMaterial('Westbridge · céu de fim de tarde',scene);
  skyMaterial.disableLighting=true;skyMaterial.emissiveColor=Color3.White();skyMaterial.diffuseTexture=skyTexture;
  skyMaterial.disableDepthWrite=true;skyMaterial.backFaceCulling=false;skyMaterial.fogEnabled=false;
  const sky=MeshBuilder.CreateSphere('Westbridge · céu local',{diameter:700,segments:24,sideOrientation:Mesh.BACKSIDE},scene);
  sky.parent=parent;sky.position.set(500,0,0);sky.material=skyMaterial;sky.isPickable=false;
  sky.infiniteDistance=false;sky.metadata={castShadow:false,westbridgeSky:true};
  let saved:{fogMode:number;fogColor:Color3;fogStart:number;fogEnd:number;fogDensity:number;clearColor:Color4;
    exposure:number;contrast:number;toneMappingEnabled:boolean;toneMappingType:number;camera:typeof scene.activeCamera;maxZ:number}|null=null;
  function paintSky(){
    const c=skyTexture.getContext() as unknown as CanvasRenderingContext2D;
    const gradient=c.createLinearGradient(0,0,0,256);
    if(timeOfDay==='afternoon'){
      gradient.addColorStop(0,'#526f82');gradient.addColorStop(.43,'#9aadb1');gradient.addColorStop(.53,'#d7c5a0');
      gradient.addColorStop(.64,'#e5bd91');gradient.addColorStop(.85,'#b1b09e');gradient.addColorStop(1,'#858c7e');
    }else{
      gradient.addColorStop(0,'#101b32');gradient.addColorStop(.46,'#26384a');gradient.addColorStop(.62,'#58616b');gradient.addColorStop(1,'#353f43');
    }
    c.fillStyle=gradient;c.fillRect(0,0,512,256);
    if(timeOfDay==='afternoon')for(let i=0;i<24;i++){
      const y=28+(i*31)%92,x=(i*127)%512;
      c.fillStyle=`rgba(229,215,188,${.035+(i%4)*.012})`;
      for(const offset of[-512,0,512]){c.beginPath();c.ellipse(x+offset,y,36+(i%6)*9,2+(i%3),-.06,0,Math.PI*2);c.fill();}
    }
    skyTexture.update(false);
  }
  function bindLights(){
    const all=[...staticMeshes,...extraMeshes];ambient.includedOnlyMeshes=all;sun.includedOnlyMeshes=all;
    for(const lamp of lamps)lamp.includedOnlyMeshes=[];
    for(const mesh of all){
      if(mesh.isDisposed())continue;
      mesh.computeWorldMatrix(true);
      const center=mesh.getBoundingInfo().boundingBox.centerWorld;
      const closest=[...lamps].sort((a,b)=>Vector3.DistanceSquared(a.position,center)-Vector3.DistanceSquared(b.position,center)).slice(0,2);
      for(const lamp of closest)lamp.includedOnlyMeshes.push(mesh);
    }
  }
  function rebuildShadow(){
    shadow?.dispose();shadow=null;
    if(quality==='low')return;
    shadow=new ShadowGenerator(quality==='high'?2048:1024,sun);
    shadow.bias=.0012;shadow.normalBias=.055;shadow.usePercentageCloserFiltering=true;
    shadow.filteringQuality=quality==='high'?ShadowGenerator.QUALITY_MEDIUM:ShadowGenerator.QUALITY_LOW;
    // Static city geometry is rendered once; extra moving actors receive the
    // neighbourhood shadows rather than leaving stale silhouettes in the map.
    for(const mesh of staticMeshes)if(mesh instanceof Mesh&&mesh.metadata?.castShadow!==false)shadow.addShadowCaster(mesh,false);
    const map=shadow.getShadowMap();if(map)map.refreshRate=RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    if(map)map.renderList=active?map.renderList:[];
  }
  function apply(){
    const night=timeOfDay==='night';
    ambient.intensity=night?.30:.88;ambient.diffuse.set(night?.59:.96,night?.68:.94,night?.86:.87);
    ambient.groundColor.set(night?.13:.58,night?.16:.53,night?.23:.45);
    sun.intensity=night?.065:1.30;sun.diffuse.set(1,night?.82:.85,night?.66:.68);
    porch.intensity=night?3.4:.8;streetA.intensity=streetB.intensity=night?5.8:0;
    for(const light of lights)light.setEnabled(active);
    sky.setEnabled(active);
    if(active){
      scene.fogMode=SceneFogLinear;scene.fogColor=night?new Color3(.13,.18,.23):new Color3(.69,.70,.65);
      scene.fogStart=night?58:95;scene.fogEnd=night?190:260;
      scene.clearColor=night?new Color4(.13,.18,.23,1):new Color4(.69,.70,.65,1);
      const process=scene.imageProcessingConfiguration;
      process.exposure=night?1.08:1.04;process.contrast=1.08;process.toneMappingEnabled=true;
      process.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;
      if(scene.activeCamera)scene.activeCamera.maxZ=500;
    }
  }
  // Avoid a runtime import of Scene solely for its constant.
  const SceneFogLinear=3;
  paintSky();apply();
  return{
    sky,lights,
    setMeshes(meshes:AbstractMesh[]){staticMeshes=meshes;bindLights();rebuildShadow();},
    setExtraMeshes(meshes:AbstractMesh[]){extraMeshes=meshes;bindLights();},
    setQuality(value:Settings['quality']){if(value===quality)return;quality=value;rebuildShadow();},
    setTimeOfDay(value:WestbridgeTime){if(value===timeOfDay)return;timeOfDay=value;paintSky();apply();shadow?.getShadowMap()?.resetRefreshCounter();},
    setActive(value:boolean){
      if(value===active)return;
      if(value){
        const p=scene.imageProcessingConfiguration;
        saved={fogMode:scene.fogMode,fogColor:scene.fogColor.clone(),fogStart:scene.fogStart,fogEnd:scene.fogEnd,fogDensity:scene.fogDensity,
          clearColor:scene.clearColor.clone(),exposure:p.exposure,contrast:p.contrast,toneMappingEnabled:p.toneMappingEnabled,toneMappingType:p.toneMappingType,
          camera:scene.activeCamera,maxZ:scene.activeCamera?.maxZ??95};
        active=true;bindLights();rebuildShadow();apply();
      }else{
        active=false;for(const light of lights)light.setEnabled(false);sky.setEnabled(false);
        if(saved){
          scene.fogMode=saved.fogMode;scene.fogColor=saved.fogColor;scene.fogStart=saved.fogStart;scene.fogEnd=saved.fogEnd;scene.fogDensity=saved.fogDensity;scene.clearColor=saved.clearColor;
          Object.assign(scene.imageProcessingConfiguration,{exposure:saved.exposure,contrast:saved.contrast,toneMappingEnabled:saved.toneMappingEnabled,toneMappingType:saved.toneMappingType});
          if(saved.camera)saved.camera.maxZ=saved.maxZ;saved=null;
        }
      }
    },
    refreshShadows(){shadow?.getShadowMap()?.resetRefreshCounter();},
    get diagnostics(){return{active,timeOfDay,quality,shadowSize:shadow?.getShadowMap()?.getSize().width??0,
      staticShadowCasters:shadow?.getShadowMap()?.renderList?.length??0,shadowRefresh:'static-once',localLights:lights.length,
      extraMeshes:extraMeshes.length,sky:'local-painted-gradient',globalStateSaved:!!saved};},
    dispose(){this.setActive(false);shadow?.dispose();for(const light of lights)light.dispose();sky.dispose();skyMaterial.dispose();skyTexture.dispose();},
  };
}
