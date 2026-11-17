import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {UniversalCamera} from '@babylonjs/core/Cameras/universalCamera.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import '@babylonjs/core/Culling/ray.js';
const {createHostHouseWestbridgeView}=await import('../src/scene/hostHouseWestbridgeView.ts');
const {hostHouseToWestbridge}=await import('../src/game/hostHouseExteriorFrame.ts');
const {createHostHouseMirrors}=await import('../src/scene/hostHouseMirrors.ts');

test('exterior culling: main layer masks follow actual window poses and restore without changing mirror visibility',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),parent=new TransformNode('interior',scene);
  const exterior=(name,position)=>{
    const mesh=MeshBuilder.CreateBox(name,{size:.4},scene),wb=hostHouseToWestbridge(position);
    mesh.position.set(wb.x,wb.y,wb.z);return mesh;
  };
  const front=exterior('actual front street fixture',{x:760,y:2,z:41}),rear=exterior('actual rear garden fixture',{x:734,y:2,z:33});
  const sky=MeshBuilder.CreateSphere('actual sky geometry fixture',{diameter:700,segments:4},scene);
  sky.position.x=500;sky.metadata={westbridgeSky:true};
  const pane=(name,x,y,z)=>{
    const mesh=MeshBuilder.CreateBox('REN_HH_window_'+name+'_glass',{width:.002,height:1.44,depth:1.34},scene);
    mesh.parent=parent;mesh.position.set(x,y,z);mesh.metadata={gltf:{extras:{hostHouseWindowGlass:true,hostHouseWindow:name}}};return mesh;
  };
  const panes=[pane('front_ground_living',751.94,2,41),pane('rear_ground_kitchen',742,1.95,33)];
  const view=createHostHouseWestbridgeView(scene,{parent,apertures:panes,
    source:{meshes:[front,rear,sky],sky,windows:[],timeOfDay:'afternoon',source:'real runtime fixture',originX:500,houseScale:null}});
  const frontClone=view.meshes.find(mesh=>mesh.metadata.hostHouseExteriorSourceName===front.name);
  const rearClone=view.meshes.find(mesh=>mesh.metadata.hostHouseExteriorSourceName===rear.name);
  const camera=new UniversalCamera('player',new Vector3(747,2.04,37),scene);scene.activeCamera=camera;
  camera.minZ=.05;camera.maxZ=500;camera.fov=1.08;
  function look(position,target){
    camera.position.copyFromFloats(...position);camera.setTarget(new Vector3(...target));
    camera.getViewMatrix(true);scene.setTransformMatrix(camera.getViewMatrix(),camera.getProjectionMatrix(true));
    scene.onBeforeActiveMeshesEvaluationObservable.notifyObservers(scene);
  }
  view.setActive(true);
  look([743,2.04,37],[743,2.04,50]);
  assert.equal(view.diagnostics.mainPassPortalCulling.rejectedMeshes,3,'opaque wall view removes all exterior submissions');
  look([750.8,2.04,41],[760,2.04,41]);
  assert.notEqual(frontClone.layerMask,0);assert.equal(rearClone.layerMask,0);
  assert.equal(rearClone.isVisible,true);assert.equal(rearClone.isEnabled(),true,'mirror lists retain enabled/visible exterior meshes');
  look([744.6,2.04,33],[730,2.04,33]);
  assert.equal(frontClone.layerMask,0);assert.notEqual(rearClone.layerMask,0);
  look([751.9,2.04,41],[760,2.04,41]);
  assert.equal(view.diagnostics.mainPassPortalCulling.reason,'near-aperture-plane');assert.notEqual(rearClone.layerMask,0);
  look([753,2.04,41],[760,2.04,41]);assert.equal(view.diagnostics.mainPassPortalCulling.reason,'outside-interior');
  look([743,2.04,37],[743,2.04,50]);assert.equal(frontClone.layerMask,0);
  view.setActive(false);assert.notEqual(frontClone.layerMask,0);assert.notEqual(rearClone.layerMask,0);
  view.dispose();assert.equal(front.isDisposed(),false);assert.equal(rear.isDisposed(),false);
  scene.dispose();engine.dispose();
});

test('exterior culling: mirror filtering uses the reflected frustum and ignores main-pass layer masks',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  const mesh=(name,x,y,z)=>{const m=MeshBuilder.CreateBox(name,{size:.1},scene);m.position.set(x,y,z);return m;};
  const surface=mesh('REN_service_bath_mirror',744,5.5,31.5),room=mesh('room fixture',744,5.5,32);
  const reflected=mesh('reflected exterior fixture',744,5.5,40),behind=mesh('behind reflected camera fixture',744,5.5,20);
  for(const m of [reflected,behind]){m.metadata={hostHouseExterior:true};m.layerMask=0;m.computeWorldMatrix(true);}
  const camera=new UniversalCamera('player',new Vector3(744,5.5,34),scene);scene.activeCamera=camera;
  camera.minZ=.05;camera.maxZ=500;camera.setTarget(new Vector3(744,5.5,31.5));camera.getViewMatrix(true);
  scene.setTransformMatrix(camera.getViewMatrix(),camera.getProjectionMatrix(true));
  const mirrors=createHostHouseMirrors(scene,{meshes:[surface,room],exteriorMeshes:[reflected,behind]});
  const texture=scene.textures.find(texture=>texture.name.startsWith('REN_service_bath_mirror'));
  assert.ok(texture);assert.equal(texture.forceLayerMaskCheck,false);
  texture.onBeforeRenderObservable.notifyObservers(0);
  const list=texture.getCustomRenderList(0,texture.renderList,texture.renderList.length);
  assert.ok(list.includes(room),'room list remains intact');
  assert.ok(list.includes(reflected),'main-pass mask cannot hide reflected exterior');
  assert.equal(list.includes(behind),false,'reflection culls geometry behind its actual virtual camera');
  texture.onAfterRenderObservable.notifyObservers(0);
  mirrors.dispose();scene.dispose();engine.dispose();
});
