import './register-typescript.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
const {createDoor}=await import('../src/game/door.ts');
const {DOOR,ROOM}=await import('../src/game/layout.ts');
const {circleOverlapsObstacle,moveWithCollisions,PLAYER_RADIUS}=await import('../src/game/collision.ts');
const far={x:0,z:0};
const near=(actual,expected,message='matching physical coordinate')=>assert.ok(Math.abs(actual-expected)<.000001,`${message}: ${actual} vs ${expected}`);
function fixture(run) {
  const engine=new NullEngine(),scene=new Scene(engine),cues=[];
  const door=createDoor(scene,cue=>cues.push(cue));
  try{run({door,scene,cues});}finally{scene.dispose();engine.dispose();}
}
function at(angle) {
  return {x:DOOR.hingeX+Math.cos(angle)*DOOR.width/2,z:DOOR.z-Math.sin(angle)*DOOR.width/2,
    halfWidth:DOOR.width/2,halfDepth:DOOR.thickness/2,rotation:angle};
}

test('porta: folha física permanece, gira suavemente em .6s e alterna abrir/fechar',()=>fixture(({door,cues})=>{
  assert.equal(door.target.id,'door');assert.equal(door.target.label(),'Abrir porta');assert.equal(door.isOpen,false);
  const meshes=[...door.target.meshes];assert.ok(meshes.length>=3);
  door.target.execute();assert.equal(door.target.label(),'Fechar porta');assert.deepEqual(cues,['handle']);
  door.update(.15,far);near(door.angle,DOOR.openAngle*.15625,'quarter-time smoothstep');assert.equal(door.isOpen,false);
  assert.ok(meshes.every(mesh=>mesh.isEnabled()&&mesh.isVisible&&mesh.isPickable));
  door.update(.45,far);near(door.angle,DOOR.openAngle);assert.equal(door.isOpen,true);
  assert.deepEqual(door.target.meshes,meshes,'opening never replaces or removes the leaf');
  door.target.execute();assert.equal(door.target.label(),'Abrir porta');door.update(.6,far);near(door.angle,0);
  assert.equal(door.isOpen,false);assert.deepEqual(cues,['handle','door','handle','door']);
  door.target.execute();door.update(.2,far);door.reset();near(door.angle,0);assert.equal(door.target.label(),'Abrir porta');
  assert.ok(meshes.every(mesh=>mesh.isEnabled()&&mesh.isVisible));
}));

test('porta: collider OBB coincide com a folha Babylon no hinge, meio e final da abertura',()=>fixture(({door})=>{
  const leaf=door.target.meshes.find(mesh=>mesh.metadata?.doorPart==='leaf');assert.ok(leaf);
  const check=()=>{
    const collider=door.collider(),expected=at(door.angle);
    for(const field of ['x','z','halfWidth','halfDepth','rotation'])near(collider[field],expected[field],field);
    leaf.computeWorldMatrix(true);const vertices=leaf.getVerticesData('position'),matrix=leaf.getWorldMatrix();
    const c=Math.cos(door.angle),s=Math.sin(door.angle);
    for(let index=0;index<vertices.length;index+=3) {
      const p=Vector3.TransformCoordinates(new Vector3(vertices[index],vertices[index+1],vertices[index+2]),matrix);
      const dx=p.x-collider.x,dz=p.z-collider.z;
      assert.ok(Math.abs(dx*c-dz*s)<=collider.halfWidth+.000001);
      assert.ok(Math.abs(dx*s+dz*c)<=collider.halfDepth+.000001);
      assert.ok(p.y>=ROOM.floor-.000001 && p.y<=ROOM.floor+DOOR.height+.000001);
    }
  };
  check();door.target.execute();door.update(.3,far);near(door.angle,DOOR.openAngle/2);check();
  door.update(.3,far);check();near(door.collider().x,DOOR.hingeX);near(door.collider().z,DOOR.z+DOOR.width/2);
}));

test('porta: bloqueia a passagem e costuras fechada; aberta permite atravessar a abertura real',()=>fixture(({door})=>{
  for(const x of [1.68,1.9,2.1,2.28]) {
    const end=moveWithCollisions({x,z:2.5},0,2,[door.collider()]);
    assert.ok(end.z<DOOR.z,'closed leaf and adjacent walls form a continuous barrier');
    assert.equal(circleOverlapsObstacle(end,door.collider()),false);
  }
  door.target.execute();door.update(.6,far);
  const end=moveWithCollisions({x:1.98,z:2.5},0,2,[door.collider()]);
  near(end.z,4.5,'the player actually walks through the opening, without a teleport');
}));

test('porta: varredura completa impede atravessar jogador mesmo com ambas poses finais livres',()=>fixture(({door,cues})=>{
  const player={x:2.1,z:3.75};
  assert.equal(circleOverlapsObstacle(player,at(0)),false);
  assert.equal(circleOverlapsObstacle(player,at(DOOR.openAngle)),false);
  assert.equal(circleOverlapsObstacle(player,at(DOOR.openAngle/2)),true);
  door.target.execute();door.update(.6,player);near(door.angle,0,'full opening sweep waits for the player');
  assert.deepEqual(cues,['handle'],'a blocked leaf does not produce a moving wood cue');
  door.update(.6,player);near(door.angle,0);
  door.update(.3,far);near(door.angle,DOOR.openAngle/2,'blocked time is not accumulated');
  door.update(.3,far);assert.equal(door.isOpen,true);
  door.target.execute();door.update(.6,player);near(door.angle,DOOR.openAngle,'closing also checks the complete arc');
  door.update(.3,far);near(door.angle,DOOR.openAngle/2);door.update(.3,far);near(door.angle,0);
}));

test('porta: passos curtos nunca empurram o círculo durante abertura e fechamento',()=>fixture(({door})=>{
  for(const player of [{x:1.73,z:4.12},{x:2.1,z:3.75},{x:2.4,z:3.75}]) {
    for(const closing of [false,true]) {
      door.reset();
      if(closing){door.target.execute();door.update(.6,far);}
      door.target.execute();
      for(let frame=0;frame<60;frame++) {
        const before=door.angle;door.update(.02,player);const after=door.angle;
        for(const t of [0,.25,.5,.75,1])assert.equal(circleOverlapsObstacle(player,at(before+(after-before)*t),PLAYER_RADIUS),false,
          `the leaf never sweeps through the player (${closing?'closing':'opening'}, frame ${frame})`);
      }
    }
  }
  const before=door.angle;
  door.update(NaN,far);door.update(-1,far);door.update(0,far);near(door.angle,before);
}));
