import { Season } from './types';

export interface SeasonInfo {
  name: string;
  emoji: string;
  desc: string;
  hungerMod: number;
  hydrationMod: number;
  /** 行動帶來的飽食收益倍率 */
  foodGainMult: number;
}

export const SEASONS: Record<Season, SeasonInfo> = {
  normal: { name: '尋常之年', emoji: '🌤️', desc: '氣候平穩，沒有特別的影響。', hungerMod: 0, hydrationMod: 0, foodGainMult: 1 },
  bounty: { name: '豐饒之年', emoji: '🌾', desc: '植物繁茂、獵物眾多：食物收益 +30%，飽食消耗 -3。', hungerMod: -3, hydrationMod: 0, foodGainMult: 1.3 },
  drought: { name: '大旱之年', emoji: '☀️', desc: '水源乾涸：水分消耗 +8。', hungerMod: 0, hydrationMod: 8, foodGainMult: 1 },
  monsoon: { name: '雨季之年', emoji: '🌧️', desc: '雨水豐沛：水分消耗 -6，但食物收益 -10%。', hungerMod: 0, hydrationMod: -6, foodGainMult: 0.9 },
  cold: { name: '寒流之年', emoji: '❄️', desc: '異常低溫：飽食消耗 +6（維持體溫需要更多熱量）。', hungerMod: 6, hydrationMod: 0, foodGainMult: 1 },
  omen: { name: '異象之年', emoji: '🌋', desc: '火山灰與異常天象：水分消耗 +3。末日將近……', hungerMod: 0, hydrationMod: 3, foodGainMult: 1 },
};

export function rollSeason(year: number, maxYear: number): Season {
  if (year >= maxYear - 2) return 'omen';
  const r = Math.random();
  if (r < 0.45) return 'normal';
  if (r < 0.62) return 'bounty';
  if (r < 0.76) return 'drought';
  if (r < 0.89) return 'monsoon';
  return 'cold';
}
