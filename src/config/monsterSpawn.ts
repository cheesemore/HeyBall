import { BLOCK_COLS, BLOCK_ROWS } from './gameBalance';

/** 精英怪基础血量 */
export const ELITE_BASE_HP = 800;

/** 首领怪基础血量（相对旧版减半） */
export const BOSS_BASE_HP = 1600;

/** 精英 footprint */
export const ELITE_FOOTPRINT_W = 2;
export const ELITE_FOOTPRINT_H = 2;

/** 首领 footprint（战场 8×9 格，底边对齐 4×4） */
export const BOSS_FOOTPRINT_W = 4;
export const BOSS_FOOTPRINT_H = 4;
export const BOSS_ANCHOR_COL = Math.floor((BLOCK_COLS - BOSS_FOOTPRINT_W) / 2);
/** 锚点行：使 4×4 占满最底四行 */
export const BOSS_ANCHOR_ROW = BLOCK_ROWS - BOSS_FOOTPRINT_H;

/** 累计刷出行 ≥ 此值后，每行有概率刷精英 */
export const ELITE_SPAWN_MIN_ORDINAL = 8;

/** 每行刷新时生成精英的概率 */
export const ELITE_SPAWN_CHANCE = 0.1;

/** 首次首领出现的累计刷出行序号 */
export const BOSS_FIRST_SPAWN_ORDINAL = 100;

/** 之后每击败一名首领，下一首领间隔刷出行数 */
export const BOSS_SPAWN_INTERVAL = 50;

/** 第 n 个首领（0 起）的目标刷出行：100、150、200、250… */
export function getBossSpawnOrdinal(bossIndex: number): number {
  return BOSS_FIRST_SPAWN_ORDINAL + bossIndex * BOSS_SPAWN_INTERVAL;
}

/** 当前还需达到的行序号才会刷下一名首领 */
export function getNextBossSpawnOrdinal(bossesDefeated: number): number {
  return getBossSpawnOrdinal(bossesDefeated);
}
