// ==========================================================
// 把整份生涯報告（.lr-sheet 節點）原樣截成完整圖片。
// 太長的話，會在「章節交界」而不是文字中間切成好幾張。
// ==========================================================

/** 單張畫布的高度預算（實際像素，含 pixelRatio 放大） */
const MAX_PAGE_PX = 3200 * 2;
/** 單張畫布的像素面積上限，超過就自動降低擷取解析度，避免記憶體爆掉 */
const CANVAS_PIXEL_BUDGET = 22_000_000;

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, err => { clearTimeout(t); reject(err); });
  });
}

function pickPixelRatio(w: number, h: number): number {
  let ratio = 2;
  while (w * h * ratio * ratio > CANVAS_PIXEL_BUDGET && ratio > 1) {
    ratio -= 0.25;
  }
  return Math.max(1, ratio);
}

export interface ReportPage {
  canvas: HTMLCanvasElement;
  index: number;
  total: number;
}

/**
 * 擷取整份報告，回傳一張或多張畫布（依內容長度自動切頁，
 * 切點對齊章節邊界，不會把文字切成一半）。
 */
export async function captureFullReport(sheetEl: HTMLElement): Promise<ReportPage[]> {
  const { toCanvas } = await import('html-to-image');

  const w = sheetEl.offsetWidth;
  const h = sheetEl.scrollHeight;
  const pixelRatio = pickPixelRatio(w, h);

  // 先量好每個章節相對於報告頂端的位置（CSS px），等等要拿來當切頁點
  const sectionEls = Array.from(sheetEl.querySelectorAll<HTMLElement>('.lr-hero, .lr-section, .lr-epitaph'));
  const sheetTop = sheetEl.getBoundingClientRect().top;
  const boundaries = sectionEls
    .map(el => Math.round((el.getBoundingClientRect().top - sheetTop) * pixelRatio))
    .filter(b => b > 0);

  // html-to-image 是把節點複製進一個 SVG foreignObject 再拍下來；CSS Grid 的
  // minmax(0, 1fr) 這類「自動縮到剛好」的寬度計算，在 foreignObject 裡有時會跟
  // 正常畫面算出差個幾 px 的結果，讓最右側的內容被裁掉。與其想辦法完全對齊，
  // 不如直接多留一點安全邊界寬度——寧可右側多一點點空白，也不要裁到文字。
  const WIDTH_MARGIN = 64;
  const fullCanvas = await withTimeout(
    toCanvas(sheetEl, {
      pixelRatio,
      backgroundColor: '#e8ebe3',
      cacheBust: true,
      width: w + WIDTH_MARGIN,
      // 不主動內嵌外部字型：字型已經由頁面的 <link> 載入並套用在畫面上了，
      // 這裡只是把「已經畫出來的樣子」拍下來，不需要再另外抓字型檔一次——
      // 這一步會連到 Google Fonts，網路較慢或被擋時反而會讓整個截圖卡住。
      skipFonts: true,
    }),
    20000,
    '報告截圖逾時',
  );

  if (fullCanvas.height <= MAX_PAGE_PX * 1.15) {
    return [{ canvas: fullCanvas, index: 0, total: 1 }];
  }

  const cuts = [0];
  let pageStart = 0;
  for (const b of boundaries) {
    if (b - pageStart > MAX_PAGE_PX && b > cuts[cuts.length - 1]) {
      cuts.push(b);
      pageStart = b;
    }
  }
  cuts.push(fullCanvas.height);

  const pages: HTMLCanvasElement[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const y0 = cuts[i];
    const y1 = cuts[i + 1];
    const pieceH = y1 - y0;
    if (pieceH <= 0) continue;
    const piece = document.createElement('canvas');
    piece.width = fullCanvas.width;
    piece.height = pieceH;
    const ctx = piece.getContext('2d')!;
    ctx.drawImage(fullCanvas, 0, y0, fullCanvas.width, pieceH, 0, 0, fullCanvas.width, pieceH);
    pages.push(piece);
  }

  return pages.map((canvas, index) => ({ canvas, index, total: pages.length }));
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('canvas.toBlob 失敗'))), 'image/png');
  });
}
