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
  | 'COMBAT'
  | 'STAT_ALLOCATE'
  | 'ENDGAME'
  | 'RESULT'
  | 'GAME_OVER';

export type StatKey = 'str' | 'agi' | 'int' | 'cha';

export type EndingType = 'total_wipe' | 'lone_survivor' | 'pack_survives' | 'legend';

export type Season = 'normal' | 'bounty' | 'drought' | 'monsoon' | 'cold' | 'omen';

export type EventRarity = 'common' | 'rare' | 'legendary' | 'chain';

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
  /** 物種專屬戰鬥被動 */
  combatPassive: string;
  /** 古生物小知識 */
  fact: string;
  /** 隱藏物種 */
  hidden?: boolean;
  startTraits?: string[];
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
  /** 3D 戰鬥敵人 id（見 enemies.ts） */
  enemy?: string;
  /** 行動出現條件 */
  requires?: Requirement;
  /** 標籤：night / flee / rest / study / group */
  tags?: string[];
  resourceCost: { hunger: number; hydration: number };
}

export interface Requirement {
  minPack?: number;
  maxPack?: number;
  mate?: boolean;
  noMate?: boolean;
  diets?: DietType[];
  sizes?: BodySize[];
  flag?: string;
  noFlag?: string;
  trait?: string;
  minYear?: number;
  maxYear?: number;
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
  /** 直接獲得伴侶 */
  mateGain?: boolean;
  /** 失去伴侶（獲得喪偶之痛） */
  mateLoss?: boolean;
  /** 指定獲得的詞條 id（正面或負面） */
  traitGainId?: string;
  /** 設定劇情旗標（記錄設定年份） */
  setFlags?: string[];
  /** 獲得古生物知識點 */
  knowledge?: number;
  statChanges?: Partial<Stats>;
}

// ========== 事件 ==========

export interface GameEvent {
  id: string;
  templateId: string;
  narrative: string;
  year: number;
  rarity: EventRarity;
  fact?: string;
  tags?: string[];
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
  packBonus?: number;
  arena?: ArenaOutcome;
  statChanges?: Partial<Stats>;
}

// ========== 3D 戰鬥結果 ==========

export type ArenaResultKind = 'victory' | 'defeat' | 'fled' | 'death';

export interface ArenaOutcome {
  result: ArenaResultKind;
  hpLost: number;
  finalHp: number;
  packLost: number;
  damageDealt: number;
  perfectDodges: number;
  maxCombo: number;
  interrupts: number;
  timeSec: number;
  enemyName: string;
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
  mateGained?: boolean;
  mateLost?: boolean;
  flagsSet?: string[];
  knowledgeGain?: number;
  extraTraits?: Trait[];
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

export interface EndgameSummary {
  ending: EndingType;
  title: string;
  narrative: string;
  score: number;
  rank: string;
  finalHp: number;
  finalPack: number;
  log: { title: string; text: string; good: boolean }[];
  fossil: string;
  newAchievements: string[];
  quizCorrect: number;
  quizTotal: number;
  bossDefeated: boolean;
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

  ending: EndingType | null;
  endgame: EndgameSummary | null;
  deathCause: string | null;

  season: Season;
  flags: Record<string, number>;
  recentEvents: string[];
  knowledge: number;
  mateName: string | null;
  /** 玩家恐龍的暱稱（生涯報告使用） */
  dinoName: string;
  /** 生涯大事記 */
  chronicle: ChronicleEntry[];
  runStats: RunStats;
  /** 上一年年末結算的提示（族群增減、詞條痊癒等） */
  yearNotes: string[];

  bgColor: string;
  log: string[];
}

export type ChronicleKind = 'normal' | 'combat' | 'love' | 'pack' | 'legend' | 'danger' | 'trait';

export interface ChronicleEntry {
  year: number;
  icon: string;
  text: string;
  kind: ChronicleKind;
}

export interface RunStats {
  enemiesDefeated: string[];
  damageDealt: number;
  births: number;
  packLost: number;
  matesLost: number;
  critSuccesses: number;
  critFailures: number;
  fightsWon: number;
  fightsLost: number;
  perfectDodges: number;
  bestCombo: number;
  rareEvents: number;
  eggsHatched: number;
  maxPack: number;
}

// ========== Reducer Actions ==========

export type GameActionType =
  | { type: 'START_GAME' }
  | { type: 'SELECT_SPECIES'; species: Species }
  | { type: 'SET_EVENT'; event: GameEvent }
  | { type: 'SELECT_MAIN_ACTION'; action: GameAction }
  | { type: 'SELECT_SUB_ACTION'; action: GameAction | null }
  | { type: 'CONFIRM_ACTIONS' }
  | { type: 'START_COMBAT' }
  | { type: 'CANCEL_COMBAT' }
  | { type: 'RESOLVE_ACTIONS'; resolution: YearResolution }
  | { type: 'ROLL_GROWTH'; roll: GrowthRoll }
  | { type: 'ENTER_STAT_ALLOCATE' }
  | { type: 'ALLOCATE_STATS'; allocation: Partial<Stats> }
  | { type: 'ADVANCE_YEAR' }
  | { type: 'SET_ENDING'; summary: EndgameSummary }
  | { type: 'GAME_OVER'; cause: string }
  | { type: 'RESTART' };
