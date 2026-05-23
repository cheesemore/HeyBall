import { BLOCK_COLS, BLOCK_ROWS, ROW_SPAWN_DENSITY } from '../config/gameBalance';
import {
  getMonsterGrowthStep,
} from '../config/monsterScaling';
import {
  BOSS_ANCHOR_COL,
  BOSS_ANCHOR_ROW,
  BOSS_FOOTPRINT_H,
  BOSS_FOOTPRINT_W,
  ELITE_FOOTPRINT_H,
  ELITE_FOOTPRINT_W,
  ELITE_SPAWN_CHANCE,
  ELITE_SPAWN_MIN_ORDINAL,
  getNextBossSpawnOrdinal,
} from '../config/monsterSpawn';
import type { MonsterTypeId } from '../config/monsterTable';
import { rollNormalSpawnTypeId } from '../logic/rollSpecialSpawn';
import { createMonsterInstance } from './monster';
import {
  canPlaceFootprint,
  completePartialLargeMonsters,
  crushMonstersOverlappingFootprint,
  placeFootprintPartial,
} from './monsterFootprint';
import type { BlockMonster } from './monster';
import type { MonsterGrid } from './monsterGrid';

export interface SpawnSessionState {
  spawnRowOrdinal: number;
  /** 场上是否存在存活首领（首领战期间暂停刷行计数与空降） */
  bossActive: boolean;
  /** 已击败首领数量，用于计算下一首领刷出行 */
  bossesDefeated: number;
  /** 本局启用的特殊怪 typeId（空=仅普通灰砖） */
  specialTypeIds: MonsterTypeId[];
}

/** 首领：固定 4×4 贴底居中；生成前击碎占位区内全部怪物 */
export function trySpawnBoss(
  grid: MonsterGrid,
  state: SpawnSessionState,
  growthStep: number,
  rowOrdinal: number,
): BlockMonster[] {
  if (state.bossActive) return [];
  if (rowOrdinal < getNextBossSpawnOrdinal(state.bossesDefeated)) {
    return [];
  }

  const crushed = crushMonstersOverlappingFootprint(
    grid,
    BOSS_ANCHOR_ROW,
    BOSS_ANCHOR_COL,
    BOSS_FOOTPRINT_W,
    BOSS_FOOTPRINT_H,
  );

  const boss = createMonsterInstance('boss', BOSS_ANCHOR_ROW, BOSS_ANCHOR_COL, growthStep);
  const placed = placeFootprintPartial(grid, boss);
  if (placed > 0) {
    state.bossActive = true;
  }
  return crushed;
}

/** 继续铺满场上首领的剩余格子 */
export function tryCompleteBoss(grid: MonsterGrid, state: SpawnSessionState): void {
  if (!state.bossActive) return;
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

export interface SpawnBottomRowsResult {
  spawnRowOrdinal: number;
  bossCrushed: BlockMonster[];
}

/** 对一批底行刷怪：首领 > 补全 > 精英 > 普通（首领在场时仅推进首领、不刷杂兵） */
export function spawnIntoBottomRows(
  grid: MonsterGrid,
  targetRows: number[],
  state: SpawnSessionState,
): SpawnBottomRowsResult {
  let ordinal = state.spawnRowOrdinal;
  const bossPhase = state.bossActive;
  const bossCrushed: BlockMonster[] = [];

  for (const targetRow of targetRows) {
    const growthStep = getMonsterGrowthStep(ordinal);

    if (!bossPhase) {
      bossCrushed.push(...trySpawnBoss(grid, state, growthStep, ordinal));
      tryCompleteBoss(grid, state);
      completePartialLargeMonsters(grid);

      if (!state.bossActive) {
        if (ordinal >= ELITE_SPAWN_MIN_ORDINAL && Math.random() < ELITE_SPAWN_CHANCE) {
          trySpawnEliteOnRow(grid, targetRow, growthStep);
        }

        completePartialLargeMonsters(grid);
        fillNormalCellsOnRow(grid, targetRow, growthStep, state);
        completePartialLargeMonsters(grid);
      }
    } else {
      tryCompleteBoss(grid, state);
      completePartialLargeMonsters(grid);
    }

    if (!state.bossActive) {
      ordinal++;
    }
  }

  state.spawnRowOrdinal = ordinal;
  return { spawnRowOrdinal: ordinal, bossCrushed };
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
