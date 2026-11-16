import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync}from'node:fs';
import {createHash}from'node:crypto';
import {NullEngine}from'@babylonjs/core/Engines/nullEngine.js';
import {Scene}from'@babylonjs/core/scene.js';
import {TransformNode}from'@babylonjs/core/Meshes/transformNode.js';
import {LoadAssetContainerAsync}from'@babylonjs/core/Loading/sceneLoader.js';
import {Vector3}from'@babylonjs/core/Maths/math.vector.js';
import '@babylonjs/loaders/glTF/index.js';
const{applyHostHouseEnvelope,isHostHouseOutwardSkin,hostHouseEnvelopePlanes}=await import('../src/scene/hostHouseEnvelope.ts');
const{adjustHostHouseSourceX}=await import('../src/game/hostHouseLayout.ts');
test('A01 envelope: original blue exterior wins all outside rays while native inner walls and garage remain intact',async()=>{
const file=new URL('../public/models/daniel_helen_house_a01.glb',import.meta.url),bytes=readFileSync(file),sha=createHash('sha256').update(bytes).digest('hex');
const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const materialNames=new Map(doc.nodes.filter(n=>n.mesh!==undefined).map(n=>[n.name,doc.meshes[n.mesh].primitives.map(p=>doc.materials[p.material].name)]));
const engine=new NullEngine(),scene=new Scene(engine),asset=await LoadAssetContainerAsync(new Uint8Array(bytes),scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:true,animationStartMode:0}}});
asset.addAllToScene();const origin=new TransformNode('actual origin',scene);origin.position.x=500;const nodes=[...asset.transformNodes,...asset.meshes],set=new Set(nodes);
for(const n of nodes)if(!n.parent||!set.has(n.parent))n.parent=origin;
for(const n of nodes)n.computeWorldMatrix(true);
const meshes=asset.meshes.filter(m=>m.getTotalVertices());
for(const mesh of meshes){const a=mesh.getVerticesData('position'),data=Float32Array.from(a),world=mesh.computeWorldMatrix(true),inverse=world.clone().invert();let count=0;
 for(let i=0;i<a.length;i+=3){const p=Vector3.TransformCoordinates(Vector3.FromArray(a,i),world),x=500-p.x,next=adjustHostHouseSourceX(mesh.name,x);if(Math.abs(next-x)<1e-8)continue;p.x=500-next;const q=Vector3.TransformCoordinates(p,inverse);data[i]=q.x;data[i+1]=q.y;data[i+2]=q.z;count++;}
 if(count){mesh.makeGeometryUnique();mesh.setVerticesData('position',data,true);mesh.refreshBoundingInfo();}
}
function triangles(m){const p=m.getVerticesData('position'),idx=m.getIndices(),world=m.computeWorldMatrix(true),points=[];for(let i=0;i<p.length;i+=3){const a=Vector3.TransformCoordinates(Vector3.FromArray(p,i),world);points.push([500-a.x,a.y,a.z]);}const result=[];for(let i=0;i<idx.length;i+=3)result.push([points[idx[i]],points[idx[i+1]],points[idx[i+2]]]);return result;}
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function ray(tris,o,d){let nearest=Infinity;for(const [a,b,c]of tris){const e1=sub(b,a),e2=sub(c,a),p=cross(d,e2),det=dot(e1,p);if(Math.abs(det)<1e-10)continue;const inv=1/det,s=sub(o,a),u=dot(s,p)*inv;if(u<0||u>1)continue;const q=cross(s,e1),v=dot(d,q)*inv;if(v<0||u+v>1)continue;const t=dot(e2,q)*inv;if(t>1e-8)nearest=Math.min(nearest,t);}return nearest;}
const rays=[
 {id:'left-main',o:[14,1.4,-16.4],d:[1,0,0],axis:0,blue:15.430018,names:/^ENV_[01]_04/},
 {id:'rear-main',o:[18,1.4,-20],d:[0,0,1],axis:2,blue:-18.907209,names:/^ENV_[01]_03/},
 {id:'front-main',o:[21,1.4,-10],d:[0,0,-1],axis:2,blue:-12.722898,names:/^ENV_[01]_01/},
 {id:'upper-right-main',o:[25,4.3,-15.7],d:[-1,0,0],axis:0,blue:23.030584,names:/^ENV_1_05/},
 {id:'garage-rear',o:[25,1.4,-20],d:[0,0,1],axis:2,blue:-18.435123,names:/^ENV_0_07/},
 {id:'garage-front',o:[26.6,2.6,-10],d:[0,0,-1],axis:2,blue:-13.194982,names:/^ENV_0_06/},
 {id:'exposed-shared-front-right',o:[24,1.4,-12.95],d:[-1,0,0],axis:0,blue:23.030584,names:/^ENV_0_05/},
];
const before=meshes.map(mesh=>({mesh,indices:Array.from(mesh.getIndices()),attributes:Object.fromEntries(mesh.getVerticesDataKinds().map(k=>[k,Array.from(mesh.getVerticesData(k))])),transform:JSON.stringify([mesh.position.asArray(),mesh.scaling.asArray(),mesh.rotation.asArray(),mesh.rotationQuaternion?.asArray()]),triangles:triangles(mesh),material:mesh.material}));
const initial=rays.map(r=>ray(before.filter(s=>r.names.test(s.mesh.name)).flatMap(s=>s.triangles),r.o,r.d));
const report=applyHostHouseEnvelope(meshes);
assert.ok(report.changedMeshes>50);assert.ok(report.outwardTrianglesRemoved>100);assert.ok(report.sharedCornerRemoved>0);
let untouched=0,reveals=0,preservedInner=0;
for(const s of before){
 const changed=report.changes.find(c=>c.name===s.mesh.name);const corner=/^ENV_0_05(?:[_.]|$)/.test(s.mesh.name);
 assert.equal(s.mesh.material,s.material);assert.equal(JSON.stringify([s.mesh.position.asArray(),s.mesh.scaling.asArray(),s.mesh.rotation.asArray(),s.mesh.rotationQuaternion?.asArray()]),s.transform);
 for(const[k,old]of Object.entries(s.attributes)){const next=Array.from(s.mesh.getVerticesData(k));assert.deepEqual(next.slice(0,old.length),old,'source vertex data stays exact: '+s.mesh.name+'/'+k);}
 if(!changed){assert.deepEqual(Array.from(s.mesh.getIndices()),s.indices);untouched++;if(/_Vao_|_Janela_/.test(s.mesh.name))reveals++;}
 const planes=hostHouseEnvelopePlanes(s.mesh.name);
 for(const tri of triangles(s.mesh))for(const plane of planes)for(const point of tri)
  assert.ok(point.reduce((sum,v,i)=>sum+v*plane.normal[i],0)<=plane.limit+1e-6,'all rendered wall/reveal caps stay behind blue base panels: '+s.mesh.name);
 if(!corner){const next=Array.from(s.mesh.getIndices()),keys=new Set(Array.from({length:next.length/3},(_,j)=>next.slice(j*3,j*3+3).join(',')));
  for(let i=0;i<s.indices.length;i+=3){const tri=s.triangles[i/3];
   if(isHostHouseOutwardSkin(s.mesh.name,tri)||planes.some(plane=>tri.some(point=>point.reduce((sum,v,k)=>sum+v*plane.normal[k],0)>plane.limit+1e-7)))continue;
   if(/^(Piso_|Laje_|Forro_)/.test(s.mesh.name)){const n=cross(sub(tri[1],tri[0]),sub(tri[2],tri[0]));if(Math.abs(n[1])<1e-8)continue;}
   const key=s.indices.slice(i,i+3).join(',');assert.ok(keys.has(key),'native inside face/floor top stays exact: '+s.mesh.name);preservedInner++;
  }
 }
}
const sharedRay={o:[24,1.4,-16.0],d:[-1,0,0]};
const sharedBefore=ray(before.filter(s=>/^ENV_0_05/.test(s.mesh.name)).flatMap(s=>s.triangles),sharedRay.o,sharedRay.d);
const sharedAfter=ray(meshes.filter(m=>/^ENV_0_05/.test(m.name)).flatMap(triangles),sharedRay.o,sharedRay.d);
assert.ok(Math.abs(sharedBefore-sharedAfter)<1e-8,'cream shared wall seen inside garage stays in place');
report.garageSharedWallPreserved={beforeDistance:sharedBefore,afterDistance:sharedAfter};
report.rays=rays.map((r,i)=>{const next=ray(meshes.filter(m=>r.names.test(m.name)).flatMap(triangles),r.o,r.d),blueT=(r.blue-r.o[r.axis])/r.d[r.axis];assert.ok(initial[i]<blueT-1e-3,r.id+' initially covered the blue exterior');assert.ok(next>blueT+1e-3,r.id+' no longer covers the blue exterior');return{id:r.id,beforeDistance:initial[i],afterDistance:next,blueDistance:blueT};});
const floorBand=[
 {id:'floor-band-left-y3',o:[14,3,-16.4],d:[1,0,0],axis:0,blue:15.430018},
 {id:'floor-band-rear-y3',o:[18,3,-20],d:[0,0,1],axis:2,blue:-18.907209},
 {id:'floor-band-front-y3',o:[21,3,-10],d:[0,0,-1],axis:2,blue:-12.722898},
 {id:'floor-band-right-y3',o:[25,3,-15.7],d:[-1,0,0],axis:0,blue:23.030584},
];
report.floorBandRays=floorBand.map(r=>{const selected=m=>/^(Piso_|Laje_|Forro_)/.test(m.name),a=ray(before.filter(s=>selected(s.mesh)).flatMap(s=>s.triangles),r.o,r.d),b=ray(meshes.filter(selected).flatMap(triangles),r.o,r.d),blue=(r.blue-r.o[r.axis])/r.d[r.axis];assert.ok(a<blue,'old slab was ahead of blue at Y3');assert.ok(b>blue,'vertical slab band cannot cover facade at Y3');return{id:r.id,before:a,after:b,blueDistance:blue};});
assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),sha);
const second=applyHostHouseEnvelope(meshes);assert.equal(second.changedMeshes,0,'idempotent filtering and corner clipping');
report.preserved={untouchedMeshes:untouched,revealMeshes:reveals,inwardAndOtherTriangles:preservedInner,originalAttributePrefixesExact:true,sourceSha256:sha};
for(const c of report.changes)c.materialSource=materialNames.get(c.name);
writeFileSync('/tmp/a01-envelope-review.json',JSON.stringify(report,null,2));
console.log('PASS',JSON.stringify({changedMeshes:report.changedMeshes,outwardRemoved:report.outwardTrianglesRemoved,cornerRemoved:report.sharedCornerRemoved,cornerAdded:report.sharedCornerAdded,preserved:report.preserved,rays:report.rays}));
asset.dispose();scene.dispose();engine.dispose();

});
