import { GameState } from './types';
import { rollD20 } from './dice';
import { getEffectiveStat } from './traits';

export function attemptMating(state: GameState): {
  success: boolean;
  narrative: string;
  hungerCost: number;
  hydrationCost: number;
} {
  const cha = getEffectiveStat(state.stats.cha, 'cha', state.traits, state.hunger);
  const roll = rollD20();
  const dc = 12;
  const total = roll + Math.floor(cha / 5);

  const hungerCost = 20;
  const hydrationCost = 15;

  if (roll === 20 || total >= dc) {
    return {
      success: true,
      narrative: roll === 20
        ? '大成功！你的求偶表演驚艷全場，成功找到了伴侶！'
        : '求偶成功！你展現了自己的魅力，贏得了伴侶的芳心。',
      hungerCost,
      hydrationCost,
    };
  }

  return {
    success: false,
    narrative: roll === 1
      ? '大失敗！你的求偶表演慘不忍睹，對方嫌棄地走開了……'
      : '求偶失敗。對方似乎對你不太感興趣。',
    hungerCost,
    hydrationCost,
  };
}

export function tryPackGrowth(state: GameState): {
  grew: boolean;
  narrative: string;
} {
  if (!state.hasMate) return { grew: false, narrative: '' };
  if (state.hunger < 50 || state.hydration < 50) {
    return { grew: false, narrative: '資源不足，今年沒有新的族群成員。' };
  }

  // Automatic growth if resources are sufficient
  return {
    grew: true,
    narrative: '族群壯大了！新的成員加入了你的族群。',
  };
}

export function sacrificePackMember(state: GameState): {
  possible: boolean;
  narrative: string;
} {
  if (state.packSize <= 0) {
    return { possible: false, narrative: '沒有族群成員可以犧牲。' };
  }
  return {
    possible: true,
    narrative: '一名族群成員為了保護你犧牲了自己……',
  };
}
