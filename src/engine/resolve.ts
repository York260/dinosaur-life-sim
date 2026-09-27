import {
  GameState, GameAction, Stats, YearResolution, GrowthRoll, CheckResult, Trait,
  ActionBreakdown, ActionResult, ArenaOutcome, CombatOutcome,
} from './types';
import { rollD20, resolveCheck, rollGrowthDice, getActionCondition } from './dice';
import { resolveCombat } from './combat';
import {
  getEffectiveStat, getRandomPositiveTrait, getRandomNegativeTrait, getTraitCheckBonus,
  getTraitById, hasTrait,
} from './traits';
import { getPackCheckBonus } from './pack';
import { SEASONS } from './seasons';

export interface YearOutcome {
  resolution: YearResolution;
  growth: GrowthRoll;
  gameOverCause?: string;
}

interface Acc {
  narrative: string;
  hp: number;
  hunger: number;
  hydration: number;
  pack: number;
  stats: Partial<Stats>;
  traits: Trait[];
  traitRemoved?: string;
  mateGained: boolean;
  mateLost: boolean;
  flags: string[];
  knowledge: number;
}

function addStats(acc: Acc, changes?: Partial<Stats>) {
  if (!changes) return;
  for (const [k, v] of Object.entries(changes)) {
    if (v) acc.stats[k as keyof Stats] = (acc.stats[k as keyof Stats] || 0) + v;
  }
}

function pushTrait(acc: Acc, state: GameState, t: Trait | undefined) {
  if (!t) return;
  if (state.traits.some(x => x.id === t.id) || acc.traits.some(x => x.id === t.id)) return;
  acc.traits.push(t);
}

/** 套用行動結果中「非數值」的效果（旗標、伴侶、詞條、知識等） */
function applyEffects(acc: Acc, state: GameState, r: ActionResult, opts: { skipPack?: boolean } = {}) {
  if (!opts.skipPack) acc.pack += r.packChange || 0;
  addStats(acc, r.statChanges);
  if (r.traitGainId) pushTrait(acc, state, getTraitById(r.traitGainId));
  if (r.traitGain) pushTrait(acc, state, getRandomPositiveTrait([...state.traits, ...acc.traits]));
  if (r.traitRemove && state.traits.some(t => t.id === r.traitRemove)) acc.traitRemoved = r.traitRemove;
  if (r.mateGain && !state.hasMate) acc.mateGained = true;
  if (r.mateChance && !state.hasMate && state.year >= 13) acc.mateGained = true;
  if (r.mateLoss && state.hasMate) acc.mateLost = true;
  if (r.setFlags) acc.flags.push(...r.setFlags);
  if (r.knowledge) acc.knowledge += r.knowledge;
}

function foodMult(state: GameState, hunger: number): number {
  if (hunger <= 0) return hunger;
  return Math.round(hunger * SEASONS[state.season].foodGainMult);
}

function eff(state: GameState, key: keyof Stats) {
  return getEffectiveStat(state.stats[key], key, state.traits, state.hunger);
}

export function resolveYear(state: GameState, arena?: ArenaOutcome): YearOutcome {
  const mainAction = state.selectedMainAction as GameAction;
  const subAction = state.selectedSubAction;
  const eventTags = state.currentEvent?.tags;
  const acc: Acc = {
    narrative: '', hp: 0, hunger: 0, hydration: 0, pack: 0, stats: {}, traits: [],
    mateGained: false, mateLost: false, flags: [], knowledge: 0,
  };
  let gameOverCause: string | undefined;
  let combatOutcome: CombatOutcome | undefined;
  let mainBreakdown: ActionBreakdown;
  let checkResult: CheckResult;
  let roll = 0;

  if (mainAction.isCombat && mainAction.threatDC) {
    const threat = mainAction.threatDC;
    if (arena) {
      // ---------- 3D 戰鬥結果 ----------
      const win = arena.result === 'victory';
      const r = win ? mainAction.successResult : mainAction.failureResult;
      combatOutcome = win
        ? (arena.hpLost < 15 ? 'great_victory' : 'minor_victory')
        : arena.result === 'death' ? 'catastrophic_defeat' : 'defeat';
      checkResult = combatOutcome === 'great_victory' ? 'critical_success'
        : combatOutcome === 'minor_victory' ? 'success' : combatOutcome === 'defeat' ? 'failure' : 'critical_failure';

      acc.hp = -(state.hp - arena.finalHp);
      if (win) {
        const reward = combatOutcome === 'great_victory' ? 30 + Math.floor(Math.random() * 21) : 15 + Math.floor(Math.random() * 11);
        acc.hunger = foodMult(state, Math.max(r.hungerChange, reward));
        acc.hydration = r.hydrationChange;
        applyEffects(acc, state, r);
        acc.narrative = `⚔️ 擊敗了${arena.enemyName}！${combatOutcome === 'great_victory' ? '（大勝：幾乎毫髮無傷）' : ''}\n${r.narrative}`;
        if (arena.perfectDodges >= 3 && !hasTrait(state.traits, 'battle_hardened')) {
          pushTrait(acc, state, getTraitById('battle_hardened'));
          acc.narrative += '\n在一次次完美閃避中，你的戰鬥本能覺醒了！（獲得「百戰不殆」）';
        }
      } else if (arena.result === 'death') {
        gameOverCause = `你在與${arena.enemyName}的戰鬥中倒下了……`;
        acc.narrative = gameOverCause;
      } else {
        acc.hunger = Math.min(0, r.hungerChange);
        acc.hydration = Math.min(0, r.hydrationChange);
        applyEffects(acc, state, r, { skipPack: arena.result === 'defeat' });
        if (arena.result === 'defeat') {
          acc.pack -= arena.packLost;
          acc.narrative = `💀 敗給了${arena.enemyName}。一名族人挺身而出，替你擋下了致命一擊……\n${r.narrative}`;
          if (Math.random() < 0.4) pushTrait(acc, state, getRandomNegativeTrait(state.traits));
        } else {
          acc.narrative = `🏃 你從${arena.enemyName}面前撤退了。`;
          if (r.mateLoss) acc.narrative += `\n${r.narrative}`;
        }
      }
      mainBreakdown = {
        actionLabel: mainAction.label,
        roll: 0, primaryStat: 'str', statBonus: 0, traitBonus: 0, total: 0, dc: threat,
        checkResult, narrative: acc.narrative, resourceCost: mainAction.resourceCost,
        hpChange: acc.hp, hungerChange: acc.hunger, hydrationChange: acc.hydration, packChange: acc.pack,
        isCombat: true, combatOutcome, arena, statChanges: { ...acc.stats },
      };
    } else {
      // ---------- 快速擲骰結算（舊版戰鬥） ----------
      const c = resolveCombat(eff(state, 'str'), eff(state, 'agi'), state.packSize, state.traits, threat);
      roll = c.roll;
      combatOutcome = c.outcome;
      const win = c.outcome === 'great_victory' || c.outcome === 'minor_victory';
      const r = win ? mainAction.successResult : mainAction.failureResult;
      checkResult = c.outcome === 'great_victory' ? 'critical_success'
        : c.outcome === 'minor_victory' ? 'success' : c.outcome === 'defeat' ? 'failure' : 'critical_failure';
      acc.narrative = c.narrative;
      acc.hp = c.hpChange;
      acc.hunger = foodMult(state, c.hungerGain);
      if (win) {
        applyEffects(acc, state, r);
        acc.narrative += `\n${r.narrative}`;
      } else {
        applyEffects(acc, state, r);
      }
      if (c.outcome === 'catastrophic_defeat') {
        if (state.packSize + acc.pack > 0) {
          acc.pack -= 1;
          acc.hp = -(state.hp - 10);
          acc.narrative = '慘敗！致命一擊落下的瞬間，一名族人撲了上來，替你承受了一切……';
        } else {
          gameOverCause = '在戰鬥中慘遭致命攻擊，你的恐龍倒下了……';
        }
      } else if (c.outcome === 'defeat' && Math.random() < 0.4) {
        pushTrait(acc, state, getRandomNegativeTrait(state.traits));
      }
      const statBonus = Math.floor(Math.max(eff(state, 'str'), eff(state, 'agi')) / 5);
      mainBreakdown = {
        actionLabel: mainAction.label,
        roll: c.roll, primaryStat: 'str', statBonus,
        traitBonus: c.total - c.roll - statBonus - state.packSize,
        total: c.total, dc: threat, checkResult, narrative: acc.narrative,
        resourceCost: mainAction.resourceCost,
        hpChange: acc.hp, hungerChange: acc.hunger, hydrationChange: 0, packChange: acc.pack,
        isCombat: true, combatOutcome, combatPackBonus: state.packSize, statChanges: { ...acc.stats },
      };
    }
  } else {
    // ---------- 一般判定 ----------
    const stat = mainAction.primaryStat;
    const effStat = eff(state, stat);
    const condition = getActionCondition(mainAction.tags, eventTags);
    const packBonus = getPackCheckBonus(state.packSize);
    roll = rollD20();
    checkResult = resolveCheck(roll, effStat, mainAction.dc, state.traits, stat, condition, packBonus);
    const ok = checkResult === 'success' || checkResult === 'critical_success';
    const r = ok ? mainAction.successResult : mainAction.failureResult;
    acc.narrative = r.narrative;
    acc.hp = r.hpChange;
    acc.hunger = foodMult(state, r.hungerChange);
    acc.hydration = r.hydrationChange;
    applyEffects(acc, state, r);

    if (checkResult === 'critical_success' && acc.traits.length === 0) {
      pushTrait(acc, state, getRandomPositiveTrait(state.traits));
      acc.narrative += '\n大成功！額外獲得了一個正面詞條！';
    }
    if (checkResult === 'critical_failure') {
      acc.hp -= 10;
      acc.narrative += '\n大失敗！遭受了額外傷害。';
      if (Math.random() < 0.3) pushTrait(acc, state, getRandomNegativeTrait(state.traits));
    }
    const statBonus = Math.floor(effStat / 5);
    const traitBonus = getTraitCheckBonus(state.traits, stat, condition);
    mainBreakdown = {
      actionLabel: mainAction.label,
      roll, primaryStat: stat, statBonus, traitBonus, packBonus,
      total: roll + statBonus + traitBonus + packBonus,
      dc: mainAction.dc, checkResult, narrative: acc.narrative,
      resourceCost: mainAction.resourceCost,
      hpChange: acc.hp, hungerChange: acc.hunger, hydrationChange: acc.hydration, packChange: acc.pack,
      statChanges: r.statChanges,
    };
  }

  // ---------- 副行動 ----------
  let subBreakdown: ActionBreakdown | undefined;
  if (subAction && !gameOverCause) {
    const stat = subAction.primaryStat;
    const effStat = eff(state, stat);
    const condition = getActionCondition(subAction.tags, eventTags);
    const subRoll = rollD20();
    const subDc = subAction.dc + 3;
    const subCheck = resolveCheck(subRoll, effStat, subDc, state.traits, stat, condition);
    const ok = subCheck === 'success' || subCheck === 'critical_success';
    const r = ok ? subAction.successResult : subAction.failureResult;
    const before = { hp: acc.hp, hunger: acc.hunger, hydration: acc.hydration, pack: acc.pack };
    acc.narrative += `\n\n【副行動】${subAction.label}（擲骰=${subRoll}，${ok ? '成功' : '失敗'}）\n${r.narrative}`;
    acc.hp += r.hpChange;
    acc.hunger += foodMult(state, r.hungerChange);
    acc.hydration += r.hydrationChange;
    applyEffects(acc, state, r);
    const statBonus = Math.floor(effStat / 5);
    const traitBonus = getTraitCheckBonus(state.traits, stat, condition);
    subBreakdown = {
      actionLabel: subAction.label,
      roll: subRoll, primaryStat: stat, statBonus, traitBonus,
      total: subRoll + statBonus + traitBonus, dc: subDc, checkResult: subCheck,
      narrative: r.narrative, resourceCost: subAction.resourceCost,
      hpChange: acc.hp - before.hp, hungerChange: acc.hunger - before.hunger,
      hydrationChange: acc.hydration - before.hydration, packChange: acc.pack - before.pack,
      statChanges: r.statChanges,
    };
  }

  if (acc.mateLost) {
    pushTrait(acc, state, getTraitById('grief'));
  }

  const [traitGained, ...extraTraits] = acc.traits;
  const resolution: YearResolution = {
    actionNarrative: acc.narrative,
    roll,
    checkResult,
    hpChange: acc.hp,
    hungerChange: acc.hunger,
    hydrationChange: acc.hydration,
    traitGained,
    extraTraits,
    traitRemoved: acc.traitRemoved,
    packChange: acc.pack,
    mateGained: acc.mateGained,
    mateLost: acc.mateLost,
    flagsSet: acc.flags,
    knowledgeGain: acc.knowledge,
    combatOutcome,
    mainBreakdown,
    subBreakdown,
    statChanges: Object.keys(acc.stats).length > 0 ? acc.stats : undefined,
  };

  const growth = rollGrowthDice(state.traits);
  if (growth.isCritical) {
    growth.bonusTrait = getRandomPositiveTrait([...state.traits, ...acc.traits]);
  }

  return { resolution, growth, gameOverCause };
}
