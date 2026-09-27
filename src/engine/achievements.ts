import { GameState, EndingType, ArenaOutcome } from './types';

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  desc: string;
  secret?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', icon: '🩸', name: '初嚐血味', desc: '在 3D 戰鬥中獲勝' },
  { id: 'perfect_dodger', icon: '💨', name: '閃避大師', desc: '單場戰鬥完美閃避 3 次以上' },
  { id: 'combo_king', icon: '🔥', name: '連擊之王', desc: '打出 6 連擊以上' },
  { id: 'interrupter', icon: '✋', name: '先發制人', desc: '單場戰鬥打斷敵人 3 次以上' },
  { id: 'tyrant_slayer', icon: '👑', name: '弒君者', desc: '擊敗焦土暴君' },
  { id: 'albino_hunter', icon: '🤍', name: '白色傳說', desc: '擊敗傳說中的白化暴君', secret: true },
  { id: 'scholar', icon: '🎓', name: '古生物學家', desc: '末日知識題全部答對（至少 2 題）' },
  { id: 'big_family', icon: '👨‍👩‍👧‍👦', name: '大家族', desc: '族群達到 8 隻以上' },
  { id: 'foster_parent', icon: '🥚', name: '養父母', desc: '孵化一顆被遺棄的蛋' },
  { id: 'survivor', icon: '🌅', name: '倖存者', desc: '撐過三重審判' },
  { id: 'legend', icon: '🌟', name: '新世界的始祖', desc: '達成傳說結局' },
  { id: 'lone_wolf', icon: '🐺', name: '孤高', desc: '以孤獨倖存結局通關' },
  { id: 'iron_will', icon: '🛡️', name: '絕地求生', desc: '以 15 以下的 HP 撐過末日' },
  { id: 'furball', icon: '🐭', name: '人類之祖的恩人', desc: '放過一隻小毛球，並撐到了末日', secret: true },
  { id: 'chicken', icon: '🐔', name: '時空迷途', desc: '用隱藏物種遊玩', secret: true },
  { id: 'amber', icon: '💎', name: '時間膠囊', desc: '親手埋下一塊琥珀', secret: true },
];

const KEY = 'dinolife_achievements_v1';

export function loadAchievements(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAchievements(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // 無痕模式等情況下忽略
  }
}

/** 解鎖並回傳本次新解鎖的成就 id */
export function unlock(ids: string[]): string[] {
  const have = new Set(loadAchievements());
  const fresh = ids.filter(id => !have.has(id));
  if (fresh.length) saveAchievements([...have, ...fresh]);
  return fresh;
}

export function arenaAchievements(o: ArenaOutcome, enemyId?: string): string[] {
  const out: string[] = [];
  if (o.result === 'victory') out.push('first_blood');
  if (o.perfectDodges >= 3) out.push('perfect_dodger');
  if (o.maxCombo >= 6) out.push('combo_king');
  if (o.interrupts >= 3) out.push('interrupter');
  if (o.result === 'victory' && enemyId === 'scorched_tyrant') out.push('tyrant_slayer');
  if (o.result === 'victory' && enemyId === 'albino_tyrant') out.push('albino_hunter');
  return out;
}

export function lifeAchievements(state: GameState): string[] {
  const out: string[] = [];
  if (state.runStats.maxPack >= 8) out.push('big_family');
  if (state.flags.egg_hatched) out.push('foster_parent');
  if (state.species?.id === 'chicken') out.push('chicken');
  if (state.flags.buried_amber) out.push('amber');
  return out;
}

export function endingAchievements(
  state: GameState,
  ending: EndingType,
  finalHp: number,
  quizCorrect: number,
  quizTotal: number,
): string[] {
  const out = lifeAchievements(state);
  if (ending !== 'total_wipe') {
    out.push('survivor');
    if (finalHp <= 15) out.push('iron_will');
    if (state.flags.spared_mammal) out.push('furball');
  }
  if (ending === 'legend') out.push('legend');
  if (ending === 'lone_survivor') out.push('lone_wolf');
  if (quizTotal >= 2 && quizCorrect === quizTotal) out.push('scholar');
  return out;
}

// ---------- 隱藏物種解鎖 ----------

const SECRET_KEY = 'dinolife_secret_species';

export function isSecretUnlocked(): boolean {
  try {
    return window.localStorage.getItem(SECRET_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSecretUnlocked() {
  try {
    window.localStorage.setItem(SECRET_KEY, '1');
  } catch {
    // ignore
  }
}
