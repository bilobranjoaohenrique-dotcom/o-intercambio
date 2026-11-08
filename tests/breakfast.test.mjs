import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { createBreakfastSeat, breakfastSpeechDuration } = await import('../src/game/breakfast.ts');
const seat = { position:{x:-.7,y:1.22,z:16.85},stand:{x:-.7,y:1.65,z:16.2},lookTarget:{x:0,y:1.42,z:18.55} };
function setup() {
 const position={...seat.stand,set(x,y,z){Object.assign(this,{x,y,z});}};
 const camera={position,rotation:{x:.4,y:0,z:0}};
 const controls={movement:true,adoptions:0,clearInput(){},adoptCameraPose(){this.adoptions++;},setMovementEnabled(value){this.movement=value;}};
 return {camera,controls,controller:createBreakfastSeat(camera,controls,seat)};
}
const point=camera=>({x:camera.position.x,y:camera.position.y,z:camera.position.z});
test('café: sentar interpola sem salto inicial, mantém primeira pessoa e bloqueia somente o deslocamento',()=>{
 const {camera,controls,controller}=setup(); const initial=point(camera);
 assert.equal(controller.sit(),true);assert.deepEqual(point(camera),initial);assert.equal(controls.movement,false);
 let previous=initial,events=[];
 for(let i=0;i<25;i++){
  const event=controller.update(.05);if(event)events.push(event);
  const next=point(camera);assert.ok(Math.hypot(next.x-previous.x,next.y-previous.y,next.z-previous.z)<.09);
  assert.ok(Object.values(next).every(Number.isFinite));previous=next;
 }
 assert.equal(controller.state,'seated');assert.deepEqual(events,['seated']);assert.deepEqual(point(camera),seat.position);
 assert.equal(controls.movement,false);assert.ok(controls.adoptions>10);
 camera.rotation.y=.8;controller.update(.1);assert.equal(camera.rotation.y,.8,'seated mouse look is not overwritten');
});
test('café: pausa preserva transição, comandos duplicados são recusados e levantar restaura pose caminhável',()=>{
 const {camera,controls,controller}=setup();assert.equal(controller.stand(),false);
 controller.sit();controller.update(.1);assert.equal(controller.sit(),false);
 const paused=point(camera);controller.update(0);controller.update(NaN);assert.deepEqual(point(camera),paused);
 for(let i=0;i<24;i++)controller.update(.05);
 assert.equal(controller.stand(),true);assert.equal(controller.stand(),false);
 for(let i=0;i<25;i++)controller.update(.05);
 assert.equal(controller.state,'standing');assert.deepEqual(point(camera),seat.stand);assert.equal(controls.movement,true);
 controller.sit();controller.reset();assert.equal(controller.state,'standing');assert.equal(controls.movement,true);
});
test('café: intervalo da fala depende do texto e termina enquanto o jogador aguarda uma escolha',()=>{
 assert.equal(breakfastSpeechDuration('Oi.'),2.2);
 assert.ok(breakfastSpeechDuration('Bom dia, querido. Sente aqui para tomar café.')>2.2);
 assert.equal(breakfastSpeechDuration('x'.repeat(1000)),6);
});
