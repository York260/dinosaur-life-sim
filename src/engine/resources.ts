import { GameState, GameAction } from './types';
import { getTraitConsumptionMod, getTraitHpPerTurn } from './traits';
import { SEASONS } from './seasons';
import { getPackUpkeep } from './pack';

export function calculateConsumption(
  state: GameState,
  mainAction: GameAction | null,
  subAction: GameAction | null
): { hungerCost: number; hydrationCost: number } {
  const species = state.species;
  if (!species) return { hungerCost: 0, hydrationCost: 0 };

  // Base consumption: fixed 10 * size multiplier
  const baseHunger = species.sizeMultiplier * 10;
  const baseHydration = species.sizeMultiplier * 10;

  // Action costs (×0.9 adjustment)
  const mainHungerCost = mainAction ? mainAction.resourceCost.hunger * 0.9 : 0;
  const mainHydrationCost = mainAction ? mainAction.resourceCost.hydration * 0.9 : 0;
  const subHungerCost = subAction && mainAction ? subAction.resourceCost.hunger * 0.9 * 0.5 : 0;
  const subHydrationCost = subAction && mainAction ? subAction.resourceCost.hydration * 0.9 * 0.5 : 0;

  // Trait modifications
  const hungerMod = getTraitConsumptionMod(state.traits, 'hunger');
  const hydrationMod = getTraitConsumptionMod(state.traits, 'hydration');
  const generalMod = getTraitConsumptionMod(state.traits);

  // Season & pack
  const season = SEASONS[state.season];
  const packUpkeep = getPackUpkeep(state.packSize);

  const hungerCost = Math.max(5, Math.round(
    baseHunger + mainHungerCost + subHungerCost + hungerMod + generalMod + season.hungerMod + packUpkeep
  ));
  const hydrationCost = Math.max(5, Math.round(
    baseHydration + mainHydrationCost + subHydrationCost + hydrationMod + generalMod + season.hydrationMod
  ));

  return { hungerCost, hydrationCost };
}

export function applyConsumption(state: GameState): {
  newHunger: number;
  newHydration: number;
  hpPenalty: number;
  hpRegen: number;
  addWeakness: boolean;
  warnings: string[];
} {
  const { hungerCost, hydrationCost } = calculateConsumption(
    state,
    state.selectedMainAction,
    state.selectedSubAction
  );

  const newHunger = Math.max(0, Math.min(100, state.hunger - hungerCost));
  const newHydration = Math.max(0, Math.min(100, state.hydration - hydrationCost));

  const warnings: string[] = [];
  let hpPenalty = 0;
  let hpRegen = 0;
  let addWeakness = false;

  // Starvation/dehydration: weakness + HP loss when either reaches 0
  if (newHunger === 0 || newHydration === 0) {
    addWeakness = true;
    if (newHunger === 0) {
      hpPenalty += 10;
      warnings.push('飢餓：飽食度歸零，HP -10，並陷入「虛弱」（全屬性 -5）！');
    }
    if (newHydration === 0) {
      hpPenalty += 10;
      warnings.push('脫水：水分歸零，HP -10，並陷入「虛弱」（全屬性 -5）！');
    }
  } else if (newHunger >= 50 && newHydration >= 50) {
    // 營養充足時自然癒合
    hpRegen = 6;
  }

  // Trait HP-per-turn effects (e.g., infection)
  const traitHpEffect = getTraitHpPerTurn(state.traits);
  if (traitHpEffect < 0) {
    hpPenalty += Math.abs(traitHpEffect);
    warnings.push(`詞條效果：每回合損失 ${Math.abs(traitHpEffect)} HP`);
  }

  return { newHunger, newHydration, hpPenalty, hpRegen, addWeakness, warnings };
}

export function clampResource(value: number): number {
  return Math.max(0, Math.min(100, value));
}
