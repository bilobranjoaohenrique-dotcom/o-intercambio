import type { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DOOR, ROOM, type Point2 } from './layout';
import { circleOverlapsObstacle, PLAYER_RADIUS } from './collision';
import type { InteractionTarget, Obstacle } from './types';

const SWING_SECONDS = .6;
const MAX_SWEEP_ANGLE = .025;
const EPSILON = .000001;
const ease = (t: number) => t*t*(3-2*t);

/** Geometry and collision share the hinge and the same Babylon Y rotation.
 * The leaf remains a real, pickable mesh throughout opening and closing. */
export function createDoor(scene: Scene, onSound?: (cue: 'door' | 'handle') => void) {
  const wood = new StandardMaterial('porta.madeira',scene);
  wood.diffuseColor=Color3.FromHexString('#795537');
  wood.specularColor.set(.045,.033,.023);wood.specularPower=18;
  const inset = new StandardMaterial('porta.paineis',scene);
  inset.diffuseColor=Color3.FromHexString('#6c4b33');inset.specularColor.set(.025,.022,.018);
  const metal = new StandardMaterial('porta.latão',scene);
  metal.diffuseColor=Color3.FromHexString('#92703e');metal.specularColor.set(.30,.23,.12);metal.specularPower=32;

  // A small authored grain texture gives the large wooden surface a sober,
  // low-resolution finish. It has no external asset or canvas dependency.
  if(typeof document!=='undefined') {
    const width=64,height=128,pixels=new Uint8Array(width*height*3);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
      const wave=Math.sin(x*.69+Math.sin(y*.064)*.7)*7+Math.sin(x*1.94+y*.007)*3;
      const pore=((Math.imul(x+13,73856093)^Math.imul(y+7,19349663))>>>0)%11-5;
      const seam=x===1||x===32||x===62?-9:0,grain=wave+pore*.5+seam;
      const at=(y*width+x)*3;pixels[at]=112+grain;pixels[at+1]=79+grain*.78;pixels[at+2]=51+grain*.55;
    }
    const texture=RawTexture.CreateRGBTexture(pixels,width,height,scene,false,false,Texture.NEAREST_SAMPLINGMODE);
    texture.name='porta.veios-locais-64x128';texture.wrapU=texture.wrapV=Texture.WRAP_ADDRESSMODE;
    wood.diffuseTexture=texture;wood.diffuseColor=Color3.White();
    inset.diffuseTexture=texture;inset.diffuseColor.set(.83,.78,.71);
  }

  const hinge = new TransformNode('porta.dobradiça',scene);
  hinge.position.set(DOOR.hingeX,ROOM.floor,DOOR.z);
  hinge.metadata={doorHinge:true};
  const moving: Mesh[]=[];
  function box(name: string, width: number, height: number, depth: number,
    x: number, y: number, z: number, material: StandardMaterial, attached=true) {
    const mesh=MeshBuilder.CreateBox(name,{width,height,depth},scene);
    mesh.position.set(x,y,z);mesh.material=material;mesh.receiveShadows=true;mesh.isPickable=true;
    mesh.metadata={doorPart:attached?'detail':'frame'};
    if(attached){mesh.parent=hinge;moving.push(mesh);}
    return mesh;
  }
  const leaf=box('porta.folha',DOOR.width,DOOR.height,DOOR.thickness,
    DOOR.width/2,DOOR.height/2,0,wood);
  leaf.metadata={doorPart:'leaf',interaction:'door'};
  for(const side of [-1,1]) {
    for(const [y,height] of [[.48,.62],[1.48,.91]]) {
      const panel=box('porta.painel',DOOR.width-.20,height,.004,
        DOOR.width/2,y,side*(DOOR.thickness/2+.0008),inset);
      panel.metadata={doorPart:'panel',interaction:'door'};
    }
    const handleX=DOOR.width-.125;
    const plate=MeshBuilder.CreateCylinder('porta.espelho-maçaneta',{height:.014,diameter:.085,tessellation:10},scene);
    plate.parent=hinge;plate.rotation.x=Math.PI/2;plate.position.set(handleX,1.02,side*(DOOR.thickness/2+.007));
    const stem=MeshBuilder.CreateCylinder('porta.eixo-maçaneta',{height:.055,diameter:.025,tessellation:8},scene);
    stem.parent=hinge;stem.rotation.x=Math.PI/2;stem.position.set(handleX,1.02,side*(DOOR.thickness/2+.034));
    for(const mesh of [plate,stem]){mesh.material=metal;mesh.isPickable=true;mesh.metadata={doorPart:'handle',interaction:'door'};moving.push(mesh);}
    const knob=MeshBuilder.CreateSphere('porta.maçaneta-redonda',{diameter:.073,segments:12},scene);
    knob.parent=hinge;knob.scaling.z=.82;knob.position.set(handleX,1.02,side*(DOOR.thickness/2+.069));
    knob.material=metal;knob.isPickable=true;knob.metadata={doorPart:'handle',interaction:'door'};moving.push(knob);
  }
  for(const y of [.24,1.04,1.84]) {
    const barrel=MeshBuilder.CreateCylinder('porta.ferragem-dobradiça',{height:.12,diameter:.042,tessellation:8},scene);
    barrel.parent=hinge;barrel.position.set(0,y,0);barrel.material=metal;barrel.isPickable=true;
    barrel.metadata={doorPart:'hinge',interaction:'door'};moving.push(barrel);
  }
  // Trim sits outside the clear aperture; it never narrows the layout's door
  // width or adds a hidden threshold for the player controller.
  const frameWidth=.07;
  box('porta.batente-esquerdo',frameWidth,DOOR.height+.08,.14,
    DOOR.hingeX-frameWidth/2,ROOM.floor+(DOOR.height+.08)/2,DOOR.z,wood,false);
  box('porta.batente-direito',frameWidth,DOOR.height+.08,.14,
    DOOR.hingeX+DOOR.width+frameWidth/2,ROOM.floor+(DOOR.height+.08)/2,DOOR.z,wood,false);
  box('porta.batente-superior',DOOR.width+frameWidth*2,.08,.14,
    DOOR.hingeX+DOOR.width/2,ROOM.floor+DOOR.height+.04,DOOR.z,wood,false);

  let angle=0,wantsOpen=false,from=0,to=0,elapsed=0,duration=SWING_SECONDS,sounded=false;
  function colliderAt(rotation: number): Obstacle {
    return {x:DOOR.hingeX+Math.cos(rotation)*DOOR.width/2,
      z:DOOR.z-Math.sin(rotation)*DOOR.width/2,
      halfWidth:DOOR.width/2,halfDepth:DOOR.thickness/2,rotation};
  }
  function apply() {
    hinge.rotation.y=angle;hinge.computeWorldMatrix(true);
    for(const mesh of moving)mesh.computeWorldMatrix(true);
  }
  function blocked(next: number, player: Point2) {
    if(circleOverlapsObstacle(player,colliderAt(angle),PLAYER_RADIUS))return true;
    const count=Math.max(1,Math.ceil(Math.abs(next-angle)/MAX_SWEEP_ANGLE));
    // Between two sampled poses, every point on the leaf is within this
    // conservative distance of its midpoint pose. Expanding the player circle
    // by that amount guards the entire arc, including a long single frame.
    const outerRadius=Math.hypot(DOOR.width,DOOR.thickness/2);
    for(let index=0;index<count;index++) {
      const a=angle+(next-angle)*index/count,b=angle+(next-angle)*(index+1)/count;
      const padding=2*outerRadius*Math.sin(Math.abs(b-a)/4)+EPSILON;
      if(circleOverlapsObstacle(player,colliderAt((a+b)/2),PLAYER_RADIUS+padding))return true;
    }
    return false;
  }
  const target: InteractionTarget={
    id:'door',meshes:moving,
    label:()=>wantsOpen?'Fechar porta':'Abrir porta',
    execute(){
      wantsOpen=!wantsOpen;from=angle;to=wantsOpen?DOOR.openAngle:0;elapsed=0;sounded=false;
      duration=SWING_SECONDS*Math.abs(to-from)/Math.abs(DOOR.openAngle);
      onSound?.('handle');
    },
  };
  apply();
  return {
    target,
    update(seconds: number, player: Point2) {
      if(!Number.isFinite(seconds)||seconds<=0||Math.abs(to-angle)<EPSILON)return;
      const time=Math.min(duration,elapsed+seconds);
      const next=time>=duration?to:from+(to-from)*ease(time/duration);
      if(blocked(next,player))return; // No accumulated animation time while obstructed.
      if(!sounded){sounded=true;onSound?.('door');}
      elapsed=time;angle=next;apply();
    },
    reset(){angle=0;wantsOpen=false;from=0;to=0;elapsed=0;duration=SWING_SECONDS;sounded=false;apply();},
    get angle(){return angle;},
    get isOpen(){return Math.abs(angle-DOOR.openAngle)<EPSILON;},
    collider(): Obstacle{return colliderAt(angle);},
  };
}
