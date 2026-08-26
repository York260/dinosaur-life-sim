import { CombatOutcome, Trait } from './types';
import { rollD20 } from './dice';
import { getTraitCombatBonus } from './traits';

export interface CombatResult {
  roll: number;
  total: number;
  outcome: CombatOutcome;
  hpChange: number;
  narrative: string;
  hungerGain: number;
}

export function resolveCombat(
  str: number,
  agi: number,
  packSize: number,
  traits: Trait[],
  threatDC: number
): CombatResult {
  const roll = rollD20();
  const { rollBonus, damageReduction } = getTraitCombatBonus(traits, packSize);

  const statBonus = Math.floor(Math.max(str, agi) / 5);
  const packBonus = packSize; // +1 per pack member
  const total = roll + statBonus + packBonus + rollBonus;

  let outcome: CombatOutcome;
  let hpChange: number;
  let narrative: string;
  let hungerGain = 0;

  if (roll === 1 || total < threatDC - 10) {
    outcome = 'catastrophic_defeat';
    hpChange = -100; // lethal
    narrative = '慘敗！敵方的攻擊致命且精準，你已無力回天……';
  } else if (total < threatDC) {
    outcome = 'defeat';
    const baseDmg = 30 + Math.floor(Math.random() * 21); // 30~50
    hpChange = -(baseDmg - damageReduction);
    narrative = `戰鬥失敗！你受到了重傷，損失 ${Math.abs(hpChange)} HP。`;
  } else if (total >= threatDC + 10 || roll === 20) {
    outcome = 'great_victory';
    hpChange = 0;
    hungerGain = 30 + Math.floor(Math.random() * 21); // 30~50
    narrative = `大勝！完美的一擊！你毫髮無傷地擊退了敵人，獲得 ${hungerGain} 點飽食。`;
  } else {
    outcome = 'minor_victory';
    const baseDmg = 10 + Math.floor(Math.random() * 11); // 10~20
    hpChange = -(baseDmg - damageReduction);
    hungerGain = 15 + Math.floor(Math.random() * 11); // 15~25
    narrative = `小勝！你擊退了敵人，但也受了些傷。HP -${Math.abs(hpChange)}，獲得 ${hungerGain} 點飽食。`;
  }

  hpChange = Math.min(0, hpChange); // Never positive from combat damage

  return { roll, total, outcome, hpChange, narrative, hungerGain };
}
