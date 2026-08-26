import { GameState, EndgamePhaseResult, EndingType, EndgameChoice } from './types';
import { rollD20 } from './dice';
import { getEffectiveStat, getTraitEndgameBonus } from './traits';

// ========== Phase 1: Detection (INT check) ==========

export function getPhase1Choices(state: GameState): EndgameChoice[] {
  const int = getEffectiveStat(state.stats.int, 'int', state.traits, state.hunger);
  const baseRate = Math.min(95, Math.max(10, 30 + int * 0.8));

  return [
    {
      id: 'search_shelter',
      label: '全力搜索避難所',
      description: '運用智慧和經驗尋找能夠抵禦災難的庇護所',
      successRate: Math.round(baseRate),
    },
    {
      id: 'follow_instinct',
      label: '跟隨直覺行動',
      description: '依靠本能感知危險，朝最安全的方向前進',
      successRate: Math.round(baseRate * 0.8),
    },
  ];
}

export function resolvePhase1(state: GameState, choiceId: string): EndgamePhaseResult {
  const int = getEffectiveStat(state.stats.int, 'int', state.traits, state.hunger);
  const traitBonus = getTraitEndgameBonus(state.traits);
  const roll = rollD20();

  let dc = choiceId === 'search_shelter' ? 12 : 14;
  const total = roll + Math.floor(int / 5) + traitBonus;
  const success = roll === 20 || (roll !== 1 && total >= dc);

  return {
    phase: 1,
    narrative: success
      ? '你敏銳地察覺到了大氣中的異變——天空出現了一道越來越亮的光痕。你的智慧告訴你，這不是流星，而是末日的前兆。你發現了一處深邃的地下洞穴系統，這可能是最後的庇護所！'
      : '天空突然變得異常明亮，你感到一陣前所未有的恐懼。你四處奔跑尋找掩護，但沒有找到理想的避難所。巨大的陰影正從天際逼近……',
    roll,
    success,
    consequence: success ? '發現避難所' : '未找到避難所',
  };
}

// ========== Phase 2: Decision ==========

export function getPhase2Choices(state: GameState, phase1Success: boolean): EndgameChoice[] {
  const cha = getEffectiveStat(state.stats.cha, 'cha', state.traits, state.hunger);
  const agi = getEffectiveStat(state.stats.agi, 'agi', state.traits, state.hunger);
  const packBonus = state.packSize * 3;

  if (phase1Success) {
    return [
      {
        id: 'lead_all',
        label: '帶領全族進入避難所',
        description: `帶著所有 ${state.packSize} 名族群成員一起進入洞穴`,
        successRate: Math.round(Math.min(90, 40 + cha * 0.5 + packBonus * 0.5)),
      },
      {
        id: 'sacrifice_weak',
        label: '犧牲弱者加速撤離',
        description: '讓老弱成員斷後，確保精銳存活',
        successRate: Math.round(Math.min(95, 60 + agi * 0.3)),
      },
      {
        id: 'flee_alone',
        label: '獨自逃亡',
        description: '拋下一切，只求自保',
        successRate: Math.round(Math.min(95, 50 + agi * 0.6)),
      },
    ];
  } else {
    return [
      {
        id: 'desperate_search',
        label: '拼死尋找掩護',
        description: '在最後時刻尋找任何可能的庇護',
        successRate: Math.round(Math.min(70, 20 + state.stats.int * 0.5)),
      },
      {
        id: 'huddle_together',
        label: '族群聚集互相保護',
        description: '用身體互相掩護，降低傷害',
        successRate: Math.round(Math.min(60, 15 + packBonus)),
      },
      {
        id: 'flee_alone',
        label: '獨自拚命逃跑',
        description: '朝衝擊波相反方向全速奔跑',
        successRate: Math.round(Math.min(50, 20 + agi * 0.4)),
      },
    ];
  }
}

export function resolvePhase2(
  state: GameState,
  choiceId: string,
  phase1Success: boolean
): EndgamePhaseResult {
  const roll = rollD20();
  const traitBonus = getTraitEndgameBonus(state.traits);
  const packBonus = state.packSize;

  let dc: number;
  let statValue: number;

  switch (choiceId) {
    case 'lead_all':
      dc = 14;
      statValue = getEffectiveStat(state.stats.cha, 'cha', state.traits, state.hunger);
      break;
    case 'sacrifice_weak':
      dc = 11;
      statValue = getEffectiveStat(state.stats.agi, 'agi', state.traits, state.hunger);
      break;
    case 'desperate_search':
      dc = 16;
      statValue = getEffectiveStat(state.stats.int, 'int', state.traits, state.hunger);
      break;
    case 'huddle_together':
      dc = 15 - Math.floor(packBonus / 2);
      statValue = getEffectiveStat(state.stats.str, 'str', state.traits, state.hunger);
      break;
    case 'flee_alone':
    default:
      dc = phase1Success ? 10 : 15;
      statValue = getEffectiveStat(state.stats.agi, 'agi', state.traits, state.hunger);
      break;
  }

  const total = roll + Math.floor(statValue / 5) + traitBonus + (choiceId !== 'flee_alone' ? Math.floor(packBonus / 2) : 0);
  const success = roll === 20 || (roll !== 1 && total >= dc);

  const narratives: Record<string, { success: string; failure: string }> = {
    lead_all: {
      success: '你帶領族群有序地進入洞穴深處。巨響從天而降，整個世界都在震動，但洞穴結構穩固，你們安全了！',
      failure: '你試圖帶領所有人進入，但洞口太窄，混亂中有人被落石擊中。不是所有人都能進來……',
    },
    sacrifice_weak: {
      success: '在你的指揮下，精銳成員迅速撤入深處。犧牲者們在洞口築起了最後的屏障。他們的犧牲換來了其餘族群的存活。',
      failure: '即使犧牲了一部分成員，剩餘的族群仍然行動太慢。衝擊波追上了你們……',
    },
    flee_alone: {
      success: '你拋下一切，以最快的速度朝低地奔去。巨大的火球在身後墜落，衝擊波幾乎將你掀翻，但你活了下來。',
      failure: '你拚命奔跑，但衝擊波的速度遠超你的想像。灼熱的氣浪將你吞沒……',
    },
    desperate_search: {
      success: '就在最後一刻，你發現了一處天然的岩石裂縫！你和族群擠了進去，碎石從頭頂落下，但最深處足以保護你們。',
      failure: '你拼命搜索，但天空已經被火焰照亮。來不及了……',
    },
    huddle_together: {
      success: '族群緊緊聚在一起，用最堅硬的部位面向衝擊方向。衝擊波席捲而過後，核心成員居然奇蹟般地存活了！',
      failure: '衝擊波的力量遠超你們的防禦極限。族群被吹散……',
    },
  };

  const chosen = narratives[choiceId] || narratives.flee_alone;

  return {
    phase: 2,
    narrative: success ? chosen.success : chosen.failure,
    roll,
    success,
    consequence: success
      ? (choiceId === 'flee_alone' ? '獨自存活' : '族群暫時安全')
      : '情況危急',
  };
}

// ========== Phase 3: Final Judgment ==========

export function resolvePhase3(
  state: GameState,
  phase1Success: boolean,
  phase2Success: boolean,
  phase2Choice: string
): { result: EndgamePhaseResult; ending: EndingType } {
  const roll = rollD20();
  const traitBonus = getTraitEndgameBonus(state.traits);

  // Aggregate all stats
  const totalStats =
    getEffectiveStat(state.stats.str, 'str', state.traits, state.hunger) +
    getEffectiveStat(state.stats.agi, 'agi', state.traits, state.hunger) +
    getEffectiveStat(state.stats.int, 'int', state.traits, state.hunger) +
    getEffectiveStat(state.stats.cha, 'cha', state.traits, state.hunger);

  const statBonus = Math.floor(totalStats / 20);
  const packBonus = state.packSize * 2;
  const hpBonus = Math.floor(state.hp / 20);
  const phaseBonus = (phase1Success ? 5 : 0) + (phase2Success ? 5 : 0);

  const total = roll + statBonus + packBonus + hpBonus + traitBonus + phaseBonus;
  const dc = 18;

  let ending: EndingType;
  let narrative: string;

  if (roll === 1) {
    ending = 'total_wipe';
    narrative = '大失敗……最後的一擊降臨了。大地裂開，天空塌陷，漫長的核冬天將吞噬一切。你和你的族群，連同這個時代的所有生命，都將成為化石，沉睡在地球的記憶中。\n\n但在億萬年後，某種小小的哺乳動物將會站起來，仰望星空，想像你們曾經的偉大。';
  } else if (roll === 20 || total >= dc + 5) {
    ending = phase2Choice === 'flee_alone' ? 'lone_survivor' : 'pack_survives';
    if (ending === 'pack_survives') {
      narrative = `真結局——族群延續\n\n塵埃終將落定。當你帶著族群從避難所中走出時，世界已經面目全非。天空灰暗，植被凋零，空氣中瀰漫著灰燼的味道。\n\n但你們活下來了。${state.packSize} 名族群成員與你一起迎接了這個嶄新而殘酷的世界。生命會找到出路——而你，就是那條路的起點。\n\n你們的血脈將延續下去，在這片焦土上重新建立家園。這不是結束，而是一個新的開始。`;
    } else {
      narrative = '孤獨倖存\n\n你活下來了，但身邊空無一人。曾經繁華的世界只剩下灰色的荒野。你獨自走在無盡的平原上，腳下是同伴們的遺骸。\n\n你將獨自面對這個新世界的一切挑戰。也許某天你會再次找到同伴，也許不會。但至少——你還活著。';
    }
  } else if (total >= dc) {
    ending = phase2Choice === 'flee_alone' ? 'lone_survivor' : 'pack_survives';
    if (ending === 'pack_survives') {
      narrative = `族群延續\n\n你們勉強撐過了最黑暗的時刻。族群損失了一些成員，但核心成員存活了下來。前方的路依然艱辛，但你們已經證明了——即使面對末日，團結的力量也能創造奇蹟。`;
    } else {
      narrative = '孤獨倖存\n\n你獨自一人活了下來。代價是失去了一切。但只要還活著，就還有希望。你開始在這片荒蕪的新世界中尋找其他倖存者的蹤跡。';
    }
  } else {
    ending = 'total_wipe';
    narrative = '全軍覆沒\n\n衝擊過後的世界一片死寂。滾燙的灰燼從天空落下，覆蓋了一切。你用盡了最後的力氣，但終究無法抵擋自然的力量。\n\n恐龍的時代結束了。但你的掙扎並非毫無意義——在地球漫長的歷史中，你曾經存在過，曾經戰鬥過，曾經愛過。這就足夠了。';
  }

  return {
    result: {
      phase: 3,
      narrative,
      roll,
      success: ending !== 'total_wipe',
      consequence: ending === 'pack_survives' ? '族群延續' : ending === 'lone_survivor' ? '孤獨倖存' : '全軍覆沒',
    },
    ending,
  };
}
