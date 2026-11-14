import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3,Quaternion,Matrix } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import type { Point3 } from '../game/layout';
import { WB_REAR_SEAT, vehiclePoint, type WestbridgeDriveSample } from '../game/westbridgeDrive';
import { WB_WALK_SPAWN } from '../game/westbridgeLayout';

const SOURCE='/models/carro_intercambio.glb';
const plain=(v:Vector3)=>({x:v.x,y:v.y,z:v.z});

/** The provided car has one opaque exterior mesh and no modelled cabin.
 * Its original textures/mesh remain intact outside; a separately authored
 * interior supplies the real rear-seat view instead of a camera inside black
 * painted windows. Both views share the same moving vehicle root. */
export function buildWestbridgeVehicle(scene:Scene,parent:TransformNode) {
  const root=new TransformNode('Westbridge · carro dos anfitriões',scene);root.parent=parent;
  const exteriorRoot=new TransformNode('Westbridge · carro GLB original',scene);exteriorRoot.parent=root;
  const interiorRoot=new TransformNode('Westbridge · cabine do carro',scene);interiorRoot.parent=root;interiorRoot.setEnabled(false);
  const interiorFill=new HemisphericLight('Westbridge · claridade local da cabine',new Vector3(0,1,.15),scene);
  interiorFill.parent=root;interiorFill.diffuse.set(1,.95,.86);interiorFill.groundColor.set(.75,.72,.64);
  interiorFill.intensity=.32;interiorFill.renderPriority=50;interiorFill.includedOnlyMeshes=[];interiorFill.setEnabled(false);
  const meshes:AbstractMesh[]=[],exterior:AbstractMesh[]=[],materials:StandardMaterial[]=[],textures:DynamicTexture[]=[];
  let loaded=false,disposed=false,error:string|null=null,interiorView=false;
  let asset:Awaited<ReturnType<typeof LoadAssetContainerAsync>>|null=null;
  let position:Point3={x:0,y:0,z:0},yaw=0;
  let seed=81327;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function material(name:string,color:string,paint?:(context:CanvasRenderingContext2D)=>void) {
    const m=new StandardMaterial('Westbridge · carro · '+name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.set(.035,.035,.032);m.specularPower=24;m.maxSimultaneousLights=4;
    if(paint){const t=new DynamicTexture('carro · '+name,{width:256,height:256},scene,true,Texture.TRILINEAR_SAMPLINGMODE);
      paint(t.getContext() as unknown as CanvasRenderingContext2D);t.update(false);t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=4;
      m.diffuseTexture=t;m.diffuseColor.set(1,1,1);textures.push(t);}
    materials.push(m);return m;
  }
  function grain(c:CanvasRenderingContext2D,color:string,strength:number) {
    c.fillStyle=color;c.fillRect(0,0,256,256);
    for(let j=0;j<20000;j++){c.fillStyle=`rgba(${random()>.5?'194,189,169':'14,19,20'},${random()*strength})`;c.fillRect(random()*256,random()*256,1,1);}
  }
  const cloth=material('tecido grafite tramado','#383c40',c=>{
    grain(c,'#3d4244',.20);
    for(let x=0;x<256;x+=4){c.fillStyle='rgba(142,146,141,.07)';c.fillRect(x,0,1,256);}
    for(let y=0;y<256;y+=4){c.fillStyle='rgba(12,18,19,.12)';c.fillRect(0,y,256,1);}
    for(let x=10;x<256;x+=30){c.fillStyle='rgba(134,139,131,.12)';c.fillRect(x,0,2,256);}
  });
  const vinyl=material('vinil usado','#333836',c=>grain(c,'#333735',.10));
  const trim=material('acabamento grafite','#242b2b',c=>grain(c,'#29302f',.09));
  const headliner=material('forro bege cinza','#8e8b7a',c=>grain(c,'#999484',.12));
  const metal=material('metal escuro','#545d5d');metal.specularColor.set(.15,.15,.14);
  const belt=material('cinto tecido','#252c2a',c=>{grain(c,'#2a302c',.09);for(let y=0;y<256;y+=2){c.fillStyle='rgba(177,177,148,.045)';c.fillRect(0,y,256,1);}});
  const cluster=material('instrumentos analógicos','#15201f',c=>{
    c.fillStyle='#111a1b';c.fillRect(0,0,256,256);
    for(const x of [71,177]){c.strokeStyle='#a6ac99';c.lineWidth=2;c.beginPath();c.arc(x,116,49,Math.PI*.78,Math.PI*2.22);c.stroke();
      for(let i=0;i<11;i++){const a=Math.PI*.78+i*Math.PI*1.44/10;c.beginPath();c.moveTo(x+Math.cos(a)*42,116+Math.sin(a)*42);c.lineTo(x+Math.cos(a)*48,116+Math.sin(a)*48);c.stroke();}
      c.strokeStyle='#ba715b';c.lineWidth=3;c.beginPath();c.moveTo(x,116);c.lineTo(x-28,140);c.stroke();}
    c.fillStyle='#929d82';c.fillRect(92,191,75,19);c.fillStyle='#26362e';c.font='15px monospace';c.fillText('184730',97,206);
  });cluster.emissiveColor.set(.035,.05,.037);
  function add(mesh:Mesh,m:StandardMaterial,p:Point3) {mesh.parent=interiorRoot;mesh.position.set(p.x,p.y,p.z);mesh.material=m;mesh.isPickable=false;mesh.receiveShadows=false;mesh.metadata={westbridgeVehicle:true,carInterior:true,westbridgeInterior:true,castShadow:false};meshes.push(mesh);return mesh;}
  function box(name:string,w:number,h:number,d:number,p:Point3,m:StandardMaterial) {return add(MeshBuilder.CreateBox('carro · '+name,{width:w,height:h,depth:d},scene),m,p);}
  // Chamfered prisms give cushions and door cards shaped silhouettes rather
  // than replacing the supplied car with untextured box stand-ins.
  function softBox(name:string,w:number,h:number,d:number,p:Point3,m:StandardMaterial,bevel=.035) {
    const b=Math.min(bevel,w/5,d/5),x=w/2,z=d/2,ring=[[-x+b,-z],[x-b,-z],[x,-z+b],[x,z-b],[x-b,z],[-x+b,z],[-x,z-b],[-x,-z+b]];
    const positions:number[]=[],indices:number[]=[],uvs:number[]=[];
    // Side faces need their own UV rectangle: reusing cap UVs would collapse
    // the vertical upholstery faces onto a single texture row.
    for(let j=0;j<8;j++){
      const k=(j+1)%8,start=positions.length/3;
      for(const [xx,yy,zz]of [[ring[j][0],-h/2,ring[j][1]],[ring[k][0],-h/2,ring[k][1]],
        [ring[j][0],h/2,ring[j][1]],[ring[k][0],h/2,ring[k][1]]])positions.push(xx,yy,zz);
      uvs.push(0,1,1,1,0,0,1,0);indices.push(start,start+1,start+2,start+1,start+3,start+2);
    }
    const cap=positions.length/3;
    for(const y of [-h/2,h/2])for(const [xx,zz]of ring){positions.push(xx,y,zz);uvs.push((xx+x)/w,(zz+z)/d);}
    for(let j=1;j<7;j++){indices.push(cap,cap+j+1,cap+j,cap+8,cap+8+j,cap+8+j+1);}
    const data=new VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;const normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;
    const mesh=new Mesh('carro · '+name,scene);data.applyToMesh(mesh);return add(mesh,m,p);
  }
  function rod(name:string,a:Point3,b:Point3,width:number,m:StandardMaterial) {
    const av=new Vector3(a.x,a.y,a.z),bv=new Vector3(b.x,b.y,b.z),direction=bv.subtract(av),length=direction.length();
    const mesh=add(MeshBuilder.CreateCylinder('carro · '+name,{height:length,diameter:width,tessellation:8},scene),m,plain(av.add(bv).scale(.5)));
    const normal=direction.scale(1/length),axis=Vector3.Cross(Vector3.Up(),normal),dot=Vector3.Dot(Vector3.Up(),normal);
    mesh.rotationQuaternion=axis.lengthSquared()<1e-8?Quaternion.Identity():Quaternion.RotationAxis(axis.normalize(),Math.acos(Math.max(-1,Math.min(1,dot))));return mesh;
  }
  softBox('piso forrado',1.55,.03,2.40,{x:0,y:0,z:-.03},trim);
  for(const x of [-.43,.43]){
    softBox('assento dianteiro',.56,.15,.58,{x,y:.45,z:.20},cloth,.06);
    const back=softBox('encosto dianteiro',.53,.61,.16,{x,y:.83,z:-.06},cloth,.06);back.rotation.x=-.09;
    softBox('apoio de cabeça',.34,.20,.14,{x,y:1.24,z:-.08},cloth,.04);
    for(const dx of [-.09,.09])rod('haste apoio',{x:x+dx,y:1.10,z:-.08},{x:x+dx,y:1.20,z:-.08},.018,metal);
    softBox('bolso do banco',.37,.19,.025,{x,y:.71,z:-.159},vinyl,.025);
  }
  softBox('banco traseiro',1.38,.18,.56,{x:0,y:.45,z:-.75},cloth,.06);
  softBox('encosto traseiro',1.37,.57,.16,{x:0,y:.83,z:-1.10},cloth,.05);
  softBox('teto interno',1.58,.045,2.29,{x:0,y:1.535,z:-.03},headliner,.06);
  for(const side of [-1,1]){
    softBox('painel interno da porta',.07,.875,1.91,{x:side*.79,y:.4525,z:-.05},vinyl,.03);
    softBox('apoio de braço',.11,.09,.45,{x:side*.73,y:.66,z:-.27},trim,.03);
    box('maçaneta interna',.035,.045,.14,{x:side*.735,y:.80,z:-.05},metal);
    rod('coluna A',{x:side*.72,y:.88,z:1.12},{x:side*.69,y:1.48,z:.72},.065,headliner);
    rod('coluna B',{x:side*.79,y:.85,z:-.35},{x:side*.75,y:1.48,z:-.38},.06,headliner);
    rod('coluna traseira',{x:side*.76,y:.88,z:-1.04},{x:side*.70,y:1.47,z:-1.10},.065,headliner);
    rod('cinto dianteiro',{x:side*.76,y:1.30,z:-.36},{x:side*.70,y:.49,z:-.02},.025,belt);
    rod('borda inferior janela',{x:side*.79,y:.91,z:-1.05},{x:side*.79,y:.91,z:1.02},.035,trim);
  }
  softBox('painel dianteiro',1.48,.24,.32,{x:0,y:.87,z:1.00},vinyl,.06);
  softBox('capela instrumentos',.47,.14,.19,{x:-.43,y:1.01,z:.90},trim,.035);
  add(MeshBuilder.CreatePlane('carro · instrumentos legíveis',{width:.38,height:.14},scene),cluster,{x:-.43,y:1.005,z:.795});
  const steering=add(MeshBuilder.CreateTorus('carro · volante',{diameter:.32,thickness:.022,tessellation:24},scene),trim,{x:-.43,y:.95,z:.68});steering.rotation.x=Math.PI/2+.18;
  for(const end of [-.14,.14])rod('raio volante',{x:-.43,y:.95,z:.68},{x:-.43+end,y:.95,z:.68},.018,trim);
  softBox('console central',.20,.33,.42,{x:0,y:.43,z:.54},trim,.035);
  rod('alavanca câmbio',{x:0,y:.54,z:.48},{x:0,y:.72,z:.46},.025,metal);
  add(MeshBuilder.CreateSphere('carro · pomo câmbio',{diameter:.075,segments:8},scene),trim,{x:0,y:.73,z:.46});
  softBox('retrovisor interno',.24,.075,.035,{x:0,y:1.38,z:.82},trim,.012);

  // The cabin is rigid relative to the moving root. Batch its authored pieces
  // by material instead of paying a draw call for every seam, bolster or rod.
  // Keep host seat anchors separate; the source exterior is never merged.
  const parts=[...meshes] as Mesh[],batched:Mesh[]=[];
  const localFromWorld=Matrix.Invert(interiorRoot.computeWorldMatrix(true));
  for(const m of materials){
    const group=parts.filter(mesh=>mesh.material===m);if(!group.length)continue;
    const merged=Mesh.MergeMeshes(group,true,true,undefined,false,false);
    if(!merged)throw Error('Não foi possível preparar a cabine do veículo.');
    merged.bakeTransformIntoVertices(localFromWorld);merged.parent=interiorRoot;
    merged.name='carro · cabine agrupada · '+m.name;merged.isPickable=false;merged.receiveShadows=false;
    merged.metadata={westbridgeVehicle:true,carInterior:true,westbridgeInterior:true,castShadow:false};batched.push(merged);
  }
  meshes.splice(0,meshes.length,...batched);

  const daniel=new TransformNode('carro · assento de Daniel',scene),helen=new TransformNode('carro · assento de Helen',scene);
  daniel.parent=root;helen.parent=root;daniel.position.set(-.43,.02,.22);helen.position.set(.43,.02,.22);

  const ready=LoadAssetContainerAsync(SOURCE,scene,{pluginExtension:'.glb',pluginOptions:{gltf:{animationStartMode:0}}}).then(value=>{
    if(disposed){value.dispose();return;}
    asset=value;const nodes=[...value.transformNodes,...value.meshes],owned=new Set<TransformNode>(nodes);
    for(const node of nodes)if(!node.parent||!owned.has(node.parent as TransformNode))node.parent=exteriorRoot;
    for(const mesh of value.meshes)if(mesh.getTotalVertices()>0){mesh.isPickable=false;mesh.receiveShadows=true;mesh.metadata={...mesh.metadata,westbridgeVehicle:true,originalCarExterior:true,castShadow:true};exterior.push(mesh);meshes.push(mesh);}
    value.addAllToScene();exteriorRoot.setEnabled(!interiorView);loaded=true;
  }).catch(reason=>{error=String(reason?.message??reason);throw reason;});

  return {
    root,meshes,ready,hostSeats:{daniel,helen},rearSeat:WB_REAR_SEAT,
    setPose(sample:WestbridgeDriveSample) {
      if(disposed||![sample.position.x,sample.position.y,sample.position.z,sample.yaw].every(Number.isFinite))return;
      position={...sample.position};yaw=sample.yaw;root.position.set(position.x,position.y,position.z);root.rotation.y=yaw;
    },
    setInteriorView(enabled:boolean) {
      interiorView=enabled;interiorRoot.setEnabled(enabled);exteriorRoot.setEnabled(!enabled);
      // Hosts are attached to the same root before boarding. This fill affects
      // only the cabin and its occupants, never the street or another scene.
      interiorFill.includedOnlyMeshes=enabled?root.getChildMeshes(false):[];interiorFill.setEnabled(enabled);
    },
    exitPoint(){return {...WB_WALK_SPAWN};},
    get diagnostics(){return {source:SOURCE,loaded,error,position:{...position},yaw,interiorView,
      exteriorMeshes:exterior.length,interiorMeshes:meshes.length-exterior.length,
      rearSeatWorld:vehiclePoint(position,yaw,WB_REAR_SEAT),hostSeats:2,
      interiorFillIntensity:interiorView&&interiorFill.isEnabled()?interiorFill.intensity:0,
      interiorFillMeshes:interiorFill.includedOnlyMeshes.length,
      originalExteriorUnmodified:true,exteriorHiddenFromInside:interiorView,
      interior:'Authored textured interior; source GLB contains only one opaque exterior mesh',
      localBounds:{width:1.946080207824707,height:1.5662199258804321,length:4.250219821929932}};},
    dispose(){if(disposed)return;disposed=true;interiorFill.dispose();asset?.dispose();root.dispose(false,false);for(const m of materials)m.dispose(false,false);for(const t of textures)t.dispose();},
  };
}
