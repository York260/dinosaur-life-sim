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
  condition?: string
): number {
  const traitBonus = getTraitCheckBonus(traits, primaryStat, condition);
  // Need to roll >= dc on D20. Effective bonus = stat weight + trait bonus
  // Success = roll + (stat/5) + traitBonus >= dc
  const effectiveBonus = Math.floor(stat / 5) + traitBonus;
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
  condition?: string
): CheckResult {
  if (roll === 1) return 'critical_failure';
  if (roll === 20) return 'critical_success';

  const traitBonus = getTraitCheckBonus(traits, primaryStat, condition);
  const total = roll + Math.floor(stat / 5) + traitBonus;

  if (total >= dc) return 'success';
  return 'failure';
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
