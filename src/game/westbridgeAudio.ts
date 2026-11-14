/** Original procedural nonverbal sound design. These are provisional synthesis
 * layers, not recordings, voice ambience, dialogue or music. The owner supplies
 * its existing context, master bus and noise buffer. */
export type AudioPoint = { x: number; y: number; z: number };
export type VehicleMotion = { speed: number; running: boolean; position: AudioPoint };
export type FootstepSurface = 'asphalt' | 'concrete' | 'grass' | 'wood';
type Area = 'westbridge' | 'westbridge-car' | null;
const finitePoint = (point: AudioPoint) => !!point && [point.x,point.y,point.z].every(Number.isFinite);
const copyPoint = (point: AudioPoint) => ({x:point.x,y:point.y,z:point.z});
const clamp = (value: number, low: number, high: number) => Math.max(low,Math.min(high,value));
const boundedPoint = (point: AudioPoint) => ({x:clamp(point.x,-100000,100000),y:clamp(point.y,-100000,100000),z:clamp(point.z,-100000,100000)});

export function normalizeVehicleMotion(value: VehicleMotion, previous: VehicleMotion): VehicleMotion {
  return { speed: Number.isFinite(value.speed) ? clamp(value.speed,0,24) : 0,
    running: value.running === true,
    position: finitePoint(value.position) ? boundedPoint(value.position) : copyPoint(previous.position) };
}

/** Every level is before the existing master gain. Stopped tyres are silent. */
export function vehicleSoundMix(speed: number, running: boolean, inside: boolean) {
  const normalized = Number.isFinite(speed) ? clamp(speed/11,0,1) : 0;
  return { engineFrequency: 48 + normalized*37,
    engineGain: running ? (inside ? .013 : .019) + normalized*.007 : 0,
    tyreGain: normalized*(inside ? .014 : .022),
    tyreCutoff: inside ? 360+normalized*170 : 760+normalized*420,
    windGain: inside ? .0035+normalized*.005 : .018,
  };
}

export const footstepSound = (surface: FootstepSurface, running = false) => {
  const profiles = {
    asphalt: { duration:.115, noise:.043, cutoff:1250, thud:83, body:.018 },
    concrete: { duration:.105, noise:.042, cutoff:1900, thud:98, body:.021 },
    grass: { duration:.17, noise:.048, cutoff:490, thud:58, body:.008 },
    wood: { duration:.12, noise:.033, cutoff:980, thud:137, body:.024 },
  } as const;
  const selected = profiles[surface] ?? profiles.concrete;
  return { ...selected, noise:selected.noise*(running?1.1:1), body:selected.body*(running?1.12:1) };
};

export function createWestbridgeAudio(context: AudioContext, master: AudioNode, noise: AudioBuffer) {
  let area: Area = null, disposed = false, paused = false, unavailable = false;
  let seed = 148611, ticks = 0;
  let motion: VehicleMotion = { speed:0,running:false,position:{x:475.1,y:.3,z:-8.7} };
  let bus: GainNode | null = null, windGain: GainNode | null = null;
  let engineGain: GainNode | null = null, tyreGain: GainNode | null = null;
  let engine: OscillatorNode | null = null, harmonic: OscillatorNode | null = null;
  let tyreFilter: BiquadFilterNode | null = null, vehiclePanner: PannerNode | null = null;
  let analyser: AnalyserNode | null = null;
  const analysisSamples=new Float32Array(256), panners=new Set<PannerNode>();
  const sources = new Set<AudioScheduledSourceNode>(), nodes = new Set<AudioNode>();
  const targets = new WeakMap<AudioParam,number>();
  const birds = new Set<AudioScheduledSourceNode>();
  const random = () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; };
  const anchors = [{x:484.2,y:5.5,z:-10.1},{x:513,y:6,z:-23},{x:463,y:4,z:12}];
  const add = <T extends AudioNode>(node: T): T => { nodes.add(node);return node; };
  function target(param: AudioParam | undefined, value: number, smooth = .08) {
    if(!param || !Number.isFinite(value))return;
    const bounded=clamp(value,-100000,100000),previous=targets.get(param);
    if(previous!==undefined && Math.abs(previous-bounded)<.00001)return;
    targets.set(param,bounded);param.setTargetAtTime(bounded,context.currentTime,smooth);
  }
  function position(panner: PannerNode, point: AudioPoint) {
    if(!finitePoint(point))return;
    // Babylon uses left-handed +Z forward; Web Audio uses right-handed space.
    // Mirror Z for sources and listener together so stereo is not reversed.
    if(panner.positionX){target(panner.positionX,point.x);target(panner.positionY,point.y);target(panner.positionZ,-point.z);}
    else {const p=boundedPoint(point);panner.setPosition(p.x,p.y,-p.z);}
  }
  function spatial(point: AudioPoint, reference = 5, distance = 75) {
    const panner=add(context.createPanner());panner.panningModel='HRTF';panner.distanceModel='inverse';
    panner.refDistance=reference;panner.maxDistance=distance;panner.rolloffFactor=1.15;
    position(panner,point);panners.add(panner);return panner;
  }
  function start(source: AudioScheduledSourceNode) { sources.add(source);source.start();return source; }
  function stop() {
    for(const source of sources){source.onended=null;try{source.stop();}catch{/* ended */}}
    sources.clear();birds.clear();
    for(const node of nodes){try{node.disconnect();}catch{/* partial graph */}}
    nodes.clear();panners.clear();bus=windGain=engineGain=tyreGain=null;engine=harmonic=null;tyreFilter=null;vehiclePanner=null;analyser=null;
  }
  function noiseLoop(cutoff: number, level: number, output: AudioNode, type: BiquadFilterType = 'lowpass') {
    const source=add(context.createBufferSource());source.buffer=noise;source.loop=true;
    const filter=add(context.createBiquadFilter());filter.type=type;filter.frequency.value=cutoff;filter.Q.value=.55;
    const gain=add(context.createGain());gain.gain.value=level;
    source.connect(filter);filter.connect(gain);gain.connect(output);start(source);
    return {source,filter,gain};
  }
  function syncVehicle() {
    if(!bus || !area)return;
    const mix=vehicleSoundMix(motion.speed,motion.running,area==='westbridge-car');
    target(windGain?.gain,mix.windGain);
    target(engine?.frequency,mix.engineFrequency,.18);target(harmonic?.frequency,mix.engineFrequency*2,.18);
    target(engineGain?.gain,mix.engineGain,.18);target(tyreGain?.gain,mix.tyreGain,.13);
    target(tyreFilter?.frequency,mix.tyreCutoff,.18);
    if(vehiclePanner)position(vehiclePanner,motion.position);
  }
  function build() {
    if(disposed || unavailable || paused || !area || bus)return;
    try {
      bus=add(context.createGain());bus.gain.value=1;
      try{analyser=add(context.createAnalyser());analyser.fftSize=256;analyser.smoothingTimeConstant=0;bus.connect(analyser);analyser.connect(master);}
      catch{analyser=null;bus.connect(master);}
      const wind=noiseLoop(320,.012,bus);windGain=wind.gain;
      if(area==='westbridge') {
        const traffic=spatial({x:521,y:1,z:3},12,120);traffic.connect(bus);
        noiseLoop(140,.013,traffic);
        // One very quiet upper band suggests foliage/insects, without a
        // permanent trill or event that competes with narrative text.
        const insects=spatial({x:482,y:.8,z:-12},4,32);insects.connect(bus);
        noiseLoop(5100,.0016,insects,'bandpass');
      }
      vehiclePanner=spatial(motion.position,area==='westbridge-car'?3:2,45);vehiclePanner.connect(bus);
      const tyre=noiseLoop(360,0,vehiclePanner);tyreGain=tyre.gain;tyreFilter=tyre.filter;
      engineGain=add(context.createGain());engineGain.gain.value=0;engineGain.connect(vehiclePanner);
      engine=add(context.createOscillator());engine.type='triangle';engine.frequency.value=48;engine.connect(engineGain);start(engine);
      const harmonicGain=add(context.createGain());harmonicGain.gain.value=.11;harmonicGain.connect(engineGain);
      harmonic=add(context.createOscillator());harmonic.type='sine';harmonic.frequency.value=96;harmonic.connect(harmonicGain);start(harmonic);
      syncVehicle();
    }catch{stop();unavailable=true;}
  }
  function setArea(next: Area) {
    if(disposed)return;
    if(area!==next){stop();ticks=0;}
    area=next;build();
  }
  function bird() {
    if(!bus || area!=='westbridge' || paused || context.state!=='running')return;
    const anchor=anchors[Math.floor(random()*anchors.length)],panner=spatial(anchor,3,55);
    panner.connect(bus);
    const gain=add(context.createGain()),now=context.currentTime,osc=add(context.createOscillator());
    const pitch=2400+random()*1100;osc.type='sine';osc.frequency.setValueAtTime(pitch,now);
    osc.frequency.exponentialRampToValueAtTime(pitch*1.16,now+.065);
    osc.frequency.exponentialRampToValueAtTime(pitch*.91,now+.145);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.0065,now+.026);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.17);
    osc.connect(gain);gain.connect(panner);sources.add(osc);birds.add(osc);
    osc.onended=()=>{sources.delete(osc);birds.delete(osc);panners.delete(panner);for(const node of [osc,gain,panner]){node.disconnect();nodes.delete(node);}};
    osc.start(now);osc.stop(now+.19);
  }
  function updateListener(point: AudioPoint, orientation?: AudioPoint) {
    if(!finitePoint(point))return;
    const listener=context.listener;
    if(!listener)return;
    if(listener.positionX){target(listener.positionX,point.x,.025);target(listener.positionY,point.y,.025);target(listener.positionZ,-point.z,.025);}
    else {const p=boundedPoint(point);listener.setPosition(p.x,p.y,-p.z);}
    if(orientation && finitePoint(orientation)) {
      if(listener.forwardX){target(listener.forwardX,orientation.x,.025);target(listener.forwardY,orientation.y,.025);target(listener.forwardZ,-orientation.z,.025);target(listener.upX,0);target(listener.upY,1);target(listener.upZ,0);}
      else listener.setOrientation(orientation.x,orientation.y,-orientation.z,0,1,0);
    }
  }
  return {
    setArea,updateListener,
    setVehicleMotion(value: VehicleMotion) { motion=normalizeVehicleMotion(value,motion);syncVehicle(); },
    tick() { if(area!=='westbridge'||paused||disposed)return;ticks++;if(ticks%2===0 && random()<.65)bird(); },
    pause(value: boolean) { paused=value;if(bus)target(bus.gain,value?0:1,.03);if(!value)build(); },
    reset() { stop();area=null;motion={speed:0,running:false,position:{x:475.1,y:.3,z:-8.7}};ticks=0; },
    get diagnostics() {
      let rms=0;
      if(analyser && !paused && context.state==='running'){
        analyser.getFloatTimeDomainData(analysisSamples);
        for(const value of analysisSamples)rms+=value*value;
        rms=Math.sqrt(rms/analysisSamples.length);
      }
      return {area,procedural:true,recordings:false,dialogueAudio:false,supported:!unavailable,
      paused,activeSources:sources.size,spatialSources:panners.size,busGainTarget:bus&&area&&!paused?1:0,rmsBeforeMaster:rms,
      birdSources:birds.size,vehicle:{...motion,position:copyPoint(motion.position)},
      mix:vehicleSoundMix(motion.speed,motion.running,area==='westbridge-car')}; },
    dispose() { if(disposed)return;stop();area=null;disposed=true; },
  };
}
