import { useReducer, useEffect, useCallback } from 'react';
import {
  GameState, GameActionType, Species, GameAction, Stats,
  YearResolution, GrowthRoll, CheckResult, EndgamePhaseResult, EndingType, Trait,
  ActionBreakdown,
} from './engine/types';
import { rollD20, resolveCheck, rollGrowthDice, calculateSuccessRate } from './engine/dice';
import { generateEvent } from './engine/events';
import { resolveCombat } from './engine/combat';
import { applyConsumption, clampResource } from './engine/resources';
import { getEffectiveStat, getRandomPositiveTrait, getRandomNegativeTrait, getTraitCheckBonus, WEAKNESS_TRAIT } from './engine/traits';
import { tryPackGrowth } from './engine/pack';
import { getRandomBgColor } from './theme/colors';
import SpeciesSelect from './components/SpeciesSelect';
import GameBoard from './components/GameBoard';
import EndGame from './components/EndGame';
import GameOver from './components/GameOver';

// ========== Initial State ==========

const INITIAL_STATE: GameState = {
  phase: 'TITLE',
  species: null,
  year: 1,
  maxYear: 25,
  hp: 100,
  hunger: 80,
  hydration: 80,
  stats: { str: 10, agi: 10, int: 10, cha: 10 },
  traits: [],
  unallocatedPoints: 0,
  hasMate: false,
  packSize: 0,
  currentEvent: null,
  selectedMainAction: null,
  selectedSubAction: null,
  yearResolution: null,
  growthRoll: null,
  endgameResults: [],
  ending: null,
  deathCause: null,
  bgColor: 'hsl(0, 0%, 92%)',
  log: [],
};

// ========== Reducer ==========

function gameReducer(state: GameState, action: GameActionType): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...INITIAL_STATE, phase: 'SPECIES_SELECT' };

    case 'SELECT_SPECIES': {
      const sp = action.species;
      return {
        ...INITIAL_STATE,
        phase: 'YEAR_EVENT',
        species: sp,
        stats: { ...sp.baseStats },
        bgColor: getRandomBgColor(sp.id),
      };
    }

    case 'SET_EVENT':
      return {
        ...state,
        phase: 'ACTION_SELECT',
        currentEvent: action.event,
        selectedMainAction: null,
        selectedSubAction: null,
      };

    case 'SELECT_MAIN_ACTION':
      return { ...state, selectedMainAction: action.action };

    case 'SELECT_SUB_ACTION':
      return { ...state, selectedSubAction: action.action };

    case 'CONFIRM_ACTIONS':
      return { ...state, phase: 'RESOLVE' };

    case 'RESOLVE_ACTIONS': {
      // Apply stat changes from resolution
      const resolvedStats = { ...state.stats };
      if (action.resolution.statChanges) {
        for (const [key, val] of Object.entries(action.resolution.statChanges)) {
          if (val) {
            resolvedStats[key as keyof Stats] = Math.max(0, Math.min(100, resolvedStats[key as keyof Stats] + val));
          }
        }
      }
      return {
        ...state,
        phase: 'DICE_ROLL',
        yearResolution: action.resolution,
        hp: clampResource(state.hp + action.resolution.hpChange),
        hunger: clampResource(state.hunger + action.resolution.hungerChange),
        hydration: clampResource(state.hydration + action.resolution.hydrationChange),
        packSize: Math.max(0, state.packSize + action.resolution.packChange),
        hasMate: state.hasMate || (action.resolution.actionNarrative.includes('找到了伴侶')),
        stats: resolvedStats,
        traits: (() => {
          let newTraits = [...state.traits];
          if (action.resolution.traitGained) {
            if (!newTraits.find(t => t.id === action.resolution.traitGained!.id)) {
              newTraits.push(action.resolution.traitGained);
            }
          }
          if (action.resolution.traitRemoved) {
            newTraits = newTraits.filter(t => t.id !== action.resolution.traitRemoved);
          }
          return newTraits;
        })(),
      };
    }

    case 'ROLL_GROWTH': {
      let newTraits = [...state.traits];
      if (action.roll.bonusTrait) {
        if (!newTraits.find(t => t.id === action.roll.bonusTrait!.id)) {
          newTraits.push(action.roll.bonusTrait);
        }
      }
      return {
        ...state,
        growthRoll: action.roll,
        unallocatedPoints: state.unallocatedPoints + action.roll.points,
        traits: newTraits,
      };
    }

    case 'ENTER_STAT_ALLOCATE':
      return { ...state, phase: 'STAT_ALLOCATE' };

    case 'ALLOCATE_STATS': {
      const newStats = { ...state.stats };
      let spent = 0;
      for (const [key, val] of Object.entries(action.allocation)) {
        if (val) {
          newStats[key as keyof Stats] = Math.min(100, newStats[key as keyof Stats] + val);
          spent += val;
        }
      }
      return {
        ...state,
        stats: newStats,
        unallocatedPoints: Math.max(0, state.unallocatedPoints - spent),
      };
    }

    case 'ADVANCE_YEAR': {
      const newYear = state.year + 1;
      const newBg = state.species ? getRandomBgColor(state.species.id) : state.bgColor;

      // Apply resource consumption
      const consumption = applyConsumption(state);
      const newHp = clampResource(state.hp - consumption.hpPenalty);
      const newHunger = consumption.newHunger;
      const newHydration = consumption.newHydration;

      // Handle weakness trait: add if starving/dehydrated, remove if recovered
      let advTraits = [...state.traits];
      const hasWeakness = advTraits.some(t => t.id === 'weakness');
      if (consumption.addWeakness && !hasWeakness) {
        advTraits.push({ ...WEAKNESS_TRAIT });
      } else if (!consumption.addWeakness && hasWeakness) {
        advTraits = advTraits.filter(t => t.id !== 'weakness');
      }

      // Pack growth
      const packGrowth = tryPackGrowth(state);
      const newPackSize = state.packSize + (packGrowth.grew ? 1 : 0);

      // Check death
      if (newHp <= 0) {
        return {
          ...state,
          phase: 'GAME_OVER',
          hp: 0,
          hunger: newHunger,
          hydration: newHydration,
          year: newYear,
          traits: advTraits,
          deathCause: '你的恐龍因為傷重/飢渴而死亡了。',
        };
      }

      // Check endgame
      if (newYear > state.maxYear) {
        return {
          ...state,
          phase: 'ENDGAME_PHASE1',
          year: newYear,
          hp: newHp,
          hunger: newHunger,
          hydration: newHydration,
          packSize: newPackSize,
          traits: advTraits,
          bgColor: newBg,
          currentEvent: null,
          selectedMainAction: null,
          selectedSubAction: null,
          yearResolution: null,
          growthRoll: null,
        };
      }

      return {
        ...state,
        phase: 'YEAR_EVENT',
        year: newYear,
        hp: newHp,
        hunger: newHunger,
        hydration: newHydration,
        packSize: newPackSize,
        traits: advTraits,
        bgColor: newBg,
        currentEvent: null,
        selectedMainAction: null,
        selectedSubAction: null,
        yearResolution: null,
        growthRoll: null,
      };
    }

    case 'ENTER_ENDGAME':
      return { ...state, phase: 'ENDGAME_PHASE1' };

    case 'ENDGAME_RESULT': {
      const newResults = [...state.endgameResults, action.result];
      let nextPhase = state.phase;
      if (action.result.phase === 1) nextPhase = 'ENDGAME_PHASE2';
      else if (action.result.phase === 2) nextPhase = 'ENDGAME_PHASE3';
      else if (action.result.phase === 3) nextPhase = 'RESULT';
      return { ...state, phase: nextPhase, endgameResults: newResults };
    }

    case 'SET_ENDING':
      return { ...state, ending: action.ending, phase: 'RESULT' };

    case 'GAME_OVER':
      return { ...state, phase: 'GAME_OVER', deathCause: action.cause };

    case 'RESTART':
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ========== App ==========

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);

  // Apply background color
  useEffect(() => {
    document.body.style.backgroundColor = state.bgColor;
  }, [state.bgColor]);

  // Generate event when entering YEAR_EVENT phase
  useEffect(() => {
    if (state.phase === 'YEAR_EVENT' && !state.currentEvent && state.species) {
      const event = generateEvent(state);
      dispatch({ type: 'SET_EVENT', event });
    }
  }, [state.phase, state.currentEvent, state.species]);

  // ========== Handlers ==========

  const handleStart = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const handleSelectSpecies = useCallback((species: Species) => {
    dispatch({ type: 'SELECT_SPECIES', species });
  }, []);

  const handleSelectMain = useCallback((action: GameAction) => {
    dispatch({ type: 'SELECT_MAIN_ACTION', action });
  }, []);

  const handleSelectSub = useCallback((action: GameAction | null) => {
    dispatch({ type: 'SELECT_SUB_ACTION', action });
  }, []);

  const handleConfirmActions = useCallback(() => {
    dispatch({ type: 'CONFIRM_ACTIONS' });

    const mainAction = state.selectedMainAction;
    if (!mainAction) return;

    const subAction = state.selectedSubAction;
    const primaryStat = mainAction.primaryStat;
    const effectiveStat = getEffectiveStat(state.stats[primaryStat], primaryStat, state.traits, state.hunger);

    // Roll for main action
    const roll = rollD20();
    const checkResult: CheckResult = resolveCheck(roll, effectiveStat, mainAction.dc, state.traits, primaryStat);
    const isSuccess = checkResult === 'success' || checkResult === 'critical_success';

    let narrative = '';
    let hpChange = 0;
    let hungerChange = 0;
    let hydrationChange = 0;
    let traitGained: Trait | undefined;
    let traitRemoved: string | undefined;
    let packChange = 0;
    let combatOutcome = undefined;
    const totalStatChanges: Partial<Stats> = {};

    // Build main breakdown
    let mainBreakdown: ActionBreakdown;

    // Handle combat actions
    if (mainAction.isCombat && mainAction.threatDC) {
      const combatResult = resolveCombat(
        getEffectiveStat(state.stats.str, 'str', state.traits, state.hunger),
        getEffectiveStat(state.stats.agi, 'agi', state.traits, state.hunger),
        state.packSize,
        state.traits,
        mainAction.threatDC
      );
      narrative = combatResult.narrative;
      hpChange = combatResult.hpChange;
      hungerChange = combatResult.hungerGain;
      combatOutcome = combatResult.outcome;

      const combatStatBonus = Math.floor(Math.max(
        getEffectiveStat(state.stats.str, 'str', state.traits, state.hunger),
        getEffectiveStat(state.stats.agi, 'agi', state.traits, state.hunger)
      ) / 5);

      mainBreakdown = {
        actionLabel: mainAction.label,
        roll: combatResult.roll,
        primaryStat: 'str',
        statBonus: combatStatBonus,
        traitBonus: combatResult.total - combatResult.roll - combatStatBonus - state.packSize,
        total: combatResult.total,
        dc: mainAction.threatDC,
        checkResult: combatResult.outcome === 'great_victory' ? 'critical_success'
          : combatResult.outcome === 'minor_victory' ? 'success'
          : combatResult.outcome === 'defeat' ? 'failure'
          : 'critical_failure',
        narrative: combatResult.narrative,
        resourceCost: mainAction.resourceCost,
        hpChange: combatResult.hpChange,
        hungerChange: combatResult.hungerGain,
        hydrationChange: 0,
        packChange: 0,
        isCombat: true,
        combatOutcome: combatResult.outcome,
        combatPackBonus: state.packSize,
      };

      // Collect statChanges from combat action results
      const combatIsSuccess = combatResult.outcome === 'great_victory' || combatResult.outcome === 'minor_victory';
      const combatActionResult = combatIsSuccess ? mainAction.successResult : mainAction.failureResult;
      if (combatActionResult.statChanges) {
        for (const [k, v] of Object.entries(combatActionResult.statChanges)) {
          if (v) totalStatChanges[k as keyof Stats] = (totalStatChanges[k as keyof Stats] || 0) + v;
        }
        mainBreakdown.statChanges = combatActionResult.statChanges;
      }

      if (combatResult.outcome === 'catastrophic_defeat') {
        dispatch({ type: 'GAME_OVER', cause: '在戰鬥中慘遭致命攻擊，你的恐龍倒下了……' });
        return;
      }
      if (combatResult.outcome === 'defeat') {
        if (Math.random() < 0.4) {
          traitGained = getRandomNegativeTrait(state.traits);
        }
      }
    } else {
      // Normal action resolution
      const result = isSuccess ? mainAction.successResult : mainAction.failureResult;
      narrative = result.narrative;
      hpChange = result.hpChange;
      hungerChange = result.hungerChange;
      hydrationChange = result.hydrationChange;
      packChange = result.packChange || 0;
      if (result.traitGain) {
        traitGained = getRandomPositiveTrait(state.traits);
      }
      if (result.traitRemove) {
        traitRemoved = result.traitRemove;
      }
      // Collect statChanges from main action
      if (result.statChanges) {
        for (const [k, v] of Object.entries(result.statChanges)) {
          if (v) totalStatChanges[k as keyof Stats] = (totalStatChanges[k as keyof Stats] || 0) + v;
        }
      }

      // Handle mate chance (adult stage: year >= 13)
      if (isSuccess && result.mateChance && !state.hasMate && state.year >= 13) {
        narrative += '\n你成功找到了伴侶！';
        packChange += 1;
      }

      // Critical success bonus
      if (checkResult === 'critical_success' && !traitGained) {
        traitGained = getRandomPositiveTrait(state.traits);
        narrative += '\n大成功！額外獲得了一個正面詞條！';
      }

      // Critical failure penalty
      if (checkResult === 'critical_failure') {
        hpChange -= 10;
        narrative += '\n大失敗！遭受了額外傷害。';
        if (Math.random() < 0.3) {
          traitGained = getRandomNegativeTrait(state.traits);
        }
      }

      const mainStatBonus = Math.floor(effectiveStat / 5);
      const mainTraitBonus = getTraitCheckBonus(state.traits, primaryStat);

      mainBreakdown = {
        actionLabel: mainAction.label,
        roll,
        primaryStat,
        statBonus: mainStatBonus,
        traitBonus: mainTraitBonus,
        total: roll + mainStatBonus + mainTraitBonus,
        dc: mainAction.dc,
        checkResult,
        narrative,
        resourceCost: mainAction.resourceCost,
        hpChange,
        hungerChange,
        hydrationChange,
        packChange,
        statChanges: result.statChanges,
      };
    }

    // Sub action
    let subBreakdown: ActionBreakdown | undefined;
    if (subAction) {
      const subPrimaryStat = subAction.primaryStat;
      const subEffectiveStat = getEffectiveStat(state.stats[subPrimaryStat], subPrimaryStat, state.traits, state.hunger);
      const subRoll = rollD20();
      const subDc = subAction.dc + 3; // DC+3 penalty
      const subCheckResult = resolveCheck(subRoll, subEffectiveStat, subDc, state.traits, subPrimaryStat);
      const subSuccess = subCheckResult === 'success' || subCheckResult === 'critical_success';
      const subOutcome = subSuccess ? subAction.successResult : subAction.failureResult;

      narrative += `\n\n【副行動】${subAction.label}（擲骰=${subRoll}，${subSuccess ? '成功' : '失敗'}）\n${subOutcome.narrative}`;
      hpChange += subOutcome.hpChange;
      hungerChange += subOutcome.hungerChange;
      hydrationChange += subOutcome.hydrationChange;
      packChange += subOutcome.packChange || 0;
      if (subOutcome.traitRemove) {
        traitRemoved = subOutcome.traitRemove;
      }
      // Collect statChanges from sub action
      if (subOutcome.statChanges) {
        for (const [k, v] of Object.entries(subOutcome.statChanges)) {
          if (v) totalStatChanges[k as keyof Stats] = (totalStatChanges[k as keyof Stats] || 0) + v;
        }
      }

      const subStatBonus = Math.floor(subEffectiveStat / 5);
      const subTraitBonus = getTraitCheckBonus(state.traits, subPrimaryStat);

      subBreakdown = {
        actionLabel: subAction.label,
        roll: subRoll,
        primaryStat: subPrimaryStat,
        statBonus: subStatBonus,
        traitBonus: subTraitBonus,
        total: subRoll + subStatBonus + subTraitBonus,
        dc: subDc,
        checkResult: subCheckResult,
        narrative: subOutcome.narrative,
        resourceCost: subAction.resourceCost,
        hpChange: subOutcome.hpChange,
        hungerChange: subOutcome.hungerChange,
        hydrationChange: subOutcome.hydrationChange,
        packChange: subOutcome.packChange || 0,
        statChanges: subOutcome.statChanges,
      };
    }

    const resolution: YearResolution = {
      actionNarrative: narrative,
      roll,
      checkResult,
      hpChange,
      hungerChange,
      hydrationChange,
      traitGained,
      traitRemoved,
      packChange,
      combatOutcome,
      mainBreakdown,
      subBreakdown,
      statChanges: Object.keys(totalStatChanges).length > 0 ? totalStatChanges : undefined,
    };

    dispatch({ type: 'RESOLVE_ACTIONS', resolution });

    // Growth roll
    const growth = rollGrowthDice(state.traits);
    if (growth.isCritical) {
      growth.bonusTrait = getRandomPositiveTrait([...state.traits, ...(traitGained ? [traitGained] : [])]);
    }
    dispatch({ type: 'ROLL_GROWTH', roll: growth });

  }, [state.selectedMainAction, state.selectedSubAction, state.stats, state.traits, state.hunger, state.packSize, state.hasMate, state.year]);

  const handleContinueFromDice = useCallback(() => {
    // Check for death after resolution
    if (state.hp <= 0) {
      dispatch({ type: 'GAME_OVER', cause: '你的恐龍因傷重而死亡了。' });
      return;
    }
    dispatch({ type: 'ENTER_STAT_ALLOCATE' });
  }, [state.hp]);

  const handleAllocateStats = useCallback((allocation: Partial<Stats>) => {
    dispatch({ type: 'ALLOCATE_STATS', allocation });
    // After allocation, advance year
    setTimeout(() => {
      dispatch({ type: 'ADVANCE_YEAR' });
    }, 100);
  }, []);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESTART' });
  }, []);

  const handleEndgameResult = useCallback((result: EndgamePhaseResult) => {
    dispatch({ type: 'ENDGAME_RESULT', result });
  }, []);

  const handleSetEnding = useCallback((ending: EndingType) => {
    dispatch({ type: 'SET_ENDING', ending });
  }, []);

  // ========== Render ==========

  if (state.phase === 'TITLE') {
    return (
      <div className="title-screen">
        <h1>恐龍人生模擬器</h1>
        <p className="subtitle">DinoLife Simulator</p>
        <p className="subtitle" style={{ fontSize: '0.9rem', maxWidth: 400, marginBottom: '1.5rem' }}>
          在白堊紀末期生存、成長、繁衍，帶領族群度過滅絕隕石的末日挑戰
        </p>
        <button className="start-btn" onClick={handleStart}>
          開始遊戲
        </button>
      </div>
    );
  }

  if (state.phase === 'SPECIES_SELECT') {
    return <SpeciesSelect onSelect={handleSelectSpecies} />;
  }

  if (state.phase === 'GAME_OVER') {
    return (
      <GameOver
        cause={state.deathCause || '未知原因'}
        year={state.year}
        speciesName={state.species?.name || '恐龍'}
        onRestart={handleRestart}
      />
    );
  }

  if (
    state.phase === 'ENDGAME_PHASE1' ||
    state.phase === 'ENDGAME_PHASE2' ||
    state.phase === 'ENDGAME_PHASE3' ||
    state.phase === 'RESULT'
  ) {
    return (
      <EndGame
        state={state}
        onPhaseResult={handleEndgameResult}
        onSetEnding={handleSetEnding}
        onRestart={handleRestart}
      />
    );
  }

  // Main game phases
  return (
    <GameBoard
      state={state}
      onSelectMain={handleSelectMain}
      onSelectSub={handleSelectSub}
      onConfirmActions={handleConfirmActions}
      onContinueFromDice={handleContinueFromDice}
      onAllocateStats={handleAllocateStats}
    />
  );
}
