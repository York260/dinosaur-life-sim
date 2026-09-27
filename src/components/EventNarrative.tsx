import { GameEvent } from '../engine/types';

const RARITY_LABEL: Record<string, string> = {
  rare: '✨ 稀有事件',
  legendary: '🌟 傳說事件',
  chain: '🔗 連鎖事件',
};

interface Props {
  event: GameEvent;
  year: number;
}

export default function EventNarrative({ event, year }: Props) {
  return (
    <div className={`card event-narrative fade-in rarity-${event.rarity}`}>
      <div className="event-title">
        第 {year} 年事件
        {RARITY_LABEL[event.rarity] && <span className="rarity-tag">{RARITY_LABEL[event.rarity]}</span>}
        {event.tags?.includes('night') && <span className="rarity-tag night">🌙 夜間</span>}
      </div>
      {event.narrative}
      {event.fact && <div className="event-fact">📖 古生物小知識：{event.fact}</div>}
    </div>
  );
}
