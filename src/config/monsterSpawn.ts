import { BLOCK_COLS, BLOCK_ROWS } from './gameBalance';

/** 精英怪基础血量 */
export const ELITE_BASE_HP = 800;

/** 首领怪基础血量 */
export const BOSS_BASE_HP = 3200;

/** 精英 footprint */
export const ELITE_FOOTPRINT_W = 2;
export const ELITE_FOOTPRINT_H = 2;

/** 首领 footprint（战场 8×9 格，居中 4×4） */
export const BOSS_FOOTPRINT_W = 4;
export const BOSS_FOOTPRINT_H = 4;
export const BOSS_ANCHOR_COL = Math.floor((BLOCK_COLS - BOSS_FOOTPRINT_W) / 2);
export const BOSS_ANCHOR_ROW = Math.floor((BLOCK_ROWS - BOSS_FOOTPRINT_H) / 2);

/** 累计刷出行 ≥ 此值后，每行有概率刷精英 */
export const ELITE_SPAWN_MIN_ORDINAL = 8;

/** 每行刷新时生成精英的概率 */
export const ELITE_SPAWN_CHANCE = 0.1;

/** 第 140「波」对应累计刷出行序号（8 列 × 约 17.5 轮，配表可改） */
export const BOSS_SPAWN_ORDINAL = 140;
