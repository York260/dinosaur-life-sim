import { useEffect, useRef, ReactNode } from 'react';
import './TitleScene.css';

const FILL = '#08060c';
const EDGE = '#3a2d40';

function Rex() {
  return (
    <svg viewBox="0 0 220 130">
      <g fill={FILL} stroke={EDGE} strokeWidth="2" strokeLinejoin="round">
        <path d="M58 60L4 88L60 84Z" />
        <g className="ts-leg b"><path d="M84 80L112 80L108 122L80 122L80 114L96 114Z" /></g>
        <ellipse cx="108" cy="66" rx="56" ry="30" transform="rotate(-8 108 66)" />
        <path d="M146 50L168 30L176 62L152 78Z" />
        <path d="M160 34L208 40L212 58L192 62L176 60Z" />
        <path d="M150 74L166 82L152 86Z" />
        <g className="ts-leg a"><path d="M108 80L136 80L132 122L104 122L104 114L120 114Z" /></g>
      </g>
      <rect x="188" y="44" width="6" height="5" fill="#e8541c" />
    </svg>
  );
}

function Sauro() {
  return (
    <svg viewBox="0 0 260 150">
      <g fill={FILL} stroke={EDGE} strokeWidth="2" strokeLinejoin="round">
        <path d="M74 82L6 124L78 104Z" />
        <g className="ts-leg b"><path d="M84 96L108 96L104 142L82 142Z" /><path d="M150 96L172 96L170 142L148 142Z" /></g>
        <ellipse cx="130" cy="88" rx="64" ry="30" />
        <path d="M176 78L206 20L224 24L198 96Z" />
        <path d="M218 18L248 22L248 34L220 34Z" />
        <g className="ts-leg a"><path d="M106 96L130 96L128 144L106 144Z" /><path d="M168 96L190 96L188 144L166 144Z" /></g>
      </g>
    </svg>
  );
}

type WalkerProps = { kind: 'rex' | 'sauro'; dir: 'fwd' | 'back' | 'flip'; dur: number; delay: number; step: number; width: string; bottom: string };
function Walker({ kind, dir, dur, delay, step, width, bottom }: WalkerProps) {
  const style = { '--dur': `${dur}s`, '--delay': `${delay}s`, '--step': `${step}s`, width, bottom } as React.CSSProperties;
  return (
    <div className={`ts-walker ${dir === 'fwd' ? '' : dir}`} style={style}>
      {kind === 'rex' ? <Rex /> : <Sauro />}
    </div>
  );
}

const BANDS = ['#0d0b17', '#120e20', '#181129', '#211430', '#33182f', '#54202b', '#7d2c21'];
const JIT = [0.95, 1.08, 0.9, 1.05, 0.98, 1.1, 0.88, 1.02, 0.94, 1.07];
type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, u: number): RGB => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const rgb = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const DARK: RGB = [30, 20, 18];
const LIT: RGB = [104, 74, 58];
const HOT: RGB = [214, 92, 40];

export default function TitleScene({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const scene = sceneRef.current!;
    const sky = skyRef.current!;
    const fx = fxRef.current!;
    const sctx = sky.getContext('2d');
    const fctx = fx.getContext('2d');
    if (!sctx || !fctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let W = 0, H = 0;
    let stars: { x: number; y: number; s: number; p: number; f: number }[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = scene.clientWidth; H = scene.clientHeight;
      for (const c of [sky, fx]) { c.width = W * dpr; c.height = H * dpr; }
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      const n = Math.round((W * H) / 5600);
      for (let k = 0; k < n; k++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.62, s: Math.random() < 0.15 ? 3 : 2, p: Math.random() * 6.28, f: 0.6 + Math.random() * 1.4 });
    };

    let px = 0, tx = 0;
    const onMove = (e: PointerEvent) => { tx = (e.clientX / W - 0.5) * 2; };
    const onLeave = () => { tx = 0; };
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerleave', onLeave);

    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; s?: number };
    const sparks: P[] = [], embers: P[] = [], streaks: P[] = [];
    let last = performance.now(), time = 0, nextStreak = 2.5, raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
      px += (tx - px) * Math.min(1, dt * 3);
      scene.style.setProperty('--px', (px + (reduce ? 0 : Math.sin(time * 0.25) * 0.35)).toFixed(3));

      const hz = H * 0.66, bh = hz / BANDS.length;
      BANDS.forEach((c, b) => { sctx.fillStyle = c; sctx.fillRect(0, Math.floor(b * bh), W, Math.ceil(bh) + 1); });
      sctx.fillStyle = BANDS[BANDS.length - 1]; sctx.fillRect(0, hz, W, H - hz);
      sctx.fillStyle = '#efe4cc';
      for (const st of stars) if (Math.sin(time * st.f + st.p) > -0.35) sctx.fillRect(Math.round(st.x - px * 4), Math.round(st.y), st.s, st.s);

      // asteroid: faceted rock with flat flame tongues
      const grow = 0.75 + 0.5 * ((time % 120) / 120);
      const ax = W * 0.8 - px * 8, ay = H * 0.085 + Math.sin(time * 0.6) * 3, r = Math.max(13, Math.min(W, H) * 0.042) * grow;
      const travel = 2.45, light = -2.3, rot = time * 0.12, tailAng = travel + Math.PI;
      const q = Math.floor(time * 12);
      const rnd = (k: number) => Math.abs((Math.sin(q * 12.9898 + k * 78.233) * 43758.5453) % 1);
      ([['#8a2f16', 3.6, 0.9], ['#d6521c', 2.7, 0.62], ['#ffbf47', 1.7, 0.34]] as [string, number, number][]).forEach(([col, len, wid], fi) => {
        const L = r * len * (0.85 + 0.3 * rnd(fi + 1)), wdt = r * wid;
        const ux = Math.cos(tailAng), uy = Math.sin(tailAng), nx = -uy, ny = ux;
        const bx = ax + ux * r * 0.55, by = ay + uy * r * 0.55;
        sctx.fillStyle = col; sctx.beginPath();
        sctx.moveTo(bx + nx * wdt, by + ny * wdt);
        sctx.lineTo(bx + ux * L * 0.55 + nx * wdt * (0.9 + 0.3 * rnd(fi + 5)), by + uy * L * 0.55 + ny * wdt * 0.9);
        sctx.lineTo(bx + ux * L + nx * wdt * 0.4 * rnd(fi + 9), by + uy * L + ny * wdt * 0.4 * rnd(fi + 9));
        sctx.lineTo(bx + ux * L * 0.5 - nx * wdt * (1 + 0.3 * rnd(fi + 3)), by + uy * L * 0.5 - ny * wdt);
        sctx.lineTo(bx - nx * wdt, by - ny * wdt);
        sctx.closePath(); sctx.fill();
      });
      const N = JIT.length;
      for (let v = 0; v < N; v++) {
        const a0 = rot + (v * 6.2832) / N, a1 = rot + ((v + 1) * 6.2832) / N, am = (a0 + a1) / 2;
        const r0 = r * JIT[v], r1 = r * JIT[(v + 1) % N];
        const lightU = 0.5 + 0.5 * Math.cos(am - light), heatU = Math.max(0, Math.cos(am - travel));
        sctx.fillStyle = rgb(mix(mix(DARK, LIT, lightU * 0.8), HOT, Math.pow(heatU, 5) * 0.6));
        sctx.beginPath(); sctx.moveTo(ax, ay);
        sctx.lineTo(ax + Math.cos(a0) * r0, ay + Math.sin(a0) * r0);
        sctx.lineTo(ax + Math.cos(a1) * r1, ay + Math.sin(a1) * r1);
        sctx.closePath(); sctx.fill();
      }
      sctx.strokeStyle = '#0c0706'; sctx.lineWidth = 2; sctx.beginPath();
      for (let w = 0; w <= N; w++) {
        const aa = rot + ((w % N) * 6.2832) / N, rr = r * JIT[w % N];
        const xx = ax + Math.cos(aa) * rr, yy = ay + Math.sin(aa) * rr;
        if (w === 0) sctx.moveTo(xx, yy); else sctx.lineTo(xx, yy);
      }
      sctx.stroke();
      if (!reduce && Math.random() < 0.6) sparks.push({ x: ax + Math.cos(tailAng) * r, y: ay + Math.sin(tailAng) * r, vx: Math.cos(tailAng) * (30 + Math.random() * 60) + (Math.random() - 0.5) * 30, vy: Math.sin(tailAng) * (30 + Math.random() * 60) + (Math.random() - 0.5) * 30, life: 0, max: 1 + Math.random() });
      for (let j = sparks.length - 1; j >= 0; j--) {
        const p = sparks[j]; p.life += dt;
        if (p.life > p.max) { sparks.splice(j, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        sctx.fillStyle = p.life / p.max < 0.5 ? '#ffbf47' : '#d6521c';
        sctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
      }

      fctx.clearRect(0, 0, W, H);
      if (!reduce) {
        nextStreak -= dt;
        if (nextStreak < 0) { streaks.push({ x: Math.random() * W * 0.7, y: Math.random() * H * 0.25, vx: 380 + Math.random() * 200, vy: 170 + Math.random() * 90, life: 0, max: 0.8 }); nextStreak = 4 + Math.random() * 5; }
        while (embers.length < Math.round(W / 10)) embers.push({ x: Math.random() * W, y: embers.length < 8 ? H * (0.45 + Math.random() * 0.55) : H + 6, vx: (Math.random() - 0.3) * 14, vy: -(20 + Math.random() * 44), life: 0, max: 5 + Math.random() * 5, s: Math.random() < 0.3 ? 3 : 2 });
      }
      for (let s2 = streaks.length - 1; s2 >= 0; s2--) {
        const m = streaks[s2]; m.life += dt;
        if (m.life > m.max) { streaks.splice(s2, 1); continue; }
        m.x += m.vx * dt; m.y += m.vy * dt;
        fctx.strokeStyle = m.life / m.max < 0.6 ? '#efe4cc' : '#d6521c'; fctx.lineWidth = 2;
        fctx.beginPath(); fctx.moveTo(m.x, m.y); fctx.lineTo(m.x - m.vx * 0.12, m.y - m.vy * 0.12); fctx.stroke();
      }
      for (let e = embers.length - 1; e >= 0; e--) {
        const em = embers[e]; em.life += dt;
        if (em.life > em.max || em.y < -10) { embers.splice(e, 1); continue; }
        em.x += (em.vx + Math.sin(time * 1.3 + e) * 10) * dt; em.y += em.vy * dt;
        const wv = em.life / em.max;
        fctx.fillStyle = wv < 0.5 ? '#ffbf47' : wv < 0.8 ? '#e8541c' : '#7a2c18';
        fctx.fillRect(Math.round(em.x), Math.round(em.y), em.s ?? 2, em.s ?? 2);
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="ts-scene" ref={sceneRef}>
      <canvas ref={skyRef} className="ts-canvas" aria-hidden="true" />

      <div className="ts-layer ts-far" aria-hidden="true">
        <svg viewBox="0 0 400 100" preserveAspectRatio="none">
          <path fill="var(--ts-rock-1)" d="M0 100V60L30 44L60 62L90 26L122 58L150 50L182 64L210 34L246 62L278 52L310 66L330 30L364 60L400 46V100Z" />
          <path fill="var(--ts-rock-lit)" d="M30 44L60 62L22 62Z M90 26L60 62L84 72Z M150 50L122 58L140 66Z M210 34L182 64L204 74Z M330 30L310 66L326 72Z M400 46L364 60L392 64Z" />
          <path fill="var(--ts-rock-shade)" d="M90 26L122 58L98 74Z M210 34L246 62L218 78Z M330 30L364 60L338 76Z M30 44L60 62L44 70Z" />
          <path fill="var(--ts-rock-1)" d="M214 100L258 28H298L346 100Z" />
          <path fill="var(--ts-rock-lit)" d="M214 100L258 28L276 100Z" />
          <path fill="var(--ts-rock-shade)" d="M298 28L346 100L306 100Z" />
          <path fill="var(--ts-lava)" d="M262 28L294 28L288 34L268 34Z" />
          <path fill="var(--ts-lava-hot)" d="M272 29L284 29L281 32L275 32Z" />
          <g className="ts-lava-flow"><path fill="var(--ts-lava)" d="M277 36L280 36L282 58L279 70L276 58Z" /></g>
        </svg>
      </div>

      <div className="ts-layer ts-mid" aria-hidden="true">
        <svg viewBox="0 0 400 100" preserveAspectRatio="none">
          <path fill="var(--ts-hill)" d="M0 100V56L46 34L96 52L150 40L208 56L262 42L320 58L364 38L400 44V100Z" />
          <path fill="#1d1425" d="M46 34L96 52L60 60Z M150 40L208 56L172 62Z M262 42L320 58L284 64Z M364 38L400 44L380 56Z" />
          <path stroke="#1f1628" strokeWidth="1" fill="none" d="M0 74H400M0 88H400" />
        </svg>
        <Walker kind="sauro" dir="back" dur={95} delay={-30} step={1.7} width="clamp(60px, 16vw, 96px)" bottom="62%" />
        <Walker kind="sauro" dir="fwd" dur={80} delay={-50} step={1.3} width="clamp(44px, 11vw, 64px)" bottom="72%" />
        <Walker kind="rex" dir="flip" dur={54} delay={-14} step={0.8} width="clamp(130px, 36vw, 210px)" bottom="3%" />
        <Walker kind="rex" dir="back" dur={72} delay={-40} step={1} width="clamp(64px, 17vw, 100px)" bottom="24%" />
      </div>

      <div className="ts-layer ts-near" aria-hidden="true">
        <svg viewBox="0 0 400 100" preserveAspectRatio="none">
          <path fill="var(--ts-ground)" d="M0 100V34L40 22L90 32L150 18L210 30L270 20L330 32L400 24V100Z" />
          <path fill="#171021" d="M0 34L40 22L28 40Z M150 18L210 30L176 38Z M270 20L330 32L296 40Z" />
          <path stroke="#1b1326" strokeWidth="1.2" fill="none" d="M0 56H400M0 78H400M60 56V78M180 56V78M300 56V78M120 78V100M240 78V100M350 78V100" />
        </svg>
      </div>

      <canvas ref={fxRef} className="ts-canvas ts-fx" aria-hidden="true" />
      <div className="ts-grain" aria-hidden="true" />
      <div className="ts-flash" aria-hidden="true" />

      <div className="ts-ui">{children}</div>
    </div>
  );
}

export const TitleIcons = {
  guide: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4 9.5 4 12 5.5c2.5-1.5 5.5-1.5 8 0V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z" /><path d="M12 5.5V19" /></svg>
  ),
  achv: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8.5 20h7" /></svg>
  ),
  archive: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5V18a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V9.5A1.5 1.5 0 0 0 19 8H12L10 5.5H5A1.5 1.5 0 0 0 3.5 7z" /></svg>
  ),
};
