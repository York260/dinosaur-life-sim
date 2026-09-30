import { useEffect, useRef, useState, ReactNode } from 'react';
import eventImg from '../assets/tutorial/event.jpg';
import diceImg from '../assets/tutorial/dice.jpg';
import statusImg from '../assets/tutorial/status.jpg';
import packImg from '../assets/tutorial/pack.jpg';
import allocImg from '../assets/tutorial/alloc.jpg';
import titleBtnImg from '../assets/tutorial/titlebtn.jpg';
import './Tutorial.css';

const SEEN_KEY = 'dinolife_tutorial_seen_v1';

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* 無法寫入就下次再顯示，不影響遊戲 */
  }
}

interface Slide {
  art: ReactNode;
  title: string;
  body: ReactNode;
}

const shot = (src: string, alt: string, pins?: ReactNode, maxH = 250) => (
  <div className="tut-shot">
    <div className="tut-frame">
      <img src={src} alt={alt} style={{ maxHeight: maxH }} />
      {pins}
    </div>
  </div>
);

const SLIDES: Slide[] = [
  {
    art: (
      <div className="tut-art">
        <div className="tut-row" style={{ gap: 26 }}>
          <span style={{ fontSize: 78, lineHeight: 1 }}>🦖</span>
          <span style={{ fontSize: 58, lineHeight: 1, transform: 'translateY(-22px) rotate(-12deg)' }}>☄️</span>
        </div>
      </div>
    ),
    title: '撐過 25 年，迎接最後的天災',
    body: <>你是白堊紀末的一隻恐龍。每年做選擇、求生存，<b>25 年後小行星會墜落</b>，看你能不能帶著族群活下來。</>,
  },
  {
    art: shot(
      eventImg,
      '事件畫面與行動卡片',
      <>
        <span className="tut-pin g" style={{ right: 8, top: 10 }}>① 先看事件</span>
        <span className="tut-pin g" style={{ left: 8, top: '57%' }}>② 選 1 個主行動</span>
      </>,
    ),
    title: '每年先看事件，再選行動',
    body: <>每年會遇到一個事件。選 <b>1 個主行動</b>，副行動可選可不選。</>,
  },
  {
    art: shot(diceImg, '擲骰結果畫面', undefined, 250),
    title: '擲骰子看運氣',
    body: <>確認後擲骰子，<b>點數達到門檻就成功</b>，成功或失敗會影響生命、飽食和水分。行動卡片上的 % 是成功率。</>,
  },
  {
    art: (
      <div className="tut-art">
        <div className="tut-compare">
          <div className="tut-action" style={{ flex: 1 }}>
            <div className="tut-tag">力量 15</div>
            <b>撕咬獵物</b>
            <div className="tut-ring mid" style={{ alignSelf: 'center' }}>55%</div>
          </div>
          <span className="tut-arrow">➜</span>
          <div className="tut-action" style={{ flex: 1 }}>
            <div className="tut-tag">力量 25</div>
            <b>撕咬獵物</b>
            <div className="tut-ring" style={{ alignSelf: 'center' }}>75%</div>
          </div>
        </div>
        <span className="tut-ex">示範</span>
      </div>
    ),
    title: '能力值越高，越容易成功',
    body: <>每個行動會對應一種能力值（力量、敏捷、智力、魅力），<b>該項越高，成功率越高</b>。</>,
  },
  {
    art: shot(statusImg, '生命、飽食、水分狀態列', undefined, 160),
    title: '顧好生命、飽食、水分',
    body: <>每年都會消耗飽食和水分。<b>任何一項歸零就會扣血並變虛弱</b>，能力值也會下降，記得補充。</>,
  },
  {
    art: (
      <div className="tut-shot" style={{ padding: 8, gap: 8 }}>
        <img src={packImg} alt="族群資訊" style={{ borderRadius: 10, maxHeight: 96, width: 'auto' }} />
        <img src={allocImg} alt="分配屬性點畫面" style={{ borderRadius: 10, maxHeight: 150, width: 'auto' }} />
      </div>
    ),
    title: '族群與成長',
    body: <>族群越大，判定越容易、戰鬥有援軍，但也吃得更多。每年擲骰得屬性點，<b>由你決定加在哪一項</b>。</>,
  },
  {
    art: (
      <div className="tut-art" style={{ alignContent: 'center', gap: 10 }}>
        <svg className="tut-lanes" viewBox="0 0 320 150" role="img" aria-label="三條跑道，中間跑道亮紅色表示敵人即將攻擊">
          <polygon points="60,10 260,10 310,150 10,150" fill="none" stroke="var(--tut-line)" strokeWidth="2" />
          <line x1="126" y1="10" x2="103" y2="150" stroke="var(--tut-line)" strokeWidth="2" />
          <line x1="194" y1="10" x2="217" y2="150" stroke="var(--tut-line)" strokeWidth="2" />
          <polygon points="126,10 194,10 217,150 103,150" fill="var(--tut-danger)" opacity=".28" />
          <text x="160" y="34" textAnchor="middle" fontSize="26">🐊</text>
          <text x="160" y="63" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--tut-danger)">!</text>
          <text x="238" y="128" textAnchor="middle" fontSize="26">🦖</text>
          <path d="M226 112 C 212 98, 206 92, 196 90" fill="none" stroke="var(--tut-accent)" strokeWidth="3" strokeDasharray="5 4" strokeLinecap="round" />
          <path d="M200 84 L192 90 L201 96" fill="none" stroke="var(--tut-accent)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="tut-keys"><span>◀ ▶ 閃避</span><span>撕咬</span><span>衝撞</span><span>撤退</span></div>
      </div>
    ),
    title: '戰鬥：紅色跑道別站',
    body: <>敵人蓄力時地上會亮<b>紅色跑道</b>，攻擊前往旁邊閃。<b>撞中「蓄力中」的敵人能打斷牠</b>；撕咬穩定，衝撞打空會有破綻。</>,
  },
  {
    art: shot(titleBtnImg, '標題畫面上的玩法按鈕', undefined, 220),
    title: '準備好了',
    body: <>進度會<b>自動存檔</b>，關掉再開可接著玩。想複習時，回標題畫面點「<b>玩法</b>」就能再看一次。</>,
  },
];

interface Props {
  /** 第一次自動出現時為 true：最後一頁按鈕是「開始遊戲」，否則是「關閉」 */
  firstRun: boolean;
  /** 看完或略過。startGame 為 true 表示玩家按了「開始遊戲」 */
  onClose: (startGame: boolean) => void;
}

export default function Tutorial({ firstRun, onClose }: Props) {
  const [i, setI] = useState(0);
  const n = SLIDES.length;
  const last = i === n - 1;
  const touchX = useRef<number | null>(null);

  const go = (to: number) => setI(Math.max(0, Math.min(n - 1, to)));
  const finish = () => onClose(firstRun && last);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setI(v => Math.max(0, v - 1));
      else if (e.key === 'ArrowRight') setI(v => Math.min(n - 1, v + 1));
      else if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, onClose]);

  return (
    <div className="tut-backdrop" role="dialog" aria-modal="true" aria-label="新手教學">
      <div className="tut-stage">
        <div className="tut-topbar">
          <span>{i + 1} / {n}</span>
          {!last && <button className="tut-skip" onClick={() => onClose(false)}>略過</button>}
        </div>
        <div
          className="tut-viewport"
          onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
          }}
        >
          <div className="tut-track" style={{ transform: `translateX(${-i * 100}%)` }}>
            {SLIDES.map((s, k) => (
              <section className="tut-slide" key={k} aria-hidden={k !== i}>
                {s.art}
                <h2>{s.title}</h2>
                <p>{s.body}</p>
              </section>
            ))}
          </div>
        </div>
        <div className="tut-dots" aria-hidden="true">
          {SLIDES.map((_, k) => <span key={k} className={`tut-dot ${k === i ? 'on' : ''}`} />)}
        </div>
        <div className="tut-nav">
          <button className="tut-btn ghost" disabled={i === 0} onClick={() => go(i - 1)}>上一頁</button>
          <button className="tut-btn primary" onClick={() => (last ? finish() : go(i + 1))}>
            {last ? (firstRun ? '開始遊戲' : '關閉') : '下一頁'}
          </button>
        </div>
      </div>
    </div>
  );
}
