import { BLOCK_COLS, BLOCK_ROWS } from '../config/gameBalance';
import { battleGridRowTopY, MONSTER_SIZE } from '../layout';
import type { BlockMonster } from './monster';
import { isAnchorCell } from './monster';
import type { MonsterGrid } from './monsterGrid';

export function footprintCells(
  anchorRow: number,
  anchorCol: number,
  w: number,
  h: number,
): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let dr = 0; dr < h; dr++) {
    for (let dc = 0; dc < w; dc++) {
      cells.push({ row: anchorRow + dr, col: anchorCol + dc });
    }
  }
  return cells;
}

export function cellInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BLOCK_ROWS && col >= 0 && col < BLOCK_COLS;
}

/** 足迹内是否全部在界内且为空（可被该实例占用） */
export function canPlaceFootprint(
  grid: MonsterGrid,
  anchorRow: number,
  anchorCol: number,
  w: number,
  h: number,
  occupant?: BlockMonster,
): boolean {
  for (const { row, col } of footprintCells(anchorRow, anchorCol, w, h)) {
    if (!cellInBounds(row, col)) return false;
    const cell = grid[row]![col];
    if (cell !== null && cell !== occupant) return false;
  }
  return true;
}

/** 占用足迹内所有当前为空的格子；至少占 1 格才成功 */
export function placeFootprintPartial(
  grid: MonsterGrid,
  monster: BlockMonster,
): number {
  let placed = 0;
  for (const { row, col } of footprintCells(
    monster.anchorRow,
    monster.anchorCol,
    monster.footprintW,
    monster.footprintH,
  )) {
    if (!cellInBounds(row, col)) continue;
    if (grid[row]![col] !== null) continue;
    grid[row]![col] = monster;
    placed++;
  }
  return placed;
}

export function footprintsOverlap(
  aRow: number,
  aCol: number,
  aW: number,
  aH: number,
  bRow: number,
  bCol: number,
  bW: number,
  bH: number,
): boolean {
  return !(
    aRow + aH <= bRow ||
    bRow + bH <= aRow ||
    aCol + aW <= bCol ||
    bCol + bW <= aCol
  );
}

/** 击碎与矩形足迹相交的全部怪物（含仅部分重叠的大怪） */
export function crushMonstersOverlappingFootprint(
  grid: MonsterGrid,
  anchorRow: number,
  anchorCol: number,
  w: number,
  h: number,
): BlockMonster[] {
  const crushed: BlockMonster[] = [];
  for (const m of collectUniqueMonsters(grid)) {
    if (
      !footprintsOverlap(
        m.anchorRow,
        m.anchorCol,
        m.footprintW,
        m.footprintH,
        anchorRow,
        anchorCol,
        w,
        h,
      )
    ) {
      continue;
    }
    clearMonsterFromGrid(grid, m);
    crushed.push(m);
  }
  return crushed;
}

export function clearMonsterFromGrid(grid: MonsterGrid, monster: BlockMonster): void {
  for (let r = 0; r < BLOCK_ROWS; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      if (grid[r]![c]?.instanceId === monster.instanceId) {
        grid[r]![c] = null;
      }
    }
  }
}

/** 补全场上未铺满的大家伙（跨回合拼齐 2×2 / 4×4） */
export function completePartialLargeMonsters(grid: MonsterGrid): void {
  const seen = new Set<string>();
  for (let r = 0; r < BLOCK_ROWS; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      const m = grid[r]![c];
      if (!m || seen.has(m.instanceId)) continue;
      seen.add(m.instanceId);
      if (m.footprintW === 1 && m.footprintH === 1) continue;
      placeFootprintPartial(grid, m);
    }
  }
}

export function collectUniqueMonsters(grid: MonsterGrid): BlockMonster[] {
  const seen = new Set<string>();
  const list: BlockMonster[] = [];
  for (let r = 0; r < BLOCK_ROWS; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      const m = grid[r]![c];
      if (!m || !isAnchorCell(m, r, c) || seen.has(m.instanceId)) continue;
      seen.add(m.instanceId);
      list.push(m);
    }
  }
  return list;
}

export function getFootprintAabb(
  monster: BlockMonster,
): { left: number; top: number; right: number; bottom: number } {
  const pad = 2;
  const left = monster.anchorCol * MONSTER_SIZE + pad;
  const top = battleGridRowTopY(monster.anchorRow) + pad;
  const right = (monster.anchorCol + monster.footprintW) * MONSTER_SIZE - pad;
  const bottom =
    battleGridRowTopY(monster.anchorRow + monster.footprintH - 1) +
    MONSTER_SIZE -
    pad;
  return { left, top, right, bottom };
}
