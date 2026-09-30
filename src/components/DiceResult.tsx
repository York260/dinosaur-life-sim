import { useState, useEffect } from 'react';
import { YearResolution, GrowthRoll, CheckResult, ActionBreakdown, StatKey, Stats } from '../engine/types';

const RESULT_LABELS: Record<CheckResult, string> = {
  critical_success: '大成功！',
  success: '成功',
  failure: '失敗',
  critical_failure: '大失敗！',
};

const RESULT_COLORS: Record<CheckResult, string> = {
  critical_success: 'critical-success',
  success: 'success',
  failure: 'failure',
  critical_failure: 'critical-failure',
};

const STAT_NAMES: Record<StatKey, string> = {
  str: '力量',
  agi: '敏捷',
  int: '智力',
  cha: '魅力',
};

const COMBAT_LABELS: Record<string, string> = {
  great_victory: '大勝',
  minor_victory: '小勝',
  defeat: '失敗',
  catastrophic_defeat: '慘敗',
};

// Animated dice number component
function AnimatedDice({ value, colorClass }: { value: number; colorClass: string }) {
  const [display, setDisplay] = useState(Math.floor(Math.random() * 20) + 1);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);
    const interval = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 20) + 1);
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setDisplay(value);
      setSettled(true);
    }, 800);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [value]);

  return (
    <span className={`breakdown-roll ${colorClass} ${settled ? 'dice-settled' : 'dice-spinning'}`}>
      {display}
    </span>
  );
}

// Format a net change value with sign and color
function NetChange({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  const cls = value > 0 ? 'positive' : 'negative';
  return (
    <span className={`net-change-item ${cls}`}>
      {label} {value > 0 ? '+' : ''}{value}
    </span>
  );
}

// Format stat changes
function StatChanges({ changes }: { changes?: Partial<Stats> }) {
  if (!changes) return null;
  const entries = Object.entries(changes).filter(([, v]) => v && v !== 0);
  if (entries.length === 0) return null;
  return (
    <>
      {entries.map(([key, val]) => (
        <span key={key} className={`net-change-item ${val! > 0 ? 'positive' : 'negative'}`}>
          {STAT_NAMES[key as StatKey]} {val! > 0 ? '+' : ''}{val}
        </span>
      ))}
    </>
  );
}

// Simplified action result block
function ActionResultBlock({
  breakdown,
  isSubAction,
  traitGained,
  extras,
}: {
  breakdown: ActionBreakdown;
  isSubAction?: boolean;
  traitGained?: { name: string; description: string; isPositive: boolean } | null;
  extras?: { name: string; isPositive: boolean }[];
}) {
  const resultColor = RESULT_COLORS[breakdown.checkResult];
  const resultLabel = breakdown.isCombat && breakdown.combatOutcome
    ? COMBAT_LABELS[breakdown.combatOutcome]
    : RESULT_LABELS[breakdown.checkResult];
  const isPass = breakdown.checkResult === 'success' || breakdown.checkResult === 'critical_success';

  // Calculate adjusted threshold: dc - statBonus - traitBonus
  // The player's roll needs to exceed this number
  const adjustedThreshold = breakdown.dc - breakdown.statBonus - breakdown.traitBonus
    - (breakdown.packBonus ?? 0)
    - (breakdown.isCombat && breakdown.combatPackBonus ? breakdown.combatPackBonus : 0);
  const arena = breakdown.arena;

  // Net resource changes (gain - cost)
  const netHunger = breakdown.hungerChange - breakdown.resourceCost.hunger;
  const netHydration = breakdown.hydrationChange - breakdown.resourceCost.hydration;

  return (
    <div className="action-result-block card fade-in">
      <div className="action-result-header">
        <span className="action-result-title">
          {isSubAction ? '副行動' : '主行動'}：{breakdown.actionLabel}
        </span>
      </div>

      {/* 3D 戰鬥統計 */}
      {arena && (
        <div className="arena-summary">
          <div><b>{arena.damageDealt}</b><span>造成傷害</span></div>
          <div><b>{arena.hpLost}</b><span>承受傷害</span></div>
          <div><b>{arena.maxCombo}</b><span>最高連擊</span></div>
          <div><b>{arena.perfectDodges}</b><span>完美閃避</span></div>
        </div>
      )}

      {/* Dice vs Threshold */}
      {!arena && <div className="result-dice-vs">
        <div className="dice-vs-col">
          <AnimatedDice value={breakdown.roll} colorClass={resultColor} />
          <span className="dice-vs-label">你的骰子</span>
        </div>
        <span className="dice-vs-text">vs</span>
        <div className="dice-vs-col">
          <span className="dice-vs-threshold">{adjustedThreshold}</span>
          <span className="dice-vs-label">門檻</span>
        </div>
      </div>}
      {!arena && (breakdown.packBonus ?? 0) > 0 && (
        <div className="breakdown-note">🦕 族群幫忙 +{breakdown.packBonus}</div>
      )}

      {/* Big success/fail result */}
      <div className={`result-verdict ${isPass ? 'verdict-pass' : 'verdict-fail'}`}>
        {isPass ? '✅' : '❌'} {resultLabel}
      </div>

      {/* Narrative */}
      <div className="breakdown-narrative">{breakdown.narrative}</div>

      {/* Net resource changes - single row */}
      <div className="net-changes">
        <NetChange label="HP" value={breakdown.hpChange} />
        <NetChange label="飽食" value={netHunger} />
        <NetChange label="水分" value={netHydration} />
        <NetChange label="族群" value={breakdown.packChange} />
        <StatChanges changes={breakdown.statChanges} />
        {traitGained && (
          <span className={`net-change-item ${traitGained.isPositive ? 'positive' : 'negative'}`}>
            詞條：{traitGained.name}
          </span>
        )}
        {extras?.map(t => (
          <span key={t.name} className={`net-change-item ${t.isPositive ? 'positive' : 'negative'}`}>
            詞條：{t.name}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  resolution: YearResolution;
  growthRoll: GrowthRoll;
  onContinue: () => void;
}

export default function DiceResult({ resolution, growthRoll, onContinue }: Props) {
  const hasBreakdowns = !!resolution.mainBreakdown;

  // Fallback: old-style display when no breakdown data
  if (!hasBreakdowns) {
    return (
      <div className="card dice-result fade-in">
        <div className={`dice-number ${RESULT_COLORS[resolution.checkResult]}`}>
          {resolution.roll}
        </div>
        <div className="dice-label">{RESULT_LABELS[resolution.checkResult]}</div>
        <div className="dice-narrative">{resolution.actionNarrative}</div>

        {resolution.combatOutcome && (
          <div className="dice-detail" style={{ fontWeight: 700 }}>
            {COMBAT_LABELS[resolution.combatOutcome]}
          </div>
        )}

        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
          {resolution.hpChange !== 0 && <span>HP {resolution.hpChange > 0 ? '+' : ''}{resolution.hpChange} </span>}
          {resolution.hungerChange !== 0 && <span>飽食 {resolution.hungerChange > 0 ? '+' : ''}{resolution.hungerChange} </span>}
          {resolution.hydrationChange !== 0 && <span>水分 {resolution.hydrationChange > 0 ? '+' : ''}{resolution.hydrationChange} </span>}
          {resolution.packChange !== 0 && <span>族群 {resolution.packChange > 0 ? '+' : ''}{resolution.packChange} </span>}
        </div>

        {resolution.traitGained && (
          <div style={{ fontSize: '0.85rem', color: resolution.traitGained.isPositive ? '#27ae60' : '#e74c3c', fontWeight: 700 }}>
            {resolution.traitGained.isPositive ? '獲得正面詞條' : '獲得負面詞條'}：{resolution.traitGained.name} — {resolution.traitGained.description}
          </div>
        )}

        <div className="growth-roll">
          <div className="growth-title">
            成長擲骰：{growthRoll.roll}
            {growthRoll.isCritical && ' (大成功！)'}
          </div>
          <div className="growth-points">+{growthRoll.points} 屬性點</div>
          {growthRoll.bonusTrait && (
            <div style={{ fontSize: '0.85rem', color: '#27ae60', fontWeight: 700, marginTop: '0.3rem' }}>
              大成功額外獲得詞條：{growthRoll.bonusTrait.name}
            </div>
          )}
        </div>

        <button className="dice-continue-btn" onClick={onContinue}>
          分配屬性點
        </button>
      </div>
    );
  }

  // Simplified visual breakdown display
  return (
    <div className="dice-result-container fade-in">
      {/* Main action breakdown */}
      {resolution.mainBreakdown && (
        <ActionResultBlock
          breakdown={resolution.mainBreakdown}
          traitGained={!resolution.subBreakdown ? resolution.traitGained : null}
          extras={!resolution.subBreakdown ? resolution.extraTraits : undefined}
        />
      )}

      {/* Sub action breakdown */}
      {resolution.subBreakdown && (
        <ActionResultBlock
          breakdown={resolution.subBreakdown}
          isSubAction
          traitGained={resolution.traitGained}
          extras={resolution.extraTraits}
        />
      )}

      {(resolution.mateGained || resolution.mateLost || resolution.traitRemoved || (resolution.knowledgeGain ?? 0) > 0) && (
        <div className="card life-notes fade-in">
          {resolution.mateGained && <div>💕 找到伴侶了！吃飽喝足時族群會長大</div>}
          {resolution.mateLost && <div>💔 失去了伴侶……</div>}
          {resolution.traitRemoved && <div>✨ 壞狀態解除了！</div>}
          {(resolution.knowledgeGain ?? 0) > 0 && <div>📖 知識 +{resolution.knowledgeGain}</div>}
        </div>
      )}

      {/* Trait gained/removed - show separately only if not shown in action blocks */}
      {resolution.traitGained && !resolution.mainBreakdown && (
        <div className="card trait-change-card fade-in">
          <div style={{
            fontSize: '0.9rem',
            color: resolution.traitGained.isPositive ? '#27ae60' : '#e74c3c',
            fontWeight: 700,
            padding: '0.8rem',
          }}>
            {resolution.traitGained.isPositive ? '獲得正面詞條' : '獲得負面詞條'}：
            {resolution.traitGained.name} — {resolution.traitGained.description}
          </div>
        </div>
      )}

      {/* Growth roll */}
      <div className="action-result-block card fade-in growth-block">
        <div className="action-result-header">
          <span className="action-result-title">成長擲骰</span>
          {growthRoll.isCritical && (
            <span className="action-result-badge critical-success">大成功！</span>
          )}
        </div>
        <div className="breakdown-row growth-dice-row">
          <AnimatedDice
            value={growthRoll.roll}
            colorClass={growthRoll.isCritical ? 'critical-success' : 'success'}
          />
          <span className="breakdown-op">&rarr;</span>
          <span className="growth-points-inline">+{growthRoll.points} 屬性點</span>
        </div>
        {growthRoll.bonusTrait && (
          <div style={{ fontSize: '0.85rem', color: '#27ae60', fontWeight: 700, padding: '0 0.8rem 0.5rem' }}>
            額外獲得：{growthRoll.bonusTrait.name}
          </div>
        )}
      </div>

      <div className="dice-continue-wrap">
        <button className="dice-continue-btn" onClick={onContinue}>
          分配屬性點
        </button>
      </div>
    </div>
  );
}
