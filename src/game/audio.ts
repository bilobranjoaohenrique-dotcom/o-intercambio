import type { Settings } from './types';

export type AudioCue = 'cloth' | 'bed' | 'foot' | 'door' | 'handle' | 'objective' | 'engine';
type Point = { x:number;y:number;z:number };
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const valid=(p:Point)=>[p.x,p.y,p.z].every(Number.isFinite);

/** Original procedural ambience and effects only. Dialogue is never sent to
 * Web Audio, a synthesizer, an API, or an audio file. Every story line is text. */
export function createAudio(settings:()=>Settings) {
  let context:AudioContext|null=null,master:GainNode|null=null,noise:AudioBuffer|null=null;
  let unlocked=false,paused=false,disposed=false,disabled=false,lastVolume=-1,listener:Point={x:0,y:0,z:0};
  let timer:ReturnType<typeof setInterval>|undefined;
  let seed=945813;
  const transient=new Set<AudioScheduledSourceNode>(),persistent=new Set<AudioScheduledSourceNode>();
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
      const gain=context.createGain();gain.gain.value=.022;wind.connect(low);low.connect(gain);gain.connect(master);wind.start();persistent.add(wind);
      timer=setInterval(ambient,2100);setVolume();
    }catch{disabled=true;}
  }
  function finish(source:AudioScheduledSourceNode,nodes:AudioNode[]){
    transient.add(source);source.onended=()=>{transient.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
  }
  function envelope(duration:number,level:number){
    const gain=context!.createGain(),now=context!.currentTime;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(level,now+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(master!);return gain;
  }
  function tone(from:number,to:number,duration:number,level:number,delay=0,type:OscillatorType='sine'){
    if(!context||!master||!noise)return;
    const now=context.currentTime+delay,osc=context.createOscillator(),gain=envelope(duration,level);
    osc.type=type;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),now+duration);
    osc.connect(gain);finish(osc,[gain]);osc.start(now);osc.stop(now+duration+.02);
  }
  function rustle(duration:number,level:number,cutoff=900){
    if(!context||!master||!noise)return;
    const source=context.createBufferSource();source.buffer=noise;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=cutoff;
    const gain=envelope(duration,level);source.connect(filter);filter.connect(gain);finish(source,[filter,gain]);
    source.start(0,random()*.6,duration);source.stop(context.currentTime+duration+.02);
  }
  function ambient(){
    if(!context||paused||disposed||context.state!=='running')return;
    const pitch=1700+random()*800;tone(pitch,pitch*1.3,.09,.012);tone(pitch*1.2,pitch,.1,.01,.16);
    if(random()>.45){tone(110,76,.18,.009,0,'triangle');}
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
  }
  function unlock(){if(disposed)return;unlocked=true;graph();if(context&&!paused)void context.resume().then(setVolume).catch(()=>undefined);}
  function pause(value:boolean){
    paused=value;if(!context)return;setVolume();
    if(value)void context.suspend().catch(()=>undefined);
    else if(unlocked)void context.resume().then(setVolume).catch(()=>undefined);
  }
  function reset(){for(const source of transient){try{source.stop();}catch{/* already ended */}}transient.clear();}
  return{
    unlock,play,pause,reset,
    updateListener(camera:{position:Point;globalPosition?:Point}){const point=camera.globalPosition??camera.position;if(valid(point))listener={...point};setVolume();},
    get diagnostics(){return{supported:!disabled,unlocked,paused,state:context?.state??'not-created',listener:{...listener},dialogueAudio:false,transientSources:transient.size};},
    dispose(){if(disposed)return;disposed=true;reset();if(timer)clearInterval(timer);for(const source of persistent){try{source.stop();}catch{/* stopped */}}persistent.clear();void context?.close().catch(()=>undefined);master?.disconnect();},
  };
}
