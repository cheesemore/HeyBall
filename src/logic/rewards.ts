import {
  ELITE_GOLD_MULTIPLIER,
  GOLD_PER_KILL,
} from '../config/gameBalance';
import { AIRDROP_BLUE_GOLD_MULT } from '../config/airdrop';
import type { MonsterTypeId } from '../config/monsterTable';

/** 击杀奖励金币（首领 0，精英 4 倍，空降蓝 2 倍基础，普通 1 倍） */
export function goldForMonsterKill(typeId: MonsterTypeId): number {
  if (typeId === 'boss') return 0;
  if (typeId === 'elite') return GOLD_PER_KILL * ELITE_GOLD_MULTIPLIER;
  if (typeId === 'airdrop_blue') return GOLD_PER_KILL * AIRDROP_BLUE_GOLD_MULT;
  if (typeId === 'airdrop_red') return GOLD_PER_KILL * AIRDROP_BLUE_GOLD_MULT;
  return GOLD_PER_KILL;
}
