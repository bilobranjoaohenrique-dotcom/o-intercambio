import assert from 'node:assert/strict';
import test from 'node:test';
import './register-typescript.mjs';
const { createAudio } = await import('../src/game/audio.ts');
const { normalizeVehicleMotion, vehicleSoundMix, footstepSound } = await import('../src/game/westbridgeAudio.ts');

// Tests verify ownership, signal routing and lifecycle. The deterministic mock
// analyser is not evidence of an actual audible signal or browser performance.
class Param {
  constructor(value=1){this.value=value;this.calls=[];}
  setValueAtTime(value){assert.ok(Number.isFinite(value));this.value=value;this.calls.push(value);}
  setTargetAtTime(value){this.setValueAtTime(value);}
  exponentialRampToValueAtTime(value){this.setValueAtTime(value);}
  cancelScheduledValues(){}
}
class Node {
  constructor(kind){this.kind=kind;this.outputs=[];this.gain=new Param();this.frequency=new Param();this.Q=new Param();this.started=false;this.stopped=false;}
  connect(node){this.outputs.push(node);return node;}
  disconnect(){this.outputs=[];}
  start(){this.started=true;}
  stop(at){if(at===undefined){this.stopped=true;this.onended?.();}}
}
async function fixture(run){
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),contexts=[];
  class Context {
    constructor(){contexts.push(this);this.currentTime=0;this.state='suspended';this.sampleRate=4000;this.destination=new Node('destination');this.nodes=[];this.listener={};this.closed=0;
      for(const name of ['positionX','positionY','positionZ','forwardX','forwardY','forwardZ','upX','upY','upZ'])this.listener[name]=new Param();}
    node(type){const node=new Node(type);this.nodes.push(node);return node;}
    createGain(){return this.node('gain');}
    createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
    createBufferSource(){return this.node('source');}
    createOscillator(){return this.node('oscillator');}
    createBiquadFilter(){return this.node('filter');}
    createAnalyser(){const node=this.node('analyser');node.getFloatTimeDomainData=data=>data.fill(.002);return node;}
    createPanner(){const node=this.node('panner');for(const key of ['positionX','positionY','positionZ'])node[key]=new Param();return node;}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    close(){this.closed++;this.state='closed';return Promise.resolve();}
  }
  Object.defineProperty(globalThis,'AudioContext',{value:Context,writable:true,configurable:true});
  const settings={volume:.6},audio=createAudio(()=>settings);
  try{await run({audio,settings,contexts});}
  finally{audio.dispose();if(descriptor)Object.defineProperty(globalThis,'AudioContext',descriptor);else delete globalThis.AudioContext;}
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};

test('Westbridge audio: vehicle stop and malformed telemetry never create invalid gains',()=>{
  const previous={speed:4,running:true,position:{x:480,y:1,z:-5}};
  const fixed=normalizeVehicleMotion({speed:Infinity,running:false,position:{x:NaN,y:0,z:0}},previous);
  assert.equal(fixed.speed,0);assert.equal(fixed.running,false);assert.deepEqual(fixed.position,previous.position);
  previous.position.x=0;assert.equal(fixed.position.x,480,'telemetry coordinates are copied');
  for(const speed of [NaN,Infinity,-10,0,5,1000])for(const inside of [false,true]){
    const mix=vehicleSoundMix(speed,false,inside);
    assert.ok(Object.values(mix).every(Number.isFinite));assert.equal(mix.engineGain,0);
    if(!(speed>0&&Number.isFinite(speed)))assert.equal(mix.tyreGain,0);
  }
  assert.ok(vehicleSoundMix(8,true,true).tyreGain<vehicleSoundMix(8,true,false).tyreGain,'cabin muffles road noise');
  assert.ok(footstepSound('grass').cutoff<footstepSound('asphalt').cutoff);
  assert.ok(footstepSound('wood').thud>footstepSound('grass').thud,'surface response differs without new spoken audio');
});

test('Westbridge audio: shares the existing context/master, keeps mouse-oriented spatial listener and respects pause/mute',()=>fixture(async({audio,settings,contexts})=>{
  audio.setAmbience('westbridge-car');audio.setVehicleMotion({speed:8,running:true,position:{x:480,y:1,z:-3}});
  assert.equal(contexts.length,0,'scene requests do not bypass gesture unlock');
  audio.unlock();await flush();
  assert.equal(contexts.length,1);const context=contexts[0],master=context.nodes[0];
  let state=audio.diagnostics;
  assert.equal(state.ambience,'westbridge-car');assert.ok(state.westbridge.activeSources>0);assert.equal(state.westbridge.vehicle.speed,8);
  const reachesMaster=(node,seen=new Set())=>node===master||(!seen.has(node)&&(seen.add(node),node.outputs.some(output=>reachesMaster(output,seen))));
  for(const node of context.nodes.filter(node=>node.started&&!node.stopped))assert.ok(reachesMaster(node),'every started source enters the same master bus');
  audio.updateListener({position:{x:480,y:1.1,z:-4},rotation:{x:0,y:Math.PI/2,z:0}});
  assert.ok(Math.abs(context.listener.forwardX.value-1)<1e-10);assert.equal(context.listener.positionX.value,480);
  assert.equal(context.listener.positionZ.value,4,'LH world is converted to right-handed Web Audio');
  audio.updateListener({position:{x:480,y:1.1,z:-4},rotation:{x:0,y:0,z:0}});
  assert.equal(context.listener.forwardZ.value,-1,'looking ahead keeps right/left spatial sources on their correct side');
  audio.pause(true);await flush();
  assert.equal(context.state,'suspended');assert.equal(audio.diagnostics.westbridge.busGainTarget,0);assert.equal(audio.diagnostics.masterGainTarget,0);
  const sourceCount=context.nodes.filter(node=>node.started).length;
  audio.pause(false);await flush();assert.equal(context.state,'running');
  assert.equal(context.nodes.filter(node=>node.started).length,sourceCount,'pause does not duplicate loops');
  settings.volume=0;audio.updateListener({position:{x:480,y:1.1,z:-4}});
  assert.equal(audio.diagnostics.masterGainTarget,0);assert.equal(master.gain.value,0);
  assert.equal(audio.diagnostics.dialogueAudio,false);assert.equal(audio.diagnostics.westbridge.recordings,false);
}));

test('Westbridge audio: scene changes, restart and disposal stop every owned source',()=>fixture(async({audio,contexts})=>{
  audio.setAmbience('westbridge-car');audio.unlock();await flush();
  const context=contexts[0],wind=context.nodes.find(node=>node.kind==='source');
  const cabinSources=context.nodes.filter(node=>node.started&&node!==wind);
  audio.setVehicleMotion({speed:0,running:false,position:{x:475.1,y:.3,z:-8.7}});
  assert.equal(audio.diagnostics.westbridge.mix.engineGain,0);assert.equal(audio.diagnostics.westbridge.mix.tyreGain,0);
  audio.setAmbience('westbridge');assert.ok(cabinSources.every(node=>node.stopped));
  const active=audio.diagnostics.westbridge.activeSources;
  audio.setAmbience('westbridge');assert.equal(audio.diagnostics.westbridge.activeSources,active,'same area does not duplicate spatial beds');
  audio.playSurfaceFootstep('grass');assert.equal(audio.diagnostics.westbridge.lastFootstepSurface,'grass');
  assert.doesNotThrow(()=>audio.setVehicleMotion({speed:NaN,running:true,position:{x:Infinity,y:0,z:0}}));
  audio.reset();assert.equal(audio.diagnostics.ambience,'home');assert.equal(audio.diagnostics.westbridge.activeSources,0);
  assert.equal(wind.stopped,false,'reset preserves the existing home wind');
  audio.dispose();assert.equal(context.closed,1);assert.ok(context.nodes.filter(node=>node.started).every(node=>node.stopped));
  audio.dispose();audio.unlock();assert.equal(contexts.length,1);assert.equal(context.closed,1);
}));
