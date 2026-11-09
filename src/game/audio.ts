import type { Settings } from './types';

export type AudioCue = 'cloth' | 'bed' | 'foot' | 'door' | 'handle' | 'objective' | 'engine' | 'garageGate' | 'tv';
type AmbienceArea = 'home' | 'airport' | 'plane';
type Point = { x:number;y:number;z:number };
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const valid=(p:Point)=>[p.x,p.y,p.z].every(Number.isFinite);
// Babylon Vector3 exposes x/y/z through prototype getters, not enumerable own
// properties. Spreading it would retain _x/_y/_z and lose the public coordinates.
const copyPoint=(p:Point):Point=>({x:p.x,y:p.y,z:p.z});

/** Original procedural ambience and effects only. Dialogue is never sent to
 * Web Audio, a synthesizer, an API, or an audio file. Every story line is text. */
export function createAudio(settings:()=>Settings) {
  let context:AudioContext|null=null,master:GainNode|null=null,noise:AudioBuffer|null=null;
  let unlocked=false,paused=false,disposed=false,disabled=false,lastVolume=-1,listener:Point={x:0,y:0,z:0};
  let timer:ReturnType<typeof setInterval>|undefined;
  let seed=945813;
  const transient=new Set<AudioScheduledSourceNode>(),persistent=new Set<AudioScheduledSourceNode>();
  let ambience:AmbienceArea='home',homeWindGain:GainNode|null=null;
  const airportSources=new Set<AudioScheduledSourceNode>(),airportTransients=new Set<AudioScheduledSourceNode>();
  let airportNodes:AudioNode[]=[];
  // The television shares this context, master volume and procedural buffer.
  // Its source is created only while requested, and never contains speech.
  let televisionRequested=false,televisionUnavailable=false,televisionPosition:Point|null=null;
  let televisionSource:AudioBufferSourceNode|null=null,televisionFilter:BiquadFilterNode|null=null;
  let televisionGain:GainNode|null=null,televisionAnalyser:AnalyserNode|null=null,televisionLevel=0;
  const televisionSamples=new Float32Array(256);
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function setVolume(){
    if(!context||!master)return;
    const level=paused?0:clamp(settings().volume,0,1)*.8;
    if(Math.abs(level-lastVolume)<.0001)return;
    lastVolume=level;master.gain.setTargetAtTime(level,context.currentTime,.025);
  }
  function graph(){
    if(context||disposed||disabled)return;
    try{
      context=new AudioContext({latencyHint:'interactive'});master=context.createGain();master.gain.value=0;master.connect(context.destination);
      noise=context.createBuffer(1,Math.ceil(context.sampleRate*2),context.sampleRate);
      const data=noise.getChannelData(0);let previous=0;
      for(let i=0;i<data.length;i++){previous=previous*.55+(random()*2-1)*.45;data[i]=previous;}
      const wind=context.createBufferSource();wind.buffer=noise;wind.loop=true;
      const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=390;
      const gain=context.createGain();gain.gain.value=ambience==='home'?.022:0;homeWindGain=gain;
      wind.connect(low);low.connect(gain);gain.connect(master);wind.start();persistent.add(wind);
      timer=setInterval(ambient,2100);setVolume();syncTelevision();syncAmbience();
    }catch{disabled=true;}
  }
  function finish(source:AudioScheduledSourceNode,nodes:AudioNode[]){
    transient.add(source);source.onended=()=>{transient.delete(source);airportTransients.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
  }
  function envelope(duration:number,level:number,delay=0){
    const gain=context!.createGain(),now=context!.currentTime+delay;
    gain.gain.value=.0001;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(level,now+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(master!);return gain;
  }
  function tone(from:number,to:number,duration:number,level:number,delay=0,type:OscillatorType='sine'){
    if(!context||!master||!noise)return;
    const now=context.currentTime+delay,osc=context.createOscillator(),gain=envelope(duration,level);
    osc.type=type;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),now+duration);
    osc.connect(gain);finish(osc,[gain]);osc.start(now);osc.stop(now+duration+.02);
    return osc;
  }
  function rustle(duration:number,level:number,cutoff=900,delay=0){
    if(!context||!master||!noise)return;
    const source=context.createBufferSource();source.buffer=noise;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=cutoff;
    const gain=envelope(duration,level,delay);source.connect(filter);filter.connect(gain);finish(source,[filter,gain]);
    source.start(delay?context.currentTime+delay:0,random()*.6,duration);source.stop(context.currentTime+delay+duration+.02);
    return source;
  }
  function airportSound(...sources:(AudioScheduledSourceNode|undefined)[]){
    for(const source of sources)if(source)airportTransients.add(source);
  }
  function stopAirportAmbience(){
    for(const source of airportTransients){try{source.stop();}catch{/* already ended */}}
    airportTransients.clear();
    for(const source of airportSources){
      persistent.delete(source);try{source.stop();}catch{/* already stopped */}
    }
    airportSources.clear();
    for(const node of airportNodes){try{node.disconnect();}catch{/* partial graph */}}
    airportNodes=[];
  }
  function syncAmbience(){
    if(context&&homeWindGain)homeWindGain.gain.setTargetAtTime(ambience==='home'?.022:0,context.currentTime,.12);
    if(ambience==='home'){stopAirportAmbience();return;}
    if(disposed||disabled||paused||!unlocked||!context||!master||!noise||airportSources.size)return;
    try{
      // Air conditioning and a distant engine use the same noise buffer as
      // the house. Two very quiet electrical harmonics suggest fluorescent
      // fixtures; there are no recordings, voices or crowd-like syllables.
      const air=context.createBufferSource();airportNodes.push(air);air.buffer=noise;air.loop=true;
      const low=context.createBiquadFilter();airportNodes.push(low);low.type='lowpass';low.frequency.value=ambience==='plane'?190:250;
      const airGain=context.createGain();airportNodes.push(airGain);airGain.gain.value=ambience==='plane'?.065:.034;
      air.connect(low);low.connect(airGain);airGain.connect(master);air.start();airportSources.add(air);persistent.add(air);
      for(const [frequency,level] of ambience==='plane'?[[72,.008],[144,.002]]:[[120,.0035],[240,.0012]]){
        const hum=context.createOscillator();airportNodes.push(hum);hum.type='sine';hum.frequency.value=frequency;
        const gain=context.createGain();airportNodes.push(gain);gain.gain.value=level;
        hum.connect(gain);gain.connect(master);hum.start();airportSources.add(hum);persistent.add(hum);
      }
    }catch{stopAirportAmbience();}
  }
  function setAmbience(area:AmbienceArea){
    if(disposed)return;
    if(area!==ambience)stopAirportAmbience();
    ambience=area;lastVolume=-1;setVolume();syncAmbience();
  }
  function ambient(){
    if(!context||paused||disposed||context.state!=='running')return;
    if(ambience==='plane'){
      if(random()<.22)rustle(.22,.008,600);
      return;
    }
    if(ambience==='airport'){
      const event=random();
      if(event<.30){
        airportSound(rustle(.075,.012,670),rustle(.075,.010,720,.29));
      }else if(event<.56){
        airportSound(rustle(.55,.014,1800));
      }else if(event<.69){
        airportSound(tone(880,880,.075,.005));
      }else if(event<.80){
        airportSound(rustle(1.35,.022,180));
      }
      return;
    }
    const pitch=1700+random()*800;tone(pitch,pitch*1.3,.09,.012);tone(pitch*1.2,pitch,.1,.01,.16);
    if(random()>.45){tone(110,76,.18,.009,0,'triangle');}
  }
  function stopTelevision(){
    const source=televisionSource;
    televisionSource=null;televisionLevel=0;
    if(source){source.onended=null;persistent.delete(source);try{source.stop();}catch{/* already stopped */}}
    for(const node of[source,televisionFilter,televisionGain,televisionAnalyser]){
      try{node?.disconnect();}catch{/* context already closed */}
    }
    televisionFilter=null;televisionGain=null;televisionAnalyser=null;
  }
  function updateTelevisionLevel(){
    if(!context||!televisionGain)return;
    const distance=televisionPosition&&valid(listener)&&valid(televisionPosition)?Math.hypot(listener.x-televisionPosition.x,listener.y-televisionPosition.y,listener.z-televisionPosition.z):Infinity;
    // Invalid or overflowed coordinates must silence this branch instead of
    // passing a non-finite value to AudioParam and interrupting the render loop.
    const falloff=Number.isFinite(distance)?Math.max(0,1-distance/5.5):0;
    const level=televisionRequested&&!paused?falloff*falloff*.045:0;
    if(Math.abs(level-televisionLevel)<.00001)return;
    televisionLevel=level;televisionGain.gain.setTargetAtTime(level,context.currentTime,.035);
  }
  function syncTelevision(){
    if(!televisionRequested){stopTelevision();return;}
    if(disposed||disabled||paused||!unlocked||!context||!master||!noise)return;
    if(!televisionSource){
      let source:AudioBufferSourceNode|null=null,filter:BiquadFilterNode|null=null;
      let gain:GainNode|null=null,analyser:AnalyserNode|null=null;
      try{
        source=context.createBufferSource();source.buffer=noise;source.loop=true;
        filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1250;filter.Q.value=.55;
        gain=context.createGain();gain.gain.value=0;
        analyser=context.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=0;
        source.connect(filter);filter.connect(gain);gain.connect(analyser);analyser.connect(master);
        source.start();persistent.add(source);
        televisionSource=source;televisionFilter=filter;televisionGain=gain;televisionAnalyser=analyser;
        televisionUnavailable=false;
      }catch{
        if(source){try{source.stop();}catch{/* not started */}}
        for(const node of[source,filter,gain,analyser]){try{node?.disconnect();}catch{/* partial graph */}}
        televisionUnavailable=true;return;
      }
    }
    updateTelevisionLevel();
  }
  function setTelevision(on:boolean,position?:Point){
    if(disposed)return;
    if(position&&valid(position))televisionPosition=copyPoint(position);
    else if(on&&!televisionPosition)televisionPosition=copyPoint(listener);
    televisionRequested=on;syncTelevision();
  }
  function televisionDiagnostics(){
    const playing=!!televisionSource&&!paused&&context?.state==='running';
    let rms=0;
    if(playing&&televisionAnalyser){
      televisionAnalyser.getFloatTimeDomainData(televisionSamples);
      for(const sample of televisionSamples)rms+=sample*sample;
      rms=Math.sqrt(rms/televisionSamples.length);
    }
    return{requested:televisionRequested,playing,supported:!disabled&&!televisionUnavailable,
      gain:televisionLevel,effectiveGain:televisionLevel*Math.max(0,lastVolume),
      rmsBeforeMaster:rms,position:televisionPosition?copyPoint(televisionPosition):null};
  }
  function play(cue:AudioCue){
    if(!unlocked||paused||disposed||!context||context.state!=='running')return;
    setVolume();
    if(cue==='cloth')rustle(.38,.05,1400);
    if(cue==='bed'){tone(104,76,.33,.022,0,'triangle');rustle(.28,.018,520);}
    if(cue==='foot'){rustle(.115,.062,760);tone(112+random()*24,58,.09,.027,0,'triangle');}
    if(cue==='handle'){tone(1120,760,.07,.02);rustle(.07,.03,2800);}
    if(cue==='door'){tone(119,82,.4,.014,0,'triangle');rustle(.44,.026,640);}
    if(cue==='objective'){tone(523.25,523.25,.22,.016);tone(659.25,659.25,.25,.012,.12);}
    if(cue==='engine'){tone(76,58,2.7,.035,0,'sawtooth');rustle(2.6,.025,360);}
    if(cue==='garageGate'){
      rustle(1.35,.038,1900);tone(168,105,1.1,.014,0,'triangle');
      tone(1260,780,.065,.012);rustle(.09,.024,3200,.16);
    }
    if(cue==='tv'){tone(1560,760,.045,.012);rustle(.055,.016,3400);}
  }
  function unlock(){if(disposed)return;unlocked=true;graph();if(context&&!paused)void context.resume().then(()=>{setVolume();syncTelevision();syncAmbience();}).catch(()=>undefined);}
  function pause(value:boolean){
    paused=value;if(!context)return;setVolume();updateTelevisionLevel();
    if(value)void context.suspend().catch(()=>undefined);
    else if(unlocked)void context.resume().then(()=>{setVolume();syncTelevision();syncAmbience();}).catch(()=>undefined);
  }
  function reset(){ambience='home';syncAmbience();televisionRequested=false;stopTelevision();for(const source of transient){try{source.stop();}catch{/* already ended */}}transient.clear();}
  return{
    unlock,play,pause,reset,setTelevision,setAmbience,
    fadeAmbienceOut(seconds:number){if(context&&master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(.0001,context.currentTime,Math.max(.03,seconds/3));}},
    updateListener(camera:{position:Point;globalPosition?:Point}){const point=camera.globalPosition??camera.position;if(valid(point))listener=copyPoint(point);setVolume();updateTelevisionLevel();},
    get diagnostics(){return{supported:!disabled,unlocked,paused,state:context?.state??'not-created',ambience,listener:copyPoint(listener),dialogueAudio:false,transientSources:transient.size,television:televisionDiagnostics()};},
    dispose(){if(disposed)return;disposed=true;reset();if(timer)clearInterval(timer);for(const source of persistent){try{source.stop();}catch{/* stopped */}}persistent.clear();void context?.close().catch(()=>undefined);master?.disconnect();},
  };
}
