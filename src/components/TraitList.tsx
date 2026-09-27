import { Trait } from '../engine/types';

interface Props {
  traits: Trait[];
}

export default function TraitList({ traits }: Props) {
  if (traits.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="trait-section-label">詞條</div>
      <div className="trait-list">
        {traits.map((t) => (
          <span
            key={t.id}
            className={`trait-tag ${t.isPositive ? 'positive' : 'negative'}`}
            title={t.description}
          >
            {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}
