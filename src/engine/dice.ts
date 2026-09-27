import { CheckResult, GrowthRoll, StatKey, Trait } from './types';
import { getTraitCheckBonus } from './traits';

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function calculateSuccessRate(
  stat: number,
  dc: number,
  traits: Trait[],
  primaryStat: StatKey,
  condition?: string,
  extraBonus = 0
): number {
  const traitBonus = getTraitCheckBonus(traits, primaryStat, condition);
  // Need to roll >= dc on D20. Effective bonus = stat weight + trait bonus + extra (pack etc.)
  // Success = roll + (stat/5) + traitBonus + extra >= dc
  const effectiveBonus = Math.floor(stat / 5) + traitBonus + extraBonus;
  const needed = dc - effectiveBonus;
  // Probability of rolling >= needed on D20
  const successChance = Math.max(5, Math.min(95, ((21 - needed) / 20) * 100));
  return Math.round(successChance);
}

export function resolveCheck(
  roll: number,
  stat: number,
  dc: number,
  traits: Trait[],
  primaryStat: StatKey,
  condition?: string,
  extraBonus = 0
): CheckResult {
  if (roll === 1) return 'critical_failure';
  if (roll === 20) return 'critical_success';

  const traitBonus = getTraitCheckBonus(traits, primaryStat, condition);
  const total = roll + Math.floor(stat / 5) + traitBonus + extraBonus;

  if (total >= dc) return 'success';
  return 'failure';
}

/** 取得行動判定的情境條件（夜間事件 / 逃跑行動），用於詞條加成 */
export function getActionCondition(actionTags?: string[], eventTags?: string[]): string | undefined {
  if (actionTags?.includes('flee')) return 'flee';
  if (eventTags?.includes('night') || actionTags?.includes('night')) return 'night';
  return undefined;
}

export function rollGrowthDice(traits: Trait[]): GrowthRoll {
  const roll = rollD20();
  let points: number;

  if (roll >= 20) {
    points = 8;
  } else if (roll >= 16) {
    points = 5;
  } else if (roll >= 6) {
    points = 3;
  } else {
    points = 1;
  }

  return {
    roll,
    points,
    isCritical: roll === 20,
  };
}
