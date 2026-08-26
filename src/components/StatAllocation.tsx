import { useState } from 'react';
import { Stats, StatKey } from '../engine/types';

const STAT_LABELS: Record<StatKey, string> = {
  str: '力量',
  agi: '敏捷',
  int: '智力',
  cha: '魅力',
};

interface Props {
  currentStats: Stats;
  points: number;
  onConfirm: (allocation: Partial<Stats>) => void;
}

export default function StatAllocation({ currentStats, points, onConfirm }: Props) {
  const [alloc, setAlloc] = useState<Record<StatKey, number>>({
    str: 0, agi: 0, int: 0, cha: 0,
  });

  const remaining = points - Object.values(alloc).reduce((a, b) => a + b, 0);

  const adjust = (stat: StatKey, delta: number) => {
    setAlloc(prev => {
      const newVal = prev[stat] + delta;
      if (newVal < 0) return prev;
      const newTotal = Object.values(prev).reduce((a, b) => a + b, 0) + delta;
      if (newTotal > points) return prev;
      if (currentStats[stat] + newVal > 100) return prev;
      return { ...prev, [stat]: newVal };
    });
  };

  const handleConfirm = () => {
    const result: Partial<Stats> = {};
    for (const key of Object.keys(alloc) as StatKey[]) {
      if (alloc[key] > 0) result[key] = alloc[key];
    }
    onConfirm(result);
  };

  return (
    <div className="card stat-allocation fade-in">
      <h3>分配屬性點</h3>
      <div className="points-remaining">剩餘點數：{remaining}</div>
      <div className="alloc-grid">
        {(Object.keys(STAT_LABELS) as StatKey[]).map((key) => (
          <div key={key} className="alloc-row">
            <span className="alloc-label">{STAT_LABELS[key]}</span>
            <span className="alloc-current">{currentStats[key]}</span>
            <button className="alloc-btn" onClick={() => adjust(key, -1)} disabled={alloc[key] <= 0}>
              -
            </button>
            <span className="alloc-add">+{alloc[key]}</span>
            <button className="alloc-btn" onClick={() => adjust(key, 1)} disabled={remaining <= 0 || currentStats[key] + alloc[key] >= 100}>
              +
            </button>
          </div>
        ))}
      </div>
      <button
        className="alloc-confirm-btn"
        onClick={handleConfirm}
        disabled={remaining > 0}
      >
        {remaining > 0 ? `還有 ${remaining} 點未分配` : '確認分配'}
      </button>
    </div>
  );
}
