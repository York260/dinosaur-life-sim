import { useState } from 'react';
import { GameEvent } from '../engine/types';

const RARITY_LABEL: Record<string, string> = {
  rare: '✨ 稀有',
  legendary: '🌟 傳說',
  chain: '🔗 連鎖',
};

interface Props {
  event: GameEvent;
  year: number;
}

export default function EventNarrative({ event }: Props) {
  const [showFact, setShowFact] = useState(false);
  return (
    <div className={`card event-narrative fade-in rarity-${event.rarity}`}>
      {(RARITY_LABEL[event.rarity] || event.tags?.includes('night')) && (
        <div className="event-title">
          {RARITY_LABEL[event.rarity] && <span className="rarity-tag">{RARITY_LABEL[event.rarity]}</span>}
          {event.tags?.includes('night') && <span className="rarity-tag night">🌙 夜晚</span>}
        </div>
      )}
      {event.narrative}
      {event.fact && (showFact
        ? <div className="event-fact">📖 {event.fact}</div>
        : <button className="fact-toggle" onClick={() => setShowFact(true)}>📖 小知識</button>)}
    </div>
  );
}
