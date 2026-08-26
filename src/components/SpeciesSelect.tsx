import { Species } from '../engine/types';
import { SPECIES_LIST } from '../engine/species';
import './SpeciesSelect.css';

const DIET_LABELS: Record<string, string> = {
  carnivore: '肉食',
  herbivore: '草食',
  omnivore: '雜食',
};

const SIZE_LABELS: Record<string, string> = {
  small: '小型 (×0.8)',
  medium: '中型 (×1.0)',
  large: '大型 (×1.3)',
};

const STAT_LABELS: Record<string, string> = {
  str: '力量',
  agi: '敏捷',
  int: '智力',
  cha: '魅力',
};

interface Props {
  onSelect: (species: Species) => void;
}

export default function SpeciesSelect({ onSelect }: Props) {
  return (
    <div className="species-select fade-in">
      <h2>選擇你的物種</h2>
      <p className="hint">每個物種擁有不同的食性、體型與基礎屬性</p>
      <div className="species-grid">
        {SPECIES_LIST.map((sp) => (
          <div
            key={sp.id}
            className="card species-card slide-up"
            onClick={() => onSelect(sp)}
          >
            <div className="species-header">
              <span className="species-emoji">{sp.emoji}</span>
              <span className="species-name">{sp.name}</span>
              <span className={`species-diet diet-${sp.diet}`}>
                {DIET_LABELS[sp.diet]}
              </span>
            </div>
            <div className="species-size">{SIZE_LABELS[sp.bodySize]}</div>
            <div className="species-desc">{sp.description}</div>
            <div className="species-stats">
              {(Object.keys(sp.baseStats) as Array<keyof typeof sp.baseStats>).map((key) => (
                <span key={key} className="stat-badge">
                  {STAT_LABELS[key]} {sp.baseStats[key]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
