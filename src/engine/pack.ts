import { GameState, Trait } from './types';
import { hasTrait } from './traits';

/** 族群協力：主行動判定加成（每 2 隻 +1，上限 +4） */
export function getPackCheckBonus(packSize: number): number {
  return Math.min(4, Math.floor(packSize / 2));
}

/** 3D 戰鬥中可呼叫族群突擊的次數 */
export function getPackCalls(packSize: number, traits: Trait[], speciesId?: string): number {
  if (packSize <= 0) return 0;
  let calls = Math.min(3, Math.ceil(packSize / 2));
  if (hasTrait(traits, 'pack_leader')) calls += 1;
  if (speciesId === 'parasaurolophus') calls += 1;
  return calls;
}

/** 族群每年的食物負擔：每 2 隻 +1 飽食消耗（上限 +6） */
export function getPackUpkeep(packSize: number): number {
  return Math.min(6, Math.floor(packSize / 2));
}

export function tryPackGrowth(state: GameState): {
  grew: number;
  narrative: string;
} {
  if (!state.hasMate) return { grew: 0, narrative: '' };
  if (state.hunger < 50 || state.hydration < 50) {
    return { grew: 0, narrative: '資源不足，今年巢裡沒有孵出新的幼崽。' };
  }
  // 豐饒之年且魅力足夠，有機會雙胞胎
  const bonus = state.season === 'bounty' && Math.random() < 0.35 ? 1 : 0;
  return {
    grew: 1 + bonus,
    narrative: bonus
      ? '豐饒之年！巢裡一口氣孵出了兩隻幼崽，族群壯大了！'
      : '族群壯大了！新的幼崽破殼而出。',
  };
}

/** 飢荒時族群離散 */
export function checkPackDesertion(packSize: number, hunger: number): { lost: number; narrative: string } {
  if (packSize > 0 && hunger < 25) {
    return { lost: 1, narrative: '食物匱乏，一名族群成員離開了你，去別處尋找生路。' };
  }
  return { lost: 0, narrative: '' };
}
