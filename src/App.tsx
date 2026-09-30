import { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import {
  GameState, GameActionType, Species, GameAction, Stats, Trait, ArenaOutcome, EndgameSummary,
} from './engine/types';
import { generateEvent } from './engine/events';
import { applyConsumption, clampResource } from './engine/resources';
import { getTraitById, progressTraitCures, WEAKNESS_TRAIT } from './engine/traits';
import { tryPackGrowth, checkPackDesertion } from './engine/pack';
import { rollSeason } from './engine/seasons';
import { resolveYear } from './engine/resolve';
import {
  ACHIEVEMENTS, arenaAchievements, unlock, lifeAchievements, loadAchievements,
  isSecretUnlocked, setSecretUnlocked,
} from './engine/achievements';
import { getRandomBgColor } from './theme/colors';
import { randomDinoName, randomMateName } from './engine/names';
import { ENEMIES } from './engine/enemies';
import { ChronicleEntry, GameEvent, YearResolution } from './engine/types';
import { saveCurrentRun, loadCurrentRun, archiveRun, loadArchive, deleteArchiveEntry, ArchiveEntry, clearCurrentRun } from './engine/save';
import SpeciesSelect from './components/SpeciesSelect';
import GameBoard from './components/GameBoard';
import EndGame from './components/EndGame';
import GameOver from './components/GameOver';
import ReportOverlay from './components/ReportOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import Tutorial, { tutorialSeen, markTutorialSeen } from './components/Tutorial';
import TitleScene, { TitleIcons } from './components/TitleScene';

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
  ending: null,
  endgame: null,
  deathCause: null,
  season: 'normal',
  flags: {},
  recentEvents: [],
  knowledge: 0,
  mateName: null,
  dinoName: '',
  chronicle: [],
  runStats: {
    enemiesDefeated: [], damageDealt: 0, births: 0, packLost: 0, matesLost: 0, critSuccesses: 0, critFailures: 0,
    fightsWon: 0, fightsLost: 0, perfectDodges: 0, bestCombo: 0, rareEvents: 0, eggsHatched: 0, maxPack: 0,
  },
  yearNotes: [],
  bgColor: 'hsl(0, 0%, 92%)',
  log: [],
};

// ========== 生涯大事記 ==========

const FLAG_NOTES: Record<string, { icon: string; text: string; kind: ChronicleEntry['kind'] }> = {
  adopted_egg: { icon: '🥚', text: '收養了一顆被遺棄的蛋', kind: 'love' },
  egg_hatched: { icon: '🐣', text: '守護多年的蛋終於孵化了', kind: 'love' },
  ptero_friend: { icon: '🪽', text: '養大的小翼龍振翅飛向天空', kind: 'love' },
  spared_mammal: { icon: '🐭', text: '放走了一隻偷食物的小毛球', kind: 'love' },
  sibling_bond: { icon: '🤲', text: '把食物讓給了最瘦小的手足', kind: 'love' },
  sibling_joined: { icon: '🫂', text: '與失散的手足重逢', kind: 'love' },
  ally_rival: { icon: '🤝', text: '與流浪戰士結下情誼', kind: 'love' },
  rival_beaten: { icon: '🥊', text: '在決鬥中擊敗了流浪戰士', kind: 'combat' },
  albino_beaten: { icon: '🌟', text: '擊敗了傳說中的白化暴君', kind: 'legend' },
  knows_cave: { icon: '🕳️', text: '找到了一處深邃的洞穴', kind: 'normal' },
  food_cache: { icon: '🍖', text: '埋藏了過冬的存糧', kind: 'normal' },
  near_lake: { icon: '🌊', text: '把棲地遷到了深湖旁', kind: 'normal' },
  pack_drilled: { icon: '📯', text: '訓練族群緊急撤離', kind: 'pack' },
  omen_seen: { icon: '🌠', text: '察覺到天上那顆越來越亮的星', kind: 'legend' },
  buried_amber: { icon: '💎', text: '親手埋下了一塊琥珀', kind: 'normal' },
};

const RESULT_WORD: Record<string, string> = {
  critical_success: '大成功', success: '成功', failure: '失敗', critical_failure: '大失敗',
};

function eventHint(ev: GameEvent | null): string {
  if (!ev) return '';
  const first = ev.narrative.split(/[，。！？…]/)[0] ?? '';
  return first.length > 22 ? `${first.slice(0, 22)}…` : first;
}

function buildChronicle(state: GameState, res: YearResolution, mateName: string | null): ChronicleEntry[] {
  const y = state.year;
  const out: ChronicleEntry[] = [];
  const main = state.selectedMainAction;
  const ev = state.currentEvent;
  const arena = res.mainBreakdown?.arena;
  const rarityIcon = ev?.rarity === 'legendary' ? '🌟' : ev?.rarity === 'rare' ? '✨' : ev?.rarity === 'chain' ? '🔗' : '📍';

  if (main?.isCombat) {
    const foe = arena?.enemyName ?? ENEMIES[main.enemy ?? 'rival']?.name ?? '敵人';
    const won = res.combatOutcome === 'great_victory' || res.combatOutcome === 'minor_victory';
    const how = arena
      ? arena.result === 'victory' ? `勝利${arena.perfectDodges >= 2 ? `（完美閃避 ${arena.perfectDodges} 次）` : ''}` : arena.result === 'fled' ? '撤退' : '敗北'
      : won ? '勝利' : '敗北';
    out.push({ year: y, icon: '⚔️', text: `與${foe}交戰：${how}`, kind: won ? 'combat' : 'danger' });
  } else if (main) {
    out.push({
      year: y,
      icon: rarityIcon,
      text: `${eventHint(ev)} → ${main.label}（${RESULT_WORD[res.checkResult]}）`,
      kind: ev?.rarity === 'legendary' ? 'legend' : 'normal',
    });
  }
  if (res.mateGained) out.push({ year: y, icon: '💕', text: `與「${mateName}」結為伴侶`, kind: 'love' });
  if (res.mateLost) out.push({ year: y, icon: '💔', text: `失去了伴侶「${state.mateName ?? '牠'}」`, kind: 'danger' });
  if (res.packChange > 0) out.push({ year: y, icon: '🦕', text: `族群增加了 ${res.packChange} 名成員`, kind: 'pack' });
  if (res.packChange < 0) out.push({ year: y, icon: '🕯️', text: `失去了 ${-res.packChange} 名族人`, kind: 'danger' });
  for (const t of [res.traitGained, ...(res.extraTraits ?? [])]) {
    if (t) out.push({ year: y, icon: t.isPositive ? '✨' : '🩸', text: `${t.isPositive ? '獲得' : '留下了'}「${t.name}」`, kind: t.isPositive ? 'trait' : 'danger' });
  }
  for (const f of res.flagsSet ?? []) {
    const n = FLAG_NOTES[f];
    if (n && !state.flags[f]) out.push({ year: y, ...n });
  }
  if (state.hp + res.hpChange > 0 && state.hp + res.hpChange < 15) {
    out.push({ year: y, icon: '🩹', text: '身受重傷，在死亡邊緣撐了下來', kind: 'danger' });
  }
  return out;
}

// ========== Reducer ==========

function gameReducer(state: GameState, action: GameActionType): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...INITIAL_STATE, phase: 'SPECIES_SELECT' };

    case 'SELECT_SPECIES': {
      const sp = action.species;
      const traits = (sp.startTraits ?? []).map(id => getTraitById(id)).filter((t): t is Trait => !!t);
      return {
        ...INITIAL_STATE,
        phase: 'YEAR_EVENT',
        species: sp,
        stats: { ...sp.baseStats },
        traits,
        season: rollSeason(1, INITIAL_STATE.maxYear),
        dinoName: randomDinoName(),
        chronicle: [{ year: 1, icon: '🥚', text: `一隻${sp.name}在白堊紀末的森林裡破殼而出`, kind: 'normal' }],
        bgColor: getRandomBgColor(sp.id),
        yearNotes: sp.id === 'chicken' ? ['🐔 你睜開眼睛，發現自己在 6600 萬年前的森林裡。咕？'] : [],
      };
    }

    case 'SET_EVENT':
      return {
        ...state,
        phase: 'ACTION_SELECT',
        currentEvent: action.event,
        selectedMainAction: null,
        selectedSubAction: null,
        recentEvents: [...state.recentEvents, action.event.templateId].slice(-6),
        runStats: action.event.rarity === 'rare' || action.event.rarity === 'legendary'
          ? { ...state.runStats, rareEvents: state.runStats.rareEvents + 1 }
          : state.runStats,
      };

    case 'SELECT_MAIN_ACTION':
      return { ...state, selectedMainAction: action.action };

    case 'SELECT_SUB_ACTION':
      return { ...state, selectedSubAction: action.action };

    case 'CONFIRM_ACTIONS':
      return { ...state, phase: 'RESOLVE' };

    case 'START_COMBAT':
      return { ...state, phase: 'COMBAT' };

    case 'CANCEL_COMBAT':
      return { ...state, phase: 'ACTION_SELECT' };

    case 'RESOLVE_ACTIONS': {
      const res = action.resolution;
      const resolvedStats = { ...state.stats };
      if (res.statChanges) {
        for (const [key, val] of Object.entries(res.statChanges)) {
          if (val) {
            resolvedStats[key as keyof Stats] = Math.max(0, Math.min(100, resolvedStats[key as keyof Stats] + val));
          }
        }
      }
      let traits = [...state.traits];
      for (const t of [res.traitGained, ...(res.extraTraits ?? [])]) {
        if (t && !traits.some(x => x.id === t.id)) traits.push(t);
      }
      if (res.traitRemoved) traits = traits.filter(t => t.id !== res.traitRemoved);
      if (res.mateGained) traits = traits.filter(t => t.id !== 'grief');

      const flags = { ...state.flags };
      for (const f of res.flagsSet ?? []) if (!flags[f]) flags[f] = state.year;

      const packSize = Math.max(0, state.packSize + res.packChange);
      const arena = res.mainBreakdown?.arena;
      const runStats = {
        ...state.runStats,
        maxPack: Math.max(state.runStats.maxPack, packSize),
        enemiesDefeated: [...state.runStats.enemiesDefeated],
      };
      if (arena) {
        if (arena.result === 'victory') runStats.fightsWon++;
        else runStats.fightsLost++;
        runStats.perfectDodges += arena.perfectDodges;
        runStats.bestCombo = Math.max(runStats.bestCombo, arena.maxCombo);
        runStats.damageDealt += arena.damageDealt;
      } else if (res.combatOutcome) {
        if (res.combatOutcome === 'great_victory' || res.combatOutcome === 'minor_victory') runStats.fightsWon++;
        else runStats.fightsLost++;
      }
      if (res.combatOutcome === 'great_victory' || res.combatOutcome === 'minor_victory') {
        const foe = arena?.enemyName ?? ENEMIES[state.selectedMainAction?.enemy ?? 'rival']?.name;
        if (foe) runStats.enemiesDefeated.push(foe);
      }
      if (res.packChange < 0) runStats.packLost += -res.packChange;
      if (res.mateLost) runStats.matesLost++;
      if (res.checkResult === 'critical_success') runStats.critSuccesses++;
      if (res.checkResult === 'critical_failure') runStats.critFailures++;
      const mateName = res.mateGained ? randomMateName() : state.mateName;

      return {
        ...state,
        phase: 'DICE_ROLL',
        yearResolution: res,
        hp: clampResource(state.hp + res.hpChange),
        hunger: clampResource(state.hunger + res.hungerChange),
        hydration: clampResource(state.hydration + res.hydrationChange),
        packSize,
        hasMate: (state.hasMate && !res.mateLost) || !!res.mateGained,
        stats: resolvedStats,
        traits,
        flags,
        knowledge: state.knowledge + (res.knowledgeGain ?? 0),
        runStats,
        mateName,
        chronicle: [...state.chronicle, ...buildChronicle(state, res, mateName)],
      };
    }

    case 'ROLL_GROWTH': {
      const newTraits = [...state.traits];
      if (action.roll.bonusTrait && !newTraits.find(t => t.id === action.roll.bonusTrait!.id)) {
        newTraits.push(action.roll.bonusTrait);
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
      const notes: string[] = [];

      // 資源消耗（含季節與族群負擔）
      const consumption = applyConsumption(state);
      notes.push(...consumption.warnings);
      const newHunger = consumption.newHunger;
      const newHydration = consumption.newHydration;
      let newHp = clampResource(state.hp - consumption.hpPenalty + consumption.hpRegen);
      if (consumption.hpRegen > 0 && state.hp < 100) notes.push(`🩹 營養充足，傷口自然癒合：HP +${consumption.hpRegen}`);

      // 虛弱
      let traits = [...state.traits];
      const hasWeakness = traits.some(t => t.id === 'weakness');
      if (consumption.addWeakness && !hasWeakness) traits.push({ ...WEAKNESS_TRAIT });
      else if (!consumption.addWeakness && hasWeakness) traits = traits.filter(t => t.id !== 'weakness');

      // 負面詞條解除進度
      const rested = [state.selectedMainAction, state.selectedSubAction].some(a => a?.tags?.includes('rest'));
      const cure = progressTraitCures(traits, { rested, hunger: newHunger });
      traits = cure.traits;
      for (const name of cure.cured) notes.push(`✨ 負面詞條「${name}」已解除！`);

      // 族群：繁衍與離散
      const growth = tryPackGrowth(state);
      let packSize = state.packSize + growth.grew;
      if (growth.narrative) notes.push(`🥚 ${growth.narrative}`);
      const desert = checkPackDesertion(packSize, newHunger);
      if (desert.lost) {
        packSize -= desert.lost;
        notes.push(`😢 ${desert.narrative}`);
      }

      const runStats = {
        ...state.runStats,
        maxPack: Math.max(state.runStats.maxPack, packSize),
        births: state.runStats.births + growth.grew,
        packLost: state.runStats.packLost + desert.lost,
      };
      const chronicle = [...state.chronicle];
      if (growth.grew > 0) chronicle.push({ year: state.year, icon: '🐣', text: `巢中孵出了 ${growth.grew} 隻幼崽`, kind: 'pack' });
      if (desert.lost > 0) chronicle.push({ year: state.year, icon: '🍂', text: '飢荒中，一名族人離開了', kind: 'danger' });
      for (const name of cure.cured) chronicle.push({ year: state.year, icon: '🌿', text: `擺脫了「${name}」`, kind: 'trait' });

      if (newHp <= 0) {
        return {
          ...state,
          phase: 'GAME_OVER',
          hp: 0,
          hunger: newHunger,
          hydration: newHydration,
          year: newYear,
          traits,
          runStats,
          chronicle,
          deathCause: '你的恐龍因為傷重、飢餓或脫水而死亡了。',
        };
      }

      const season = rollSeason(newYear, state.maxYear);
      newHp = clampResource(newHp);

      const common = {
        ...state,
        year: newYear,
        hp: newHp,
        hunger: newHunger,
        hydration: newHydration,
        packSize,
        traits,
        season,
        runStats,
        chronicle,
        yearNotes: notes,
        bgColor: newBg,
        currentEvent: null,
        selectedMainAction: null,
        selectedSubAction: null,
        yearResolution: null,
        growthRoll: null,
      };

      if (newYear > state.maxYear) {
        return { ...common, phase: 'ENDGAME' };
      }
      return { ...common, phase: 'YEAR_EVENT' };
    }

    case 'SET_ENDING':
      return { ...state, endgame: action.summary, ending: action.summary.ending, phase: 'RESULT' };

    case 'GAME_OVER':
      return { ...state, phase: 'GAME_OVER', deathCause: action.cause };

    case 'RESTART':
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ========== Konami 秘技 ==========

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

// ========== App ==========

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE, initial => {
    const saved = loadCurrentRun();
    return saved ?? initial;
  });
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [secretUnlocked, setSecret] = useState(isSecretUnlocked());
  const [titlePanel, setTitlePanel] = useState<'achv' | 'archive' | null>(null);
  const togglePanel = (p: 'achv' | 'archive') => setTitlePanel(cur => (cur === p ? null : p));
  const showAchievements = titlePanel === 'achv';
  const showArchive = titlePanel === 'archive';
  const [tutorial, setTutorial] = useState<{ firstRun: boolean } | null>(null);
  const closeTutorial = (startGame: boolean) => {
    markTutorialSeen();
    setTutorial(null);
    if (startGame) dispatch({ type: 'START_GAME' });
  };
  const [archive, setArchive] = useState<ArchiveEntry[]>(() => loadArchive());
  const [openArchived, setOpenArchived] = useState<ArchiveEntry | null>(null);
  const toastId = useRef(0);
  const konamiIdx = useRef(0);
  const archivedThisRun = useRef(false);

  // 自動存檔：每次狀態變化都寫入 localStorage，離開太久、重新整理、
  // 分頁被系統回收後回來，都能接續原本的進度。
  useEffect(() => {
    saveCurrentRun(state);
  }, [state]);

  // 結局或死亡的當下，把這一局封存進歷代生涯檔案庫（一局只封存一次）
  useEffect(() => {
    if ((state.phase === 'RESULT' || state.phase === 'GAME_OVER') && !archivedThisRun.current) {
      archivedThisRun.current = true;
      archiveRun(state);
    } else if (state.phase === 'TITLE' || state.phase === 'SPECIES_SELECT') {
      archivedThisRun.current = false;
      setArchive(loadArchive());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const toast = useCallback((text: string) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  const announce = useCallback((ids: string[]) => {
    for (const id of unlock(ids)) {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) toast(`🏆 成就解鎖：${a.icon} ${a.name}`);
    }
  }, [toast]);

  // 背景色
  useEffect(() => {
    document.body.style.backgroundColor = state.bgColor;
  }, [state.bgColor]);

  // 產生事件
  useEffect(() => {
    if (state.phase === 'YEAR_EVENT' && !state.currentEvent && state.species) {
      const event = generateEvent(state);
      dispatch({ type: 'SET_EVENT', event });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentEvent, state.species]);

  // 人生歷程成就
  useEffect(() => {
    if (state.species) announce(lifeAchievements(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.flags, state.runStats.maxPack, state.species]);

  // Konami 秘技：標題畫面輸入 ↑↑↓↓←→←→BA
  useEffect(() => {
    if (state.phase !== 'TITLE' && state.phase !== 'SPECIES_SELECT') return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === KONAMI[konamiIdx.current]) {
        konamiIdx.current += 1;
        if (konamiIdx.current === KONAMI.length) {
          konamiIdx.current = 0;
          setSecretUnlocked();
          setSecret(true);
          toast('🐔 咕咕！隱藏物種「時空迷途的雞」已解鎖！');
        }
      } else {
        konamiIdx.current = k === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, toast]);

  // ========== Handlers ==========

  const finishYear = useCallback((arena?: ArenaOutcome) => {
    const out = resolveYear(state, arena);
    if (out.gameOverCause) {
      dispatch({ type: 'GAME_OVER', cause: out.gameOverCause });
      return;
    }
    dispatch({ type: 'RESOLVE_ACTIONS', resolution: out.resolution });
    dispatch({ type: 'ROLL_GROWTH', roll: out.growth });
  }, [state]);

  const handleConfirmActions = useCallback(() => {
    const main = state.selectedMainAction;
    if (!main) return;
    if (main.isCombat) {
      dispatch({ type: 'START_COMBAT' });
      return;
    }
    dispatch({ type: 'CONFIRM_ACTIONS' });
    finishYear();
  }, [state.selectedMainAction, finishYear]);

  const handleCombatEnd = useCallback((o: ArenaOutcome) => {
    announce(arenaAchievements(o, state.selectedMainAction?.enemy));
    finishYear(o);
  }, [announce, finishYear, state.selectedMainAction]);

  const handleAutoCombat = useCallback(() => {
    finishYear();
  }, [finishYear]);

  const handleContinueFromDice = useCallback(() => {
    if (state.hp <= 0) {
      dispatch({ type: 'GAME_OVER', cause: '你的恐龍因傷重而死亡了。' });
      return;
    }
    dispatch({ type: 'ENTER_STAT_ALLOCATE' });
  }, [state.hp]);

  const handleAllocateStats = useCallback((allocation: Partial<Stats>) => {
    dispatch({ type: 'ALLOCATE_STATS', allocation });
    setTimeout(() => dispatch({ type: 'ADVANCE_YEAR' }), 100);
  }, []);

  const handleRestart = useCallback(() => dispatch({ type: 'RESTART' }), []);

  const handleEnding = useCallback((summary: EndgameSummary) => {
    for (const id of summary.newAchievements) {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) toast(`🏆 成就解鎖：${a.icon} ${a.name}`);
    }
    dispatch({ type: 'SET_ENDING', summary });
  }, [toast]);

  // ========== Render ==========

  const toastLayer = (
    <div className="toast-layer">
      {toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}
    </div>
  );

  let screen: JSX.Element;

  if (state.phase === 'TITLE') {
    const unlocked = loadAchievements();
    screen = (
      <TitleScene>
        <div className="ts-countdown"><span>距離撞擊</span><b>25</b><span>年</span></div>
        <h1 className="ts-title" aria-label="恐龍人生模擬器">
          {'恐龍人生模擬器'.split('').map((c, i) => (
            <span key={i} aria-hidden="true" style={{ '--i': i } as React.CSSProperties}>{c}</span>
          ))}
        </h1>
        <div className="ts-en">DINOLIFE SIMULATOR</div>
        <div className="ts-spacer" />
        <div className="ts-start-wrap">
          <button
            className="ts-start"
            onClick={() => (tutorialSeen() ? dispatch({ type: 'START_GAME' }) : setTutorial({ firstRun: true }))}
          >
            開始遊戲
          </button>
        </div>
        <div className="ts-row">
          <button className="ts-slab" onClick={() => setTutorial({ firstRun: false })}>{TitleIcons.guide}玩法</button>
          <button className={`ts-slab ${showAchievements ? 'active' : ''}`} onClick={() => togglePanel('achv')}>
            {TitleIcons.achv}成就 {unlocked.length}/{ACHIEVEMENTS.length}
          </button>
          <button className={`ts-slab ${showArchive ? 'active' : ''}`} onClick={() => togglePanel('archive')}>
            {TitleIcons.archive}檔案庫{archive.length > 0 ? ` ${archive.length}` : ''}
          </button>
        </div>
        <p className="ts-foot">
          {secretUnlocked ? '有什麼東西從未來穿越回來了……' : '傳說，記得古老密碼的人，能找到一隻迷路的生物。'}
        </p>
        {(showAchievements || showArchive) && (
          <div className="ts-sheet-backdrop" onClick={() => setTitlePanel(null)}>
            <div className="ts-sheet" role="dialog" aria-label={showAchievements ? '成就' : '生涯檔案庫'} onClick={e => e.stopPropagation()}>
              <div className="ts-sheet-head">
                <span>{showAchievements ? `成就 ${unlocked.length}/${ACHIEVEMENTS.length}` : '生涯檔案庫'}</span>
                <button onClick={() => setTitlePanel(null)}>關閉</button>
              </div>
              <div className="ts-sheet-body">
                {showAchievements && (
                <div className="achv-grid card fade-in">
                  {ACHIEVEMENTS.map(a => {
                    const got = unlocked.includes(a.id);
                    return (
                      <div key={a.id} className={`achv-item ${got ? 'got' : ''}`}>
                        <span className="achv-icon">{got || !a.secret ? a.icon : '❔'}</span>
                        <div>
                          <div className="achv-name">{got || !a.secret ? a.name : '？？？'}</div>
                          <div className="achv-desc">{got || !a.secret ? a.desc : '隱藏成就'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
                {showArchive && (
                <div className="archive-list card fade-in">
                  {archive.length === 0 ? (
                    <div className="archive-empty">還沒有任何一局結束或死亡——你的第一份生涯檔案會出現在這裡。</div>
                  ) : (
                    archive.map(entry => {
                      const s = entry.state;
                      const ended = s.phase === 'RESULT' && s.endgame;
                      const outcome = ended
                        ? { total_wipe: '☄️ 全軍覆沒', lone_survivor: '🦖 孤獨倖存', pack_survives: '🌅 族群延續', legend: '🌟 傳說結局' }[s.endgame!.ending]
                        : `💀 第 ${s.year} 年身故`;
                      return (
                        <div key={entry.id} className="archive-item">
                          <button className="archive-open" onClick={() => setOpenArchived(entry)}>
                            <span className="archive-emoji">{s.species?.emoji ?? '🦕'}</span>
                            <span className="archive-info">
                              <span className="archive-name">{s.species?.name}「{s.dinoName || '無名者'}」</span>
                              <span className="archive-meta">
                                {outcome}　·　{new Date(entry.savedAt).toLocaleDateString('zh-TW')}
                              </span>
                            </span>
                          </button>
                          <button
                            className="archive-del"
                            aria-label="刪除這份檔案"
                            onClick={() => {
                              deleteArchiveEntry(entry.id);
                              setArchive(loadArchive());
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                )}
              </div>
            </div>
          </div>
        )}
        {tutorial && <Tutorial firstRun={tutorial.firstRun} onClose={closeTutorial} />}
        {openArchived && <ReportOverlay state={openArchived.state} onClose={() => setOpenArchived(null)} />}
      </TitleScene>
    );
  } else if (state.phase === 'SPECIES_SELECT') {
    screen = <SpeciesSelect onSelect={(sp: Species) => dispatch({ type: 'SELECT_SPECIES', species: sp })} showSecret={secretUnlocked} />;
  } else if (state.phase === 'GAME_OVER') {
    screen = (
      <GameOver
        cause={state.deathCause || '未知原因'}
        year={state.year}
        speciesName={state.species?.name || '恐龍'}
        state={state}
        onRestart={handleRestart}
      />
    );
  } else if (state.phase === 'ENDGAME' || state.phase === 'RESULT') {
    screen = <EndGame state={state} onEnding={handleEnding} onRestart={handleRestart} onArenaAchievements={announce} />;
  } else {
    screen = (
      <GameBoard
        state={state}
        onSelectMain={(a: GameAction) => dispatch({ type: 'SELECT_MAIN_ACTION', action: a })}
        onSelectSub={(a: GameAction | null) => dispatch({ type: 'SELECT_SUB_ACTION', action: a })}
        onConfirmActions={handleConfirmActions}
        onContinueFromDice={handleContinueFromDice}
        onAllocateStats={handleAllocateStats}
        onCombatEnd={handleCombatEnd}
        onAutoCombat={handleAutoCombat}
        onCancelCombat={() => dispatch({ type: 'CANCEL_COMBAT' })}
      />
    );
  }

  return (
    <ErrorBoundary
      fallback={retry => (
        <div className="crash-screen">
          <div className="skull">💀</div>
          <h2>發生了未預期的錯誤</h2>
          <p>遊戲畫面暫時無法顯示。你已結束的每一局生涯報告都安全地保存在「生涯檔案庫」裡，不會遺失。</p>
          <div className="crash-actions">
            <button
              className="restart-btn"
              onClick={() => {
                clearCurrentRun();
                window.location.reload();
              }}
            >
              放棄這局，回到標題
            </button>
            <button className="achv-btn" onClick={retry}>再試一次</button>
          </div>
        </div>
      )}
    >
      {screen}
      {toastLayer}
    </ErrorBoundary>
  );
}
