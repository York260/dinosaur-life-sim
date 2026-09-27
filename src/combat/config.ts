import { GameState, GameAction } from '../engine/types';
import { buildEnemyProfile } from '../engine/enemies';
import { getEffectiveStat } from '../engine/traits';
import { getPackCalls } from '../engine/pack';
import { ArenaConfig, ArenaEnv } from './ArenaGame';

export function buildArenaConfig(
  state: GameState,
  enemyId: string | undefined,
  threatDC: number,
  env: ArenaEnv,
  opts: { extraCalls?: number; hp?: number; packSize?: number } = {},
): ArenaConfig {
  const e = (k: 'str' | 'agi' | 'int' | 'cha') => getEffectiveStat(state.stats[k], k, state.traits, state.hunger);
  const packSize = opts.packSize ?? state.packSize;
  return {
    speciesId: state.species?.id ?? 'trex',
    playerHp: opts.hp ?? state.hp,
    str: e('str'),
    agi: e('agi'),
    int: e('int'),
    cha: e('cha'),
    traitIds: state.traits.map(t => t.id),
    packSize,
    packCalls: getPackCalls(packSize, state.traits, state.species?.id) + (opts.extraCalls ?? 0),
    enemy: buildEnemyProfile(enemyId, threatDC),
    env,
  };
}

export function envForAction(state: GameState, action: GameAction): ArenaEnv {
  if (state.currentEvent?.tags?.includes('night') || action.tags?.includes('night')) return 'night';
  if (action.enemy === 'croc' || /river|water|flood/.test(state.currentEvent?.templateId ?? '')) return 'river';
  if (state.season === 'omen') return 'apocalypse';
  return 'forest';
}
