/** 目标帧率 */
export const TARGET_FPS = 60;

/** 砖块受击闪白时长（秒） */
export const BLOCK_HIT_FLASH_DURATION = 0.14;

/** 击败一只普通怪物奖励金币 */
export const GOLD_PER_KILL = 5;

/** 精英怪金币倍率 */
export const ELITE_GOLD_MULTIPLIER = 4;

/** 城墙初始血量 */
export const WALL_MAX_HP = 3000;

/** 砖块初始血量（波次加成暂未实现） */
export const BLOCK_BASE_HP = 100;

import { BLOCK_ROWS } from '../layout';

/** 战斗区每行砖块数 */
export const BLOCK_COLS = 8;

export { BLOCK_ROWS };

/** 进入战斗时，从出怪线起算的行数 */
export const INITIAL_SPAWN_ROWS = 3;

/** 回合末每推进 1 行（含刷怪）的动画时长（秒） */
export const ROW_SPAWN_ANIM_STEP_SEC = 0.16;

/** 回合结束刷行：场上仅 1 行有怪时补 3 行，2–3 行补 2 行，>3 行补 1 行 */
export function getRowsToSpawnAfterTurn(occupiedRowCount: number): number {
  if (occupiedRowCount <= 1) return 3;
  if (occupiedRowCount <= 3) return 2;
  return 1;
}

/** 下方控制区配表半径：小球（表底大小，不随合成变化） */
export const SMALL_BALL_RADIUS = 24;

/** 大球表底半径 = 小球 × 1.5 */
export const BIG_BALL_RADIUS = SMALL_BALL_RADIUS * 1.5;

/** 战场上弹球半径 = 表底半径 × 此比例（可调，默认 2/3） */
export const BATTLE_BALL_SIZE_RATIO = 2 / 3;

/** 表底半径（配置用） */
export function getTableBallRadius(isBig: boolean): number {
  return isBig ? BIG_BALL_RADIUS : SMALL_BALL_RADIUS;
}

/** 战场上实际碰撞/显示半径 */
export function getBattleBallRadius(isBig: boolean): number {
  return getTableBallRadius(isBig) * BATTLE_BALL_SIZE_RATIO;
}

/** 每格独立随机：生成砖块的概率（单行约 75% 密度） */
export const ROW_SPAWN_DENSITY = 0.75;

/** 发射点：战场顶中心再向上偏移（像素） */
export const LAUNCH_Y_OFFSET = 20;

/** 多弹球发射间隔（秒），0.1 秒一颗直至打完 */
export const BALL_LAUNCH_INTERVAL = 0.1;

/** 发射锥形：张角（度）、半径（像素） */
export const LAUNCH_CONE_ANGLE = 35;
export const LAUNCH_CONE_RADIUS = 600;

/** 锥形中心轴左右摇摆幅度（度，相对向下方向） */
export const LAUNCH_CONE_SWEEP_AMPLITUDE = 52;

/** 锥形摇摆角速度（弧度/秒，作用于 sin 相位） */
export const LAUNCH_CONE_SWEEP_SPEED = 1.35;
