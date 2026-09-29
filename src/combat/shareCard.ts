import { LifeReport } from '../engine/report';

// ==========================================================
// 生涯報告的「分享卡」：把肖像 + 關鍵數據 + 一句話結語，
// 組成一張直式圖片，方便下載或用系統分享功能傳出去。
// ==========================================================

const W = 1080;
const IMG_H = 810; // 肖像區（4:3，與 portrait.ts 的 960x720 同比例）
const PANEL_H = 820;
const H = IMG_H + PANEL_H;

const SERIF = '"Noto Serif TC", "Songti TC", "PMingLiU", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif';

const TONE_ACCENT: Record<LifeReport['tone'], string> = {
  legend: '#c9962a',
  good: '#3f7a55',
  lone: '#6d7480',
  dead: '#b3372c',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = src;
  });
}

/** 以 cover 方式（裁切填滿，不變形）把圖片畫進指定區域 */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** 簡易斷行：依 maxWidth 換行，回傳畫完後的下一個 y 座標 */
function wrapText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3,
): number {
  const chars = [...text];
  let line = '';
  let lines = 0;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines + 1 >= maxLines) {
        ctx.fillText(`${line}…`, x, y);
        return y + lineHeight;
      }
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = chars[i];
      lines++;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

export async function renderShareCard(report: LifeReport, portraitDataUrl: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const accent = TONE_ACCENT[report.tone];

  // ---------- 背景 ----------
  ctx.fillStyle = '#e8ebe3';
  ctx.fillRect(0, 0, W, H);

  // ---------- 上半：肖像 ----------
  const img = await loadImage(portraitDataUrl);
  drawCover(ctx, img, 0, 0, W, IMG_H);

  // 與下方紙張的過渡陰影
  const seam = ctx.createLinearGradient(0, IMG_H - 60, 0, IMG_H);
  seam.addColorStop(0, 'rgba(10,8,6,0)');
  seam.addColorStop(1, 'rgba(10,8,6,0.35)');
  ctx.fillStyle = seam;
  ctx.fillRect(0, IMG_H - 60, W, 60);

  // ---------- 下半：檔案紙面板 ----------
  let y = IMG_H + 56;
  const padX = 64;
  const contentW = W - padX * 2;

  // 標本編號
  ctx.fillStyle = '#4b5752';
  ctx.font = `500 26px ui-monospace, "SFMono-Regular", Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(`標本編號 ${report.catalogNo}`, padX, y);

  // 稱號徽章（右側）
  ctx.font = `700 26px ${SERIF}`;
  const badge = `稱號：${report.epithet}`;
  const badgeW = ctx.measureText(badge).width + 40;
  ctx.strokeStyle = '#b3372c';
  ctx.lineWidth = 3;
  ctx.strokeRect(W - padX - badgeW, y - 38, badgeW, 50);
  ctx.fillStyle = '#b3372c';
  ctx.fillText(badge, W - padX - badgeW + 20, y - 4);

  y += 66;
  // 名字
  ctx.fillStyle = '#1d2623';
  ctx.font = `900 62px ${SERIF}`;
  ctx.fillText(`${report.speciesName}「${report.name}」`, padX, y);

  y += 58;
  // 結局
  ctx.fillStyle = accent;
  ctx.fillRect(padX, y, 6, 74);
  ctx.font = `700 34px ${SERIF}`;
  ctx.fillStyle = '#1d2623';
  ctx.fillText(report.outcomeTitle, padX + 24, y + 32);
  ctx.font = `400 24px ${SANS}`;
  ctx.fillStyle = '#4b5752';
  wrapText(ctx, report.outcomeLine, padX + 24, y + 68, contentW - 24, 32, 1);

  y += 118;

  // ---------- 數據列 ----------
  const stats: [string, string][] = [
    ['存活', `${report.yearsLived} 年`],
    ['戰績', report.figures.find(f => f.label === '戰績')?.value ?? '—'],
    ['族群巔峰', report.figures.find(f => f.label === '族群巔峰')?.value ?? '—'],
    ['評等', report.rank ?? '—'],
  ];
  const cellW = contentW / 4;
  ctx.textAlign = 'center';
  for (let i = 0; i < stats.length; i++) {
    const cx = padX + cellW * i + cellW / 2;
    ctx.font = `600 22px ${SANS}`;
    ctx.fillStyle = '#4b5752';
    ctx.fillText(stats[i][0], cx, y);
    ctx.font = `900 44px ${SERIF}`;
    ctx.fillStyle = '#1d2623';
    ctx.fillText(stats[i][1], cx, y + 46);
    if (i > 0) {
      ctx.strokeStyle = '#b9c0b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX + cellW * i, y - 30);
      ctx.lineTo(padX + cellW * i, y + 54);
      ctx.stroke();
    }
  }
  ctx.textAlign = 'left';
  y += 100;

  // 分隔線
  ctx.strokeStyle = '#1d2623';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(W - padX, y);
  ctx.stroke();
  y += 48;

  // ---------- 一句評語 ----------
  const quote = report.quotes[0];
  if (quote) {
    ctx.font = `900 60px ${SERIF}`;
    ctx.fillStyle = accent;
    ctx.fillText('“', padX - 8, y + 24);
    ctx.font = `600 28px ${SERIF}`;
    ctx.fillStyle = '#1d2623';
    y = wrapText(ctx, `${quote.quote}`, padX + 36, y, contentW - 36, 38, 2);
    ctx.font = `400 22px ${SANS}`;
    ctx.fillStyle = '#4b5752';
    ctx.fillText(`—— ${quote.speaker}，${quote.role}`, padX + 36, y + 6);
    y += 60;
  }

  // ---------- 墓誌銘 ----------
  // 用 max() 保底：就算前面的評語較長，墓誌銘也不會被往上擠到和它重疊，
  // 同時仍保留和頁尾之間足夠的間距。
  const epitaphY = Math.max(y + 30, H - 150);
  ctx.textAlign = 'center';
  ctx.font = `900 32px ${SERIF}`;
  ctx.fillStyle = '#1d2623';
  wrapText(ctx, report.epitaph, W / 2, epitaphY, contentW, 42, 2);

  // ---------- 頁尾 ----------
  ctx.font = `500 20px ${SANS}`;
  ctx.fillStyle = '#4b5752';
  ctx.fillText('🦖 恐龍人生模擬器・DinoLife Simulator', W / 2, H - 32);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}
