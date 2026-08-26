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
