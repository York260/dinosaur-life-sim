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

/** 族群成員的顯示 */
export function describePackBonuses(state: GameState): string[] {
  const p = state.packSize;
  if (p <= 0) {
    return ['尚無族群：找到伴侶、收養蛋、救助流浪者都能建立族群'];
  }
  const out = [
    `族群協力：主行動判定 +${getPackCheckBonus(p)}`,
    `戰鬥召喚：族群突擊 ${getPackCalls(p, state.traits, state.species?.id)} 次`,
    `族群負擔：每年飽食消耗 +${getPackUpkeep(p)}`,
  ];
  if (p >= 1) out.push('致命危機：族群成員可能挺身代死');
  return out;
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
