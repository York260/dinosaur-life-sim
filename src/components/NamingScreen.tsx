import { useEffect, useRef, useState } from 'react';
import { Species } from '../engine/types';
import { nameSuggestions } from '../engine/names';
import BabyDino from './BabyDino';
import './NamingScreen.css';

type Stage = 'egg' | 'crack' | 'hatched' | 'named';

const MAX_LEN = 8;

interface Props {
  species: Species;
  onConfirm: (name: string) => void;
  onBack: () => void;
}

export default function NamingScreen({ species, onConfirm, onBack }: Props) {
  const [stage, setStage] = useState<Stage>('egg');
  const [chips, setChips] = useState(() => nameSuggestions(3));
  const [name, setName] = useState(() => chips[0] ?? '');
  const [taps, setTaps] = useState(0);
  const [poke, setPoke] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 蛋自己搖一會兒就會裂開；玩家也可以點蛋加速
  useEffect(() => {
    if (stage === 'egg') {
      const t = setTimeout(() => setStage('crack'), 1300);
      return () => clearTimeout(t);
    }
    if (stage === 'crack') {
      const t = setTimeout(() => setStage('hatched'), 900);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const tapEgg = () => {
    if (stage === 'egg') { setTaps(n => n + 1); if (taps >= 1) setStage('crack'); }
    else if (stage === 'crack') setStage('hatched');
    else if (stage === 'hatched') { setPoke(n => n + 1); }
  };

  const reroll = () => {
    const next = nameSuggestions(3, chips);
    setChips(next);
    setName(next[0] ?? name);
  };

  const trimmed = name.trim();
  const confirm = () => {
    if (!trimmed || stage === 'named') return;
    setStage('named');
    setTimeout(() => onConfirm(trimmed), 1400);
  };

  const hatched = stage === 'hatched' || stage === 'named';

  return (
    <div className="nm-screen fade-in">
      <button className="nm-back" onClick={onBack} disabled={stage === 'named'}>← 換一隻</button>

      <div className="nm-stage">
        <button
          type="button"
          className={`nm-nest ${stage}`}
          onClick={tapEgg}
          aria-label={hatched ? `${species.name}寶寶` : '點蛋讓牠快點孵出來'}
        >
          {!hatched && (
            <span className="nm-egg">
              <span className="nm-spot a" /><span className="nm-spot b" /><span className="nm-spot c" />
              {stage === 'crack' && <span className="nm-crack" />}
            </span>
          )}
          {hatched && (
            <span className="nm-baby">
              <span className="nm-shell-left" />
              <span key={poke} className={`nm-emoji ${poke ? 'poked' : ''}`}><BabyDino id={species.id} /></span>
              <span className="nm-shell-right" />
            </span>
          )}
          {stage === 'named' && (
            <span className="nm-hearts" aria-hidden="true">
              <i>♥</i><i>♥</i><i>♥</i><i>♥</i><i>♥</i>
            </span>
          )}
        </button>
        {hatched && stage !== 'named' && <div className="nm-bubble">{poke === 0 ? '……？（盯著你看）' : ['嘎！', '（蹭蹭）', '咕嚕咕嚕～', '（歪頭）'][(poke - 1) % 4]}</div>}
        {stage === 'named' && <div className="nm-bubble happy">「{trimmed}」！</div>}
      </div>

      <div className={`nm-panel ${hatched ? 'show' : ''}`}>
        {stage === 'named' ? (
          <p className="nm-done">{species.name}「{trimmed}」記住自己的名字了</p>
        ) : (
          <>
            <h2>幫牠取個名字</h2>
            <input
              ref={inputRef}
              className="nm-input"
              value={name}
              maxLength={MAX_LEN}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirm(); }}
              aria-label="恐龍的名字"
              disabled={!hatched}
            />
            <div className="nm-chips">
              {chips.map(c => (
                <button key={c} type="button" className={`nm-chip ${c === name ? 'on' : ''}`} onClick={() => setName(c)} disabled={!hatched}>{c}</button>
              ))}
              <button type="button" className="nm-chip dice" onClick={reroll} disabled={!hatched} aria-label="換一批名字">🎲</button>
            </div>
            <button type="button" className="nm-go" onClick={confirm} disabled={!hatched || !trimmed}>
              {trimmed ? `就叫「${trimmed}」！` : '先取個名字'}
            </button>
          </>
        )}
      </div>
      {!hatched && <p className="nm-tip">{taps > 0 ? '快出來了……' : '點點蛋，牠會快點出來'}</p>}
    </div>
  );
}
