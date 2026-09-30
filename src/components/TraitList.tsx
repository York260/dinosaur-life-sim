import { useState } from 'react';
import { Trait } from '../engine/types';

interface Props {
  traits: Trait[];
}

export default function TraitList({ traits }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  if (traits.length === 0) {
    return null;
  }
  const shown = traits.find(t => t.id === open);

  return (
    <div>
      <div className="trait-list">
        {traits.map((t) => (
          <button
            type="button"
            key={t.id}
            className={`trait-tag ${t.isPositive ? 'positive' : 'negative'} ${t.id === open ? 'on' : ''}`}
            onClick={() => setOpen(o => (o === t.id ? null : t.id))}
            aria-expanded={t.id === open}
          >
            {t.name}
          </button>
        ))}
      </div>
      {shown && (
        <div className={`trait-desc ${shown.isPositive ? 'positive' : 'negative'}`} onClick={() => setOpen(null)}>
          <b>{shown.name}</b>：{shown.description}
        </div>
      )}
    </div>
  );
}
