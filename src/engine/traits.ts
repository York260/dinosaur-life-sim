import { Trait, StatKey } from './types';

export const POSITIVE_TRAITS: Trait[] = [
  {
    id: 'night_vision',
    name: '夜視',
    description: '夜間事件判定 +3',
    isPositive: true,
    effects: [{ type: 'check_bonus', value: 3, condition: 'night' }],
  },
  {
    id: 'efficient_metabolism',
    name: '高效代謝',
    description: '每回合飽食消耗 -3',
    isPositive: true,
    effects: [{ type: 'consumption_mod', value: -3 }],
  },
  {
    id: 'thick_scales',
    name: '厚鱗甲',
    description: '戰鬥受傷時 HP 損失 -10',
    isPositive: true,
    effects: [{ type: 'combat_bonus', value: 10 }],
  },
  {
    id: 'terrifying_roar',
    name: '駭人咆哮',
    description: '威嚇判定/求偶 CHA+5',
    isPositive: true,
    effects: [{ type: 'stat_bonus', stat: 'cha', value: 5 }],
  },
  {
    id: 'burrowing_instinct',
    name: '穴居直覺',
    description: '末日判定時額外加成 +5',
    isPositive: true,
    effects: [{ type: 'endgame_bonus', value: 5 }],
  },
  {
    id: 'keen_senses',
    name: '敏銳感官',
    description: '覓食與探索判定 INT+3',
    isPositive: true,
    effects: [{ type: 'stat_bonus', stat: 'int', value: 3 }],
  },
  {
    id: 'pack_leader',
    name: '族群領袖',
    description: '族群戰鬥加成翻倍',
    isPositive: true,
    effects: [{ type: 'combat_bonus', value: 0, condition: 'pack_leader' }],
  },
  {
    id: 'swift_runner',
    name: '疾行者',
    description: '逃跑與遷徙判定 AGI+5',
    isPositive: true,
    effects: [{ type: 'stat_bonus', stat: 'agi', value: 5 }],
  },
  {
    id: 'iron_stomach',
    name: '鐵胃',
    description: '水分消耗 -3',
    isPositive: true,
    effects: [{ type: 'consumption_mod', value: -3, condition: 'hydration' }],
  },
  {
    id: 'battle_hardened',
    name: '百戰不殆',
    description: '戰鬥骰面 +2',
    isPositive: true,
    effects: [{ type: 'combat_bonus', value: 2, condition: 'roll' }],
  },
];

export const WEAKNESS_TRAIT: Trait = {
  id: 'weakness',
  name: '虛弱',
  description: '飽食或水分歸零，全屬性 -5',
  isPositive: false,
  effects: [
    { type: 'stat_bonus', stat: 'str', value: -5 },
    { type: 'stat_bonus', stat: 'agi', value: -5 },
    { type: 'stat_bonus', stat: 'int', value: -5 },
    { type: 'stat_bonus', stat: 'cha', value: -5 },
  ],
  cureCondition: '飽食和水分都大於 0',
};

export const NEGATIVE_TRAITS: Trait[] = [
  {
    id: 'lame',
    name: '跛足',
    description: 'AGI -5，逃跑判定 -3',
    isPositive: false,
    effects: [
      { type: 'stat_bonus', stat: 'agi', value: -5 },
      { type: 'check_bonus', value: -3, condition: 'flee' },
    ],
    cureCondition: '連續 2 年選擇休養',
    cureProgress: 0,
    cureTarget: 2,
  },
  {
    id: 'scarred',
    name: '疤面',
    description: 'CHA -5（永久）',
    isPositive: false,
    effects: [{ type: 'stat_bonus', stat: 'cha', value: -5 }],
  },
  {
    id: 'infected',
    name: '感染',
    description: '每回合 HP -5',
    isPositive: false,
    effects: [{ type: 'hp_per_turn', value: -5 }],
    cureCondition: '觸發治療事件',
    cureProgress: 0,
    cureTarget: 1,
  },
  {
    id: 'hunger_fear',
    name: '飢餓恐懼',
    description: '飽食<50 時 INT-3',
    isPositive: false,
    effects: [{ type: 'stat_bonus', stat: 'int', value: -3, condition: 'hunger_below_50' }],
    cureCondition: '連續 3 年飽食>70',
    cureProgress: 0,
    cureTarget: 3,
  },
  {
    id: 'grief',
    name: '喪偶之痛',
    description: '全屬性 -2',
    isPositive: false,
    effects: [
      { type: 'stat_bonus', stat: 'str', value: -2 },
      { type: 'stat_bonus', stat: 'agi', value: -2 },
      { type: 'stat_bonus', stat: 'int', value: -2 },
      { type: 'stat_bonus', stat: 'cha', value: -2 },
    ],
    cureCondition: '重新求偶成功',
    cureProgress: 0,
    cureTarget: 1,
  },
];

export function getRandomPositiveTrait(existingTraits: Trait[]): Trait {
  const existingIds = new Set(existingTraits.map(t => t.id));
  const available = POSITIVE_TRAITS.filter(t => !existingIds.has(t.id));
  if (available.length === 0) return POSITIVE_TRAITS[0];
  return { ...available[Math.floor(Math.random() * available.length)] };
}

export function getRandomNegativeTrait(existingTraits: Trait[]): Trait {
  const existingIds = new Set(existingTraits.map(t => t.id));
  const available = NEGATIVE_TRAITS.filter(t => !existingIds.has(t.id));
  if (available.length === 0) return NEGATIVE_TRAITS[0];
  const trait = available[Math.floor(Math.random() * available.length)];
  return { ...trait, cureProgress: 0 };
}

export function getEffectiveStat(
  baseStat: number,
  statKey: StatKey,
  traits: Trait[],
  hunger?: number
): number {
  let total = baseStat;
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'stat_bonus' && effect.stat === statKey) {
        // Check conditions
        if (effect.condition === 'hunger_below_50' && hunger !== undefined && hunger >= 50) {
          continue;
        }
        total += effect.value;
      }
    }
  }
  return Math.max(0, Math.min(100, total));
}

export function getTraitCheckBonus(traits: Trait[], _statKey: StatKey, condition?: string): number {
  let bonus = 0;
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'check_bonus') {
        if (!effect.condition || effect.condition === condition) {
          bonus += effect.value;
        }
      }
    }
  }
  return bonus;
}

export function getTraitConsumptionMod(traits: Trait[], resource?: 'hunger' | 'hydration'): number {
  let mod = 0;
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'consumption_mod') {
        if (!effect.condition || effect.condition === resource) {
          mod += effect.value;
        }
      }
    }
  }
  return mod;
}

export function getTraitHpPerTurn(traits: Trait[]): number {
  let total = 0;
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'hp_per_turn') {
        total += effect.value;
      }
    }
  }
  return total;
}

export function getTraitCombatBonus(traits: Trait[], packSize: number): { rollBonus: number; damageReduction: number } {
  let rollBonus = 0;
  let damageReduction = 0;
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'combat_bonus') {
        if (effect.condition === 'roll') {
          rollBonus += effect.value;
        } else if (effect.condition === 'pack_leader') {
          rollBonus += packSize; // double pack bonus
        } else {
          damageReduction += effect.value;
        }
      }
    }
  }
  return { rollBonus, damageReduction };
}

export function getTraitEndgameBonus(traits: Trait[]): number {
  let bonus = 0;
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'endgame_bonus') {
        bonus += effect.value;
      }
    }
  }
  return bonus;
}
