// 生涯報告用的名字產生器

const DINO_NAMES = [
  '阿岩', '小霧', '赤爪', '黑尾', '蕨葉', '雷鼓', '石牙', '晨星', '灰鱗', '銅角',
  '火羽', '沙丘', '長鳴', '裂谷', '暮光', '琥珀', '苔原', '疾風', '寒溪', '烈陽',
];

const MATE_NAMES = ['月河', '青苔', '白羽', '晴嵐', '暖石', '花冠', '溪光', '銀角', '柔鱗', '初雪'];

const RIVAL_NAMES = ['斷牙', '獨眼', '灰疤', '裂顎', '夜行者', '血角'];

const SCIENTISTS = [
  { name: '林昱辰 博士', org: '國立自然科學博物館' },
  { name: 'Dr. Evelyn Hartley', org: '蒙大拿州立大學 古生物學系' },
  { name: '巴特爾 教授', org: '蒙古科學院 古生物研究所' },
  { name: 'Dr. Aiko Tanaka', org: '福井縣立恐龍博物館' },
  { name: 'Dr. Marcus Oyelaran', org: '亞伯達省皇家泰瑞爾博物館' },
];

/** 以字串產生穩定的雜湊值，讓同一局遊戲的報告內容固定 */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 由種子產生的偽隨機數（mulberry32） */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

const CUTE_NAMES = ['麻糬', '布丁', '小豆', '咕嚕', '阿胖', '小刺', '糰子', '芝麻', '豆花', '毛毛', '噗噗', '小栗'];

export function randomDinoName(): string {
  return pick(DINO_NAMES, Math.random());
}

/** 取名畫面用：從酷名字與可愛名字中各抽，回傳不重複的 n 個建議 */
export function nameSuggestions(n = 3, exclude: string[] = []): string[] {
  const pool = [...DINO_NAMES, ...CUTE_NAMES].filter(x => !exclude.includes(x));
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

export function randomMateName(): string {
  return pick(MATE_NAMES, Math.random());
}

export function rivalNameFor(seed: number): string {
  return pick(RIVAL_NAMES, seededRandom(seed)());
}

export function scientistFor(seed: number) {
  return pick(SCIENTISTS, seededRandom(seed + 7)());
}
