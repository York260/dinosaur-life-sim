import { Species } from './types';

export const SPECIES_LIST: Species[] = [
  {
    id: 'trex',
    name: '暴龍',
    emoji: '🦖',
    diet: 'carnivore',
    bodySize: 'large',
    sizeMultiplier: 1.3,
    description: '白堊紀的頂級掠食者。力量驚人但體型龐大，需要大量食物維持。',
    baseStats: { str: 25, agi: 8, int: 10, cha: 12 },
    combatPassive: '碎骨咬合：撕咬傷害 +50%，可使用咆哮',
    fact: '暴龍的咬合力估計超過 35,000 牛頓，是已知陸生動物中最強的咬合力之一，能直接咬碎骨頭。',
  },
  {
    id: 'velociraptor',
    name: '迅猛龍',
    emoji: '🦎',
    diet: 'carnivore',
    bodySize: 'small',
    sizeMultiplier: 0.8,
    description: '敏捷的小型獵手，擅長群體狩獵與快速突襲。',
    baseStats: { str: 12, agi: 25, int: 15, cha: 10 },
    combatPassive: '鐮刀爪連擊：撕咬速度 +30%，連擊加成翻倍',
    fact: '真實的迅猛龍大約只有火雞大小，而且全身覆蓋羽毛——電影裡的迅猛龍其實是「放大版」。',
  },
  {
    id: 'triceratops',
    name: '三角龍',
    emoji: '🛡️',
    diet: 'herbivore',
    bodySize: 'large',
    sizeMultiplier: 1.3,
    description: '擁有堅固頭盾與三根角的草食巨獸，防禦力極強。',
    baseStats: { str: 20, agi: 8, int: 12, cha: 15 },
    combatPassive: '三角衝鋒：衝撞傷害 +70%，受到傷害 -20%',
    fact: '三角龍的頭骨可長達 2 公尺以上，是陸地動物中最大的頭骨之一。',
  },
  {
    id: 'parasaurolophus',
    name: '副櫛龍',
    emoji: '🎺',
    diet: 'herbivore',
    bodySize: 'medium',
    sizeMultiplier: 1.0,
    description: '頭頂長有管狀冠飾的草食恐龍，擅長溝通與群體生活。',
    baseStats: { str: 10, agi: 15, int: 18, cha: 20 },
    combatPassive: '共鳴冠：咆哮次數 +1，族群召喚 +1',
    fact: '副櫛龍的中空頭冠內有彎曲的氣道，可能像號角一樣發出低沉的共鳴聲，用來與同伴溝通。',
  },
  {
    id: 'therizinosaurus',
    name: '鐮刀龍',
    emoji: '✂️',
    diet: 'omnivore',
    bodySize: 'large',
    sizeMultiplier: 1.3,
    description: '擁有巨大爪子的雜食恐龍，攻防兼備但食量驚人。',
    baseStats: { str: 18, agi: 10, int: 15, cha: 12 },
    combatPassive: '巨爪反擊：敵人露出破綻時，傷害 ×2（一般為 ×1.5）',
    fact: '鐮刀龍的爪子可長達 1 公尺，是已知動物中最長的爪之一——但牠很可能主要以植物為食。',
  },
  {
    id: 'struthiomimus',
    name: '似鴕龍',
    emoji: '🏃',
    diet: 'omnivore',
    bodySize: 'small',
    sizeMultiplier: 0.8,
    description: '外型似鴕鳥的輕盈恐龍，速度極快，適應力強。',
    baseStats: { str: 8, agi: 25, int: 18, cha: 12 },
    combatPassive: '疾風步：閃避無敵時間更長、完美閃避判定更寬、體力恢復 +40%',
    fact: '似鴕龍類有細長的後腿與輕盈的骨骼，被認為是奔跑速度最快的恐龍之一。',
  },
  {
    id: 'chicken',
    name: '時空迷途的雞',
    emoji: '🐔',
    diet: 'omnivore',
    bodySize: 'small',
    sizeMultiplier: 0.6,
    description: '不知為何從 6600 萬年後穿越回來的家雞。牠是恐龍的後代——而且牠隱約記得結局。',
    baseStats: { str: 5, agi: 20, int: 22, cha: 16 },
    combatPassive: '未來記憶：末日審判的知識題會出現「咕咕提示」；撕咬速度 +30%',
    fact: '鳥類就是恐龍！雞與暴龍的親緣關係，比暴龍與三角龍更近。2007 年科學家從暴龍化石中發現的蛋白質序列，與雞最為相似。',
    hidden: true,
    startTraits: ['burrowing_instinct'],
  },
];

export function getSpeciesById(id: string): Species | undefined {
  return SPECIES_LIST.find(s => s.id === id);
}

export function getAgeStage(year: number) {
  if (year <= 5) return 'juvenile' as const;
  if (year <= 12) return 'adolescent' as const;
  return 'adult' as const;
}
