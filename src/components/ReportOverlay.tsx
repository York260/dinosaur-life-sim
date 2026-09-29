import { CSSProperties, Suspense, lazy } from 'react';
import { GameState } from '../engine/types';
import ErrorBoundary from './ErrorBoundary';

const LifeReport = lazy(() => import('./LifeReport'));

interface Props {
  state: GameState;
  onClose: () => void;
}

// 這裡刻意全部用 inline style，不依賴 LifeReport.css（那份樣式表是跟著 LifeReport
// 一起延遲載入的 chunk）。萬一該 chunk 因為網路問題或剛好在部署更新後失效而載入失敗，
// 這個容器仍然要能顯示出清楚可讀、可以關閉的畫面，而不是整個變成空白。
const backdropStyle: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(10, 8, 6, 0.72)', backdropFilter: 'blur(3px)', padding: '1.5rem',
};

const cardStyle: CSSProperties = {
  maxWidth: 420, width: '100%', background: '#faf7f0', color: '#2a2420', borderRadius: 12,
  padding: '1.6rem', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
};

const btnRowStyle: CSSProperties = { display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' };

const primaryBtnStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #d35400, #c0392b)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '0.6rem 1.4rem', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
};

const ghostBtnStyle: CSSProperties = {
  background: 'transparent', color: '#2a2420', border: '1px solid #999',
  borderRadius: 8, padding: '0.6rem 1.4rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
};

/**
 * 生涯報告的共用容器：載入中顯示占位，渲染失敗（或報告本身的 chunk 載入失敗）時
 * 顯示可關閉的錯誤卡片，而不會讓整個遊戲畫面變成空白。底下的遊戲畫面（或標題畫面）
 * 完全不受影響，玩家隨時可以關閉這張卡片繼續玩。
 */
export default function ReportOverlay({ state, onClose }: Props) {
  return (
    <ErrorBoundary
      fallback={retry => (
        <div style={backdropStyle} role="alertdialog" aria-modal="true" aria-label="生涯報告錯誤">
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 0.6rem', fontSize: '1.15rem' }}>生涯報告暫時無法顯示</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#5a5148', lineHeight: 1.6 }}>
              生成報告時發生了未預期的錯誤，不過你的遊戲進度與其他生涯紀錄都完好無損。
              如果遊戲最近更新過，重新整理頁面通常就能解決。
            </p>
            <div style={btnRowStyle}>
              <button
                type="button"
                style={primaryBtnStyle}
                onClick={() => {
                  retry();
                  onClose();
                }}
              >
                關閉
              </button>
              <button type="button" style={ghostBtnStyle} onClick={() => window.location.reload()}>
                重新整理頁面
              </button>
            </div>
          </div>
        </div>
      )}
    >
      <Suspense
        fallback={
          <div style={{ ...backdropStyle, background: 'rgba(10, 8, 6, 0.45)' }}>
            <div style={{ color: '#faf7f0', fontSize: '0.95rem' }}>正在載入生涯報告…</div>
          </div>
        }
      >
        <LifeReport state={state} onClose={onClose} />
      </Suspense>
    </ErrorBoundary>
  );
}
