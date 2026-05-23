import { BLOCK_BASE_HP } from './gameBalance';

/** 第 20 次增长后的血量倍率（可调，等比系数由此自动推算） */
export const MONSTER_HP_FINAL_MULT = 40;

/** 血量增长次数（0 次 = 1 倍，20 次后 = MONSTER_HP_FINAL_MULT） */
export const MONSTER_HP_GROWTH_STEPS = 20;

/** 每累计多少「刷出行」触发 1 档增长 */
export const MONSTER_HP_ROWS_PER_GROWTH = 8;

/** 等比公比：1 × r^20 = MONSTER_HP_FINAL_MULT */
export const MONSTER_HP_GEOMETRIC_RATIO =
  Math.pow(MONSTER_HP_FINAL_MULT, 1 / MONSTER_HP_GROWTH_STEPS);

/** 由累计刷出行序号（从 0 起）得到增长档位 0…20 */
export function getMonsterGrowthStep(spawnRowOrdinal: number): number {
  return Math.min(
    MONSTER_HP_GROWTH_STEPS,
    Math.floor(spawnRowOrdinal / MONSTER_HP_ROWS_PER_GROWTH),
  );
}

/** 档位对应血量倍率（实数，用于计算） */
export function getMonsterHpMultiplier(growthStep: number): number {
  const step = Math.min(
    MONSTER_HP_GROWTH_STEPS,
    Math.max(0, growthStep),
  );
  return Math.pow(MONSTER_HP_GEOMETRIC_RATIO, step);
}

/** 整数血量 */
export function getMonsterHp(
  growthStep: number,
  baseHp: number = BLOCK_BASE_HP,
): number {
  return Math.max(1, Math.round(baseHp * getMonsterHpMultiplier(growthStep)));
}
