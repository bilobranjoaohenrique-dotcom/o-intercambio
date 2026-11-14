import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import '@babylonjs/loaders/glTF/index.js';
const { applyWestbridgeHouseScale } = await import('../src/scene/westbridgeHouseScale.ts');
const { WB_MANSION_BODY_Y, WB_MANSION_FLOOR, WB_RANCH_BODY_Y, WB_HOUSE_SCALE_SPECS } = await import('../src/game/westbridgeHouseScale.ts');
const close=(a,b,message,tolerance=1e-4)=>assert.ok(Math.abs(a-b)<tolerance,`${message}: ${a} vs ${b}`);
function openingHouse(a){return WB_HOUSE_SCALE_SPECS.find(h=>h.family==='cozy'&&Math.abs(500-a.x-h.x)<.648&&a.z*h.facing> -12.942&&a.z*h.facing< -12.7108);}
function planarUV(points,uv,ids,axis,channel){
  const p=ids.map(i=>points[i]),h=p[1][axis]-p[0][axis],j=p[2][axis]-p[0][axis],y=p[1].y-p[0].y,z=p[2].y-p[0].y;
  const det=h*z-j*y;if(Math.abs(det)<1e-8)return null;
  const a=uv[ids[1]*2+channel]-uv[ids[0]*2+channel],b=uv[ids[2]*2+channel]-uv[ids[0]*2+channel];
  return {horizontal:(a*z-b*y)/det,vertical:(h*b-j*a)/det};
}

test('Westbridge house proportions: real GLB calibration preserves XZ, ground, roof pitch, texture projection and source nodes', async()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  const bytes=readFileSync(new URL('../public/models/westbridge.glb',import.meta.url));
  const asset=await LoadAssetContainerAsync(new Uint8Array(bytes),scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:true,animationStartMode:0}}});
  asset.addAllToScene();
  const origin=new TransformNode('same runtime origin',scene);origin.position.x=500;
  const nodes=[...asset.transformNodes,...asset.meshes],set=new Set(nodes);
  for(const n of nodes)if(!n.parent||!set.has(n.parent))n.parent=origin;
  const source=asset.meshes.filter(m=>m.getTotalVertices()).map(mesh=>{
    const world=mesh.computeWorldMatrix(true).clone(),positions=Array.from(mesh.getVerticesData('position'));
    return {mesh,positions,normals:Array.from(mesh.getVerticesData('normal')??[]),uv:Array.from(mesh.getVerticesData('uv')??[]),uv2:Array.from(mesh.getVerticesData('uv2')??[]),indices:Array.from(mesh.getIndices()),material:mesh.material,world,local:JSON.stringify([mesh.position.asArray(),mesh.scaling.asArray(),mesh.rotation.asArray(),mesh.rotationQuaternion?.asArray()])};
  });
  const count=scene.meshes.length;
  try{
    const d=applyWestbridgeHouseScale(asset.meshes);
    assert.equal(d.houses.length,14);assert.ok(d.changedMeshes>15);assert.ok(d.changedVertices>10000);
    const leaves=d.houses.flatMap(h=>h.doors);assert.equal(leaves.length,17,'one door per house plus both mansion leaves');
    for(const leaf of leaves)close(leaf.height,2.03,'real leaf height');
    const garages=d.houses.flatMap(h=>h.garages);assert.equal(garages.length,6);
    for(const garage of garages)close(garage.height,2.15,'ranch garage clearance');
    const host=d.houses.find(h=>h.family==='host');assert.equal(host.porchSupports,6);assert.equal(host.bodyScaleY,1);
    for(const h of d.houses){
      close(h.sourceBounds.min[0],h.correctedBounds.min[0],h.id+' minimum X');close(h.sourceBounds.max[2],h.correctedBounds.max[2],h.id+' maximum Z');
      close(h.sourceBounds.min[1],h.correctedBounds.min[1],h.id+' floor');
      if(h.family==='mansion')close(h.correctedBounds.max[1]-h.sourceBounds.max[1],(4.7422-WB_MANSION_FLOOR)*(WB_MANSION_BODY_Y-1),h.id+' roof and chimney move together',2e-4);
    }
    let ground=0,roofTriangles=0,windowCrossbars=0,centralBand=0,chimneyStack=0,movedNormals=0,ironRails=0,cozyCutouts=0,cozyPanels=0,reprojectedCoordinates=0,textureTriangles=0;
    const cozyCutoutHouses=new Set();
    for(const s of source){
      const positions=s.mesh.getVerticesData('position'),normals=s.mesh.getVerticesData('normal');
      const uv=s.mesh.getVerticesData('uv')??[],uv2=s.mesh.getVerticesData('uv2')??[];
      assert.deepEqual(Array.from(s.mesh.getIndices()),s.indices,'topology '+s.mesh.name);
      assert.equal(s.mesh.material,s.material);assert.equal(JSON.stringify([s.mesh.position.asArray(),s.mesh.scaling.asArray(),s.mesh.rotation.asArray(),s.mesh.rotationQuaternion?.asArray()]),s.local,'node transform '+s.mesh.name);
      const points=[],next=[],selectedUV=new Set();
      for(let i=0;i<s.positions.length;i+=3){
        assert.equal(positions[i],s.positions[i],'authored local X');assert.equal(positions[i+2],s.positions[i+2],'authored local Z');
        const a=Vector3.TransformCoordinates(Vector3.FromArray(s.positions,i),s.world),b=Vector3.TransformCoordinates(Vector3.FromArray(positions,i),s.world);
        points.push(a);next.push(b);
        const allowUV=/^(South_Lots|North_Lots) · Cream\./.test(s.mesh.name)&&openingHouse(a)&&Math.abs(a.y-2.769109)<.0001;
        if(allowUV)selectedUV.add(i/3);
        for(const [oldMap,newMap]of [[s.uv,uv],[s.uv2,uv2]])if(oldMap.length){
          for(let axis=0;axis<2;axis++){
            const k=i/3*2+axis;
            if(!allowUV)assert.equal(newMap[k],oldMap[k],'all UVs outside measured reveal corners stay exact');
            else if(newMap[k]!==oldMap[k])reprojectedCoordinates++;
          }
        }
        if(a.y<=.065001){close(a.y,b.y,'ground stays pinned');ground++;}
        if(Math.abs(a.y-b.y)>1e-5&&normals){close(Math.hypot(normals[i],normals[i+1],normals[i+2]),1,'transformed normal is unit',2e-5);movedNormals++;}
        // Third-floor mansion window crossbars and the middle floor band must
        // follow the corrected wall, rather than the translated roof.
        if(s.mesh.name==='South_Lots · Stone.001'&&500-a.x>57.07&&500-a.x<57.68&&a.z< -15.8&&a.z> -19.85&&
          ((a.y>3.48&&a.y<3.55)||(a.y>4.34&&a.y<4.44))){
          close(b.y,WB_MANSION_FLOOR+(a.y-WB_MANSION_FLOOR)*WB_MANSION_BODY_Y,'window crossbar follows body',2e-4);windowCrossbars++;
        }
        if(s.mesh.name==='South_Lots · Stone.001'&&500-a.x>56.4&&500-a.x<61.6&&a.z< -15.8&&a.z> -19.85&&(Math.abs(a.y-3.2134)<4e-5||Math.abs(a.y-3.2933)<4e-5)){
          close(b.y,WB_MANSION_FLOOR+(a.y-WB_MANSION_FLOOR)*WB_MANSION_BODY_Y,'central floor band follows body',2e-4);centralBand++;
        }
        if(s.mesh.name==='South_Lots · Cream.001'&&500-a.x>57.28&&500-a.x<57.75&&a.z< -18.15&&a.z> -18.65&&a.y>4.60){
          close(b.y-a.y,(4.7422-WB_MANSION_FLOOR)*(WB_MANSION_BODY_Y-1),'chimney stack follows its roof and cap',2e-4);chimneyStack++;
        }
        if(/^(South_Lots|North_Lots) · Iron\./.test(s.mesh.name)){
          const house=WB_HOUSE_SCALE_SPECS.find(h=>h.family==='mansion'&&500-a.x>h.bounds[0]&&500-a.x<h.bounds[1]&&a.z>h.bounds[2]&&a.z<h.bounds[3]);
          if(house){close(b.y,WB_MANSION_FLOOR+(a.y-WB_MANSION_FLOOR)*WB_MANSION_BODY_Y,'architectural iron rails follow their floor',2e-4);ironRails++;}
          else close(b.y,a.y,'garden and street iron lamps stay unchanged');
        }
        const cozy=openingHouse(a);
        if(cozy&&/ · Cream\./.test(s.mesh.name)&&Math.abs(a.y-2.769109)<.0001){
          close(b.y,.38143834471702576+(a.y-.38143834471702576)*(2.03/2.3589040338993073),'welded Cream opening follows its resized header',2e-4);cozyCutouts++;cozyCutoutHouses.add(cozy.id);
        }
        if(cozy&&/ · PaintBlue\./.test(s.mesh.name)&&Math.abs(500-a.x-cozy.x)<.45&&a.y>1.67&&a.y<2.49){
          close(b.y,.38143834471702576+(a.y-.38143834471702576)*(2.03/2.3589040338993073),'upper raised door panel follows its leaf',2e-4);cozyPanels++;
        }
      }
      const foreign=!/^(South_Lots|North_Lots|HOST_FAMILY_HOUSE_DANIEL_HELEN) · (BrickTan|Cream|Gold|Iron|Paint|RoofShingle|SidingBlue|Stone|WindowGlow|Wood)/.test(s.mesh.name);
      if(foreign)assert.deepEqual(Array.from(positions),s.positions,'vegetation, road, yards, fences and props unchanged');
      if(/RoofShingle|StoneDark/.test(s.mesh.name))for(let k=0;k<s.indices.length;k+=3){
        const ids=s.indices.slice(k,k+3);if(!ids.every(i=>points[i].y>3.3)&&!s.mesh.name.includes('RoofShingle'))continue;
        const dy=ids.map(i=>next[i].y-points[i].y);close(dy[0],dy[1],'roof/chimney triangle remains a translation',2e-4);close(dy[1],dy[2],'roof pitch preserved',2e-4);roofTriangles++;
      }
      if(selectedUV.size)for(let k=0;k<s.indices.length;k+=3){
        const ids=s.indices.slice(k,k+3);if(!ids.some(i=>selectedUV.has(i)))continue;
        const normal=Vector3.Cross(points[ids[1]].subtract(points[ids[0]]),points[ids[2]].subtract(points[ids[0]]));
        if(Math.abs(normal.y)>1e-5||normal.lengthSquared()<1e-10)continue;
        const axis=Math.abs(normal.z)>Math.abs(normal.x)?'x':'z';
        for(const [oldMap,newMap]of [[s.uv,uv],[s.uv2,uv2]])if(oldMap.length)for(let channel=0;channel<2;channel++){
          const before=planarUV(points,oldMap,ids,axis,channel),after=planarUV(next,newMap,ids,axis,channel);
          if(before&&after){close(before.vertical,after.vertical,'siding texture keeps its original vertical projection',2e-4);close(before.horizontal,after.horizontal,'siding courses remain straight across the doorway',2e-4);textureTriangles++;}
        }
      }
    }
    assert.ok(ground>1000);assert.ok(roofTriangles>1000);assert.ok(windowCrossbars>50);assert.ok(centralBand>10);assert.ok(chimneyStack>100);assert.ok(movedNormals>10000);
    assert.ok(ironRails>5000);assert.ok(cozyCutouts>=52,'all duplicated upper reveal vertices follow the header');assert.equal(cozyCutoutHouses.size,4);assert.ok(cozyPanels>80);
    assert.ok(textureTriangles>40);assert.ok(reprojectedCoordinates>0);assert.equal(reprojectedCoordinates,d.doorwayUVReprojection.adjustedCoordinates);
    assert.equal(d.uvsPreserved,false);assert.equal(d.originalUVsPreservedExceptDoorwayReprojection,true);
    close((2.0228049755096436-.065)*WB_RANCH_BODY_Y,2.6,'ranch wall clearance');
    assert.equal(scene.meshes.length,count,'no replacement architecture');
    const after=source.map(s=>Array.from(s.mesh.getVerticesData('position')));
    assert.equal(applyWestbridgeHouseScale(asset.meshes).changedVertices,0,'idempotent integration');
    source.forEach((s,i)=>assert.deepEqual(Array.from(s.mesh.getVerticesData('position')),after[i]));
    assert.deepEqual(readFileSync(new URL('../public/models/westbridge.glb',import.meta.url)),bytes,'source file unchanged');
    writeFileSync('/tmp/westbridge-house-scale-runtime-measurements.json',JSON.stringify(d,null,2));
  }finally{asset.dispose();scene.dispose();engine.dispose();}
});
