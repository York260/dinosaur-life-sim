import { lazy, Suspense, useState } from 'react';
import { Species } from '../engine/types';
import { nameSuggestions } from '../engine/names';
import './NamingScreen.css';

const Hatch3D = lazy(() => import('./Hatch3D'));
const TAPS_TO_HATCH = 3;

type Stage = 'egg' | 'hatched' | 'named';

const MAX_LEN = 8;
const ROARS = ['吼！', '嗷嗚～', '吼吼！', '（小聲）吼……'];

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
  const [roars, setRoars] = useState(0);

  const reroll = () => {
    const next = nameSuggestions(3, chips);
    setChips(next);
    setName(next[0] ?? name);
  };

  const trimmed = name.trim();
  const confirm = () => {
    if (!trimmed || stage !== 'hatched') return;
    setStage('named');
    setTimeout(() => onConfirm(trimmed), 1600);
  };

  const hatched = stage !== 'egg';
  const bubble = stage === 'named'
    ? `「${trimmed}」！`
    : hatched
      ? (roars === 0 ? '……？（盯著你看）' : ROARS[(roars - 1) % ROARS.length])
      : null;

  return (
    <div className="nm-screen fade-in">
      <button className="nm-back" onClick={onBack} disabled={stage === 'named'}>← 換一隻</button>

      <div className="nm-stage3d">
        <Suspense fallback={<div className="nm-loading">載入中…</div>}>
          <Hatch3D
            speciesId={species.id}
            onTap={setTaps}
            onHatched={() => setStage(s => (s === 'egg' ? 'hatched' : s))}
            onRoar={() => setRoars(n => n + 1)}
            celebrate={stage === 'named'}
          />
        </Suspense>
        {bubble && <div key={`${stage}-${roars}`} className={`nm-bubble3d ${stage === 'named' ? 'happy' : ''}`}>{bubble}</div>}
        {stage === 'named' && (
          <span className="nm-hearts" aria-hidden="true"><i>♥</i><i>♥</i><i>♥</i><i>♥</i><i>♥</i></span>
        )}
      </div>

      {!hatched && (
        <p className="nm-tip">
          {taps === 0 ? '點一點蛋，讓牠出來' : taps < TAPS_TO_HATCH - 1 ? '牠在動了！再點' : '快出來了！'}
          <span className="nm-dots">{Array.from({ length: TAPS_TO_HATCH }, (_, i) => <i key={i} className={i < taps ? 'on' : ''} />)}</span>
        </p>
      )}

      <div className={`nm-panel ${hatched ? 'show' : ''}`}>
        {stage === 'named' ? (
          <p className="nm-done">{species.name}「{trimmed}」記住自己的名字了</p>
        ) : (
          <>
            <h2>幫牠取個名字</h2>
            <p className="nm-sub">點牠會吼一聲，左右拖曳可以換角度</p>
            <input
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
              <button type="button" className="nm-chip dice" onClick={reroll} disabled={!hatched}>換一批</button>
            </div>
            <button type="button" className="nm-go" onClick={confirm} disabled={!hatched || !trimmed}>
              {trimmed ? `就叫「${trimmed}」！` : '先取個名字'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
