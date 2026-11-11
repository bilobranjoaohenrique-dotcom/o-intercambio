import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { InteractionTarget } from '../game/types';
import { buildKitchen } from './kitchen';
import { buildGarage } from './garage';
import { buildLaundry } from './laundry';
import { buildAirport } from './airport';
import { buildArrival } from './arrival';
import { ARRIVAL_SPAWN } from '../game/arrivalLayout';
import { AIRPORT_ARRIVAL } from '../game/airportLayout';
import { buildPlane } from './plane';
import { PLANE_SEAT } from '../game/planeLayout';
import type { Point3 } from '../game/layout';
import { getParentsLocation, setParentsLocationState, type ParentsLocation } from '../game/parentsDeparture';

type Zone = 'home' | 'car' | 'airport' | 'plane' | 'town';
const ZONE_ORIGIN: Record<Exclude<Zone,'home'|'car'>, number> = { airport: 30, plane: 58, town: 86 };
const CAR_ORIGIN=46;

/** Additional first-chapter sets. Original geometry and supplied local GLBs
 * share the existing chapter progression without remote asset dependencies. */
export function buildChapterWorld(scene: Scene) {
  const materials = new Map<string, StandardMaterial>();
  const mat = (name: string, hex: string, emissive?: string) => {
    if (!materials.has(name)) {
      const m = new StandardMaterial(name, scene); m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = new Color3(.12,.12,.12); if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
      materials.set(name,m);
    }
    return materials.get(name)!;
  };
  const wall=mat('chapter-wall','#d5cbbb'), floor=mat('chapter-floor','#9c8d78'), tile=mat('airport-tile','#b9c1c3'),
    wood=mat('chapter-wood','#6e4934'), dark=mat('chapter-dark','#342f31'), linen=mat('chapter-linen','#b7aa92'),
    blue=mat('chapter-blue','#557b8d'), green=mat('chapter-green','#61795a'), red=mat('chapter-red','#a4493c'), fruit=mat('chapter-fruit','#d89b43'),
    metal=mat('chapter-metal','#9ba3a2'), glass=mat('chapter-glass','#92b1b8'), screen=mat('chapter-screen','#27393c','#243b39');
  glass.alpha=.3;glass.backFaceCulling=false;
  const targets: InteractionTarget[]=[];
  const textures:DynamicTexture[]=[];
  const roots = new Map<Zone,TransformNode>();
  const meshes = new Map<Zone, AbstractMesh[]>();
  function add(zone: Zone, name:string, kind:string, dims:Record<string,number>, x:number,y:number,z:number, material:StandardMaterial, target?:string) {
    const mesh=kind==='box'?MeshBuilder.CreateBox(name,dims,scene):kind==='sphere'?MeshBuilder.CreateSphere(name,dims,scene):MeshBuilder.CreateCylinder(name,dims,scene);
    mesh.position.set(x,y,z); mesh.material=material; mesh.parent=roots.get(zone)!;
    mesh.isPickable=!!target; mesh.metadata={...(mesh.metadata??{}),castShadow:false};
    meshes.get(zone)!.push(mesh);
    if(target) targets.push({id:target,meshes:[mesh],label:()=>({
      parents:'Conversar com seus pais',suitcase:'Pegar a mala',gate:'Consultar portão de embarque',
      flightBoard:'Consultar painel de voos',seat:'Sentar e preparar-se',phone:'Consultar celular',
      leaflet:'Examinar folheto',host:'Conversar com a família anfitriã',poster:'Examinar cartaz',
    }[target]??'Interagir'),execute:()=>undefined});
    return mesh;
  }
  function box(zone:Zone,name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial,target?:string) { return add(zone,name,'box',{width:w,height:h,depth:d},x,y,z,m,target); }
  function sphere(zone:Zone,name:string,d:number,x:number,y:number,z:number,m:StandardMaterial,target?:string) { return add(zone,name,'sphere',{diameter:d,segments:8},x,y,z,m,target); }
  function cyl(zone:Zone,name:string,d:number,h:number,x:number,y:number,z:number,m:StandardMaterial) { return add(zone,name,'cylinder',{diameter:d,height:h,tessellation:8},x,y,z,m); }
  function character(zone:Zone,x:number,z:number,shirt:StandardMaterial,faceTarget?:string) {
    box(zone,'sapatos do personagem',.55,.16,.32,x,.08,z,dark);
    box(zone,'pernas do personagem',.43,.72,.3,x,.49,z,blue);
    const torso=box(zone,'corpo do personagem',.68,.76,.34,x,1.18,z,shirt,faceTarget);
    sphere(zone,'cabeça do personagem',.47,x,1.82,z,linen,faceTarget);
    box(zone,'cabelo do personagem',.49,.16,.5,x,2.04,z,dark);
    sphere(zone,'olho esquerdo',.055,x-.09,1.85,z+.22,dark);
    sphere(zone,'olho direito',.055,x+.09,1.85,z+.22,dark);
    box(zone,'boca estilizada',.09,.025,.02,x,1.72,z+.238,red);
    const left=box(zone,'braço esquerdo',.2,.66,.23,x-.43,1.2,z,shirt);left.rotation.z=-.08;
    const right=box(zone,'braço direito',.2,.66,.23,x+.43,1.2,z,shirt);right.rotation.z=.08;
    return {torso,left,right};
  }
  function makeZone(zone:Zone, origin:number, ground:number, groundMat:StandardMaterial) {
    const root=new TransformNode(zone+' chapter set',scene); roots.set(zone,root); meshes.set(zone,[]);
    // Ground and an enclosing three-sided backdrop keep the playable set clear.
    box(zone,zone+' floor',12,.18,12,origin,ground-.09,0,groundMat);
    box(zone,zone+' rear wall',12,4,.22,origin,ground+2,-6,wall);
    box(zone,zone+' left wall',.22,4,12,origin-6,ground+2,0,wall);
    box(zone,zone+' right wall',.22,4,12,origin+6,ground+2,0,wall);
  }
  function sign(zone:Zone,text:string,x:number,y:number,z:number,w:number,h:number,front=true) {
    const texture=new DynamicTexture('texto de cenário '+text,{width:512,height:256},scene,false);
    texture.hasAlpha=true;texture.drawText(text,24,156,'bold 42px Arial','#e8e1cf','rgba(24,31,30,0.96)',true,true);
    textures.push(texture);
    const material=new StandardMaterial('material de placa '+text,scene);material.diffuseTexture=texture;material.emissiveColor=new Color3(.22,.22,.19);material.backFaceCulling=false;materials.set('sign-'+text,material);
    const plane=MeshBuilder.CreatePlane('placa escrita '+text,{width:w,height:h},scene);plane.position.set(x,y,z);plane.material=material;plane.parent=roots.get(zone)!;plane.isPickable=false;
    if(!front)plane.rotation.y=Math.PI;
    meshes.get(zone)!.push(plane);
  }
  // The rebuilt kitchen owns only the existing home set. Chapter progression
  // and every travel environment remain in their original modules below.
  const kitchenRoot=new TransformNode('cozinha da família',scene);
  roots.set('home',kitchenRoot);
  const kitchen=buildKitchen(scene,kitchenRoot);
  const garage=buildGarage(scene,kitchenRoot);
  const laundry=buildLaundry(scene,kitchenRoot);
  meshes.set('home',[...kitchen.meshes,...garage.meshes,...laundry.meshes]);
  targets.push(...kitchen.targets,...garage.targets);

  const carRoot=new TransformNode('viagem de carro',scene);roots.set('car',carRoot);meshes.set('car',[]);
  box('car','estrada durante a viagem',5,.06,35,CAR_ORIGIN,-.03,12,mat('car-road','#535454'));
  box('car','painel do carro',2.8,.48,.62,CAR_ORIGIN,.91,-1.4,dark);
  box('car','capô visto pelo para-brisa',2.6,.14,.7,CAR_ORIGIN,1.17,-.72,red);
  box('car','teto do carro',2.8,.18,2.6,CAR_ORIGIN,3.1,-3.1,dark);
  box('car','coluna esquerda do para-brisa',.13,1.45,.14,CAR_ORIGIN-1.35,2.1,-1.9,dark);
  box('car','coluna direita do para-brisa',.13,1.45,.14,CAR_ORIGIN+1.35,2.1,-1.9,dark);
  box('car','volante',.65,.08,.08,CAR_ORIGIN,.97,-1.9,wood);
  const windshield=MeshBuilder.CreatePlane('para-brisa do carro',{width:2.5,height:1.3},scene);windshield.position.set(CAR_ORIGIN,2.12,-1.9);windshield.material=glass;windshield.parent=carRoot;windshield.isPickable=false;meshes.get('car')!.push(windshield);
  for(const z of[5,12,20])for(const x of[CAR_ORIGIN-4,CAR_ORIGIN+4]){
    box('car','casa vista da estrada',2.8,2.4,2,x,1.2,z,wall);
    cyl('car','árvore junto à estrada',.16,3.4,x+(x<CAR_ORIGIN?-1:1),1.7,z+2,wood);
    sphere('car','copa junto à estrada',1.8,x+(x<CAR_ORIGIN?-1:1),3.5,z+2,green);
  }

  const airportRoot=new TransformNode('aeroporto brasileiro · portão 24',scene);
  roots.set('airport',airportRoot);
  const airport=buildAirport(scene,airportRoot);
  meshes.set('airport',airport.meshes);targets.push(...airport.targets);
  airport.setParentMeshes(kitchen.parentMeshes);

  const planeRoot=new TransformNode('cabine de avião · viagem aos Estados Unidos',scene);
  roots.set('plane',planeRoot);
  const plane=buildPlane(scene,planeRoot);meshes.set('plane',plane.meshes);targets.push(...plane.targets);

  const arrivalRoot=new TransformNode('terminal de chegada · anfitriões',scene);
  roots.set('town',arrivalRoot);
  const arrival=buildArrival(scene,arrivalRoot);
  meshes.set('town',arrival.meshes);targets.push(...arrival.targets);

  let activeZone:Zone='home';
  function activate(zone:Zone) {
    activeZone=zone;
    for(const [key,root]of roots) root.setEnabled(key===zone);
    kitchen.setActive(zone==='home');
    garage.setActive(zone==='home');
    laundry.setActive(zone==='home');
    airport.setActive(zone==='airport');
    plane.setActive(zone==='plane');
    arrival.setActive(zone==='town');
  }
  activate('home');
  function setParentsLocation(location: ParentsLocation) {
    setParentsLocationState(location);
    kitchen.setParentsParent(roots.get(location==='airport'?'airport':'home')!);
    kitchen.setParentsLocation(location);
    // Keep the garage's identity cache from missing meshes appended by GLB load.
    garage.setParentOccupants([...kitchen.parentMeshes], kitchen.parentShadowCasters, location === 'car');
  }
  const ready = Promise.all([kitchen.ready, garage.ready, airport.ready, arrival.ready]).then(() => {
    airport.setParentMeshes(kitchen.parentMeshes);
    setParentsLocation(getParentsLocation());
  });
  return {
    targets, ready,
    activate,
    setParentsLocation,
    setParentsFarewell(amount:number){kitchen.setParentsFarewell(amount);},
    beginGarageDeparture(){garage.beginDeparture();},
    resetGarageDeparture(){garage.resetDeparture();},
    updateGarageDeparture(seconds:number){garage.updateDeparture(seconds);},
    teleportPoint(zone:Exclude<Zone,'home'>) {
      return zone==='car'?{x:CAR_ORIGIN,y:1.65,z:-3}:zone==='airport'?AIRPORT_ARRIVAL.position:zone==='plane'?PLANE_SEAT.position:ARRIVAL_SPAWN.position;
    },
    animate(time:number,speaker?:string,observer?:Point3,text?:string) {
      if(activeZone==='home') kitchen.animate(time,speaker,observer,text);
      if(activeZone==='airport'){airport.animate(time);kitchen.animateParents(time,speaker,observer,text);}
      if(activeZone==='plane')plane.animate(time);
      if(activeZone==='town')arrival.animate(time);
    },
    get kitchenDiagnostics(){return {active:activeZone==='home',meshes:kitchen.meshes.length,...kitchen.diagnostics};},
    get garageDiagnostics(){return garage.diagnostics;},
    get laundryDiagnostics(){return laundry.diagnostics;},
    get airportDiagnostics(){return airport.diagnostics;},
    get planeDiagnostics(){return plane.diagnostics;},
    get arrivalDiagnostics(){return arrival.diagnostics;},
    get familyDiagnostics(){
      const parents = kitchen.diagnostics.parents;
      return { location: getParentsLocation(), parents, actorCount: parents.length,
        kitchenVisibleCount: parents.filter(actor => actor.visible && actor.location === 'kitchen').length,
        carVisibleCount: parents.filter(actor => actor.visible && actor.location === 'car').length,
        airportVisibleCount: parents.filter(actor => actor.visible && actor.location === 'airport').length };
    },
    dispose(){laundry.dispose();garage.dispose();kitchen.dispose();airport.dispose();plane.dispose();arrival.dispose();for(const root of roots.values())root.dispose(false,false);for(const material of materials.values())material.dispose();for(const texture of textures)texture.dispose();}
  };
}
