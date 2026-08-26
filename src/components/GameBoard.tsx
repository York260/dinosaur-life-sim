import { GameState, GameAction, Stats, YearResolution, GrowthRoll } from '../engine/types';
import StatusBar from './StatusBar';
import StatsPanel from './StatsPanel';
import TraitList from './TraitList';
import EventNarrative from './EventNarrative';
import ActionPanel from './ActionPanel';
import DiceResult from './DiceResult';
import StatAllocation from './StatAllocation';
import './GameBoard.css';

interface Props {
  state: GameState;
  onSelectMain: (action: GameAction) => void;
  onSelectSub: (action: GameAction | null) => void;
  onConfirmActions: () => void;
  onContinueFromDice: () => void;
  onAllocateStats: (allocation: Partial<Stats>) => void;
}

export default function GameBoard({
  state,
  onSelectMain,
  onSelectSub,
  onConfirmActions,
  onContinueFromDice,
  onAllocateStats,
}: Props) {
  const { species, year, maxYear, hp, hunger, hydration, stats, traits, packSize, hasMate } = state;

  if (!species) return null;

  return (
    <div className="game-board">
      {/* 雙欄容器 */}
      <div className="game-content">
        {/* 左欄：狀態面板 */}
        <div className="sidebar">
          {/* Header */}
          <div className="card game-header">
            <div>
              <div className="year-info">第 {year} 年</div>
              <div className="species-info">
                <span>{species.emoji}</span>
                <span>{species.name}</span>
              </div>
            </div>
            <div className="countdown">
              末日倒數：{maxYear - year} 年
            </div>
          </div>

          {/* Status Bars */}
          <div className="card status-bars">
            <StatusBar label="生命" value={hp} max={100} type="hp" />
            <StatusBar label="飽食" value={hunger} max={100} type="hunger" />
            <StatusBar label="水分" value={hydration} max={100} type="hydration" />
          </div>

          {/* Stats */}
          <div className="card">
            <StatsPanel stats={stats} traits={traits} hunger={hunger} />
          </div>

          {/* Pack & Traits */}
          <div className="card">
            <div className="pack-info">
              <span>{hasMate ? '💕 有伴侶' : '💔 無伴侶'}</span>
              <span>🦕 族群：{packSize} 隻</span>
            </div>
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
              <EventNarrative narrative={state.currentEvent.narrative} year={year} />
              <ActionPanel
                mainActions={state.currentEvent.mainActions}
                subActions={state.currentEvent.subActions}
                selectedMain={state.selectedMainAction}
                selectedSub={state.selectedSubAction}
                stats={stats}
                traits={traits}
                hunger={hunger}
                onSelectMain={onSelectMain}
                onSelectSub={onSelectSub}
                onConfirm={onConfirmActions}
              />
            </>
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
