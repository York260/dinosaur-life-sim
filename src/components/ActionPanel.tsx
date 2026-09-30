import { GameAction, Stats, Trait } from '../engine/types';
import ActionCard from './ActionCard';

interface Props {
  mainActions: GameAction[];
  subActions: GameAction[];
  selectedMain: GameAction | null;
  selectedSub: GameAction | null;
  stats: Stats;
  traits: Trait[];
  hunger: number;
  packBonus: number;
  eventTags?: string[];
  onSelectMain: (action: GameAction) => void;
  onSelectSub: (action: GameAction | null) => void;
  onConfirm: () => void;
}

export default function ActionPanel({
  mainActions, subActions, selectedMain, selectedSub,
  stats, traits, hunger, packBonus, eventTags,
  onSelectMain, onSelectSub, onConfirm,
}: Props) {
  return (
    <div className="action-panel slide-up">
      <div>
        <div className="action-section-title">
          選 1 個行動
          {packBonus > 0 && <span className="pack-bonus-tag">🦕 族群 +{packBonus}</span>}
        </div>
        <div className="action-cards">
          {mainActions.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              stats={stats}
              traits={traits}
              hunger={hunger}
              selected={selectedMain?.id === a.id}
              packBonus={packBonus}
              eventTags={eventTags}
              onClick={() => onSelectMain(a)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="action-section-title">順便再做（可不選）</div>
        <div className="action-cards">
          {subActions.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              stats={stats}
              traits={traits}
              hunger={hunger}
              selected={selectedSub?.id === a.id}
              dcPenalty={3}
              eventTags={eventTags}
              onClick={() => onSelectSub(selectedSub?.id === a.id ? null : a)}
            />
          ))}
        </div>
      </div>

      <div className="action-confirm">
        <button
          className="confirm-btn"
          disabled={!selectedMain}
          onClick={onConfirm}
        >
          出發！
        </button>
      </div>
    </div>
  );
}
