import { lazy, Suspense } from 'react';
import { GameState, GameAction, Stats, ArenaOutcome } from '../engine/types';
import StatusBar from './StatusBar';
import StatsPanel from './StatsPanel';
import TraitList from './TraitList';
import EventNarrative from './EventNarrative';
import ActionPanel from './ActionPanel';
import DiceResult from './DiceResult';
import StatAllocation from './StatAllocation';
import { SEASONS } from '../engine/seasons';
import { describePackBonuses, getPackCheckBonus } from '../engine/pack';
import { buildArenaConfig, envForAction } from '../combat/config';
import './GameBoard.css';

const CombatArena = lazy(() => import('./CombatArena'));

interface Props {
  state: GameState;
  onSelectMain: (action: GameAction) => void;
  onSelectSub: (action: GameAction | null) => void;
  onConfirmActions: () => void;
  onContinueFromDice: () => void;
  onAllocateStats: (allocation: Partial<Stats>) => void;
  onCombatEnd: (outcome: ArenaOutcome) => void;
  onAutoCombat: () => void;
  onCancelCombat: () => void;
}

export default function GameBoard({
  state,
  onSelectMain,
  onSelectSub,
  onConfirmActions,
  onContinueFromDice,
  onAllocateStats,
  onCombatEnd,
  onAutoCombat,
  onCancelCombat,
}: Props) {
  const { species, year, maxYear, hp, hunger, hydration, stats, traits, packSize, hasMate } = state;

  if (!species) return null;

  const season = SEASONS[state.season];
  const combatAction = state.phase === 'COMBAT' ? state.selectedMainAction : null;
  const packIcons = Math.min(packSize, 12);

  return (
    <div className={`game-board ${state.phase === 'COMBAT' ? 'in-combat' : ''}`}>
      <div className="game-content">
        {/* 左欄：狀態面板 */}
        <div className="sidebar">
          <div className="card game-header">
            <div>
              <div className="year-info">第 {year} 年</div>
              <div className="species-info">
                <span>{species.emoji}</span>
                <span>{species.name}</span>
              </div>
            </div>
            <div className="header-right">
              <div className="countdown">末日倒數：{maxYear - year} 年</div>
              <div className="season-badge" title={season.desc}>{season.emoji} {season.name}</div>
            </div>
          </div>

          <div className="card status-bars">
            <StatusBar label="生命" value={hp} max={100} type="hp" />
            <StatusBar label="飽食" value={hunger} max={100} type="hunger" />
            <StatusBar label="水分" value={hydration} max={100} type="hydration" />
          </div>

          <div className="card">
            <StatsPanel stats={stats} traits={traits} hunger={hunger} />
          </div>

          <div className="card">
            <div className="pack-info">
              <span>{hasMate ? '💕 有伴侶' : '💔 無伴侶'}</span>
              <span>🦕 族群：{packSize} 隻</span>
              <span title="古生物知識：末日審判時可用來排除錯誤答案">📖 知識：{state.knowledge}</span>
            </div>
            {packSize > 0 && (
              <div className="pack-icons">
                {Array.from({ length: packIcons }).map((_, i) => <span key={i}>{species.emoji}</span>)}
                {packSize > packIcons && <span className="pack-more">+{packSize - packIcons}</span>}
              </div>
            )}
            <ul className="pack-bonus">
              {describePackBonuses(state).map(b => <li key={b}>{b}</li>)}
            </ul>
            <div style={{ marginTop: '0.5rem' }}>
              <TraitList traits={traits} />
            </div>
          </div>

          {state.phase === 'STAT_ALLOCATE' && (
            <StatAllocation
              currentStats={stats}
              points={state.unallocatedPoints}
              onConfirm={onAllocateStats}
            />
          )}
        </div>

        {/* 右欄：事件 + 行動 + 擲骰結果 */}
        <div className="main-area">
          {(state.phase === 'YEAR_EVENT' || state.phase === 'ACTION_SELECT') && state.currentEvent && (
            <>
              {state.yearNotes.length > 0 && (
                <div className="card year-notes fade-in">
                  {state.yearNotes.map((n, i) => <div key={i}>{n}</div>)}
                </div>
              )}
              <EventNarrative event={state.currentEvent} year={year} />
              <ActionPanel
                mainActions={state.currentEvent.mainActions}
                subActions={state.currentEvent.subActions}
                selectedMain={state.selectedMainAction}
                selectedSub={state.selectedSubAction}
                stats={stats}
                traits={traits}
                hunger={hunger}
                packBonus={getPackCheckBonus(packSize)}
                eventTags={state.currentEvent.tags}
                onSelectMain={onSelectMain}
                onSelectSub={onSelectSub}
                onConfirm={onConfirmActions}
              />
            </>
          )}

          {combatAction && combatAction.threatDC && (
            <Suspense fallback={<div className="card">載入 3D 戰場中…</div>}><CombatArena
              config={buildArenaConfig(state, combatAction.enemy, combatAction.threatDC, envForAction(state, combatAction))}
              title={combatAction.label}
              speciesPassive={species.combatPassive}
              onFinish={onCombatEnd}
              onAutoResolve={onAutoCombat}
              onCancel={onCancelCombat}
            /></Suspense>
          )}

          {(state.phase === 'RESOLVE' || state.phase === 'DICE_ROLL') && state.yearResolution && state.growthRoll && (
            <DiceResult
              resolution={state.yearResolution}
              growthRoll={state.growthRoll}
              onContinue={onContinueFromDice}
            />
          )}
        </div>
      </div>
    </div>
  );
}
