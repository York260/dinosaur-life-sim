// ========== 基礎列舉 ==========

export type DietType = 'carnivore' | 'herbivore' | 'omnivore';
export type BodySize = 'small' | 'medium' | 'large';
export type AgeStage = 'juvenile' | 'adolescent' | 'adult';

export type GamePhase =
  | 'TITLE'
  | 'SPECIES_SELECT'
  | 'YEAR_EVENT'
  | 'ACTION_SELECT'
  | 'RESOLVE'
  | 'DICE_ROLL'
  | 'STAT_ALLOCATE'
  | 'ENDGAME_PHASE1'
  | 'ENDGAME_PHASE2'
  | 'ENDGAME_PHASE3'
  | 'RESULT'
  | 'GAME_OVER';

export type StatKey = 'str' | 'agi' | 'int' | 'cha';

export type EndingType = 'total_wipe' | 'lone_survivor' | 'pack_survives';

export type CombatOutcome = 'great_victory' | 'minor_victory' | 'defeat' | 'catastrophic_defeat';

export type CheckResult = 'critical_success' | 'success' | 'failure' | 'critical_failure';

// ========== 物種 ==========

export interface Species {
  id: string;
  name: string;
  emoji: string;
  diet: DietType;
  bodySize: BodySize;
  sizeMultiplier: number;
  description: string;
  baseStats: Stats;
}

// ========== 屬性 ==========

export interface Stats {
  str: number;
  agi: number;
  int: number;
  cha: number;
}

// ========== 詞條 ==========

export interface Trait {
  id: string;
  name: string;
  description: string;
  isPositive: boolean;
  effects: TraitEffect[];
  cureCondition?: string;     // 負面詞條的解除條件描述
  cureProgress?: number;      // 當前解除進度
  cureTarget?: number;        // 解除所需進度
}

export interface TraitEffect {
  type: 'stat_bonus' | 'combat_bonus' | 'consumption_mod' | 'hp_per_turn' | 'check_bonus' | 'endgame_bonus';
  stat?: StatKey;
  value: number;
  condition?: string;
}

// ========== 行動 ==========

export interface GameAction {
  id: string;
  label: string;
  description: string;
  primaryStat: StatKey;
  dc: number;
  successResult: ActionResult;
  failureResult: ActionResult;
  isCombat?: boolean;
  threatDC?: number;
  resourceCost: { hunger: number; hydration: number };
}

export interface ActionResult {
  narrative: string;
  hpChange: number;
  hungerChange: number;
  hydrationChange: number;
  traitGain?: string;       // trait id
  traitRemove?: string;     // trait id
  packChange?: number;
  mateChance?: boolean;
  statChanges?: Partial<Stats>;
}

// ========== 事件 ==========

export interface GameEvent {
  id: string;
  narrative: string;
  year: number;
  mainActions: GameAction[];
  subActions: GameAction[];
}

// ========== 行動判定明細 ==========

export interface ActionBreakdown {
  actionLabel: string;
  roll: number;
  primaryStat: StatKey;
  statBonus: number;
  traitBonus: number;
  total: number;
  dc: number;
  checkResult: CheckResult;
  narrative: string;
  resourceCost: { hunger: number; hydration: number };
  hpChange: number;
  hungerChange: number;
  hydrationChange: number;
  packChange: number;
  isCombat?: boolean;
  combatOutcome?: CombatOutcome;
  combatPackBonus?: number;
  statChanges?: Partial<Stats>;
}

// ========== 年度結算 ==========

export interface YearResolution {
  actionNarrative: string;
  roll: number;
  checkResult: CheckResult;
  hpChange: number;
  hungerChange: number;
  hydrationChange: number;
  traitGained?: Trait;
  traitRemoved?: string;
  packChange: number;
  combatOutcome?: CombatOutcome;
  mainBreakdown?: ActionBreakdown;
  subBreakdown?: ActionBreakdown;
  statChanges?: Partial<Stats>;
}

export interface GrowthRoll {
  roll: number;
  points: number;
  isCritical: boolean;
  bonusTrait?: Trait;
}

// ========== 末日 ==========

export interface EndgameChoice {
  id: string;
  label: string;
  description: string;
  successRate: number;
}

export interface EndgamePhaseResult {
  phase: 1 | 2 | 3;
  narrative: string;
  roll: number;
  success: boolean;
  consequence: string;
}

// ========== 遊戲狀態 ==========

export interface GameState {
  phase: GamePhase;
  species: Species | null;
  year: number;
  maxYear: number;

  hp: number;
  hunger: number;
  hydration: number;

  stats: Stats;
  traits: Trait[];
  unallocatedPoints: number;

  hasMate: boolean;
  packSize: number;

  currentEvent: GameEvent | null;
  selectedMainAction: GameAction | null;
  selectedSubAction: GameAction | null;
  yearResolution: YearResolution | null;
  growthRoll: GrowthRoll | null;

  endgameResults: EndgamePhaseResult[];
  ending: EndingType | null;
  deathCause: string | null;

  bgColor: string;
  log: string[];
}

// ========== Reducer Actions ==========

export type GameActionType =
  | { type: 'START_GAME' }
  | { type: 'SELECT_SPECIES'; species: Species }
  | { type: 'SET_EVENT'; event: GameEvent }
  | { type: 'SELECT_MAIN_ACTION'; action: GameAction }
  | { type: 'SELECT_SUB_ACTION'; action: GameAction | null }
  | { type: 'CONFIRM_ACTIONS' }
  | { type: 'RESOLVE_ACTIONS'; resolution: YearResolution }
  | { type: 'ROLL_GROWTH'; roll: GrowthRoll }
  | { type: 'ENTER_STAT_ALLOCATE' }
  | { type: 'ALLOCATE_STATS'; allocation: Partial<Stats> }
  | { type: 'ADVANCE_YEAR' }
  | { type: 'ENTER_ENDGAME' }
  | { type: 'ENDGAME_RESULT'; result: EndgamePhaseResult }
  | { type: 'SET_ENDING'; ending: EndingType }
  | { type: 'GAME_OVER'; cause: string }
  | { type: 'RESTART' };
