import { BLOCK_COLS, BLOCK_ROWS, ROW_SPAWN_DENSITY } from '../config/gameBalance';
import {
  getMonsterGrowthStep,
} from '../config/monsterScaling';
import {
  BOSS_ANCHOR_COL,
  BOSS_ANCHOR_ROW,
  BOSS_SPAWN_ORDINAL,
  ELITE_FOOTPRINT_H,
  ELITE_FOOTPRINT_W,
  ELITE_SPAWN_CHANCE,
  ELITE_SPAWN_MIN_ORDINAL,
} from '../config/monsterSpawn';
import type { MonsterTypeId } from '../config/monsterTable';
import { rollNormalSpawnTypeId } from '../logic/rollSpecialSpawn';
import { createMonsterInstance } from './monster';
import {
  canPlaceFootprint,
  completePartialLargeMonsters,
  placeFootprintPartial,
} from './monsterFootprint';
import type { MonsterGrid } from './monsterGrid';

export interface SpawnSessionState {
  spawnRowOrdinal: number;
  bossSpawned: boolean;
  /** 本局启用的特殊怪 typeId（空=仅普通灰砖） */
  specialTypeIds: MonsterTypeId[];
}

/** 首领：固定 4×4 贴底居中，达刷行序号后尝试生成（可跨回合拼齐） */
export function trySpawnBoss(
  grid: MonsterGrid,
  state: SpawnSessionState,
  growthStep: number,
): boolean {
  if (state.bossSpawned || state.spawnRowOrdinal < BOSS_SPAWN_ORDINAL) {
    return false;
  }

  const boss = createMonsterInstance('boss', BOSS_ANCHOR_ROW, BOSS_ANCHOR_COL, growthStep);
  const placed = placeFootprintPartial(grid, boss);
  if (placed > 0) {
    state.bossSpawned = true;
    return true;
  }
  return false;
}

/** 继续铺满场上首领的剩余格子 */
export function tryCompleteBoss(grid: MonsterGrid, state: SpawnSessionState): void {
  if (!state.bossSpawned) return;
  for (let r = 0; r < BLOCK_ROWS; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      const m = grid[r]![c];
      if (m?.typeId === 'boss') {
        placeFootprintPartial(grid, m);
        return;
      }
    }
  }
}

/**
 * 精英：底边对齐当前刷出行；顶行可伸入上方空格（半只可见）。
 * 先尝试完整 2×2，否则只占当前行 2 格。
 */
export function trySpawnEliteOnRow(
  grid: MonsterGrid,
  targetRow: number,
  growthStep: number,
): boolean {
  const cols = Array.from({ length: BLOCK_COLS - ELITE_FOOTPRINT_W + 1 }, (_, i) => i);
  shuffle(cols);

  for (const col of cols) {
    if (targetRow >= 1) {
      const anchorRow = targetRow - 1;
      if (canPlaceFootprint(grid, anchorRow, col, ELITE_FOOTPRINT_W, ELITE_FOOTPRINT_H)) {
        const elite = createMonsterInstance('elite', anchorRow, col, growthStep);
        placeFootprintPartial(grid, elite);
        return true;
      }
    }

    if (canPlaceFootprint(grid, targetRow, col, ELITE_FOOTPRINT_W, 1)) {
      const elite = createMonsterInstance('elite', targetRow, col, growthStep);
      grid[targetRow]![col] = elite;
      grid[targetRow]![col + 1] = elite;
      return true;
    }
  }
  return false;
}

/** 在指定行填充普通怪（跳过已被占用的格） */
export function fillNormalCellsOnRow(
  grid: MonsterGrid,
  targetRow: number,
  growthStep: number,
  state: SpawnSessionState,
): void {
  for (let c = 0; c < BLOCK_COLS; c++) {
    if (grid[targetRow]![c] !== null) continue;
    if (Math.random() < ROW_SPAWN_DENSITY) {
      const typeId = rollNormalSpawnTypeId(state.specialTypeIds);
      grid[targetRow]![c] = createMonsterInstance(
        typeId,
        targetRow,
        c,
        growthStep,
      );
    }
  }
}

/** 对一批底行刷怪：首领 > 补全 > 精英 > 普通（首领已出则不再刷怪） */
export function spawnIntoBottomRows(
  grid: MonsterGrid,
  targetRows: number[],
  state: SpawnSessionState,
): number {
  let ordinal = state.spawnRowOrdinal;
  const bossPhase = state.bossSpawned;

  for (const targetRow of targetRows) {
    const growthStep = getMonsterGrowthStep(ordinal);

    if (!bossPhase) {
      trySpawnBoss(grid, state, growthStep);
      tryCompleteBoss(grid, state);
      completePartialLargeMonsters(grid);

      if (ordinal >= ELITE_SPAWN_MIN_ORDINAL && Math.random() < ELITE_SPAWN_CHANCE) {
        trySpawnEliteOnRow(grid, targetRow, growthStep);
      }

      completePartialLargeMonsters(grid);
      fillNormalCellsOnRow(grid, targetRow, growthStep, state);
      completePartialLargeMonsters(grid);
    } else {
      tryCompleteBoss(grid, state);
      completePartialLargeMonsters(grid);
    }

    ordinal++;
  }

  state.spawnRowOrdinal = ordinal;
  return ordinal;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
