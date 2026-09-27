import { AgeStage, GameAction, GameState, Requirement, EventRarity, ActionResult, StatKey } from './types';

export interface EventTemplate {
  id: string;
  narratives: string[];
  stages: AgeStage[];
  mainActions: GameAction[];
  subActions: GameAction[];
  /** 事件出現條件（例如需要族群、伴侶、旗標） */
  condition?: (s: GameState) => boolean;
  /** 權重（預設 1） */
  weight?: number;
  rarity?: EventRarity;
  /** 古生物小知識 */
  fact?: string;
  tags?: string[];
}

export function meetsRequirement(req: Requirement | undefined, s: GameState): boolean {
  if (!req) return true;
  if (req.minPack !== undefined && s.packSize < req.minPack) return false;
  if (req.maxPack !== undefined && s.packSize > req.maxPack) return false;
  if (req.mate && !s.hasMate) return false;
  if (req.noMate && s.hasMate) return false;
  if (req.diets && s.species && !req.diets.includes(s.species.diet)) return false;
  if (req.sizes && s.species && !req.sizes.includes(s.species.bodySize)) return false;
  if (req.flag && !s.flags[req.flag]) return false;
  if (req.noFlag && s.flags[req.noFlag]) return false;
  if (req.trait && !s.traits.some(t => t.id === req.trait)) return false;
  if (req.minYear !== undefined && s.year < req.minYear) return false;
  if (req.maxYear !== undefined && s.year > req.maxYear) return false;
  return true;
}

// ---------- 簡寫輔助 ----------

export function R(
  narrative: string,
  hp = 0,
  hunger = 0,
  hydration = 0,
  extra: Partial<ActionResult> = {},
): ActionResult {
  return { narrative, hpChange: hp, hungerChange: hunger, hydrationChange: hydration, ...extra };
}

export function A(
  id: string,
  label: string,
  description: string,
  primaryStat: StatKey,
  dc: number,
  cost: [number, number],
  successResult: ActionResult,
  failureResult: ActionResult,
  extra: Partial<GameAction> = {},
): GameAction {
  return {
    id, label, description, primaryStat, dc,
    resourceCost: { hunger: cost[0], hydration: cost[1] },
    successResult, failureResult, ...extra,
  };
}

/** 3D 戰鬥行動 */
export function Fight(
  id: string,
  label: string,
  description: string,
  enemy: string,
  threatDC: number,
  cost: [number, number],
  successResult: ActionResult,
  failureResult: ActionResult,
  extra: Partial<GameAction> = {},
): GameAction {
  return A(id, label, description, 'str', threatDC, cost, successResult, failureResult, {
    isCombat: true, threatDC, enemy, ...extra,
  });
}
