import { Species } from '../engine/types';
import { SPECIES_LIST } from '../engine/species';
import './SpeciesSelect.css';

const DIET_LABELS: Record<string, string> = { carnivore: '肉食', herbivore: '草食', omnivore: '雜食' };
const SIZE_LABELS: Record<string, string> = { small: '小型・吃得少', medium: '中型', large: '大型・吃得多' };
const STAT_LABELS: Record<string, string> = { str: '力', agi: '敏', int: '智', cha: '魅' };

const PERK: Record<string, string> = {
  trex: '撕咬最痛，會咆哮',
  velociraptor: '咬得快，連擊強',
  triceratops: '衝撞最強，耐打',
  parasaurolophus: '族群援軍多',
  therizinosaurus: '抓破綻重擊',
  struthiomimus: '最會閃避',
  chicken: '知道結局的提示',
};

interface Props {
  onSelect: (species: Species) => void;
  showSecret?: boolean;
}

export default function SpeciesSelect({ onSelect, showSecret }: Props) {
  const list = SPECIES_LIST.filter(sp => !sp.hidden || showSecret);
  return (
    <div className="species-select fade-in">
      <h2>選擇你的恐龍</h2>
      <div className="species-grid">
        {list.map(sp => (
          <button
            key={sp.id}
            type="button"
            className={`card species-card slide-up ${sp.hidden ? 'secret' : ''}`}
            onClick={() => onSelect(sp)}
          >
            <div className="species-header">
              <span className="species-name">{sp.name}</span>
              <span className={`species-diet diet-${sp.diet}`}>{DIET_LABELS[sp.diet]}</span>
            </div>
            <div className="species-perk">{PERK[sp.id] ?? sp.combatPassive}</div>
            <div className="species-size">{SIZE_LABELS[sp.bodySize]}</div>
            <div className="species-stats">
              {(Object.keys(sp.baseStats) as Array<keyof typeof sp.baseStats>).map(key => (
                <span key={key} className="stat-badge">
                  <small>{STAT_LABELS[key]}</small>
                  {sp.baseStats[key]}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
