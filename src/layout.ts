/** 设计稿尺寸 */
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 1280;

/** 自底向上 280px：刷怪红线 / 弹球回收线 */
export const SPAWN_LINE_FROM_BOTTOM = 280;

/** 黄线：砖块逻辑顶行 row=0 的世界 Y（能到达的最高高度） */
export const WALL_LINE_FROM_TOP = 100;

/** 砖块网格顶边在战场内的 Y（row0 顶 = 黄线 world Y） */
export const BATTLE_GRID_TOP_LOCAL_Y = 100;

/** 发射点战场局部 Y（world Y = battle.y + 本值 = 80） */
export const BATTLE_LAUNCH_LOCAL_Y = 80;

export const BATTLE_WIDTH = 800;
export const BATTLE_HEIGHT = GAME_HEIGHT - SPAWN_LINE_FROM_BOTTOM;
export const RESERVED_WIDTH = 224;
export const MONSTER_SIZE = 100;

export const BLOCK_ROWS = Math.floor(
  (BATTLE_HEIGHT - BATTLE_GRID_TOP_LOCAL_Y) / MONSTER_SIZE,
);

export function battleGridRowTopY(row: number): number {
  return BATTLE_GRID_TOP_LOCAL_Y + row * MONSTER_SIZE;
}

export function battleLaunchLocalY(): number {
  return BATTLE_LAUNCH_LOCAL_Y;
}

export const layout = {
  wallY: WALL_LINE_FROM_TOP,
  spawnY: GAME_HEIGHT - SPAWN_LINE_FROM_BOTTOM,
  battle: {
    x: 0,
    y: 0,
    width: BATTLE_WIDTH,
    height: BATTLE_HEIGHT,
  },
  battleTopCenter: {
    x: BATTLE_WIDTH / 2,
    y: WALL_LINE_FROM_TOP,
  },
  control: {
    x: 0,
    y: GAME_HEIGHT - SPAWN_LINE_FROM_BOTTOM,
    width: GAME_WIDTH,
    height: SPAWN_LINE_FROM_BOTTOM,
  },
  merge: {
    x: 0,
    y: GAME_HEIGHT - SPAWN_LINE_FROM_BOTTOM,
    width: GAME_WIDTH,
    height: SPAWN_LINE_FROM_BOTTOM,
  },
  reserved: {
    x: BATTLE_WIDTH,
    y: 0,
    width: RESERVED_WIDTH,
    height: GAME_HEIGHT,
  },
} as const;

export function battleSpawnLineLocalY(): number {
  return layout.spawnY - layout.battle.y;
}
