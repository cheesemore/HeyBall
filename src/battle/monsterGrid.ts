import {
  BLOCK_COLS,
  BLOCK_ROWS,
  getRowsToSpawnAfterTurn,
  ROW_SPAWN_DENSITY,
} from '../config/gameBalance';
import { createMonsterInstance } from './monster';
import type { BlockMonster } from './monster';
import {
  clearMonsterFromGrid,
  collectUniqueMonsters,
  completePartialLargeMonsters,
  placeFootprintPartial,
} from './monsterFootprint';
import { BOSS_SPAWN_ORDINAL } from '../config/monsterSpawn';
import {
  spawnIntoBottomRows,
  tryCompleteBoss,
  trySpawnBoss,
  type SpawnSessionState,
} from './monsterSpawnLogic';
import { getMonsterGrowthStep } from '../config/monsterScaling';

/** 战场顶行（贴城墙） */
export const TOP_GRID_ROW = 0;

export type MonsterGrid = (BlockMonster | null)[][];

export function createEmptyGrid(): MonsterGrid {
  return Array.from({ length: BLOCK_ROWS }, () =>
    Array.from({ length: BLOCK_COLS }, () => null),
  );
}

/** 场上有怪的行数（用于回合末刷行规则） */
export function countOccupiedRows(grid: MonsterGrid): number {
  let n = 0;
  for (let r = 0; r < BLOCK_ROWS; r++) {
    if (grid[r]!.some((cell) => cell !== null)) n++;
  }
  return n;
}

/** 每格独立判定：生成普通砖块 */
export function rollRowCell(growthStep: number): BlockMonster | null {
  if (Math.random() >= ROW_SPAWN_DENSITY) return null;
  return createMonsterInstance('normal', 0, 0, growthStep);
}

/** 从底部刷怪红线侧向上填充若干行 */
export function fillRowsFromSpawn(
  grid: MonsterGrid,
  rowCount: number,
  state: SpawnSessionState,
): number {
  const targetRows: number[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row = BLOCK_ROWS - 1 - i;
    if (row < 0) break;
    targetRows.push(row);
  }
  spawnIntoBottomRows(grid, targetRows, state);
  return state.spawnRowOrdinal;
}

export interface PushResult {
  grid: MonsterGrid;
  wallHits: BlockMonster[];
  spawnRowOrdinal: number;
  bossSpawned: boolean;
  /** 首领登场时击碎的怪物 */
  bossCrushed: BlockMonster[];
}

/** 位于顶行（anchorRow=0）的怪物立刻自爆，按当前血量扣城墙 */
export function detonateTopRowMonsters(grid: MonsterGrid): BlockMonster[] {
  const hits: BlockMonster[] = [];
  for (const monster of collectUniqueMonsters(grid)) {
    if (monster.anchorRow !== TOP_GRID_ROW) continue;
    hits.push(monster);
    clearMonsterFromGrid(grid, monster);
  }
  return hits;
}

/** 全场上移 rowCount 行，底行按规则刷怪；大怪按 instance 整组移动 */
export function pushGridWithNewRows(
  grid: MonsterGrid,
  rowCount: number,
  state: SpawnSessionState,
): PushResult {
  const wallHits: BlockMonster[] = [];

  wallHits.push(...detonateTopRowMonsters(grid));

  const next = createEmptyGrid();

  for (const monster of collectUniqueMonsters(grid)) {
    const nr = monster.anchorRow - rowCount;
    if (nr < 0) {
      continue;
    }
    monster.anchorRow = nr;
    placeFootprintPartial(next, monster);
  }

  const targetRows: number[] = [];
  for (let i = 0; i < rowCount; i++) {
    const targetRow = BLOCK_ROWS - 1 - i;
    if (targetRow < 0) continue;
    targetRows.push(targetRow);
  }
  const spawnResult = spawnIntoBottomRows(next, targetRows, state);

  wallHits.push(...detonateTopRowMonsters(next));

  return {
    grid: next,
    wallHits,
    spawnRowOrdinal: state.spawnRowOrdinal,
    bossSpawned: state.bossSpawned,
    bossCrushed: spawnResult.bossCrushed,
  };
}

/** 首领阶段：仅上移一行，不刷普通怪/精英 */
export function pushGridBossPhase(
  grid: MonsterGrid,
  state: SpawnSessionState,
): PushResult {
  const wallHits: BlockMonster[] = [];
  wallHits.push(...detonateTopRowMonsters(grid));

  const next = createEmptyGrid();
  for (const monster of collectUniqueMonsters(grid)) {
    const nr = monster.anchorRow - 1;
    if (nr < 0) continue;
    monster.anchorRow = nr;
    placeFootprintPartial(next, monster);
  }

  const growthStep = getMonsterGrowthStep(state.spawnRowOrdinal);
  const bossCrushed = trySpawnBoss(next, state, growthStep);
  tryCompleteBoss(next, state);
  completePartialLargeMonsters(next);

  wallHits.push(...detonateTopRowMonsters(next));

  state.spawnRowOrdinal += 1;

  return {
    grid: next,
    wallHits,
    spawnRowOrdinal: state.spawnRowOrdinal,
    bossSpawned: state.bossSpawned,
    bossCrushed,
  };
}

/** 推进 1 行并在底行刷怪（首领已出则只推进） */
export function pushGridOneRow(
  grid: MonsterGrid,
  state: SpawnSessionState,
): PushResult {
  if (state.bossSpawned) {
    return pushGridBossPhase(grid, state);
  }
  return pushGridWithNewRows(grid, 1, state);
}

/** 按场上行数决定本回合末推进几行；临近/处于首领阶段时限制为 1 行 */
export function resolveTurnSpawnRowCount(
  grid: MonsterGrid,
  state: Pick<SpawnSessionState, 'bossSpawned' | 'spawnRowOrdinal'>,
): number {
  if (state.bossSpawned) return 1;

  const normal = getRowsToSpawnAfterTurn(countOccupiedRows(grid));
  const rowsUntilBoss = BOSS_SPAWN_ORDINAL - state.spawnRowOrdinal;
  if (rowsUntilBoss <= 1) return 1;
  return Math.min(normal, rowsUntilBoss);
}

export function damageBlock(m: BlockMonster, dmg: number): boolean {
  m.hp = Math.max(0, m.hp - dmg);
  return m.hp <= 0;
}

export function killMonsterOnGrid(grid: MonsterGrid, monster: BlockMonster): void {
  clearMonsterFromGrid(grid, monster);
}

