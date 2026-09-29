import { GameState } from './types';

// ==========================================================
// 本地存檔：目前進行中的一局（自動存讀，讓離開太久也不會重置）
// 與歷代生涯檔案庫（結束或死亡時自動封存，跨局保留）
// ==========================================================

const SAVE_KEY = 'dinolife_save_v2';
const ARCHIVE_KEY = 'dinolife_archive_v2';
const MAX_ARCHIVE = 24;

export interface ArchiveEntry {
  id: string;
  savedAt: number;
  state: GameState;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 粗略檢查存檔形狀是否可用，避免舊版或損毀的資料讓遊戲崩潰 */
function looksLikeGameState(v: unknown): v is GameState {
  return isPlainObject(v) && typeof v.phase === 'string' && Array.isArray((v as { chronicle?: unknown }).chronicle);
}

// ---------- 進行中的存檔 ----------

/** 儲存目前進度。刻意在每次狀態變化時呼叫，這樣分頁被瀏覽器/系統回收、
 * 手機切到背景太久、或不小心重新整理，都能接續原本的進度。 */
export function saveCurrentRun(state: GameState) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // 無痕模式、儲存空間已滿等情況下靜默失敗——遊戲本身仍可正常進行
  }
}

export function loadCurrentRun(): GameState | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return looksLikeGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCurrentRun() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

// ---------- 歷代生涯檔案庫 ----------

/** 封存前先清掉只在單一回合內有意義的暫時欄位，減少儲存空間 */
function trimForArchive(state: GameState): GameState {
  return {
    ...state,
    currentEvent: null,
    selectedMainAction: null,
    selectedSubAction: null,
    yearResolution: null,
    growthRoll: null,
    yearNotes: [],
    log: [],
  };
}

export function loadArchive(): ArchiveEntry[] {
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is ArchiveEntry =>
        isPlainObject(e) && typeof e.id === 'string' && typeof e.savedAt === 'number' && looksLikeGameState(e.state),
    );
  } catch {
    return [];
  }
}

function saveArchive(list: ArchiveEntry[]) {
  try {
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list));
  } catch {
    // 儲存空間不足時，先試著只留最新一半再存一次
    try {
      window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list.slice(0, Math.ceil(list.length / 2))));
    } catch {
      // 仍然失敗就放棄——不影響遊戲本身
    }
  }
}

/** 在結局或死亡的當下呼叫一次，把這一局封存進歷代生涯檔案庫 */
export function archiveRun(state: GameState): ArchiveEntry | null {
  if (!state.species) return null;
  const entry: ArchiveEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    savedAt: Date.now(),
    state: trimForArchive(state),
  };
  const list = [entry, ...loadArchive()].slice(0, MAX_ARCHIVE);
  saveArchive(list);
  return entry;
}

export function deleteArchiveEntry(id: string) {
  saveArchive(loadArchive().filter(e => e.id !== id));
}
