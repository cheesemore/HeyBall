import { BLOCK_BASE_HP } from './gameBalance';

/** 第 20 档（几何段末）的血量倍率 */
export const MONSTER_HP_FINAL_MULT = 40;

/** 几何增长档位数（0 档 = 1 倍，20 档 = MONSTER_HP_FINAL_MULT） */
export const MONSTER_HP_GROWTH_STEPS = 20;

/** 每累计多少「刷出行」触发 1 档增长 */
export const MONSTER_HP_ROWS_PER_GROWTH = 8;

/** 21 档起：每档在 40 倍基础上 +1 倍（21 档 = 41 倍，22 档 = 42 倍…） */
export const MONSTER_HP_LINEAR_PER_STEP_AFTER_CAP = 1;

/** 等比公比：1 × r^20 = MONSTER_HP_FINAL_MULT */
export const MONSTER_HP_GEOMETRIC_RATIO =
  Math.pow(MONSTER_HP_FINAL_MULT, 1 / MONSTER_HP_GROWTH_STEPS);

/** 由累计刷出行序号（从 0 起）得到增长档位（无尽，无上限） */
export function getMonsterGrowthStep(spawnRowOrdinal: number): number {
  return Math.floor(spawnRowOrdinal / MONSTER_HP_ROWS_PER_GROWTH);
}

/** 档位对应血量倍率 */
export function getMonsterHpMultiplier(growthStep: number): number {
  const step = Math.max(0, growthStep);
  if (step <= MONSTER_HP_GROWTH_STEPS) {
    return Math.pow(MONSTER_HP_GEOMETRIC_RATIO, step);
  }
  const extra = step - MONSTER_HP_GROWTH_STEPS;
  return (
    MONSTER_HP_FINAL_MULT + extra * MONSTER_HP_LINEAR_PER_STEP_AFTER_CAP
  );
}

/** 整数血量 */
export function getMonsterHp(
  growthStep: number,
  baseHp: number = BLOCK_BASE_HP,
): number {
  return Math.max(1, Math.round(baseHp * getMonsterHpMultiplier(growthStep)));
}
