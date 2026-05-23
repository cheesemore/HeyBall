import { BATTLE_WIDTH, battleGridRowTopY, battleLaunchLocalY, MONSTER_SIZE } from '../layout';
import type { MonsterSnapshot } from './types';

const LAUNCH_X = BATTLE_WIDTH / 2;
const LAUNCH_Y = battleLaunchLocalY();
/** Pixi 坐标系：向下为 +Y */
const BASE_AIM_DOWN = Math.PI / 2;

/** 瞄准当前血量最高的怪物中心；无怪时返回向下 */
export function aimAngleAtMaxHpMonster(monsters: MonsterSnapshot[]): number {
  if (monsters.length === 0) return BASE_AIM_DOWN;

  let best = monsters[0]!;
  for (let i = 1; i < monsters.length; i++) {
    if (monsters[i]!.hp > best.hp) best = monsters[i]!;
  }

  const tx =
    (best.anchorCol + best.footprintW / 2) * MONSTER_SIZE;
  const ty =
    battleGridRowTopY(best.anchorRow) +
    (best.footprintH * MONSTER_SIZE) / 2;

  return Math.atan2(ty - LAUNCH_Y, tx - LAUNCH_X);
}
