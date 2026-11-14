import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { buildEnvironment } from './scene/environment';
import { createPlayer, LOOK_RADIANS_PER_PIXEL } from './game/player';
import { createBreakfastObjective } from './game/objective';
import { createDoor } from './game/door';
import { createInteractions } from './game/interactions';
import { sampleOpening, openingCuesBetween, OPENING_DURATION } from './game/opening';
import { createAudio } from './game/audio';
import { loadSettings, storeSettings } from './game/settings';
import { BED_POSE } from './game/layout';
import { HOME_RESUME_POSITION } from './game/livingRoomPlacement';
import { BREAKFAST_SEAT } from './game/kitchenLayout';
import { createBreakfastSeat, breakfastSpeechDuration } from './game/breakfast';
import { canEnterFamilyCar, isTravelBagTaken, setTravelBagTaken } from './game/garageProgress';
import { parentsLocationForProgress } from './game/parentsDeparture';
import { AIRPORT_ARRIVAL } from './game/airportLayout';
import { ARRIVAL_SPAWN } from './game/arrivalLayout';
import { canBoardAtAirport, farewellGesture, AIRPORT_FAREWELL_DURATION } from './game/airportProgress';
import { createPlaneSequence } from './game/planeSequence';
import { PLANE_LOOK_LIMITS } from './game/planeLayout';
import { createWestbridgeDrive } from './game/westbridgeDrive';
import { WB_WALK_SPAWN } from './game/westbridgeLayout';
import type { Settings } from './game/types';
import { buildChapterWorld } from './scene/chapterWorld';
import { createChapterProgress, createDialogue, breakfastConversation, breakfastChoices, schoolClue, airportGoodbye, type StoryBeat, type StoryChoice } from './game/narrative';
import { mountUI, el, setEyes, createGrain } from './ui';
import './style.css';

type Phase = 'ready' | 'opening' | 'playing' | 'plane-look' | 'transition' | 'farewell' | 'paused' | 'ending' | 'complete';
const MOTHER_LINE = 'Ei, vem tomar café pra não se atrasar!';
mountUI();
const canvas = el<HTMLCanvasElement>('game');
const normalControlsHint = el('controlsHint').innerHTML;
const settings: Settings = loadSettings();
const errors: string[] = [];
let phase: Phase = 'ready', beforePause: Phase = 'ready';
let introTime = 0, worldTime = 0, playingAt = 0, endingTime = 0, transitionTime = 0, subtitleUntil = 0, examineUntil = 0;
let ready = false, hadPointerLock = false;
let frameCount = 0, last = performance.now(), lastStats = 0;
let samples: number[] = [];
let perf = { frames: 0, meanFrameMs: 0, p95FrameMs: 0, fps: 0 };
const examined = new Set<string>();
const objective = createBreakfastObjective();
const chapter = createChapterProgress();
const dialogue = createDialogue();
let selectedChoice: StoryChoice | null = null;
let chapterStage: 'home'|'airport'|'plane'|'town'|'westbridge'='home';
let transitionKind: 'arrival'|'garage-airport'|'airport-boarding'|'plane-exit'|'westbridge-entry'|'westbridge-exit'='arrival';
let farewellTime=0;
let pendingAirportDialogue=false;
let freshStartRequested=false;
let currentSpeechBeat: StoryBeat | null = null, speechUntil = 0;
const recordError = (message: string) => { if (!errors.includes(message) && errors.length < 20) errors.push(message); };
window.addEventListener('error', event => recordError(event.message));
window.addEventListener('unhandledrejection', event => recordError(String(event.reason?.message ?? event.reason)));
el('retry').onclick = () => location.reload();


setEyes(0);


createGrain();

try {
  const engine = new Engine(canvas, false, { preserveDrawingBuffer: true, stencil: false,
    disableWebGL2Support: new URLSearchParams(location.search).get('webgl') === '1' }, false);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(.58, .61, .60, 1);
  const camera = new UniversalCamera('protagonist', new Vector3(BED_POSE.position.x, BED_POSE.position.y, BED_POSE.position.z), scene);
  // Keep the horizon tied to the current pose when switching from the lying
  // opening to mouse look or a restored checkpoint; Babylon otherwise caches
  // an up vector from the last change of roll.
  camera.updateUpVectorFromRotation = true;
  camera.minZ = .045; camera.maxZ = 95; camera.fov = 1.13;
  camera.rotation.set(BED_POSE.pitch, BED_POSE.yaw, BED_POSE.roll);
  scene.activeCamera = camera;
  const audio = createAudio(() => settings);
  const environment = buildEnvironment(scene, {
    onTelevisionChange: (on, position) => audio.setTelevision(on, position),
    onTelevisionClick: () => audio.play('tv'),
  });
  const chapterWorld = buildChapterWorld(scene);
  let westbridgeDrive:ReturnType<typeof createWestbridgeDrive>|null=null;
  let westbridgePrepared=false, westbridgeResumeWalking=false;
  let characterAssetsReady = false;
  void chapterWorld.ready.then(() => { characterAssetsReady = true; }).catch(error => {
    const message = String(error?.message ?? error);recordError(message);
    el('fatal').hidden = false;el('fatalMessage').textContent = message;console.error(message);
  });
  chapterWorld.setParentsLocation(parentsLocationForProgress(chapter.mission,chapter.completed));
  const bagTarget = environment.targets.find(target => target.id === 'suitcase');
  if(bagTarget)bagTarget.label=()=>chapter.mission==='pack-suitcase'?'Pegar mala':'Examinar mochila';
  const door = createDoor(scene, cue => audio.play(cue));
  for (const mesh of door.target.meshes) environment.shadowGenerator.addShadowCaster(mesh);
  environment.addDoorMeshes(door.target.meshes);
  const interactions = createInteractions(scene, camera, [door.target, ...environment.targets, ...chapterWorld.targets]);
  const player = createPlayer(canvas, camera, () => settings, () => chapterStage==='westbridge'?chapterWorld.westbridgeObstacles:[door.collider()], running => {
    if(chapterStage==='westbridge')audio.playSurfaceFootstep(chapterWorld.westbridgeNavigation.surfaceAt(player.position),running);
    else audio.play('foot');
  });
  const breakfast = createBreakfastSeat(camera, player, BREAKFAST_SEAT);
  const planeFlight = createPlaneSequence(camera, player);
  player.setActive(false);

  function applySettings() {
    const scale = settings.quality === 'low' ? 2.2 : settings.quality === 'high' ? 1 : 1.4;
    engine.setHardwareScalingLevel(scale);
    engine.resize();
    chapterWorld.setQuality(settings.quality);
    el('grainLayer').hidden = !settings.grain;
    el('perf').hidden = !settings.performance;
    el<HTMLInputElement>('sensitivity').value = String(settings.sensitivity);
    el('sensitivityValue').textContent = settings.sensitivity.toFixed(2) + '×';
    el<HTMLInputElement>('volume').value = String(settings.volume);
    el('volumeValue').textContent = Math.round(settings.volume * 100) + '%';
    for (const key of ['headBob', 'subtitles', 'grain', 'performance'] as const) el<HTMLInputElement>(key).checked = settings[key];
    el<HTMLSelectElement>('quality').value = settings.quality;
    el('audioNotice').textContent = 'Diálogos somente em texto. O áudio contém efeitos e ambiência.';
  }
  applySettings();
  const changeSetting = () => {
    settings.sensitivity = Number(el<HTMLInputElement>('sensitivity').value);
    settings.volume = Number(el<HTMLInputElement>('volume').value);
    settings.quality = el<HTMLSelectElement>('quality').value as Settings['quality'];
    for (const key of ['headBob', 'subtitles', 'grain', 'performance'] as const) settings[key] = el<HTMLInputElement>(key).checked;
    applySettings();
    el('settingsNotice').textContent = storeSettings(settings) ? '' : 'As preferências valem nesta sessão; o navegador não permitiu guardá-las.';
  };
  for (const id of ['sensitivity', 'volume', 'headBob', 'subtitles', 'quality', 'grain', 'performance'])
    el(id).addEventListener('input', changeSetting);
  const resize = () => engine.resize();
  window.addEventListener('resize', resize);

  function releaseMouse() { if (document.pointerLockElement === canvas) document.exitPointerLock(); }
  function isInPlane() { return chapterStage==='plane'; }
  function isInsideWestbridgeCar(){return chapterStage==='westbridge'&&!!westbridgeDrive?.diagnostics.occupied;}
  function adoptPlaneSeat() {
    planeFlight.enter();player.setLookLimits(PLANE_LOOK_LIMITS);player.setMovementEnabled(false);
    el('controlsHint').textContent='Mouse · Olhar ao redor | Olhe para a janela à esquerda e pressione E';
  }
  function pauseGame(showSettings = false) {
    if (phase === 'paused' || phase === 'complete') return;
    beforePause = phase; phase = 'paused'; player.setActive(false); player.clearInput(); audio.pause(true);
    releaseMouse();
    el('settingsPanel').hidden = !showSettings;
    el('pauseTitle').textContent = beforePause === 'ready' ? 'Configurações' : 'Pausado';
    el('resume').textContent = beforePause === 'ready' ? 'Voltar' : 'Continuar';
    el<HTMLDialogElement>('pauseMenu').showModal();
  }
  function resumeGame() {
    if (phase !== 'paused') return;
    el<HTMLDialogElement>('pauseMenu').close(); phase = beforePause; last = performance.now();
    audio.pause(false); player.setActive(phase === 'playing' && (!dialogue.active || breakfast.state === 'seated'));
    player.setMovementEnabled(phase==='playing'&&breakfast.state === 'standing'&&!isInPlane()&&!isInsideWestbridgeCar()&&!dialogue.active&&chapter.mission!=='airport-farewell');
    if ((phase === 'playing' && (!dialogue.active || breakfast.state === 'seated') && !dialogue.choices.length) || phase === 'opening') player.requestPointerLock();
  }
  function beginScene() {
    if (!ready) return;
    westbridgeDrive?.stop();westbridgeDrive=null;
    camera.fov=1.13;camera.minZ=.045;
    el<HTMLDialogElement>('pauseMenu').close();
    if(freshStartRequested||chapter.mission==='complete')chapter.reset();
    freshStartRequested=false;
    pendingAirportDialogue=false;
    const resumed=chapter.mission!=='breakfast';
    setTravelBagTaken(chapter.completed.includes('pack-suitcase'));
    chapterWorld.setParentsLocation(parentsLocationForProgress(chapter.mission,chapter.completed));farewellTime=0;
    chapterWorld.resetGarageDeparture();chapterWorld.setParentsFarewell(0);
    environment.syncTravelBag();
    phase = resumed?'playing':'opening'; beforePause = phase; introTime = worldTime = endingTime = transitionTime = 0;
    subtitleUntil = examineUntil = 0; examined.clear(); objective.reset(); door.reset(); environment.setTelevision(false); environment.refreshShadows(); environment.setRoomLight(true); environment.setHallLight(true);
    chapterStage=['airport-farewell','airport-gate'].includes(chapter.mission)?'airport':chapter.mission==='plane-seat'?'plane':chapter.mission==='find-host'?'town':'home';
    document.body.dataset.chapterStage=chapterStage;
    chapterWorld.activate(chapterStage);dialogue.close();
    interactions.clear(); player.reset(); breakfast.reset(); player.setActive(false); audio.reset(); audio.pause(false); audio.unlock();
    audio.setAmbience(chapterStage==='airport'?'airport':chapterStage==='plane'?'plane':'home');
    el('controlsHint').innerHTML=normalControlsHint;
    currentSpeechBeat = null; speechUntil = 0; selectedChoice = null;
    camera.position.set(BED_POSE.position.x, BED_POSE.position.y, BED_POSE.position.z);
    camera.rotation.set(BED_POSE.pitch, BED_POSE.yaw, BED_POSE.roll);
    el('startScreen').hidden = true; el('endScreen').hidden = true; el('hud').hidden = false;
    el('objective').hidden = true; el('objective').classList.remove('compact');el('objectiveText').textContent=chapter.label;
    el('reticle').hidden = true; el('interaction').hidden = true; el('examine').hidden = true;
    el('sceneFade').style.opacity = '0'; setEyes(0);
    samples = []; last = performance.now();
    if(resumed){
      const point=chapterStage==='home'?HOME_RESUME_POSITION:chapterWorld.teleportPoint(chapterStage);
      player.teleport(point);player.setActive(true);setEyes(1);el('objectiveState').textContent='OBJETIVO ATUALIZADO';
      if(isInPlane())adoptPlaneSeat();
      if(chapterStage==='airport'){
        camera.rotation.set(AIRPORT_ARRIVAL.pitch,AIRPORT_ARRIVAL.yaw,0);player.adoptCameraPose();
      }
      if(chapterStage==='town'){camera.rotation.set(ARRIVAL_SPAWN.pitch,ARRIVAL_SPAWN.yaw,0);player.adoptCameraPose();}
      el('objectiveText').textContent=chapter.label;el('objective').hidden=false;el('reticle').hidden=false;
      document.documentElement.style.setProperty('--blur','0px');playingAt=worldTime;
      if(chapter.mission==='airport-farewell')startDialogue(airportGoodbye,[]);
      if(chapter.mission==='westbridge-ride'||chapter.mission==='westbridge-explore'){
        el('sceneFade').style.opacity='1';beginWestbridge(chapter.mission==='westbridge-explore');
      }
    }
    canvas.focus({ preventScroll: true }); player.requestPointerLock();
  }
  function activatePlayer() {
    phase = 'playing'; playingAt = worldTime; setEyes(1); document.documentElement.style.setProperty('--blur', '0px');
    objective.activate();
    player.activateFromCamera();
    samples = []; lastStats = performance.now();
    el('objectiveState').textContent = 'NOVA MISSÃO'; el('objectiveText').textContent=chapter.label;el('objective').hidden = false; el('reticle').hidden = false;
    audio.play('objective');
  }
  function finishScene() {
    environment.setTelevision(false);
    phase = 'ending'; endingTime = 0; player.setActive(false); interactions.clear();
    el('interaction').hidden = true; el('examine').hidden = true; el('controlsHint').hidden = true;
    el('objectiveState').textContent = 'OBJETIVO CONCLUÍDO'; el('objective').classList.remove('compact');
    el('reticle').hidden = true; audio.play('objective');
  }
  function renderDialogue() {
    const box=el('dialogueBox'),current=dialogue.current;
    if(!current){box.hidden=true;currentSpeechBeat=null;speechUntil=0;return;}
    if(current!==currentSpeechBeat){currentSpeechBeat=current;speechUntil=worldTime+breakfastSpeechDuration(current.text);}
    box.hidden=false;el('dialogueSpeaker').textContent=current.speaker;el('dialogueText').textContent=current.text;
    const options=el('dialogueChoices');options.replaceChildren();
    const choices=dialogue.choices;
    for(const [index,choice] of choices.entries()){
      const button=document.createElement('button');button.type='button';button.textContent=choice.label;
      button.onclick=()=>advanceDialogue(index);options.append(button);
    }
    el('dialogueHint').textContent=choices.length?'ESCOLHA UMA RESPOSTA':'E · CONTINUAR';
    if(breakfast.state==='seated'){
      if(choices.length)releaseMouse();else player.requestPointerLock();
    }
  }
  function startDialogue(lines: StoryBeat[], choices: StoryChoice[] = []) {
    if(!dialogue.start(lines,choices,choice=>{selectedChoice=choice;chapter.select(choice.id);}))return;
    player.setActive(breakfast.state==='seated');
    player.setMovementEnabled(false);
    player.clearInput();
    if(breakfast.state!=='seated')releaseMouse();
    interactions.clear();el('reticle').hidden=true;renderDialogue();
    if(chapterStage==='airport'){el('objective').hidden=true;el('controlsHint').hidden=true;}
  }
  function advanceDialogue(choiceIndex=-1) {
    const result=dialogue.advance(choiceIndex);
    if(!result.done){renderDialogue();return;}
    el('dialogueBox').hidden=true;
    currentSpeechBeat=null;speechUntil=0;
    if(selectedChoice&&chapter.mission==='talk-parents'){
      const followup=[selectedChoice.reply,...schoolClue];selectedChoice=null;
      startDialogue(followup,[]);
      // The final parent conversation sets the packing mission when dismissed.
      return;
    }
    if(chapter.mission==='talk-parents') {
      chapter.advance('pack-suitcase');el('objectiveText').textContent=chapter.label;el('objectiveState').textContent='NOVA MISSÃO';
      breakfast.stand();audio.play('objective');
    }
    if(chapterStage==='airport'&&chapter.mission==='airport-farewell'){
      phase='farewell';farewellTime=0;player.setActive(false);player.clearInput();interactions.clear();releaseMouse();
      el('reticle').hidden=true;el('interaction').hidden=true;return;
    }
    if(chapterStage==='town'&&chapter.mission==='find-host'){beginWestbridge(false);return;}
    player.setActive(true);player.setMovementEnabled(breakfast.state==='standing'&&!isInPlane());
    el('reticle').hidden=false;player.requestPointerLock();
  }
  function travelTo(zone:'airport'|'plane'|'town', mission:'airport-farewell'|'plane-seat'|'find-host') {
    environment.setTelevision(false);
    player.setMovementEnabled(true);
    player.setLookLimits(null);el('controlsHint').innerHTML=normalControlsHint;
    phase='transition';transitionKind='arrival';transitionTime=0;player.setActive(false);interactions.clear();el('interaction').hidden=true;el('dialogueBox').hidden=true;
    el('sceneFade').style.opacity='1';chapterStage=zone;document.body.dataset.chapterStage=zone;
    if(zone==='airport'){chapterWorld.setParentsLocation('airport');chapterWorld.setParentsFarewell(0);}
    chapterWorld.activate(zone);player.teleport(chapterWorld.teleportPoint(zone),zone==='airport'?AIRPORT_ARRIVAL.yaw:0);
    if(zone==='airport'){camera.rotation.x=AIRPORT_ARRIVAL.pitch;player.adoptCameraPose();}
    if(zone==='town'){camera.rotation.set(ARRIVAL_SPAWN.pitch,ARRIVAL_SPAWN.yaw,0);player.adoptCameraPose();}
    if(zone==='plane')adoptPlaneSeat();
    audio.setAmbience(zone==='airport'?'airport':zone==='plane'?'plane':'home');
    chapter.advance(mission);el('objectiveText').textContent=chapter.label;el('objectiveState').textContent='NOVA MISSÃO';el('objective').classList.remove('compact');
    pendingAirportDialogue=zone==='airport';
  }
  function travelFromGarage() {
    environment.setTelevision(false);
    phase='transition';transitionKind='garage-airport';transitionTime=0;
    // Keep the old checkpoint identifier so an interrupted fade can resume
    // safely at the airport, without ever adopting an interior camera pose.
    chapter.advance('car-ready');
    player.setActive(false);player.clearInput();interactions.clear();releaseMouse();
    el('interaction').hidden=true;el('reticle').hidden=true;el('examine').hidden=true;
    el('sceneFade').style.opacity='0';audio.play('engine');audio.fadeAmbienceOut(.65);
  }
  function beginWestbridge(walking:boolean){
    westbridgeResumeWalking=walking;westbridgePrepared=false;
    phase='transition';transitionKind='westbridge-entry';transitionTime=0;
    player.setActive(false);player.clearInput();interactions.clear();releaseMouse();
    el('interaction').hidden=true;el('reticle').hidden=true;el('dialogueBox').hidden=true;
    chapter.advance(walking?'westbridge-explore':'westbridge-ride');
    el('objectiveText').textContent=chapter.label;el('objectiveState').textContent='NOVA MISSÃO';
    audio.fadeAmbienceOut(.6);
    void chapterWorld.prepareWestbridge().then(()=>{westbridgePrepared=true;}).catch(reason=>{
      const message='Não foi possível preparar Westbridge: '+String(reason?.message??reason);
      recordError(message);el('fatal').hidden=false;el('fatalMessage').textContent=message;
    });
  }
  function enterWestbridge(){
    const vehicle=chapterWorld.westbridgeVehicle;
    if(!vehicle)throw Error('O carro de Westbridge ainda não está pronto.');
    chapterStage='westbridge';document.body.dataset.chapterStage=chapterStage;
    chapterWorld.setWestbridgeTimeOfDay(new URLSearchParams(location.search).get('westbridgeLighting')==='night'?'night':'afternoon');
    chapterWorld.activate('westbridge');
    player.setNavigation(chapterWorld.westbridgeNavigation);
    westbridgeDrive=createWestbridgeDrive(camera,player,vehicle);
    westbridgeDrive.enter(westbridgeResumeWalking);
    chapterWorld.refreshWestbridgeLighting();
    camera.fov=.98;
    if(westbridgeResumeWalking){
      westbridgeDrive.exit();player.teleport(WB_WALK_SPAWN,Math.PI);player.setMovementEnabled(true);camera.fov=1.05;
    }
    audio.setAmbience(westbridgeResumeWalking?'westbridge':'westbridge-car');
    el('controlsHint').textContent=westbridgeResumeWalking?'WASD · Caminhar | Mouse · Olhar | E · Interagir':'Mouse · Olhar pelas janelas | E · Sair quando o carro estacionar';
    transitionKind='arrival';transitionTime=0;el('sceneFade').style.opacity='1';
  }
  function exitWestbridgeCar(){
    if(!westbridgeDrive?.canExit)return;
    phase='transition';transitionKind='westbridge-exit';transitionTime=0;
    player.setActive(false);player.clearInput();releaseMouse();interactions.clear();
    el('interaction').hidden=true;el('reticle').hidden=true;
    audio.play('carDoor');
  }
  function changePlaneView() {
    const changed=planeFlight.state==='window'?planeFlight.returnToSeat():planeFlight.observe();
    if(!changed)return;
    phase='plane-look';player.setActive(false);player.clearInput();interactions.clear();releaseMouse();
    el('interaction').hidden=true;el('reticle').hidden=true;
  }
  function leavePlane() {
    if(!planeFlight.canContinue)return;
    phase='transition';transitionKind='plane-exit';transitionTime=0;player.setActive(false);player.clearInput();interactions.clear();releaseMouse();
    el('interaction').hidden=true;el('reticle').hidden=true;el('sceneFade').style.opacity='0';audio.fadeAmbienceOut(.8);
  }
  function activateInteraction() {
    if (phase !== 'playing'||dialogue.active) return;
    if(isInsideWestbridgeCar()){exitWestbridgeCar();return;}
    if(isInPlane()){
      if(planeFlight.state==='window'){changePlaneView();return;}
      if(interactions.activate()?.id==='plane-window'){changePlaneView();return;}
      if(planeFlight.canContinue)leavePlane();
      return;
    }
    if(breakfast.state==='seated'){breakfast.stand();interactions.clear();return;}
    if(breakfast.state!=='standing')return;
    const result = interactions.activate();
    if(result?.id==='wb-house-door'&&chapter.mission==='westbridge-explore'){
      chapter.advance('complete');finishScene();return;
    }
    if(result?.id==='breakfast-chair'&&chapter.mission==='talk-parents'){
      const distance=Math.hypot(player.position.x-BREAKFAST_SEAT.approach.x,player.position.z-BREAKFAST_SEAT.approach.z);
      if(distance<=1.1){selectedChoice=null;breakfast.sit();interactions.clear();}
      else{el('examine').textContent='Aproxime-se da frente da cadeira para se sentar.';examineUntil=worldTime+3;el('examine').hidden=false;}
      return;
    }
    if(result?.id==='parents'&&chapter.mission==='talk-parents'){
      el('examine').textContent='Vou me sentar à mesa para tomar café com meus pais.';examineUntil=worldTime+3;el('examine').hidden=false;return;
    }
    if(result?.id==='suitcase'&&chapter.mission==='pack-suitcase'){
      chapter.advance('enter-car');setTravelBagTaken(true);environment.syncTravelBag();interactions.clear();
      chapterWorld.setParentsLocation(parentsLocationForProgress(chapter.mission,chapter.completed));
      el('objectiveState').textContent='NOVA MISSÃO';el('objectiveText').textContent=chapter.label;el('objective').classList.remove('compact');
      el('examine').textContent='Mala em mãos. Seus pais estão esperando na garagem.';examineUntil=worldTime+3.5;el('examine').hidden=false;
      audio.play('objective');return;
    }
    if(result?.id==='family-car'){
      if(canEnterFamilyCar(chapter.mission,chapter.completed)){travelFromGarage();return;}
      el('examine').textContent='Ainda preciso pegar minha mala.';examineUntil=worldTime+3.5;el('examine').hidden=false;return;
    }
    if(result?.id==='gate'){
      if(canBoardAtAirport(chapter.mission,chapter.completed)){
        phase='transition';transitionKind='airport-boarding';transitionTime=0;player.setActive(false);player.clearInput();interactions.clear();releaseMouse();
        el('reticle').hidden=true;el('interaction').hidden=true;el('sceneFade').style.opacity='0';audio.fadeAmbienceOut(.55);
      }
      return;
    }
    if(result?.id==='host'&&chapter.mission==='find-host'){startDialogue([{speaker:'ANFITRIÃO',text:'Você deve ser nosso novo estudante. Bem-vindo!'}],[]);return;}
    if(result?.id==='poster'){el('examine').textContent='ESTUDANTE DESAPARECIDO — informações parcialmente cobertas por anúncios.';examineUntil=worldTime+4;el('examine').hidden=false;return;}
    if(result?.id==='flightBoard'){el('examine').textContent='PARTIDAS INTERNACIONAIS — AA980 · NOVA YORK (JFK) · PORTÃO 24 · EMBARQUE';examineUntil=worldTime+4;el('examine').hidden=false;return;}
    if(result?.id==='phone'){el('examine').textContent='MENSAGEM DA MÃE: “Me avisa quando pousar. A gente te ama.”';examineUntil=worldTime+4;el('examine').hidden=false;return;}
    if(result?.id==='leaflet'){el('examine').textContent='FOLHETO DA ESCOLA — “Sua nova jornada começa aqui.” O endereço está marcado à mão.';examineUntil=worldTime+4;el('examine').hidden=false;return;}
    if (result?.text) {
      if (['suitcase', 'calendar', 'photo'].includes(result.id)) examined.add(result.id);
      el('examine').textContent = result.text; examineUntil = worldTime + 3.5;
      el('examine').hidden = false;
    }
  }
  el('startGame').onclick = beginScene;
  el('objectiveText').textContent=chapter.label;
  el('dialogueBox').addEventListener('click',event=>{if(!(event.target as HTMLElement).closest('button')&&dialogue.active&&dialogue.choices.length===0)advanceDialogue();});
  el('replay').onclick = () => {freshStartRequested=true;beginScene();};
  el('restart').onclick = () => {freshStartRequested=true;beginScene();};
  el('resume').onclick = resumeGame;
  el('startSettings').onclick = () => pauseGame(true);
  el('openSettings').onclick = () => { el('settingsPanel').hidden = !el('settingsPanel').hidden; };
  el('captureMouse').onclick = () => { canvas.focus(); player.requestPointerLock(); };
  el<HTMLDialogElement>('pauseMenu').addEventListener('cancel', event => { event.preventDefault(); resumeGame(); });
  document.addEventListener('keydown', event => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (phase === 'paused') resumeGame(); else pauseGame();
    } else if (event.code === 'Enter' && !event.repeat && phase === 'playing' && dialogue.active && dialogue.choices.length===0) {
      event.preventDefault();advanceDialogue();
    } else if (event.code === 'KeyE' && !event.repeat && phase === 'playing') {
      event.preventDefault(); if(dialogue.active)advanceDialogue();else activateInteraction();
    }
  });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (!locked && hadPointerLock && (phase === 'playing' || phase === 'opening') && !dialogue.active) pauseGame();
    hadPointerLock = locked;
  });
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
    if (document.hidden && ['opening', 'playing', 'plane-look', 'farewell', 'transition', 'ending'].includes(phase)) pauseGame();
  });

  Object.defineProperty(window, '__INTERCAMBIO__', { configurable: true, get: () => ({
    build:'chapter1-westbridge-playable-1',phase, introTime, duration: OPENING_DURATION, mission: objective.state, chapterMission: chapter.mission, chapterStage, dialogue: dialogue.active,
    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    rotation: { yaw: camera.rotation.y, pitch: camera.rotation.x, roll: camera.rotation.z },
    horizonTilt: camera.getDirection(Vector3.Right()).y,
    door: { angle: door.angle, isOpen: door.isOpen }, interaction: interactions.current?.id ?? null,
    examined: [...examined], light: environment.roomLightOn,
    objectiveState: objective.state,
    perf: { ...perf, frames: frameCount }, renderer: 'Babylon.js', webgl: engine.webGLVersion, gpu: engine.getGlInfo(), settings: { ...settings },
    input: { pointerLocked: document.pointerLockElement === canvas, mouseScale: LOOK_RADIANS_PER_PIXEL * settings.sensitivity },
    meshes: scene.meshes.length, vertices: scene.getTotalVertices(), errors: [...errors], dialogueAudio: false,
    livingRoom: environment.livingRoomDiagnostics, hallway: environment.hallwayDiagnostics, bedroom: environment.bedroomDiagnostics, kitchen: chapterWorld.kitchenDiagnostics, dialogueSpeaker: dialogue.current?.speaker ?? null,
    audio: audio.diagnostics,
    breakfast: { ...breakfast.diagnostics, speechRemaining: Math.max(0,speechUntil-worldTime), movementEnabled: breakfast.state==='standing'&&!dialogue.active },
    garage: chapterWorld.garageDiagnostics, luggageCollected: isTravelBagTaken(),
    laundry: chapterWorld.laundryDiagnostics,
    family: chapterWorld.familyDiagnostics,
    carSeat: { occupied: false },
    airport: { scenery: chapterWorld.airportDiagnostics, farewell: { completed: canBoardAtAirport(chapter.mission,chapter.completed), progress:Math.min(1,farewellTime/AIRPORT_FAREWELL_DURATION) } },
    arrival: { scenery: chapterWorld.arrivalDiagnostics },
    plane: { scenery: chapterWorld.planeDiagnostics, flight:{...planeFlight.diagnostics,subtitle:planeFlight.subtitle} },
    westbridge:{...chapterWorld.westbridgeDiagnostics,drive:westbridgeDrive?.diagnostics??null,navigation:{enabled:chapterStage==='westbridge'&&!isInsideWestbridgeCar()}},
  }) });

  engine.runRenderLoop(() => {
    const now = performance.now(), frameMs = Math.max(0, now - last), dt = document.hidden ? 0 : Math.min(.1, frameMs / 1000);
    last = now;
    if (!ready && characterAssetsReady && scene.isReady()) {
      ready = true; el<HTMLButtonElement>('startGame').disabled = false; el('startGame').textContent = 'Começar';
      canvas.dataset.ready = 'true';
    }
    if (phase !== 'paused' && phase !== 'ready' && phase !== 'complete') worldTime += dt;
    if(isInPlane()&&(phase==='playing'||phase==='plane-look'))planeFlight.update(dt);
    if (phase === 'opening') {
      const previous = introTime; introTime = Math.min(OPENING_DURATION, introTime + dt);
      for (const cue of openingCuesBetween(previous, introTime)) {
        if (cue === 'mother') {
          subtitleUntil = worldTime + 4.2; el('subtitleText').textContent = MOTHER_LINE;
        } else audio.play(cue === 'feet' ? 'foot' : cue);
      }
      const pose = sampleOpening(introTime);
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      camera.rotation.set(pose.pitch, pose.yaw, pose.roll); setEyes(pose.eyes);
      document.documentElement.style.setProperty('--blur', `${pose.blur * 1.65}px`);
      if (pose.finished) activatePlayer();
    } else if (phase === 'playing') {
      const previousDoorAngle = door.angle;
      door.update(dt, player.position);
      if (Math.abs(door.angle - previousDoorAngle) > 1e-7) environment.refreshShadows();
      player.update(dt);
      if(isInsideWestbridgeCar())westbridgeDrive?.update(dt);
      if(chapterStage==='westbridge'&&westbridgeDrive){
        const drive=westbridgeDrive.diagnostics;
        audio.setVehicleMotion({speed:drive.speed,running:isInsideWestbridgeCar()&&!westbridgeDrive.canExit,position:drive.position});
      }
      const seatEvent=breakfast.update(dt);
      if(seatEvent==='seated')startDialogue(breakfastConversation,breakfastChoices);
      const target = dialogue.active||breakfast.state!=='standing'?null:interactions.update();
      const canStand=breakfast.state==='seated'&&!dialogue.active;
      el('interaction').hidden = !target&&!canStand;
      if (target) el('interactionText').textContent = target.label();
      else if(canStand)el('interactionText').textContent='Levantar da mesa';
      if(isInPlane()){
        const windowTarget=target?.id==='plane-window';
        el('interaction').hidden=!(windowTarget||planeFlight.state==='window'||planeFlight.canContinue);
        el('interactionText').textContent=planeFlight.state==='window'?'Voltar ao assento':windowTarget?'Olhar pela janela':'Avançar para a chegada';
        if(planeFlight.autoContinue)leavePlane();
      }
      if(isInsideWestbridgeCar()){
        el('interaction').hidden=!westbridgeDrive?.canExit;
        el('interactionText').textContent='Sair do carro';
      }
      el('objective').classList.toggle('compact', worldTime - playingAt > 5);
      el('controlsHint').hidden = isInPlane()?planeFlight.diagnostics.reflectionElapsed!==null:dialogue.active||chapterStage==='airport'||worldTime - playingAt > 9;
      if (objective.update(player.position)) {
        chapter.advance('talk-parents');el('objectiveState').textContent='NOVA MISSÃO';el('objectiveText').textContent=chapter.label;el('objective').classList.remove('compact');
      }
    } else if(phase==='plane-look'){
      if(!planeFlight.moving){phase='playing';player.setActive(true);player.setMovementEnabled(false);player.requestPointerLock();el('reticle').hidden=false;}
    } else if (phase === 'transition') {
      transitionTime+=dt;
      if(transitionKind==='garage-airport'){
        el('sceneFade').style.opacity=String(Math.min(1,transitionTime/.65));
        if(transitionTime>=.65)travelTo('airport','airport-farewell');
      } else if(transitionKind==='airport-boarding'){
        el('sceneFade').style.opacity=String(Math.min(1,transitionTime/.55));
        if(transitionTime>=.55)travelTo('plane','plane-seat');
      } else if(transitionKind==='plane-exit'){
        el('sceneFade').style.opacity=String(Math.min(1,transitionTime/.8));
        if(transitionTime>=.8)travelTo('town','find-host');
      } else if(transitionKind==='westbridge-entry'){
        el('sceneFade').style.opacity=String(Math.min(1,transitionTime/.65));
        if(transitionTime>=.65&&westbridgePrepared)enterWestbridge();
      } else if(transitionKind==='westbridge-exit'){
        el('sceneFade').style.opacity=String(Math.min(1,transitionTime/.3));
        if(transitionTime>=.3){
          westbridgeDrive?.exit();player.teleport(WB_WALK_SPAWN,Math.PI);player.setNavigation(chapterWorld.westbridgeNavigation);
          player.setMovementEnabled(true);camera.fov=1.05;
          chapter.advance('westbridge-explore');audio.setAmbience('westbridge');
          el('objectiveText').textContent=chapter.label;el('objectiveState').textContent='NOVA MISSÃO';el('objective').classList.remove('compact');
          el('controlsHint').innerHTML=normalControlsHint;transitionKind='arrival';transitionTime=0;
        }
      } else {
      if(!scene.isReady()){transitionTime=0;el('sceneFade').style.opacity='1';}
      else {
      el('sceneFade').style.opacity=String(Math.max(0,1-transitionTime/1.4));
      if(transitionTime>=1.4){
        phase='playing';playingAt=worldTime;el('sceneFade').style.opacity='0';el('reticle').hidden=false;
        player.setActive(true);player.requestPointerLock();
        if(pendingAirportDialogue){pendingAirportDialogue=false;startDialogue(airportGoodbye,[]);}
      }
      }
      }
    } else if(phase==='farewell'){
      farewellTime+=dt;chapterWorld.setParentsFarewell(farewellGesture(farewellTime));
      if(farewellTime>=AIRPORT_FAREWELL_DURATION){
        chapterWorld.setParentsFarewell(0);chapter.advance('airport-gate');
        phase='playing';playingAt=worldTime;player.setActive(true);player.setMovementEnabled(true);player.clearInput();player.requestPointerLock();
        el('objectiveText').textContent=chapter.label;el('objectiveState').textContent='NOVA MISSÃO';el('objective').classList.remove('compact');el('objective').hidden=false;el('reticle').hidden=false;
      }
    } else if (phase === 'ending') {
      endingTime += dt;
      el('sceneFade').style.opacity = String(Math.max(0, Math.min(1, (endingTime - 1.5) / 1.25)));
      if (endingTime >= 3) {
        phase = 'complete'; el('hud').hidden = true; el('endScreen').hidden = false; releaseMouse();
      }
    }
    if(isInPlane()){
      el('subtitle').querySelector('b')!.textContent='PROTAGONISTA:';
      if(planeFlight.subtitle)el('subtitleText').textContent=planeFlight.subtitle;
      el('subtitle').hidden=!settings.subtitles||!planeFlight.subtitle||phase==='paused'||phase==='transition';
    }else{
      el('subtitle').querySelector('b')!.textContent='MÃE:';
      el('subtitle').hidden = !settings.subtitles || worldTime >= subtitleUntil || phase === 'ready' || phase === 'complete';
    }
    if (worldTime >= examineUntil) el('examine').hidden = true;
    if(phase!=='paused')chapterWorld.animate(worldTime,phase==='playing'&&dialogue.active&&worldTime<speechUntil?dialogue.current?.speaker:undefined,camera.position,dialogue.current?.text);
    el('captureMouse').hidden = phase !== 'playing' || (dialogue.active&&breakfast.state!=='seated') || dialogue.choices.length>0 || document.pointerLockElement === canvas;
    audio.updateListener(camera);
    scene.render(); frameCount++;
    canvas.dataset.phase = phase; canvas.dataset.frames = String(frameCount);
    if (ready && (phase === 'opening' || phase === 'playing') && !document.hidden && frameMs > 0 && Number.isFinite(frameMs)) {
      samples.push(frameMs); if (samples.length > 600) samples.shift();
    }
    if (now - lastStats >= 500 && samples.length) {
      lastStats = now;
      const sorted = [...samples].sort((a, b) => a - b);
      const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      perf = { frames: frameCount, meanFrameMs: Math.round(mean * 10) / 10,
        p95FrameMs: Math.round(sorted[Math.floor((sorted.length - 1) * .95)] * 10) / 10,
        fps: Math.round(10000 / mean) / 10 };
      if (settings.performance) el('perf').textContent = `${perf.fps.toFixed(1)} FPS\n${perf.meanFrameMs.toFixed(1)} ms · P95 ${perf.p95FrameMs.toFixed(1)} ms`;
    }
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  recordError(message); el('fatal').hidden = false; el('fatalMessage').textContent = message;
  console.error(error);
}
