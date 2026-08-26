import { Stats, Trait, StatKey } from '../engine/types';
import { getEffectiveStat } from '../engine/traits';

const STAT_LABELS: Record<StatKey, string> = {
  str: '力量',
  agi: '敏捷',
  int: '智力',
  cha: '魅力',
};

interface Props {
  stats: Stats;
  traits: Trait[];
  hunger: number;
}

export default function StatsPanel({ stats, traits, hunger }: Props) {
  return (
    <div className="stats-panel">
      {(Object.keys(STAT_LABELS) as StatKey[]).map((key) => {
        const base = stats[key];
        const effective = getEffectiveStat(base, key, traits, hunger);
        const diff = effective - base;
        return (
          <div key={key} className="stat-item">
            <div className="stat-name">{STAT_LABELS[key]}</div>
            <div className="stat-value">
              {effective}
              {diff !== 0 && (
                <span style={{ fontSize: '0.6rem', color: diff > 0 ? '#27ae60' : '#e74c3c', marginLeft: 2 }}>
                  ({diff > 0 ? '+' : ''}{diff})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
