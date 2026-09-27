import { GameAction, StatKey, Trait } from '../engine/types';
import { calculateSuccessRate, getActionCondition } from '../engine/dice';
import { getEffectiveStat } from '../engine/traits';
import { ENEMIES } from '../engine/enemies';

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
  packBonus?: number;
  eventTags?: string[];
  onClick: () => void;
}

export default function ActionCard({
  action, stats, traits, hunger, selected, dcPenalty = 0, packBonus = 0, eventTags, onClick,
}: Props) {
  const costLevel = getCostLevel(action);

  // 3D 戰鬥：顯示敵人資訊而非成功率
  if (action.isCombat) {
    const enemy = ENEMIES[action.enemy || 'rival'];
    return (
      <div className={`card action-card combat ${selected ? 'selected' : ''}`} onClick={onClick}>
        <div className="action-info">
          <div className="action-label">⚔️ {action.label}</div>
          <div className="action-desc">{action.description}</div>
          <div className="action-stat">
            3D 即時戰鬥｜對手：<b>{enemy?.name ?? '未知'}</b>｜威脅 {action.threatDC}
            <span className={`cost-tag ${costLevel.className}`}>{costLevel.label}</span>
          </div>
        </div>
        <div className="combat-badge">3D</div>
      </div>
    );
  }

  const effectiveStat = getEffectiveStat(stats[action.primaryStat], action.primaryStat, traits, hunger);
  const dc = action.dc + dcPenalty;
  const condition = getActionCondition(action.tags, eventTags);
  const successRate = calculateSuccessRate(effectiveStat, dc, traits, action.primaryStat, condition, packBonus);

  const ringColor = successRate >= 70 ? '#27ae60' : successRate >= 40 ? '#f39c12' : '#e74c3c';
  const circumference = 2 * Math.PI * 19;
  const strokeDash = (successRate / 100) * circumference;
  const req = action.requires;

  return (
    <div className={`card action-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="action-info">
        <div className="action-label">
          {action.label}
          {req?.minPack && <span className="req-tag">🦕 族群</span>}
          {req?.mate && <span className="req-tag">💕 伴侶</span>}
          {action.tags?.includes('rest') && <span className="req-tag rest">休養</span>}
          {action.tags?.includes('study') && <span className="req-tag study">📖</span>}
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
