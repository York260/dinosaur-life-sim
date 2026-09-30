import { GameState, ChronicleEntry, Stats, StatKey } from './types';
import { getEffectiveStat } from './traits';
import { hashString, seededRandom, rivalNameFor, scientistFor } from './names';

// ==========================================================
// 生涯報告：把一局遊戲整理成一份「標本生涯檔案」
// ==========================================================

export type ReportTone = 'legend' | 'good' | 'lone' | 'dead';

export interface ReportFigure { label: string; value: string; note?: string }
export interface ReportBond { icon: string; who: string; relation: string; status: string; note: string }
export interface ReportFeat { icon: string; title: string; desc: string }
export interface ReportQuote { icon: string; speaker: string; role: string; quote: string }

export interface LifeReport {
  seed: number;
  catalogNo: string;
  name: string;
  speciesName: string;
  epithet: string;
  tone: ReportTone;
  outcomeTitle: string;
  outcomeLine: string;
  rank: string | null;
  yearsLived: number;
  figures: ReportFigure[];
  attributes: Record<StatKey, number>;
  chronicle: ChronicleEntry[];
  bonds: ReportBond[];
  feats: ReportFeat[];
  quotes: ReportQuote[];
  scientist: { name: string; org: string };
  specimenNotes: string[];
  scientistVerdict: string;
  epitaph: string;
}

const SPECIES_CODE: Record<string, string> = {
  trex: 'TRX', velociraptor: 'VLR', triceratops: 'TRC', parasaurolophus: 'PRS',
  therizinosaurus: 'THZ', struthiomimus: 'STR', chicken: 'GAL',
};

const SITES: Record<string, string> = {
  trex: '蒙大拿州地獄溪組',
  triceratops: '南達科他州地獄溪組',
  velociraptor: '蒙古戈壁沙漠',
  therizinosaurus: '蒙古耐梅蓋特盆地',
  parasaurolophus: '亞伯達省恐龍公園組',
  struthiomimus: '亞伯達省紅鹿河谷',
  chicken: '一座農場的後院',
};

function countBy(list: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const x of list) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function eff(state: GameState, k: StatKey) {
  return getEffectiveStat(state.stats[k], k, state.traits, state.hunger);
}

export function buildLifeReport(state: GameState): LifeReport {
  const sp = state.species!;
  const rs = state.runStats;
  const f = state.flags;
  const eg = state.endgame;
  const seed = hashString(`${state.dinoName}|${sp.id}|${state.year}|${rs.fightsWon}|${state.chronicle.length}`);
  const rnd = seededRandom(seed);
  const name = state.dinoName || '無名者';
  const reachedEnd = !!eg;
  const dead = !eg || eg.ending === 'total_wipe';
  const yearsLived = Math.min(state.year, state.maxYear);
  const fights = rs.fightsWon + rs.fightsLost;
  const survivedPack = eg?.finalPack ?? 0;
  const tone: ReportTone = !eg ? 'dead'
    : eg.ending === 'legend' ? 'legend'
    : eg.ending === 'pack_survives' ? 'good'
    : eg.ending === 'lone_survivor' ? 'lone' : 'dead';

  // ---------- 稱號 ----------
  let epithet: string;
  if (eg?.ending === 'legend') epithet = '新世界的始祖';
  else if (f.albino_beaten) epithet = '白色傳說';
  else if (eg?.bossDefeated) epithet = '弒君者';
  else if (rs.fightsWon >= 6) epithet = '百戰之王';
  else if (rs.perfectDodges >= 8) epithet = '無影者';
  else if (rs.maxPack >= 8) epithet = '大家長';
  else if (state.knowledge >= 8) epithet = '白堊紀的智者';
  else if (f.spared_mammal && rs.fightsWon <= 1) epithet = '仁慈者';
  else if (rs.matesLost > 0 && state.hasMate) epithet = '重生之心';
  else if (!eg && state.year <= 6) epithet = '早逝的星辰';
  else if (eg?.ending === 'lone_survivor') epithet = '孤行者';
  else if (eg?.ending === 'pack_survives') epithet = '守護者';
  else epithet = '不屈者';

  // ---------- 結局 ----------
  const outcomeTitle = eg ? eg.title : '生命終結';
  const outcomeLine = !eg
    ? `${state.deathCause ?? '牠在荒野中倒下了。'}（第 ${state.year} 年，距離末日還有 ${Math.max(0, state.maxYear - state.year)} 年）`
    : eg.ending === 'total_wipe'
      ? '牠撐到了末日，卻沒能走出那場漫長的黑暗。'
      : eg.ending === 'lone_survivor'
        ? '牠獨自走出了黑暗，成為灰燼之上的倖存者。'
        : `牠帶著 ${survivedPack} 名族人走出了黑暗。`;

  // ---------- 數據 ----------
  const figures: ReportFigure[] = [
    { label: '存活年數', value: `${yearsLived}`, note: reachedEnd ? '撐到了末日' : '未能抵達末日' },
    { label: '戰績', value: `${rs.fightsWon} 勝 ${rs.fightsLost} 敗`, note: fights ? `勝率 ${Math.round((rs.fightsWon / fights) * 100)}%` : '一生未曾戰鬥' },
    { label: '造成傷害', value: `${rs.damageDealt}`, note: '3D 戰鬥累計' },
    { label: '完美閃避', value: `${rs.perfectDodges}`, note: `最高連擊 ${rs.bestCombo}` },
    { label: '族群巔峰', value: `${rs.maxPack}`, note: `孵化 ${rs.births}・失去 ${rs.packLost}` },
    { label: '古生物知識', value: `${state.knowledge}`, note: `稀有事件 ${rs.rareEvents} 次` },
    { label: '大成功 / 大失敗', value: `${rs.critSuccesses} / ${rs.critFailures}`, note: '命運的骰子' },
    eg
      ? { label: '審判評等', value: eg.rank, note: `評分 ${eg.score}・知識題 ${eg.quizCorrect}/${eg.quizTotal}` }
      : { label: '死因', value: '倒下', note: `第 ${state.year} 年` },
  ];

  const attributes = { str: eff(state, 'str'), agi: eff(state, 'agi'), int: eff(state, 'int'), cha: eff(state, 'cha') } as Stats;

  // ---------- 生涯大事記 ----------
  const chronicle: ChronicleEntry[] = [...state.chronicle];
  if (eg) {
    for (const l of eg.log) {
      chronicle.push({ year: state.maxYear + 1, icon: l.good ? '☄️' : '🔥', text: l.title, kind: l.good ? 'legend' : 'danger' });
    }
  } else {
    chronicle.push({ year: state.year, icon: '💀', text: state.deathCause ?? '生命走到了盡頭', kind: 'danger' });
  }

  // ---------- 情感羈絆 ----------
  const bonds: ReportBond[] = [];
  const rivalName = rivalNameFor(seed);
  if (state.mateName) {
    bonds.push({
      icon: state.hasMate ? '💕' : '💔',
      who: `「${state.mateName}」`,
      relation: '伴侶',
      status: state.hasMate ? (dead ? '相守至最後一刻' : '一同走出黑暗') : '已先一步離去',
      note: state.hasMate ? '你們一起孵育了族群的下一代。' : '失去伴侶的那一年，你在牠倒下的地方站了一整夜。',
    });
  } else if (rs.matesLost > 0) {
    bonds.push({ icon: '💔', who: '伴侶', relation: '伴侶', status: '已先一步離去', note: '有些名字，說出口就會痛。' });
  } else {
    bonds.push({ icon: '🌙', who: '——', relation: '伴侶', status: '一生未曾遇見', note: '也許在另一條時間線上，有誰一直在等你。' });
  }
  if (f.sibling_joined) bonds.push({ icon: '🫂', who: '最瘦小的手足', relation: '手足', status: '重逢，並肩到最後', note: '小時候你把食物讓給牠；長大後牠用一生回報你。' });
  else if (f.sibling_bond) bonds.push({ icon: '🤲', who: '最瘦小的手足', relation: '手足', status: '失散於荒野', note: '你始終不知道牠後來過得好不好。' });
  else if (f.sibling_rival) bonds.push({ icon: '🥊', who: '同窩的手足', relation: '手足', status: '從小的競爭者', note: '你總是搶到最大的那一份。' });
  if (f.egg_hatched) {
    bonds.push(f.ptero_friend
      ? { icon: '🪽', who: '小翼龍', relation: '養子', status: '飛向了天空', note: '你孵出的不是恐龍。但牠始終記得你是誰。' }
      : { icon: '🐣', who: '被遺棄的蛋', relation: '養子', status: '成為族群的一員', note: '那顆蛋被你守護了兩年。' });
  } else if (f.adopted_egg) {
    bonds.push({ icon: '🥚', who: '被遺棄的蛋', relation: '養子', status: '沒能等到孵化', note: '你守著它，直到最後。' });
  }
  if (f.ally_rival) bonds.push({ icon: '🤝', who: `流浪戰士「${rivalName}」`, relation: '摯友', status: '不打不相識', note: '一頓分享的晚餐，換來一生的情誼。' });
  else if (f.rival_beaten) bonds.push({ icon: '⚔️', who: `流浪戰士「${rivalName}」`, relation: '宿敵', status: '敗於你的爪下', note: '牠倒地時，你沒有咬下最後一口。' });
  if (f.spared_mammal) bonds.push({ icon: '🐭', who: '小毛球', relation: '萍水相逢', status: '被你放走了', note: '你不知道，那是人類的遠祖。' });
  if (rs.maxPack > 0) {
    bonds.push({
      icon: '🦕', who: `族群（巔峰 ${rs.maxPack} 隻）`, relation: '族人',
      status: eg ? `${survivedPack} 名族人撐到了最後` : `${state.packSize} 名族人為你送行`,
      note: rs.packLost > 0 ? `一路上失去了 ${rs.packLost} 名族人。牠們的名字，你都記得。` : '沒有任何一名族人因你而死。',
    });
  }

  // ---------- 豐功偉業 ----------
  const feats: ReportFeat[] = [];
  if (eg?.ending === 'legend') feats.push({ icon: '🌟', title: '改寫地球歷史', desc: `帶領 ${survivedPack} 名族人撐過白堊紀末大滅絕。` });
  else if (eg && eg.ending !== 'total_wipe') feats.push({ icon: '🌅', title: '撐過三重審判', desc: '在一顆直徑 10 公里的小行星撞擊後活了下來。' });
  if (f.albino_beaten) feats.push({ icon: '🤍', title: '擊敗白化暴君', desc: '打破了一個從未輸過的傳說。' });
  if (eg?.bossDefeated) feats.push({ icon: '👑', title: '弒君', desc: '在末日的焦土上擊倒了焦土暴君。' });
  for (const [foe, n] of countBy(rs.enemiesDefeated).slice(0, 4)) {
    feats.push({ icon: '⚔️', title: `擊敗${foe}${n > 1 ? ` ×${n}` : ''}`, desc: n > 1 ? `同樣的對手，贏了 ${n} 次。` : '一場記在骨頭上的勝利。' });
  }
  if (rs.perfectDodges >= 3) feats.push({ icon: '💨', title: `完美閃避 ${rs.perfectDodges} 次`, desc: '在尖牙落下的前一瞬間離開原地。' });
  if (rs.bestCombo >= 5) feats.push({ icon: '🔥', title: `${rs.bestCombo} 連擊`, desc: '撕咬如暴雨般落下。' });
  if (eg && eg.quizTotal >= 2 && eg.quizCorrect === eg.quizTotal) feats.push({ icon: '🎓', title: '看穿天災', desc: '末日的每一道知識題都答對了。' });
  if (rs.maxPack >= 5) feats.push({ icon: '🏕️', title: `建立 ${rs.maxPack} 隻的族群`, desc: '從孤身一人，到一整個家族。' });
  if (rs.births >= 3) feats.push({ icon: '🐣', title: `孵育 ${rs.births} 隻幼崽`, desc: '每一隻都在巢裡被好好守護過。' });
  if (rs.critSuccesses >= 3) feats.push({ icon: '🎲', title: `大成功 ${rs.critSuccesses} 次`, desc: '命運之神顯然偏愛你。' });
  if (state.knowledge >= 6) feats.push({ icon: '📖', title: `累積 ${state.knowledge} 點古生物知識`, desc: '比同時代的任何恐龍都更了解這個世界。' });
  if (f.omen_seen) feats.push({ icon: '🌠', title: '預見末日', desc: '在所有恐龍之前，注意到了那顆越來越亮的星。' });
  if (feats.length === 0) feats.push({ icon: '🌿', title: '平凡而真實的一生', desc: '在白堊紀，每多活一天，都是一場勝利。' });

  // ---------- 評語 ----------
  const quotes: ReportQuote[] = [];
  const firstPackYear = state.chronicle.find(c => c.kind === 'pack')?.year;

  if (state.mateName && state.hasMate) {
    quotes.push({
      icon: '💕', speaker: `「${state.mateName}」`, role: '伴侶',
      quote: dead
        ? `牠說過要帶我們看見明天的太陽。牠做到了一半……另一半，換我替牠完成。`
        : `天空燒起來那天，${name}回頭看我的眼神，我到現在都還記得。那不是害怕，是「跟緊我」。`,
    });
  }
  if (rs.maxPack > 0) {
    const packQuotes = [
      firstPackYear ? `我是第 ${firstPackYear} 年孵出來的。從我睜開眼睛那一刻，${name}就站在我前面，替我擋住所有東西。` : `${name}總是最後一個吃，第一個醒。`,
      rs.packLost > 0
        ? `我們一共失去了 ${rs.packLost} 個兄弟姊妹。每一次，${name}都會在牠們倒下的地方站上一整夜。`
        : `跟著${name}這麼多年，我們一個都沒少。你知道這在白堊紀有多難嗎？`,
      eg?.ending === 'legend' ? `牠讓我們相信，恐龍的時代不必結束。` : `如果還有下輩子，我還要跟牠同一個巢。`,
    ];
    quotes.push({ icon: '🦕', speaker: '年輕的族人', role: '族群成員', quote: packQuotes[Math.floor(rnd() * packQuotes.length)] });
  }
  const topFoe = countBy(rs.enemiesDefeated)[0];
  if (topFoe) {
    const [foe, n] = topFoe;
    quotes.push({
      icon: '🦖', speaker: `一隻倖存的${foe}`, role: '手下敗將',
      quote: n > 1
        ? `我們試著吃掉牠 ${n} 次，${n} 次都失敗了。老實說……我開始尊敬牠了。`
        : `我只跟牠交手過一次。一次就夠了。直到現在，我的尾巴下雨天還會痛。`,
    });
  } else if (f.ally_rival) {
    quotes.push({ icon: '🤝', speaker: `「${rivalName}」`, role: '流浪戰士・摯友', quote: `我們沒打過架。牠請我吃了一頓——在白堊紀，這比什麼都珍貴。` });
  } else if (fights > 0) {
    quotes.push({ icon: '🦖', speaker: '某隻掠食者', role: '對手', quote: `那傢伙打架不怎麼樣，但就是死不掉。這種的最麻煩。` });
  } else {
    quotes.push({ icon: '🛡️', speaker: '一隻路過的甲龍', role: '鄰居', quote: `誰？沒什麼印象。牠好像一輩子都在躲架打……挺聰明的。` });
  }
  if (f.rival_beaten) {
    quotes.push({ icon: '⚔️', speaker: `「${rivalName}」`, role: '宿敵', quote: `牠打贏我那天，沒有咬下最後一口。我這輩子都搞不懂為什麼。` });
  }
  if (f.spared_mammal) {
    quotes.push({ icon: '🐭', speaker: '小毛球', role: '人類的遠祖', quote: `吱吱！吱……吱。（翻譯：那年你沒有吃掉我。我孩子的孩子的孩子，會記得你。）` });
  }
  if (f.ptero_friend) {
    quotes.push({ icon: '🪽', speaker: '小翼龍', role: '養子', quote: `嘎——！（牠在你頭頂繞了三圈，然後飛進了燃燒的天空。）` });
  }
  if (sp.id === 'chicken') {
    quotes.push({ icon: '🐔', speaker: '未來農場的母雞', role: '鄰居', quote: `咕咕咕。（翻譯：你到底跑去哪了？飼料都涼了。）` });
  }

  // ---------- 考古學家鑑定 ----------
  const scientist = scientistFor(seed);
  const site = SITES[sp.id] ?? '某處沉積岩層';
  const code = SPECIES_CODE[sp.id] ?? 'DIN';
  const catalogNo = `KPG-${code}-${String(seed % 10000).padStart(4, '0')}`;
  const specimenNotes: string[] = [];
  if (dead) {
    specimenNotes.push(`標本 ${catalogNo} 出土於${site}，保存狀況良好。`);
    specimenNotes.push(`骨骼切片中可數出 ${Math.max(1, yearsLived)} 道生長停滯線（LAGs），推定死亡年齡約 ${yearsLived} 歲。`);
    if (fights > 0) specimenNotes.push(`骨骼上可辨識出 ${fights + Math.floor(rnd() * 3)} 處癒合的咬痕與骨折，顯示這隻個體至少經歷過 ${fights} 場搏鬥。`);
    if (rs.perfectDodges >= 3) specimenNotes.push('後肢肌肉附著點異常粗壯——牠極可能擁有驚人的爆發力與閃避能力。');
    if (state.knowledge >= 4) specimenNotes.push('腦殼內模顯示大腦比例高於同類平均，這是一隻非常「聰明」的個體。');
    if (rs.maxPack >= 3) specimenNotes.push(`同一地層發現了 ${rs.maxPack} 具較小個體的遺骸，排列緊密，極可能是一個家族群。`);
    if (state.traits.some(t => !t.isPositive)) specimenNotes.push('部分骨骼有病理性增生，顯示牠曾帶著傷病生活了一段時間。');
    if (eg) specimenNotes.push('遺骸正好位於富含銥元素的 K-Pg 界線黏土層下方——牠死於那場大滅絕。');
  } else {
    specimenNotes.push(`${site}：在富含銥元素的 K-Pg 界線黏土層「上方」，發現了一組${sp.name}的足跡化石。`);
    specimenNotes.push(survivedPack > 0
      ? `足跡旁還有 ${survivedPack} 組較小的足跡，步伐間距一致，像是跟隨著牠前進。`
      : '只有這一組足跡，孤單地延伸向遠方，一直走到岩層的盡頭。');
    specimenNotes.push('依照現有理論，非鳥恐龍不應該出現在這個地層之上。');
    if (f.buried_amber) specimenNotes.push('附近還出土了一塊琥珀，周圍的土層有明顯的爪痕，像是被刻意埋下。');
  }
  const verdicts = dead
    ? ['每一塊化石都是一個被遺忘的故事。而這一個，我們終於讀懂了一部分。', `我替牠取了個名字，叫「${name}」。總覺得牠本來就叫這個名字。`]
    : ['如果這組足跡是真的，我們得重寫教科書。', '我在野外工作了三十年，第一次在化石前面說不出話來。'];
  const scientistVerdict = verdicts[Math.floor(rnd() * verdicts.length)];

  // ---------- 墓誌銘 ----------
  const epitaph = !eg
    ? '牠還來不及看見末日——但牠活過的每一天，都是真的。'
    : eg.ending === 'legend' ? '牠沒有滅絕。牠只是換了一種方式，繼續走下去。'
    : eg.ending === 'pack_survives' ? '牠留下的不是化石，是一個家族。'
    : eg.ending === 'lone_survivor' ? '最後一個站著的，就是贏家。'
    : '牠輸給了一顆從天而降的石頭，但從未輸給過命運。';

  return {
    seed, catalogNo, name, speciesName: sp.name, epithet, tone, outcomeTitle, outcomeLine,
    rank: eg?.rank ?? null, yearsLived, figures, attributes, chronicle, bonds, feats, quotes,
    scientist, specimenNotes, scientistVerdict, epitaph,
  };
}
