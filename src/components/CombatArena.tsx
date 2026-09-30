import { useEffect, useRef, useState, useCallback } from 'react';
import { ArenaGame, ArenaConfig, ArenaHud, ArenaInput, ArenaFx } from '../combat/ArenaGame';
import { ArenaOutcome } from '../engine/types';
import './CombatArena.css';

interface Props {
  config: ArenaConfig;
  title: string;
  speciesPassive?: string;
  onFinish: (outcome: ArenaOutcome) => void;
  /** 不想操作時，改用傳統擲骰結算 */
  onAutoResolve?: () => void;
  /** 戰前返回（僅在簡報畫面可用） */
  onCancel?: () => void;
  /** 事件卡片已顯示過小知識時，簡報不再重複 */
  hideFact?: boolean;
}

const KEYMAP: Record<string, ArenaInput> = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'charge', w: 'charge', W: 'charge',
  ' ': 'bite', j: 'bite', J: 'bite',
  q: 'pack', Q: 'pack',
  e: 'roar', E: 'roar', r: 'roar', R: 'roar',
  ArrowDown: 'flee', s: 'flee', S: 'flee',
};

const RESULT_TEXT: Record<ArenaOutcome['result'], { title: string; cls: string; desc: string }> = {
  victory: { title: '勝利！', cls: 'win', desc: '你擊敗了對手！' },
  defeat: { title: '敗北', cls: 'lose', desc: '一名族人為你犧牲，你帶著重傷逃離了戰場。' },
  fled: { title: '撤退', cls: 'flee', desc: '你成功脫離了戰鬥。活著，才有下一次。' },
  death: { title: '陣亡', cls: 'dead', desc: '你倒在了戰場上……' },
};

function Bar({ value, max, cls, label }: { value: number; max: number; cls: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`arena-bar ${cls}`}>
      <div className="arena-bar-lag" style={{ width: `${pct}%` }} />
      <div className="arena-bar-fill" style={{ width: `${pct}%` }} />
      {label && <span className="arena-bar-label">{label}</span>}
    </div>
  );
}

export default function CombatArena({ config, title, speciesPassive, onFinish, onAutoResolve, onCancel, hideFact }: Props) {
  const [stage, setStage] = useState<'brief' | 'fight' | 'result'>('brief');
  const [hud, setHud] = useState<ArenaHud | null>(null);
  const [fx, setFx] = useState<{ kind: ArenaFx; id: number } | null>(null);
  const [outcome, setOutcome] = useState<ArenaOutcome | null>(null);
  const [webglError, setWebglError] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ArenaGame | null>(null);
  const fxId = useRef(0);

  const enemy = config.enemy;

  // 建立 3D 場景（進入 fight 時建立一次；結果畫面仍保留場景，卸載時才釋放）
  useEffect(() => {
    if (stage !== 'fight' || gameRef.current || !mountRef.current || !overlayRef.current) return;
    try {
      const game = new ArenaGame(mountRef.current, overlayRef.current, config, {
        onHud: setHud,
        onFx: kind => {
          fxId.current += 1;
          setFx({ kind, id: fxId.current });
        },
        onEnd: o => {
          setOutcome(o);
          setStage('result');
        },
      });
      gameRef.current = game;
      game.start();
      mountRef.current.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      console.error(err);
      setWebglError(true);
    }
    // config 在戰鬥期間固定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => () => {
    gameRef.current?.dispose();
    gameRef.current = null;
  }, []);

  // 鍵盤
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (stage === 'brief' && ev.key === 'Enter') {
        ev.preventDefault();
        setStage('fight');
        return;
      }
      if (stage === 'result' && (ev.key === 'Enter' || ev.key === ' ') && outcome) {
        ev.preventDefault();
        onFinish(outcome);
        return;
      }
      if (stage !== 'fight') return;
      const input = KEYMAP[ev.key];
      if (!input) return;
      ev.preventDefault();
      if (ev.repeat && input !== 'bite') return;
      gameRef.current?.press(input);
    };
    const up = (ev: KeyboardEvent) => {
      const input = KEYMAP[ev.key];
      if (input) gameRef.current?.release(input);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [stage, outcome, onFinish]);

  const touch = useCallback((input: ArenaInput, isDown: boolean) => (ev: React.PointerEvent) => {
    ev.preventDefault();
    if (isDown) gameRef.current?.press(input);
    else gameRef.current?.release(input);
  }, []);

  // ---------- 戰前簡報 ----------
  if (stage === 'brief') {
    return (
      <div className="arena-brief card fade-in">
        <div className="arena-brief-tag">{enemy.boss ? '⚠️ BOSS 戰' : '⚔️ 戰鬥'}</div>
        <h3>{title}</h3>
        <div className="arena-brief-enemy">
          <div>
            <div className="enemy-name">{enemy.name}</div>
            <div className="enemy-intro">{enemy.intro}</div>
          </div>
          <div className="enemy-stats">
            <span>❤️ {enemy.maxHp}</span>
            <span>💥 {enemy.damage}/擊</span>
          </div>
        </div>
        {enemy.fact && !hideFact && <div className="arena-fact">📖 {enemy.fact}</div>}

        <div className="arena-controls only-kbd">
          <div><kbd>←</kbd><kbd>→</kbd> / <kbd>A</kbd><kbd>D</kbd><span>左右閃避（有無敵時間）</span></div>
          <div><kbd>Space</kbd> / <kbd>J</kbd><span>撕咬（可連擊）</span></div>
          <div><kbd>↑</kbd> / <kbd>W</kbd><span>向前衝撞</span></div>
          <div><kbd>Q</kbd><span>族群突擊 ×{config.packCalls}</span></div>
          <div><kbd>E</kbd><span>咆哮震懾（依物種/詞條/魅力）</span></div>
          <div><kbd>↓</kbd> / <kbd>S</kbd> 長按<span>撤退</span></div>
        </div>
        <div className="arena-controls only-touch">
          <div><kbd>◀</kbd><kbd>▶</kbd><span>左右閃避（有無敵時間）</span></div>
          <div><kbd>撕咬</kbd><span>穩定輸出，連按有連擊加成</span></div>
          <div><kbd>衝撞</kbd><span>大傷害，但耗很多耐力（藍條）</span></div>
          <div><kbd>族群</kbd><span>召喚族群突擊 ×{config.packCalls}</span></div>
          <div><kbd>咆哮</kbd><span>震懾敵人（依物種/詞條/魅力）</span></div>
          <div><kbd>撤退</kbd><span>長按脫離戰鬥</span></div>
        </div>
        <ul className="arena-tips">
          <li><b className="red">別太早閃</b>：撲咬類招式在蓄力後段才鎖定你的位置，看到「!」快變黃再閃。</li>
          <li>衝撞只有撞中<b>蓄力中</b>的敵人才會<b className="blue">打斷並暈眩</b>；打空會有長硬直，很危險。</li>
          <li>重擊、二連擊的第二下有<b className="gold">霸體</b>，打不斷，只能閃。</li>
          <li>完美閃避 → 下一擊必暴擊；敵人攻擊落空 → 露出破綻，傷害提高。</li>
          {enemy.chargeTaken !== undefined && enemy.chargeTaken < 1 && <li>此敵人裝甲厚，衝撞傷害降低，改用<b>撕咬</b>更有效。</li>}
          {(enemy.evadeCharge ?? 0) > 0 && <li>此敵人動作敏捷，衝撞容易被閃開，用<b>撕咬</b>更穩。</li>}
          <li>受到的傷害直接扣生命值。HP 歸零時，若有族群成員會有一名替你犧牲。</li>
          {speciesPassive && <li>物種被動：{speciesPassive}</li>}
        </ul>
        <div className="arena-brief-actions">
          <button className="arena-start-btn" onClick={() => setStage('fight')}>開始戰鬥（Enter）</button>
          {onAutoResolve && (
            <button className="arena-auto-btn" onClick={onAutoResolve}>快速擲骰結算</button>
          )}
          {onCancel && (
            <button className="arena-auto-btn" onClick={onCancel}>← 返回重選行動</button>
          )}
        </div>
      </div>
    );
  }

  if (webglError) {
    return (
      <div className="arena-brief card">
        <h3>無法啟動 3D 戰鬥</h3>
        <p>你的瀏覽器似乎不支援 WebGL。將改用擲骰結算。</p>
        {onAutoResolve && <button className="arena-start-btn" onClick={onAutoResolve}>擲骰結算</button>}
      </div>
    );
  }

  const res = outcome ? RESULT_TEXT[outcome.result] : null;
  const hpMax = 100;

  return (
    <div className={`arena-wrap ${enemy.boss ? 'boss' : ''}`}>
      <div className="arena-stage">
        <div ref={mountRef} className="arena-canvas" />
        <div ref={overlayRef} className="arena-overlay" />
        {fx && <div key={fx.id} className={`arena-fx fx-${fx.kind}`} />}

        {hud && (
          <div className="arena-hud">
            <div className="hud-enemy">
              <div className="hud-name">
                {enemy.boss && <span className="boss-tag">BOSS</span>}
                {enemy.name}
                {hud.enraged && <span className="enrage-tag">狂暴</span>}
              </div>
              <Bar value={hud.enemyHp} max={hud.enemyMaxHp} cls="enemy" label={`${Math.ceil(hud.enemyHp)} / ${hud.enemyMaxHp}`} />
            </div>

            {hud.banner && stage === 'fight' && <div key={hud.banner} className="hud-banner">{hud.banner}</div>}
            {hud.combo >= 2 && <div key={`c${hud.combo}`} className="hud-combo">{hud.combo}<small> COMBO</small></div>}
            {hud.critReady && <div className="hud-crit">⚡ 下一擊必暴擊</div>}

            <div className="hud-player">
              <Bar value={hud.playerHp} max={hpMax} cls="player" label={`HP ${Math.ceil(hud.playerHp)}`} />
              <Bar value={hud.stamina} max={100} cls="stamina" />
              <div className="hud-skills">
                <span className={hud.packCallsLeft > 0 ? '' : 'off'}>Q 族群 ×{hud.packCallsLeft}</span>
                <span className={hud.roarsLeft > 0 ? '' : 'off'}>E 咆哮 ×{hud.roarsLeft}</span>
              </div>
              {hud.flee > 0 && (
                <div className="hud-flee"><div style={{ width: `${hud.flee * 100}%` }} /><span>撤退中…</span></div>
              )}
            </div>
          </div>
        )}

        {stage === 'result' && res && outcome && (
          <div className="arena-result fade-in">
            <div className={`result-title ${res.cls}`}>{res.title}</div>
            <div className="result-desc">{res.desc}</div>
            <div className="result-grid">
              <div><b>{outcome.damageDealt}</b><span>造成傷害</span></div>
              <div><b>{outcome.hpLost}</b><span>承受傷害</span></div>
              <div><b>{outcome.maxCombo}</b><span>最高連擊</span></div>
              <div><b>{outcome.perfectDodges}</b><span>完美閃避</span></div>
              <div><b>{outcome.interrupts}</b><span>打斷</span></div>
              <div><b>{outcome.timeSec}s</b><span>戰鬥時間</span></div>
            </div>
            <button className="arena-start-btn" onClick={() => onFinish(outcome)}>繼續（Enter）</button>
          </div>
        )}
      </div>

      {stage === 'fight' && (
        <div className="arena-touch">
          <button onPointerDown={touch('left', true)}>◀</button>
          <button onPointerDown={touch('bite', true)} className="t-bite">撕咬</button>
          <button onPointerDown={touch('charge', true)} className="t-charge">衝撞</button>
          <button onPointerDown={touch('right', true)}>▶</button>
          <button onPointerDown={touch('pack', true)} className="t-small">族群</button>
          <button onPointerDown={touch('roar', true)} className="t-small">咆哮</button>
          <button
            onPointerDown={touch('flee', true)}
            onPointerUp={touch('flee', false)}
            onPointerLeave={touch('flee', false)}
            className="t-small"
          >撤退(長按)</button>
        </div>
      )}
    </div>
  );
}
