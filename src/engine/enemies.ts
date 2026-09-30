// ========== 3D 戰鬥敵人資料 ==========

export type ModelKind =
  | 'theropod'
  | 'raptor'
  | 'ceratops'
  | 'hadrosaur'
  | 'therizino'
  | 'ornitho'
  | 'croc'
  | 'ankylo'
  | 'ptero'
  | 'chicken';

export type EnemyMove = 'lunge' | 'double' | 'sweep' | 'stomp';

export interface EnemyTemplate {
  id: string;
  name: string;
  model: ModelKind;
  color: number;
  accent: number;
  scale: number;
  hpMult: number;
  dmgMult: number;
  /** 蓄力（預警）秒數 */
  windup: number;
  /** 攻擊後的破綻秒數 */
  recovery: number;
  /** 兩次攻擊間的待機秒數 */
  idle: number;
  moves: Partial<Record<EnemyMove, number>>;
  /** 衝撞／咬受到的傷害倍率（缺省 1） */
  chargeTaken?: number;
  biteTaken?: number;
  /** 衝撞被閃開的機率（缺省 0） */
  evadeCharge?: number;
  boss?: boolean;
  intro: string;
  fact?: string;
}

export interface EnemyProfile extends EnemyTemplate {
  maxHp: number;
  damage: number;
}

export const ENEMIES: Record<string, EnemyTemplate> = {
  small_theropod: {
    id: 'small_theropod', name: '小型獸腳類', model: 'raptor', color: 0x8a7a55, accent: 0x5a4a30, scale: 0.8,
    hpMult: 0.6, dmgMult: 0.6, windup: 0.8, recovery: 0.9, idle: 1.1,
    moves: { lunge: 4, double: 1 },
    evadeCharge: 0.3,
    intro: '一隻瘦小的獸腳類擋住去路，牠看起來和你一樣餓。',
  },
  raptor: {
    id: 'raptor', name: '馳龍獵手', model: 'raptor', color: 0x6d5b8a, accent: 0xd9a441, scale: 0.9,
    hpMult: 0.8, dmgMult: 0.85, windup: 0.6, recovery: 0.7, idle: 0.8,
    moves: { lunge: 3, double: 3 },
    evadeCharge: 0.35,
    intro: '快速、狡猾、會連續撲咬。注意牠的二段攻擊！',
    fact: '馳龍類後腳第二趾有一枚可以抬起的大鉤爪，可能用來壓制獵物。',
  },
  tyrant: {
    id: 'tyrant', name: '成年暴龍', model: 'theropod', color: 0x6b4f3a, accent: 0x3d2b1f, scale: 1.25,
    hpMult: 1.3, dmgMult: 1.35, windup: 0.85, recovery: 0.9, idle: 1.0,
    moves: { lunge: 3, sweep: 2, stomp: 1 },
    intro: '大地在震動。頂級掠食者正盯著你——每一口都足以致命。',
    fact: '暴龍擁有雙眼立體視覺，而且嗅覺極為發達。',
  },
  ceratops: {
    id: 'ceratops', name: '暴怒的角龍', model: 'ceratops', color: 0x5d6b3a, accent: 0xd8c9a0, scale: 1.1,
    hpMult: 1.3, dmgMult: 1.2, windup: 0.9, recovery: 1.0, idle: 1.1,
    moves: { lunge: 4, stomp: 1 },
    chargeTaken: 0.7, biteTaken: 1.1,
    intro: '三根尖角對準了你。牠的衝鋒又快又重！',
  },
  hadrosaur: {
    id: 'hadrosaur', name: '埃德蒙頓龍', model: 'hadrosaur', color: 0x7a6a4a, accent: 0xb58d5a, scale: 1.1,
    hpMult: 1.0, dmgMult: 0.8, windup: 1.0, recovery: 1.0, idle: 1.2,
    moves: { sweep: 3, stomp: 2 },
    chargeTaken: 1.2,
    intro: '體型巨大的鴨嘴龍拚命反抗，粗壯的尾巴橫掃而來。',
    fact: '埃德蒙頓龍的嘴裡有上千顆排列緊密的牙齒，能磨碎堅韌的植物。',
  },
  rival: {
    id: 'rival', name: '挑戰者', model: 'theropod', color: 0x555555, accent: 0x8b0000, scale: 1.0,
    hpMult: 1.0, dmgMult: 1.0, windup: 0.8, recovery: 0.8, idle: 1.0,
    moves: { lunge: 3, double: 1, sweep: 1 },
    intro: '同類的挑戰者。這是一場尊嚴之戰！',
  },
  croc: {
    id: 'croc', name: '巨鱷', model: 'croc', color: 0x3f5a3a, accent: 0x9aa36b, scale: 1.2,
    hpMult: 1.2, dmgMult: 1.25, windup: 0.75, recovery: 1.0, idle: 1.3,
    moves: { lunge: 4, sweep: 2 },
    intro: '水面下伏擊的巨鱷！牠的咬合力驚人，還會用尾巴掃擊。',
    fact: '恐鱷（Deinosuchus）是白堊紀晚期的巨型鱷類，體長可達 10 公尺以上，會捕食恐龍。',
  },
  ankylo: {
    id: 'ankylo', name: '甲龍', model: 'ankylo', color: 0x6b6450, accent: 0x3c3a30, scale: 1.1,
    hpMult: 1.6, dmgMult: 1.3, windup: 1.0, recovery: 1.1, idle: 1.2,
    moves: { sweep: 4, stomp: 1 },
    chargeTaken: 0.6, biteTaken: 1.15,
    intro: '全身裝甲的甲龍！小心牠的尾錘橫掃——那可以打碎骨頭。',
    fact: '甲龍的尾錘由融合的骨板構成，研究估計揮擊力量足以擊碎大型掠食者的腿骨。',
  },
  ptero: {
    id: 'ptero', name: '風神翼龍', model: 'ptero', color: 0xb7a58a, accent: 0xc0392b, scale: 1.1,
    hpMult: 0.9, dmgMult: 1.0, windup: 0.7, recovery: 0.9, idle: 1.0,
    moves: { lunge: 3, double: 2 },
    evadeCharge: 0.35,
    intro: '翼展超過 10 公尺的巨型翼龍在地面上大步逼近——牠要把你當點心！',
    fact: '風神翼龍站立時和長頸鹿差不多高。許多學者認為牠們像鸛鳥一樣在地面上捕食小型動物。',
  },
  scorched_tyrant: {
    id: 'scorched_tyrant', name: '焦土暴君', model: 'theropod', color: 0x2b1d18, accent: 0xff5a1f, scale: 1.45,
    hpMult: 2.4, dmgMult: 1.4, windup: 0.8, recovery: 0.8, idle: 0.8,
    moves: { lunge: 3, double: 2, sweep: 2, stomp: 2 },
    boss: true,
    intro: '被天火灼傷、因飢餓而瘋狂的巨型暴龍。牠要搶奪你最後的避難所！',
  },
  albino_tyrant: {
    id: 'albino_tyrant', name: '白化暴君', model: 'theropod', color: 0xeeeae0, accent: 0xd03030, scale: 1.35,
    hpMult: 2.0, dmgMult: 1.3, windup: 0.75, recovery: 0.8, idle: 0.85,
    moves: { lunge: 3, double: 2, sweep: 2, stomp: 1 },
    boss: true,
    intro: '傳說中的白色巨獸。能活到今天，代表牠從未輸過。',
    fact: '白化症在現代爬行動物與鳥類中都曾被記錄，但在野外通常存活率很低。',
  },
};

export function buildEnemyProfile(enemyId: string | undefined, threatDC: number): EnemyProfile {
  const t = ENEMIES[enemyId || 'rival'] || ENEMIES.rival;
  const maxHp = Math.round((230 + threatDC * 15) * t.hpMult);
  const damage = Math.round((5 + threatDC * 0.9) * t.dmgMult);
  return { ...t, maxHp, damage };
}
