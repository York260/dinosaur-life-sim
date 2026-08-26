import { GameAction, StatKey, Trait } from '../engine/types';
import { calculateSuccessRate } from '../engine/dice';
import { getEffectiveStat } from '../engine/traits';

const STAT_LABELS: Record<StatKey, string> = {
  str: '力量',
  agi: '敏捷',
  int: '智力',
  cha: '魅力',
};

function getCostLevel(action: GameAction): { label: string; className: string } {
  const total = action.resourceCost.hunger + action.resourceCost.hydration;
  if (total <= 10) return { label: '消耗：低', className: 'cost-low' };
  if (total <= 20) return { label: '消耗：中', className: 'cost-mid' };
  return { label: '消耗：高', className: 'cost-high' };
}

interface Props {
  action: GameAction;
  stats: Record<StatKey, number>;
  traits: Trait[];
  hunger: number;
  selected: boolean;
  dcPenalty?: number;
  onClick: () => void;
}

export default function ActionCard({ action, stats, traits, hunger, selected, dcPenalty = 0, onClick }: Props) {
  const effectiveStat = getEffectiveStat(stats[action.primaryStat], action.primaryStat, traits, hunger);
  const dc = action.dc + dcPenalty;
  const successRate = calculateSuccessRate(effectiveStat, dc, traits, action.primaryStat);
  const costLevel = getCostLevel(action);

  const ringColor = successRate >= 70 ? '#27ae60' : successRate >= 40 ? '#f39c12' : '#e74c3c';
  const circumference = 2 * Math.PI * 19;
  const strokeDash = (successRate / 100) * circumference;

  return (
    <div className={`card action-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="action-info">
        <div className="action-label">
          {action.label}
          {action.isCombat && ' [戰鬥]'}
        </div>
        <div className="action-desc">{action.description}</div>
        <div className="action-stat">
          {STAT_LABELS[action.primaryStat]} 判定 | 難度 {dc}
          {dcPenalty > 0 && <span style={{ color: '#e74c3c' }}> (+{dcPenalty} 副行動懲罰)</span>}
          <span className={`cost-tag ${costLevel.className}`}>{costLevel.label}</span>
        </div>
      </div>
      <div className="success-ring" style={{ color: ringColor }}>
        <svg width="48" height="48">
          <circle cx="24" cy="24" r="19" fill="none" stroke="#e8e8e8" strokeWidth="4" />
          <circle
            cx="24" cy="24" r="19"
            fill="none"
            stroke={ringColor}
            strokeWidth="4"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="ring-text">{successRate}%</span>
      </div>
    </div>
  );
}
