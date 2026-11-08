export type StoryBeat = { speaker: string; text: string };
export type StoryChoice = { id: string; label: string; reply: StoryBeat };

export const breakfastConversation: StoryBeat[] = [
  { speaker: 'MÃE', text: 'Bom dia! Pensei que você ia dormir até perder o voo.' },
  { speaker: 'PAI', text: 'Grande dia, hein? Preparado pra viagem?' },
];
export const breakfastChoices: StoryChoice[] = [
  { id: 'excited', label: 'Tô animado. Vai ser incrível.', reply: { speaker: 'MÃE', text: 'Eu sabia que você ia gostar. Aproveita cada momento.' } },
  { id: 'nervous', label: 'Pra falar a verdade, tô meio nervoso.', reply: { speaker: 'PAI', text: 'É normal. Vai com calma e lembra que estamos aqui.' } },
  { id: 'miss', label: 'Ainda não acredito que vou ficar tanto tempo longe.', reply: { speaker: 'MÃE', text: 'A casa vai sentir sua falta também. Mas essa oportunidade é sua.' } },
];
export const schoolClue: StoryBeat[] = [
  { speaker: 'PAI', text: 'Engraçado... ainda acho estranho como aquela escola conseguiu nosso contato.' },
  { speaker: 'MÃE', text: 'Foi uma ótima oportunidade. Não fica colocando coisa na cabeça dele.' },
  { speaker: 'MÃE', text: 'Filho, sobe lá e pega tua mala. Eu e teu pai vamos te esperar no carro, tá?' },
  { speaker: 'PAI', text: 'E vê se não esquece o passaporte!' },
];
export const airportGoodbye: StoryBeat[] = [
  { speaker: 'MÃE', text: 'Me manda mensagem assim que chegar, tá?' },
  { speaker: 'PAI', text: 'Qualquer coisa, liga pra gente. Estamos orgulhosos de você.' },
];

export type ChapterMission =
  | 'breakfast' | 'talk-parents' | 'pack-suitcase' | 'enter-car' | 'car-ready' | 'airport-gate'
  | 'plane-seat' | 'find-host' | 'complete';
export const missionLabels: Record<ChapterMission, string> = {
  breakfast: 'Desça para tomar café',
  'talk-parents': 'Converse com seus pais',
  'pack-suitcase': 'Suba e pegue sua mala',
  'enter-car': 'Vá até a garagem. Seus pais estão esperando.',
  'car-ready': 'Siga viagem com seus pais',
  'airport-gate': 'Encontre seu portão de embarque',
  'plane-seat': 'Prepare-se para a chegada',
  'find-host': 'Encontre sua família anfitriã',
  complete: 'Capítulo 1 concluído',
};

const SAVE_KEY = 'o-intercambio.chapter1.checkpoint.v1';
export function createChapterProgress() {
  let mission: ChapterMission = 'breakfast';
  let choice: string | null = null;
  let completed: ChapterMission[] = [];
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (saved && ['breakfast','talk-parents','pack-suitcase','enter-car','car-ready','airport-gate','plane-seat','find-host'].includes(saved.mission)) {
      mission = saved.mission; choice = typeof saved.choice === 'string' ? saved.choice : null;
      completed = Array.isArray(saved.completed) ? saved.completed.filter((x: unknown): x is ChapterMission =>
        typeof x === 'string' && x in missionLabels) : [];
    }
  } catch { /* A blocked or malformed save starts a new chapter. */ }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ mission, choice, completed })); } catch { /* Session remains playable. */ }
  }
  return {
    get mission() { return mission; }, get choice() { return choice; }, get completed() { return [...completed]; },
    get label() { return missionLabels[mission]; },
    advance(next: ChapterMission) {
      if (mission !== 'complete' && !completed.includes(mission)) completed.push(mission);
      mission = next; save();
      return mission;
    },
    select(value: string) { choice = value; save(); },
    reset() { mission = 'breakfast'; choice = null; completed = []; try { localStorage.removeItem(SAVE_KEY); } catch { /* no-op */ } },
  };
}

export function createDialogue() {
  let beats: StoryBeat[] = [];
  let index = 0;
  let choices: StoryChoice[] = [];
  let onChoice: ((choice: StoryChoice) => void) | null = null;
  return {
    get active() { return beats.length > 0; },
    get current() { return beats[index] ?? null; },
    get choices() { return index === beats.length - 1 ? choices : []; },
    start(script: StoryBeat[], options: StoryChoice[] = [], choose?: (choice: StoryChoice) => void) {
      if (beats.length) return false;
      beats = [...script]; index = 0; choices = options; onChoice = choose ?? null; return true;
    },
    advance(choiceIndex = -1) {
      if (!beats.length) return { done: true, current: null };
      if (index < beats.length - 1) index++;
      else if (choices.length && choiceIndex < 0) return { done: false, current: beats[index], choices };
      else {
        if (choiceIndex >= 0 && choices[choiceIndex]) onChoice?.(choices[choiceIndex]);
        beats = []; choices = []; index = 0; onChoice = null;
        return { done: true, current: null };
      }
      return { done: false, current: beats[index], choices: [] };
    },
    close() { beats = []; choices = []; index = 0; onChoice = null; },
  };
}
