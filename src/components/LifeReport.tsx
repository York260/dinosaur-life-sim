import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GameState, ChronicleEntry, StatKey } from '../engine/types';
import { buildLifeReport } from '../engine/report';
import { renderPortrait } from '../combat/portrait';
import { renderShareCard } from '../combat/shareCard';
import { captureFullReport, canvasToBlob } from '../combat/fullReport';
import './LifeReport.css';

interface Props {
  state: GameState;
  onClose: () => void;
}

const SECTION_NO = ['壹', '貳', '參', '肆', '伍', '陸'];

const STAT_LABEL: Record<StatKey, string> = { str: '力量', agi: '敏捷', int: '智力', cha: '魅力' };

function Radar({ values }: { values: Record<StatKey, number> }) {
  const size = 220;
  const c = size / 2;
  const r = 78;
  const keys: StatKey[] = ['str', 'agi', 'int', 'cha'];
  const angle = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / keys.length;
  const pt = (i: number, v: number) => {
    const k = Math.max(0, Math.min(100, v)) / 100;
    return [c + Math.cos(angle(i)) * r * k, c + Math.sin(angle(i)) * r * k];
  };
  const poly = keys.map((k, i) => pt(i, values[k]).join(',')).join(' ');
  return (
    <svg className="lr-radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="最終屬性雷達圖">
      {[25, 50, 75, 100].map(ring => (
        <polygon
          key={ring}
          points={keys.map((_, i) => pt(i, ring).join(',')).join(' ')}
          fill="none"
          stroke="#b9c0b8"
          strokeWidth={ring === 100 ? 1.4 : 0.8}
        />
      ))}
      {keys.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#b9c0b8" strokeWidth={0.8} />;
      })}
      <polygon points={poly} fill="rgba(168,100,31,0.28)" stroke="#a8641f" strokeWidth={2} />
      {keys.map((k, i) => {
        const [x, y] = pt(i, values[k]);
        return <circle key={k} cx={x} cy={y} r={3.5} fill="#a8641f" />;
      })}
      {keys.map((k, i) => {
        const [x, y] = pt(i, 128);
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="lr-radar-label">
            {STAT_LABEL[k]} {values[k]}
          </text>
        );
      })}
    </svg>
  );
}

function groupByYear(entries: ChronicleEntry[]) {
  const map = new Map<number, ChronicleEntry[]>();
  for (const e of entries) {
    const list = map.get(e.year) ?? [];
    list.push(e);
    map.set(e.year, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export default function LifeReport({ state, onClose }: Props) {
  const report = useMemo(() => buildLifeReport(state), [state]);
  const [variant, setVariant] = useState(0);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState(false);
  const [onlyMajor, setOnlyMajor] = useState(true);
  const [cardBusy, setCardBusy] = useState<'download' | 'share' | null>(null);
  const [cardError, setCardError] = useState(false);
  const [cardNote, setCardNote] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortrait(null);
    const t = setTimeout(() => {
      try {
        setPortrait(renderPortrait({
          speciesId: state.species?.id ?? 'trex',
          seed: report.seed + variant * 7919,
          tone: report.tone,
          packSize: state.endgame?.finalPack ?? state.packSize,
          fights: state.runStats.fightsWon + state.runStats.fightsLost,
          name: `${report.speciesName}「${report.name}」`,
          subtitle: `${report.epithet}・${report.outcomeTitle}`,
          catalogNo: report.catalogNo,
          rank: report.rank,
          crown: report.tone === 'legend' || !!state.flags.albino_beaten || !!state.endgame?.bossDefeated,
        }));
      } catch (err) {
        console.error(err);
        setPortraitError(true);
      }
    }, 60);
    return () => clearTimeout(t);
  }, [report, variant, state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 等 React 真的把「擷取模式」（隱藏按鈕等互動元件）畫到畫面上，再開始截圖
  const waitFrame = () => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  const pageFileName = (index: number, total: number) =>
    total > 1
      ? `${report.catalogNo}-${report.name}-第${index + 1}張共${total}張.png`
      : `${report.catalogNo}-${report.name}.png`;

  const downloadBlob = (blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  };

  /** 完整報告可能被切成好幾張圖；依序觸發多次下載，之間留一點間隔避免被瀏覽器擋下 */
  const downloadPages = async (blobs: Blob[]) => {
    for (let i = 0; i < blobs.length; i++) {
      downloadBlob(blobs[i], pageFileName(i, blobs.length));
      if (i < blobs.length - 1) await new Promise(r => setTimeout(r, 400));
    }
  };

  /** 完整報告截圖失敗時的退路：改用精簡的單張分享卡 */
  const fallbackCardBlob = async (): Promise<Blob> => {
    if (!portrait) throw new Error('肖像尚未準備好');
    const url = await renderShareCard(report, portrait);
    return (await fetch(url)).blob();
  };

  const captureBlobs = async (): Promise<Blob[]> => {
    if (!sheetRef.current) return [await fallbackCardBlob()];
    setCapturing(true);
    await waitFrame();
    try {
      const pages = await captureFullReport(sheetRef.current);
      return Promise.all(pages.map(p => canvasToBlob(p.canvas)));
    } catch (err) {
      console.error('完整報告截圖失敗，改用精簡分享卡', err);
      return [await fallbackCardBlob()];
    } finally {
      setCapturing(false);
    }
  };

  const handleDownload = async () => {
    if (cardBusy) return;
    setCardBusy('download');
    setCardError(false);
    setCardNote(null);
    try {
      const blobs = await captureBlobs();
      await downloadPages(blobs);
      setCardNote(blobs.length > 1 ? `報告較長，已分成 ${blobs.length} 張圖片下載。` : null);
    } catch (err) {
      console.error(err);
      setCardError(true);
    } finally {
      setCardBusy(null);
    }
  };

  const handleShare = async () => {
    if (cardBusy) return;
    setCardBusy('share');
    setCardError(false);
    setCardNote(null);
    try {
      const blobs = await captureBlobs();
      const files = blobs.map((b, i) => new File([b], pageFileName(i, blobs.length), { type: 'image/png' }));
      const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
      const shareData = {
        files,
        title: `${report.speciesName}「${report.name}」的生涯報告`,
        text: report.epitaph,
      };
      if (nav.share && nav.canShare && nav.canShare(shareData)) {
        await nav.share(shareData);
        return;
      }
      await downloadPages(blobs);
      setCardNote(blobs.length > 1 ? `裝置不支援分享多張圖片，已改為分成 ${blobs.length} 張下載。` : '裝置不支援直接分享，已改為下載圖片。');
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error(err);
        setCardError(true);
      }
    } finally {
      setCardBusy(null);
    }
  };

  const years = groupByYear(report.chronicle);
  const lastYear = years.length ? years[years.length - 1][0] : 0;

  return createPortal(
    <div className="lr-backdrop" role="dialog" aria-modal="true" aria-label="生涯報告">
      <div ref={sheetRef} className={`lr-sheet fade-in ${capturing ? 'capturing' : ''}`}>
        <header className="lr-top">
          <div className="lr-org">
            <span className="lr-org-mark">KPG</span>
            <span>白堊紀末期古生物研究所・標本生涯檔案</span>
          </div>
          <div className="lr-tools">
            <button type="button" onClick={handleDownload} disabled={!!cardBusy}>
              {cardBusy === 'download' ? '產生圖片中…' : '📥 下載完整報告'}
            </button>
            <button type="button" onClick={handleShare} disabled={!!cardBusy}>
              {cardBusy === 'share' ? '準備中…' : '🔗 分享完整報告'}
            </button>
            <button type="button" className="lr-close" onClick={onClose} aria-label="關閉報告">✕</button>
          </div>
        </header>

        {cardError && <div className="lr-card-error">圖片產生失敗，請再試一次。</div>}
        {cardNote && <div className="lr-card-note">{cardNote}</div>}

        {/* ===== 身分 ===== */}
        <section className={`lr-hero tone-${report.tone}`}>
          <figure className="lr-portrait">
            {portrait ? (
              <img src={portrait} alt={`${report.speciesName}「${report.name}」的肖像`} />
            ) : (
              <div className="lr-portrait-wait">{portraitError ? '無法繪製肖像（瀏覽器不支援 WebGL）' : '繪製肖像中…'}</div>
            )}
            <figcaption>
              <span>{report.tone === 'dead' ? '化石復原圖' : '生態復原圖'}・依據本局資料生成</span>
              {!portraitError && (
                <button type="button" onClick={() => setVariant(v => v + 1)}>換個姿勢</button>
              )}
            </figcaption>
          </figure>

          <div className="lr-id">
            <div className="lr-catalog">標本編號 {report.catalogNo}</div>
            <h1>
              <small>{report.speciesName}</small>
              「{report.name}」
            </h1>
            <div className="lr-epithet">稱號：{report.epithet}</div>
            <div className={`lr-outcome tone-${report.tone}`}>
              <b>{report.outcomeTitle}</b>
              <p>{report.outcomeLine}</p>
            </div>
            <dl className="lr-quick">
              <div><dt>存活</dt><dd>{report.yearsLived} 年</dd></div>
              <div><dt>戰績</dt><dd>{state.runStats.fightsWon} 勝</dd></div>
              <div><dt>族群巔峰</dt><dd>{state.runStats.maxPack}</dd></div>
              <div><dt>評等</dt><dd>{report.rank ?? '—'}</dd></div>
            </dl>
          </div>
        </section>

        {/* ===== 壹 數據 ===== */}
        <section className="lr-section">
          <h2><span className="lr-no">{SECTION_NO[0]}</span>生涯數據</h2>
          <div className="lr-data">
            <div className="lr-figures">
              {report.figures.map(f => (
                <div key={f.label} className="lr-figure">
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                  {f.note && <span>{f.note}</span>}
                </div>
              ))}
            </div>
            <div className="lr-radar-wrap">
              <Radar values={report.attributes} />
              <span className="lr-caption">最終屬性（含詞條修正）</span>
            </div>
          </div>
        </section>

        {/* ===== 貳 大事記 ===== */}
        <section className="lr-section">
          <h2>
            <span className="lr-no">{SECTION_NO[1]}</span>生涯大事記
            <label className="lr-toggle">
              <input id="lr-only-major" type="checkbox" checked={onlyMajor} onChange={e => setOnlyMajor(e.target.checked)} />
              只看重大事件
            </label>
          </h2>
          <ol className="lr-timeline">
            {years.map(([year, entries]) => {
              const shown = onlyMajor
                ? entries.filter(e => e.kind !== 'normal' || year === 1 || year === lastYear)
                : entries;
              if (shown.length === 0) return null;
              return (
                <li key={year}>
                  <span className="lr-year">{year > state.maxYear ? '末日' : `第 ${year} 年`}</span>
                  <ul>
                    {shown.map((e, i) => (
                      <li key={i} className={`k-${e.kind}`}>
                        <span className="lr-ev-icon" aria-hidden="true">{e.icon}</span>
                        {e.text}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ===== 參 情感 ===== */}
        <section className="lr-section">
          <h2><span className="lr-no">{SECTION_NO[2]}</span>情感羈絆</h2>
          <div className="lr-bonds">
            {report.bonds.map((b, i) => (
              <article key={i} className="lr-bond">
                <div className="lr-bond-head">
                  <span className="lr-bond-icon" aria-hidden="true">{b.icon}</span>
                  <div>
                    <div className="lr-bond-rel">{b.relation}</div>
                    <div className="lr-bond-who">{b.who}</div>
                  </div>
                </div>
                <div className="lr-bond-status">{b.status}</div>
                <p>{b.note}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ===== 肆 豐功偉業 ===== */}
        <section className="lr-section">
          <h2><span className="lr-no">{SECTION_NO[3]}</span>豐功偉業</h2>
          <ul className="lr-feats">
            {report.feats.map((f, i) => (
              <li key={i}>
                <span className="lr-feat-icon" aria-hidden="true">{f.icon}</span>
                <div>
                  <b>{f.title}</b>
                  <p>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== 伍 評語 ===== */}
        <section className="lr-section">
          <h2><span className="lr-no">{SECTION_NO[4]}</span>他們眼中的{report.name}</h2>
          <div className="lr-quotes">
            {report.quotes.map((q, i) => (
              <blockquote key={i} className="lr-quote">
                <p>「{q.quote}」</p>
                <footer>
                  <span aria-hidden="true">{q.icon}</span>
                  <b>{q.speaker}</b>
                  <em>{q.role}</em>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* ===== 陸 鑑定 ===== */}
        <section className="lr-section lr-appraisal">
          <h2><span className="lr-no">{SECTION_NO[5]}</span>6600 萬年後・鑑定報告</h2>
          <ul>
            {report.specimenNotes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
          <blockquote className="lr-verdict">
            <p>「{report.scientistVerdict}」</p>
            <footer>—— {report.scientist.name}，{report.scientist.org}</footer>
          </blockquote>
        </section>

        <footer className="lr-epitaph">
          <p>{report.epitaph}</p>
          <button type="button" onClick={onClose}>關閉檔案</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
