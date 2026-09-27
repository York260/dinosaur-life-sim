import { GameState, EndingType, EndgameSummary, StatKey, ArenaOutcome } from './types';
import { rollD20 } from './dice';
import { getEffectiveStat, getTraitEndgameBonus, hasTrait } from './traits';

// ==========================================================
// 三重審判：天火 → 混亂 → 長夜
// 以真實的白堊紀末（K-Pg）大滅絕研究為基礎設計
// ==========================================================

export interface EndgameRun {
  hp: number;
  pack: number;
  startPack: number;
  food: number;
  warmth: number;
  score: number;
  knowledge: number;
  shelter: boolean;
  nearWater: boolean;
  detritus: boolean;
  bossDefeated: boolean;
  quizCorrect: number;
  quizTotal: number;
  dead: boolean;
  deathText: string;
  log: { title: string; text: string; good: boolean }[];
}

export interface TrialOption {
  id: string;
  icon: string;
  label: string;
  desc: string;
  kind: 'quiz' | 'check' | 'boss' | 'safe' | 'strategy';
  rate?: number;
  disabled?: string;
  tag?: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: { text: string; correct: boolean; why: string }[];
  source: string;
}

export interface StepResult {
  run: EndgameRun;
  title: string;
  text: string;
  good: boolean;
  roll?: { value: number; bonus: number; dc: number };
}

// ---------- 背景資料 ----------

export const IMPACT_FACTS = [
  { label: '小行星直徑', value: '約 10 公里' },
  { label: '撞擊速度', value: '約每秒 20 公里' },
  { label: '撞擊地點', value: '猶加敦半島・希克蘇魯伯' },
  { label: '隕石坑直徑', value: '約 180 公里' },
  { label: '釋放能量', value: '約 10²³ 焦耳（數十億顆廣島原子彈）' },
  { label: '時間', value: '約 6600 萬年前' },
];

// ---------- 知識題庫 ----------

const TRIAL1_QUIZ: QuizQuestion[] = [
  {
    id: 'q_heat_shelter',
    prompt: '撞擊後不到一小時，被拋入太空的熔融碎屑如流星雨般重返大氣。整片天空像烤箱的上火一樣散發高熱，持續數小時。你該躲在哪裡？',
    options: [
      { text: '爬上高大的樹冠，遠離地面', correct: false, why: '樹冠直接暴露在天空的熱輻射下，還可能被點燃。' },
      { text: '鑽進地洞，或把自己埋進土裡', correct: true, why: '幾十公分厚的土壤就能有效阻隔熱輻射。撐過大滅絕的陸生動物，很多都是會挖洞或躲在地下的小型動物。' },
      { text: '站在空曠的平原中央，遠離可燃物', correct: false, why: '避開了野火，卻完全暴露在來自天空的紅外線熱輻射下。' },
      { text: '躲到茂密森林的樹蔭下', correct: false, why: '樹蔭擋不住持續數小時的熱輻射，而森林很快就會陷入大火。' },
    ],
    source: '參考：Robertson 等人（2004）提出的「全球熱脈衝」假說；此假說的強度至今仍有學術爭論。',
  },
  {
    id: 'q_heat_water',
    prompt: '天際一片赤紅，熱浪從天而降。你眼前有一條深河、一片密林、一座沙丘。哪一個最可能讓你活下來？',
    options: [
      { text: '衝進密林躲避', correct: false, why: '森林會變成火海。白堊紀末地層中常發現大量木炭與煙塵。' },
      { text: '潛入深河，只露出鼻孔', correct: true, why: '水能吸收大量熱能。淡水中的鱷類、龜類、魚類與兩棲類，在大滅絕中的存活率明顯較高。' },
      { text: '爬上沙丘高處', correct: false, why: '高處毫無遮蔽，承受最多的熱輻射。' },
      { text: '原地趴下一動也不動', correct: false, why: '趴下無法阻擋來自整片天空的熱輻射。' },
    ],
    source: '參考：淡水生態系在白堊紀末大滅絕中的存活率遠高於陸地生態系（Sheehan & Fastovsky, 1992）。',
  },
];

const TRIAL2_QUIZ: QuizQuestion[] = [
  {
    id: 'q_tsunami',
    prompt: '大地劇烈搖晃後，遠方海岸的海水突然急速退去，露出大片海床和活蹦亂跳的擱淺魚群。焦土暴君正在追你。你該怎麼做？',
    options: [
      { text: '衝上海床撿魚，順便甩開暴君', correct: false, why: '海水異常退去正是海嘯的前兆，海床是死亡陷阱。' },
      { text: '引誘暴君跟著你，全速往內陸高地跑', correct: true, why: '海水急退是海嘯即將來臨的典型徵兆。你跑向高地，而緊追不捨的暴君……被巨浪吞沒。' },
      { text: '躲在海邊的礁石後面等牠離開', correct: false, why: '礁石擋不住海嘯。模擬顯示，撞擊點附近的初始浪高可達上千公尺。' },
      { text: '跳進海裡游向遠方', correct: false, why: '海嘯來臨時待在海中同樣極度危險。' },
    ],
    source: '參考：Range 等人（2022）對希克蘇魯伯撞擊海嘯的模擬研究。',
  },
  {
    id: 'q_wind',
    prompt: '焦土暴君靠嗅覺搜尋獵物。現在風從你這裡吹向牠。你要帶著族群悄悄繞開牠，應該怎麼移動？',
    options: [
      { text: '維持現在的位置，保持安靜', correct: false, why: '風會把你的氣味直接送到牠的鼻子裡。' },
      { text: '繞到牠的下風處（讓風從牠那裡吹向你）', correct: true, why: '處在下風處，你的氣味就不會飄向牠。許多掠食者與獵物都懂得利用風向。' },
      { text: '爬到上風處的高地觀察牠', correct: false, why: '上風處會讓你的氣味一路飄向牠。' },
      { text: '大聲吼叫把牠嚇跑', correct: false, why: '一隻飢餓又瘋狂的暴君，不會被嚇跑。' },
    ],
    source: '暴龍的嗅球比例非常大，研究認為牠的嗅覺在獸腳類中名列前茅。',
  },
];

export function pickQuiz(trial: 1 | 2): QuizQuestion {
  const pool = trial === 1 ? TRIAL1_QUIZ : TRIAL2_QUIZ;
  const q = pool[Math.floor(Math.random() * pool.length)];
  // 打亂選項
  const options = [...q.options].sort(() => Math.random() - 0.5);
  return { ...q, options };
}

/** 依智力自動排除的錯誤選項數 */
export function quizAutoEliminate(state: GameState): number {
  const int = eff(state, 'int');
  return int >= 75 ? 2 : int >= 45 ? 1 : 0;
}

// ---------- 工具 ----------

function eff(state: GameState, key: StatKey): number {
  return getEffectiveStat(state.stats[key], key, state.traits, state.hunger);
}

function checkBonus(state: GameState, key: StatKey): number {
  return Math.floor(eff(state, key) / 5) + getTraitEndgameBonus(state.traits);
}

export function rateFor(bonus: number, dc: number): number {
  return Math.round(Math.max(5, Math.min(95, ((21 - (dc - bonus)) / 20) * 100)));
}

function roll(bonus: number, dc: number) {
  const value = rollD20();
  const success = value === 20 || (value !== 1 && value + bonus >= dc);
  return { value, bonus, dc, success };
}

function cloneRun(r: EndgameRun): EndgameRun {
  return { ...r, log: [...r.log] };
}

function packLoss(run: EndgameRun, n: number, state: GameState): number {
  const drilled = !!state.flags.pack_drilled;
  const loss = Math.min(run.pack, drilled ? Math.floor(n / 2) : n);
  run.pack -= loss;
  return loss;
}

function hurt(run: EndgameRun, n: number, cause: string) {
  run.hp = Math.max(0, run.hp - n);
  if (run.hp <= 0 && !run.dead) {
    run.dead = true;
    run.deathText = cause;
  }
}

// ---------- 初始化 ----------

export function initRun(state: GameState): { run: EndgameRun; notes: string[] } {
  const notes: string[] = [];
  const run: EndgameRun = {
    hp: state.hp,
    pack: state.packSize,
    startPack: state.packSize,
    food: state.hunger,
    warmth: 60,
    score: 0,
    knowledge: state.knowledge,
    shelter: false,
    nearWater: !!state.flags.near_lake,
    detritus: false,
    bossDefeated: false,
    quizCorrect: 0,
    quizTotal: 0,
    dead: false,
    deathText: '',
    log: [],
  };
  if (state.flags.food_cache) {
    run.food += 35;
    notes.push('🥩 你事先埋藏的食物：長夜的食物儲備 +35');
  }
  if (state.flags.omen_seen) {
    run.hp = Math.min(100, run.hp + 10);
    notes.push('🌠 你早已察覺天上的異星，提前做好準備：HP +10');
  }
  if (state.flags.knows_cave) notes.push('🕳️ 你記得一處深邃的洞穴，天火降臨時可以直奔那裡');
  if (state.flags.near_lake) notes.push('🌊 你的棲地就在深湖旁：淡水與魚蝦觸手可及');
  if (state.flags.pack_drilled) notes.push('📯 族群受過撤離訓練：族群損失減半');
  if (state.flags.ally_rival) notes.push('🤝 你曾善待的流浪戰士，會在危急時現身');
  if (state.flags.ptero_friend) notes.push('🪽 你養大的翼龍在高空盤旋，會替你預警');
  if (state.knowledge > 0) notes.push(`📖 古生物知識 ${state.knowledge} 點：答題時可花 2 點排除一個錯誤選項`);
  return { run, notes };
}

// ==========================================================
// 審判一：天火
// ==========================================================

export function trial1Options(state: GameState, run: EndgameRun): TrialOption[] {
  const strB = checkBonus(state, 'str') + Math.min(4, run.pack);
  const agiB = checkBonus(state, 'agi') + (run.nearWater ? 3 : 0);
  const opts: TrialOption[] = [
    {
      id: 'quiz', icon: '🧠', label: '冷靜判斷：用知識找出生路', kind: 'quiz',
      desc: '回答一道真實科學題。答對幾乎毫髮無傷；答錯將付出慘痛代價。',
      tag: '知識',
    },
    {
      id: 'dig', icon: '💪', label: '就地拚命挖洞', kind: 'check',
      desc: `力量判定（族群幫忙挖：+${Math.min(4, run.pack)}）。成功可躲入地下。`,
      rate: rateFor(strB, 15),
    },
    {
      id: 'lake', icon: '🌊', label: '全速衝向湖泊潛入水中', kind: 'check',
      desc: `敏捷判定${run.nearWater ? '（棲地在湖邊 +3）' : ''}。成功可躲入水中。`,
      rate: rateFor(agiB, 14),
    },
  ];
  if (state.flags.knows_cave) {
    const b = checkBonus(state, 'int') + 4;
    opts.unshift({
      id: 'cave', icon: '🕳️', label: '直奔你記得的深邃洞穴', kind: 'check',
      desc: '你早就知道該去哪裡。這是事前準備的回報。', rate: rateFor(b, 8), tag: '準備',
    });
  }
  return opts;
}

export function resolveTrial1(state: GameState, runIn: EndgameRun, choice: string, quizCorrect?: boolean): StepResult {
  const run = cloneRun(runIn);
  const title = '審判一・天火';
  let good: boolean;
  let text: string;
  let r: ReturnType<typeof roll> | undefined;

  if (choice === 'quiz') {
    run.quizTotal++;
    good = !!quizCorrect;
    if (good) run.quizCorrect++;
  } else if (choice === 'cave') {
    r = roll(checkBonus(state, 'int') + 4, 8);
    good = r.success;
  } else if (choice === 'dig') {
    r = roll(checkBonus(state, 'str') + Math.min(4, run.pack), 15);
    good = r.success;
  } else {
    r = roll(checkBonus(state, 'agi') + (run.nearWater ? 3 : 0), 14);
    good = r.success;
  }

  if (good) {
    const dmg = choice === 'quiz' || choice === 'cave' ? 5 : 12;
    hurt(run, dmg, '');
    run.score += choice === 'quiz' || choice === 'cave' ? 3 : 2;
    if (choice === 'lake') run.nearWater = true;
    else run.shelter = true;
    text = {
      quiz: '你做出了正確的判斷。天空燃燒了好幾個小時，森林在身後化為火海——而你活了下來。',
      cave: '你帶著族群一路狂奔，衝進了早就探勘好的洞穴深處。外面是地獄，洞裡卻涼爽安靜。',
      dig: '你和族人拚命刨土，在天空燃起來的前一刻把自己埋進了地下。',
      lake: '你一頭扎進湖裡。水面上熱浪翻騰，水下卻是另一個世界。',
    }[choice]!;
    text += ` HP -${dmg}。`;
  } else {
    hurt(run, 30, '你被天火吞沒了。');
    const lost = packLoss(run, Math.ceil(run.pack / 2), state);
    text = '熱浪從天而降，大地燃起熊熊烈火。你在火海中掙扎求生……HP -30。';
    if (lost > 0) text += ` 有 ${lost} 名族人沒能撐過去。`;
  }
  if (state.flags.ptero_friend && good) text += ' 你養大的翼龍在高空盤旋，提早發出了尖鳴——多虧了牠。';
  run.log.push({ title, text, good });
  return { run, title, text, good, roll: r ? { value: r.value, bonus: r.bonus, dc: r.dc } : undefined };
}

// ==========================================================
// 審判二：混亂（焦土暴君）
// ==========================================================

export function trial2Options(state: GameState, run: EndgameRun): TrialOption[] {
  const hideDc = 12 + Math.ceil(run.pack / 2) - (state.flags.pack_drilled ? 4 : 0) - (state.flags.ally_rival ? 2 : 0);
  const hideB = checkBonus(state, 'cha');
  const opts: TrialOption[] = [
    {
      id: 'boss', icon: '⚔️', label: '迎戰焦土暴君', kind: 'boss',
      desc: `3D BOSS 戰。勝利可奪回避難所與暴君的屍體（大量食物）。${state.flags.ally_rival ? '老友會前來助陣！' : ''}`,
      tag: 'BOSS',
    },
    {
      id: 'quiz', icon: '🧠', label: '智取：利用天災對付牠', kind: 'quiz',
      desc: '回答一道真實科學題。答對可不戰而勝；答錯將陷入險境。',
      tag: '知識',
    },
    {
      id: 'hide', icon: '🤫', label: '帶領族群潛伏不動', kind: 'check',
      desc: `魅力判定。族群越大越難藏${state.flags.pack_drilled ? '（受過訓練 -4 難度）' : ''}。`,
      rate: rateFor(hideB, hideDc),
    },
  ];
  const canBait = run.pack > 0 || run.food >= 40;
  opts.push({
    id: 'bait', icon: '🩸', label: '留下誘餌，趁機脫身', kind: 'safe',
    desc: run.pack > 0 ? '犧牲一名族人引開暴君。必定成功，但代價沉重。' : '丟下 40 點食物儲備引開暴君。',
    disabled: canBait ? undefined : '沒有族人，也沒有足夠的食物',
  });
  return opts;
}

export function trial2BossCalls(state: GameState): number {
  return state.flags.ally_rival ? 2 : 0;
}

export function resolveTrial2(
  state: GameState, runIn: EndgameRun, choice: string,
  opts: { quizCorrect?: boolean; arena?: ArenaOutcome } = {},
): StepResult {
  const run = cloneRun(runIn);
  const title = '審判二・混亂';
  let good = false;
  let text = '';
  let r: ReturnType<typeof roll> | undefined;

  if (choice === 'boss' && opts.arena) {
    const a = opts.arena;
    run.hp = a.finalHp;
    if (a.result === 'victory') {
      good = true;
      run.bossDefeated = true;
      run.score += 4;
      run.food += 50;
      run.shelter = true;
      text = `你擊倒了焦土暴君！牠龐大的身軀轟然倒地——這具屍體，將是你們撐過長夜的糧食。（食物儲備 +50）`;
    } else if (a.result === 'defeat') {
      run.pack = Math.max(0, run.pack - a.packLost);
      run.shelter = false;
      text = '一名族人撲向暴君，用生命為你爭取了逃跑的時間。你們失去了避難所。';
    } else if (a.result === 'fled') {
      run.shelter = false;
      text = '你撤退了。暴君佔據了你們的避難所，你們只能在外面迎接接下來的黑暗。';
    } else {
      run.hp = 0;
      run.dead = true;
      run.deathText = '你倒在焦土暴君的巨口之下。';
      text = '你倒在焦土暴君的巨口之下……';
    }
  } else if (choice === 'quiz') {
    run.quizTotal++;
    good = !!opts.quizCorrect;
    if (good) {
      run.quizCorrect++;
      run.score += 3;
      text = '你的判斷完全正確。焦土暴君再也沒有出現過。';
    } else {
      hurt(run, 30, '你的判斷失誤了，焦土暴君追上了你。');
      const lost = packLoss(run, 1, state);
      text = `判斷失誤！暴君追上了你們。HP -30${lost ? `，失去 ${lost} 名族人` : ''}。`;
    }
  } else if (choice === 'hide') {
    const dc = 12 + Math.ceil(run.pack / 2) - (state.flags.pack_drilled ? 4 : 0) - (state.flags.ally_rival ? 2 : 0);
    r = roll(checkBonus(state, 'cha'), dc);
    good = r.success;
    if (good) {
      run.score += 3;
      text = '你們屏住呼吸，一動也不動。暴君的鼻息噴在岩石上，最終拖著腳步離開了。';
    } else {
      hurt(run, 35, '一聲幼崽的哭叫暴露了你們的位置……');
      const lost = packLoss(run, 1, state);
      text = `一隻幼崽忍不住叫出了聲——暴君撲了過來！HP -35${lost ? `，失去 ${lost} 名族人` : ''}。`;
    }
  } else {
    good = true;
    run.score += 1;
    if (run.pack > 0) {
      run.pack -= 1;
      text = '一名年老的族人主動走向暴君……你們在牠的犧牲下安全撤離。';
    } else {
      run.food -= 40;
      text = '你丟下了辛苦儲存的食物。暴君低頭大嚼，你趁機溜走了。（食物儲備 -40）';
    }
  }
  run.log.push({ title, text, good });
  return { run, title, text, good, roll: r ? { value: r.value, bonus: r.bonus, dc: r.dc } : undefined };
}

// ==========================================================
// 審判三：長夜（撞擊冬天）
// ==========================================================

export interface WinterRound {
  title: string;
  subtitle: string;
  data: { label: string; value: string }[];
  narrative: string;
}

export const WINTER_ROUNDS: WinterRound[] = [
  {
    title: '黑暗降臨',
    subtitle: '撞擊後第 1 個月',
    narrative: '煙塵與硫酸鹽氣膠遮蔽了天空。白晝如同黃昏，植物一片片地枯萎。',
    data: [
      { label: '☀️ 日照', value: '不到平常的 10%' },
      { label: '🌡️ 氣溫', value: '持續驟降' },
      { label: '🌿 植物', value: '光合作用幾乎停擺，大量枯死' },
      { label: '🦴 屍體', value: '遍地都是，仍然新鮮' },
      { label: '💧 淡水', value: '河湖仍可飲用；水中有大量腐爛的有機碎屑' },
    ],
  },
  {
    title: '酸雨寒冬',
    subtitle: '撞擊後第 6 個月',
    narrative: '酸雨斷斷續續地落下。世界陷入漫長的寒冬，連湖面邊緣都結了冰。',
    data: [
      { label: '☀️ 日照', value: '約平常的 20%' },
      { label: '🌡️ 氣溫', value: '比撞擊前低約 10～20°C（各研究估計不同）' },
      { label: '🦴 屍體', value: '大多已腐爛' },
      { label: '🌰 種子', value: '大量種子仍休眠在土壤中' },
      { label: '🌧️ 酸雨', value: '間歇性降下' },
    ],
  },
  {
    title: '蕨類之春',
    subtitle: '撞擊後第 2 年',
    narrative: '天空終於透出一絲光亮。焦黑的大地上，冒出了第一抹綠色——是蕨類。',
    data: [
      { label: '☀️ 日照', value: '回升至平常的 60% 左右' },
      { label: '🌡️ 氣溫', value: '仍偏冷，但開始回暖' },
      { label: '🌱 地表', value: '蕨類孢子爆發（地層中的「蕨類高峰」）' },
      { label: '🐭 倖存動物', value: '稀少，多為小型動物' },
    ],
  },
];

const WINTER_SOURCE = '參考：Brugger 等（2017）、Senel 等（2023）的撞擊冬天模擬；Vajda 等（2001）的蕨類高峰研究；Larson 等（2016）關於食種子鳥類存活的研究。';
export { WINTER_SOURCE };

function sizeKey(state: GameState) {
  return state.species?.bodySize ?? 'medium';
}

export function winterOptions(state: GameState, run: EndgameRun, round: number): TrialOption[] {
  const diet = state.species?.diet;
  const o: TrialOption[] = [];
  if (round === 0) {
    o.push({ id: 'scavenge', icon: '🦴', label: '食腐：啃食遍地的屍體', kind: 'strategy', desc: '有一定機率感染。' });
    o.push({ id: 'detritus', icon: '🐟', label: '在河湖捕捉昆蟲幼蟲、魚與蛙', kind: 'strategy', desc: '需要涉入冰冷的水中。' });
    o.push({ id: 'dead_plants', icon: '🌿', label: '啃食枯死的植物', kind: 'strategy', desc: '滿地都是，但營養不多。' });
  } else if (round === 1) {
    o.push({ id: 'scavenge', icon: '🦴', label: '繼續食腐', kind: 'strategy', desc: '有一定機率感染。' });
    o.push({ id: 'seeds', icon: '🌰', label: '挖掘土壤中的種子與堅果', kind: 'strategy', desc: '需要合適的嘴與消化系統。' });
    o.push({ id: 'torpor', icon: '😴', label: '蟄伏：降低代謝撐過寒冬', kind: 'strategy', desc: '減少能量消耗。' });
    o.push({ id: 'detritus', icon: '🐟', label: '破冰捕捉水中生物', kind: 'strategy', desc: '淡水碎屑食物鏈。' });
    o.push({
      id: 'hunt', icon: '⚔️', label: '獵殺其他倖存者', kind: 'check',
      desc: '力量判定。成功可大量補充食物，失敗會受傷。', rate: rateFor(checkBonus(state, 'str'), 15),
    });
  } else {
    o.push({ id: 'ferns', icon: '🌱', label: '啃食新生的蕨類', kind: 'strategy', desc: '大地上最早回歸的綠色。' });
    o.push({ id: 'detritus', icon: '🐟', label: '在河湖捕捉水中生物', kind: 'strategy', desc: '淡水碎屑食物鏈。' });
    o.push({
      id: 'small_prey', icon: '🐭', label: '捕食小型倖存動物', kind: 'check',
      desc: '敏捷判定。蜥蜴、哺乳類與鳥類。', rate: rateFor(checkBonus(state, 'agi'), diet === 'herbivore' ? 18 : 11),
    });
    o.push({
      id: 'migrate', icon: '🧭', label: '長途遷徙尋找綠洲', kind: 'check',
      desc: '敏捷判定。成功可大量補充食物與體溫，失敗可能損失族人。', rate: rateFor(checkBonus(state, 'agi'), 14),
    });
    if (run.pack > 0) {
      o.push({ id: 'nurture', icon: '👶', label: '守護族群的幼崽', kind: 'strategy', desc: '犧牲部分食物，讓新生命有機會長大。' });
    }
  }
  // 抱團 / 洞穴
  o.push({
    id: 'huddle', icon: '🫂', label: run.pack > 0 ? '全族擠在一起取暖' : '蜷縮起來保存體溫', kind: 'strategy',
    desc: run.pack > 0 ? `族群越大越溫暖（目前 ${run.pack} 隻）。` : '獨自一人，效果有限。',
  });
  if (run.shelter) {
    o.push({ id: 'burrow', icon: '🕳️', label: '躲進避難所深處', kind: 'strategy', desc: '洞穴裡的溫度穩定得多。' });
  }
  return o;
}

/** 使用知識點揭示的最佳策略提示 */
export function winterHint(state: GameState, round: number): string {
  const diet = state.species?.diet;
  const size = sizeKey(state);
  if (round === 0) {
    if (diet === 'herbivore') return '📖 植物已死，食腐不適合你。淡水中的碎屑食物鏈不依賴陽光，是這段時期最穩定的食物來源。';
    return '📖 撞擊初期屍體又多又新鮮，是肉食者最好的機會。若體溫不足，別忘了保暖。';
  }
  if (round === 1) {
    if (size === 'small') return '📖 小型動物可以進入蟄伏大幅降低消耗；而種子能在土壤中休眠多年——吃種子的鳥類正是這樣活下來的。';
    if (diet === 'carnivore') return '📖 屍體已經腐爛。淡水碎屑食物鏈或狩獵才是肉食者的出路；大型動物無法蟄伏。';
    return '📖 土壤中的種子是寒冬中最可靠的食物。大型動物無法蟄伏。';
  }
  if (diet === 'carnivore') return '📖 蕨類對你沒有用。倖存的小型動物與水中生物才是你的食物。';
  return '📖 蕨類是災後最早回歸的植物——這是植食者翻身的時刻。';
}

export function resolveWinterRound(state: GameState, runIn: EndgameRun, round: number, choice: string): StepResult {
  const run = cloneRun(runIn);
  const diet = state.species?.diet;
  const size = sizeKey(state);
  const sizeMult = state.species?.sizeMultiplier ?? 1;
  const title = `審判三・長夜：${WINTER_ROUNDS[round].title}`;
  const lines: string[] = [];
  let r: ReturnType<typeof roll> | undefined;

  let food = 0;
  let warmth = 0;
  let drainMult = 1;
  let foodDrainMult = 1;

  const detritusGain = (base: number) => base + (run.nearWater ? 10 : 0) + (run.detritus ? 8 : 0);

  switch (choice) {
    case 'scavenge': {
      const fresh = round === 0;
      food = diet === 'herbivore' ? 6 : fresh ? (diet === 'carnivore' ? 48 : 40) : 12;
      lines.push(diet === 'herbivore'
        ? '你的牙齒是用來磨植物的，根本咬不動腐肉。'
        : fresh ? '遍地的屍體讓你吃得飽飽的。' : '屍體早已腐爛發臭，能吃的部分不多。');
      const infectChance = fresh ? 0.25 : 0.5;
      if (diet !== 'herbivore' && Math.random() < infectChance && !hasTrait(state.traits, 'iron_stomach')) {
        hurt(run, 12, '腐肉讓你染上重病。');
        lines.push('但你吃到了腐敗的肉，病了好幾天。HP -12。');
      }
      break;
    }
    case 'detritus':
      food = detritusGain(round === 0 ? 26 : round === 1 ? 20 : 18);
      warmth = -6;
      run.detritus = true;
      lines.push('水底的腐爛有機物養活了大量昆蟲幼蟲、螺與小魚——這條食物鏈根本不需要陽光。');
      if (run.nearWater) lines.push('你熟悉的深湖讓收穫更豐富。');
      break;
    case 'dead_plants':
      food = diet === 'herbivore' ? 24 : diet === 'omnivore' ? 15 : 3;
      lines.push(diet === 'carnivore' ? '你嚼了幾口枯葉，完全無法消化。' : '枯死的植物乾硬難嚼，勉強果腹。');
      break;
    case 'seeds':
      food = size === 'small' ? 36 : diet === 'carnivore' ? 5 : diet === 'omnivore' ? 30 : 26;
      lines.push(diet === 'carnivore' && size !== 'small'
        ? '你的大嘴巴根本撿不起細小的種子。'
        : '土壤裡的種子營養豐富。在未來，正是靠著吃種子，某些鳥類撐過了這場浩劫。');
      break;
    case 'torpor':
      if (size === 'small') {
        drainMult = 0.4;
        foodDrainMult = 0.4;
        lines.push('你蜷縮在落葉堆裡，心跳變得極慢。整個寒冬幾乎不需要進食。');
      } else if (size === 'medium') {
        drainMult = 0.75;
        foodDrainMult = 0.7;
        lines.push('你盡量減少活動，稍微節省了一些能量。');
      } else {
        lines.push('你的體型太大，身體根本無法進入蟄伏。這個冬天白白浪費了。');
      }
      break;
    case 'hunt':
      r = roll(checkBonus(state, 'str'), 15);
      if (r.success) {
        food = 40;
        lines.push('你撲倒了一隻同樣飢餓的倖存者。');
      } else {
        hurt(run, 20, '你在狩獵中受了致命傷。');
        lines.push('獵物拚死反擊，你受了重傷。HP -20。');
      }
      break;
    case 'ferns':
      food = diet === 'herbivore' ? 42 : diet === 'omnivore' ? 32 : 5;
      lines.push(diet === 'carnivore' ? '你對蕨葉完全提不起興趣。' : '鮮嫩的蕨葉——這是兩年來最美味的一餐！');
      break;
    case 'small_prey':
      r = roll(checkBonus(state, 'agi'), diet === 'herbivore' ? 18 : 11);
      food = r.success ? (diet === 'herbivore' ? 12 : 32) : 0;
      lines.push(r.success ? '你抓到了幾隻從地洞裡探頭的小動物。' : '那些小東西太靈活了。');
      break;
    case 'migrate':
      r = roll(checkBonus(state, 'agi'), 14);
      if (r.success) {
        food = 30;
        warmth = 25;
        lines.push('你們穿越焦土，找到了一片被群山保護的河谷，那裡已經冒出了新芽。');
      } else {
        hurt(run, 15, '你倒在遷徙的路上。');
        const lost = packLoss(run, 1, state);
        lines.push(`長途跋涉讓你們筋疲力竭。HP -15${lost ? `，${lost} 名族人倒在了路上` : ''}。`);
      }
      break;
    case 'nurture':
      if (run.food >= 40) {
        run.food -= 15;
        run.pack += 1;
        lines.push('你們把最好的食物留給了幼崽。牠活了下來——族群有了新的希望。（族群 +1，食物 -15）');
      } else {
        lines.push('食物不夠，幼崽沒能撐過去……');
      }
      break;
    case 'huddle':
      warmth = run.pack > 0 ? Math.min(55, 14 + run.pack * 8) : 10;
      lines.push(run.pack > 0 ? `${run.pack} 名族人緊緊依偎，彼此的體溫就是最好的毛毯。` : '你獨自蜷縮著，冷得發抖。');
      break;
    case 'burrow':
      warmth = 35;
      foodDrainMult = 0.8;
      lines.push('避難所深處的溫度比外面高了許多。');
      break;
  }

  // 消耗：大型動物需要更多食物，小型動物散熱更快（真實的體型取捨）
  const foodDrain = Math.round((22 * sizeMult + run.pack * 2) * foodDrainMult);
  const warmthDrain = Math.round(22 * (size === 'large' ? 0.65 : size === 'small' ? 1.3 : 1) * drainMult);

  run.food += food - foodDrain;
  run.warmth += warmth - warmthDrain;
  lines.push(`（食物 ${food >= 0 ? '+' : ''}${food} / 消耗 -${foodDrain}；體溫 ${warmth >= 0 ? '+' : ''}${warmth} / 流失 -${warmthDrain}）`);

  let penalty = false;
  if (run.food < 0) {
    penalty = true;
    run.food = 0;
    hurt(run, 25, '你在漫長的黑暗中餓死了。');
    const lost = packLoss(run, 1, state);
    lines.push(`飢荒！HP -25${lost ? `，${lost} 名族人餓死了` : ''}。`);
  }
  if (run.warmth < 0) {
    penalty = true;
    run.warmth = 0;
    hurt(run, 20, '你在酷寒中凍死了。');
    const lost = packLoss(run, 1, state);
    lines.push(`嚴寒！HP -20${lost ? `，${lost} 名族人凍死了` : ''}。`);
  }
  run.food = Math.min(150, run.food);
  run.warmth = Math.min(100, run.warmth);
  if (!penalty && !run.dead) run.score += 1;

  const text = lines.join('\n');
  const good = !penalty && !run.dead;
  run.log.push({ title, text, good });
  return { run, title, text, good, roll: r ? { value: r.value, bonus: r.bonus, dc: r.dc } : undefined };
}

// ==========================================================
// 結局
// ==========================================================

const FOSSIL_SITES: Record<string, string> = {
  trex: '美國蒙大拿州・地獄溪組（Hell Creek Formation）',
  triceratops: '美國南達科他州・地獄溪組',
  velociraptor: '蒙古・戈壁沙漠',
  therizinosaurus: '蒙古・耐梅蓋特盆地',
  parasaurolophus: '加拿大亞伯達省・恐龍公園',
  struthiomimus: '加拿大亞伯達省・紅鹿河谷',
  chicken: '某農場的後院',
};

const NICKNAMES = ['大咬', '老疤', '阿灰', '倖存者', '小不點', '紅爪', '星塵', '雷鳴'];

function fossilEpilogue(state: GameState, ending: EndingType): string {
  const site = FOSSIL_SITES[state.species?.id ?? 'trex'] ?? '某處沉積岩層';
  const year = 1902 + Math.floor(Math.random() * 122);
  const nick = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
  let t: string;
  if (ending === 'total_wipe') {
    t = `🦴 化石檔案：${year} 年，古生物學家在${site}挖出了一具保存完好的${state.species?.name}骨骼，編號 K-Pg-${Math.floor(Math.random() * 9000) + 1000}，暱稱「${nick}」。牠的骨骼上布滿了傷痕——每一道，都是你活過的證明。`;
  } else {
    t = `🦴 化石檔案：${site}的岩層中，科學家找到了一層富含銥元素的薄薄黏土——那是小行星留下的簽名。而在它的上方，有一組小小的足跡。那是你的。`;
  }
  if (state.flags.buried_amber) {
    t += `\n\n💎 另外，${year + 3} 年有人在同一地區挖出了一塊琥珀，裡面封著一隻蚊子。沒有人知道，它是被一隻恐龍親手埋下的。`;
  }
  return t;
}

export function computeEnding(state: GameState, run: EndgameRun): Omit<EndgameSummary, 'newAchievements'> {
  const sp = state.species;
  const smallTheropod = sp && ['velociraptor', 'struthiomimus'].includes(sp.id);
  let ending: EndingType;
  let title: string;
  let narrative: string;

  if (run.dead) {
    ending = 'total_wipe';
    title = '全軍覆沒';
    narrative = `${run.deathText}\n\n恐龍的時代結束了。但你的掙扎並非毫無意義——在地球漫長的歷史中，你曾經存在過，曾經戰鬥過，曾經愛過。`;
  } else if (run.pack <= 0) {
    ending = 'lone_survivor';
    title = '孤獨倖存';
    narrative = run.startPack > 0
      ? '你活下來了，但身邊空無一人。曾經並肩的族人，都留在了那場漫長的黑暗裡。你獨自走在灰色的荒野上……但只要還活著，就還有希望。'
      : '你獨自撐過了天火、混亂與長夜。灰燼之上，新芽正在萌發。這個全新的世界，屬於倖存者。';
  } else if (run.pack >= 3 && run.score >= 10) {
    ending = 'legend';
    title = '傳說結局・新世界的始祖';
    narrative = smallTheropod
      ? `你與 ${run.pack} 名族人走出了黑暗。在這個平行的時間線裡，你們是最後的非鳥恐龍——但真實的歷史中，你們那些長著羽毛的小型獸腳類遠親，也就是「鳥類」，真的撐過了這場浩劫。\n\n所以，恐龍從未真正滅絕。下次看見窗外的麻雀時，記得向牠打聲招呼。`
      : `你與 ${run.pack} 名族人走出了黑暗。在真實的歷史裡，沒有任何一種體重超過約 25 公斤的陸生動物撐過這場災難——但在這條時間線上，你們做到了。\n\n你們以智慧、勇氣與團結，改寫了地球的歷史。新生代的大地上，將迴盪著你們的吼聲。`;
  } else {
    ending = 'pack_survives';
    title = '族群延續';
    narrative = `塵埃終將落定。當你帶著 ${run.pack} 名族人走出黑暗時，世界已面目全非：天空灰暗，蕨類遍地。\n\n但你們活下來了。生命會找到出路——而你，就是那條路的起點。`;
  }

  if (sp?.id === 'chicken' && !run.dead) {
    narrative += '\n\n🐔 一道閃光之後，你發現自己站在一座農場的後院裡。旁邊的母雞們看著你，眼神彷彿在說：「你去哪兒了？」';
  }
  if (state.flags.spared_mammal) {
    narrative += '\n\n🐭 後記：還記得那隻你放走的小毛球嗎？牠的族群也撐過了浩劫。在接下來的 6600 萬年裡，牠的後代將長出更大的腦、更靈巧的手……最後，其中一支會站起身來，挖出你的化石，替你取名字。\n謝謝你，當年沒有吃掉人類的祖先。';
  }

  const score = run.score + Math.min(3, run.pack) + (run.dead ? 0 : 2);
  const rank = run.dead ? 'D' : ending === 'legend' ? 'S' : score >= 11 ? 'A' : score >= 7 ? 'B' : 'C';

  return {
    ending,
    title,
    narrative,
    score,
    rank,
    finalHp: run.hp,
    finalPack: run.pack,
    log: run.log,
    fossil: fossilEpilogue(state, ending),
  };
}
