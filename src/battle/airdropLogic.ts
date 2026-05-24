import { BLOCK_COLS } from '../config/gameBalance';

import {

  AIRDROP_INTERVAL_TURNS,

  AIRDROP_MAX_ROW,

  AIRDROP_MIN_ROW,

  AIRDROP_RED_CHANCE,

  AIRDROP_RED_START_TURN,

} from '../config/airdrop';

import type { BlockMonster } from './monster';

import { createMonsterInstance, isAnchorCell } from './monster';

import {

  clearMonsterFromGrid,

  collectUniqueMonsters,

} from './monsterFootprint';

import type { MonsterGrid } from './monsterGrid';

import { pickBluePatternCells } from './airdropPatterns';



export type AirDropVariant = 'airdrop_blue' | 'airdrop_red';



export interface AirDropApplyResult {

  grid: MonsterGrid;

  placed: BlockMonster[];

  crushed: BlockMonster[];

}



export function shouldTriggerAirDrop(turn: number, bossActive: boolean): boolean {

  if (bossActive) return false;

  return turn > 0 && turn % AIRDROP_INTERVAL_TURNS === 0;

}



export function resolveAirDropVariant(turn: number): AirDropVariant {

  if (turn >= AIRDROP_RED_START_TURN && Math.random() < AIRDROP_RED_CHANCE) {

    return 'airdrop_red';

  }

  return 'airdrop_blue';

}



function blocksAirDropLanding(m: BlockMonster): boolean {

  return m.typeId === 'elite' || m.typeId === 'boss';

}



function getOccupantAt(
  grid: MonsterGrid,
  row: number,
  col: number,
): BlockMonster | null {
  return grid[row]?.[col] ?? null;
}

function getAnchorMonster(
  grid: MonsterGrid,
  row: number,
  col: number,
): BlockMonster | null {
  const m = getOccupantAt(grid, row, col);
  if (!m || !isAnchorCell(m, row, col)) return null;
  return m;
}

function cellBlocksAirDrop(grid: MonsterGrid, row: number, col: number): boolean {
  const m = getOccupantAt(grid, row, col);
  return m != null && blocksAirDropLanding(m);
}



function crushAt(

  grid: MonsterGrid,

  row: number,

  col: number,

): BlockMonster | null {

  const m = getAnchorMonster(grid, row, col);

  if (!m || blocksAirDropLanding(m)) return null;

  clearMonsterFromGrid(grid, m);

  return m;

}



function placeAirdrop(

  grid: MonsterGrid,

  typeId: AirDropVariant,

  row: number,

  col: number,

  growthStep: number,

  placed: BlockMonster[],

  crushed: BlockMonster[],

): void {

  if (row < AIRDROP_MIN_ROW || row > AIRDROP_MAX_ROW) return;

  if (col < 0 || col >= BLOCK_COLS) return;



  if (cellBlocksAirDrop(grid, row, col)) return;

  const existing = getOccupantAt(grid, row, col);

  if (existing) {
    if (!isAnchorCell(existing, row, col)) return;

    const c = crushAt(grid, row, col);

    if (c) crushed.push(c);

  }



  const monster = createMonsterInstance(typeId, row, col, growthStep);

  grid[row]![col] = monster;

  placed.push(monster);

}



/** 蓝色空降：图案落在 3–7 行，精英/首领占用格不降落，其余击碎 */

export function applyBlueAirDrop(
  grid: MonsterGrid,
  growthStep: number,
): AirDropApplyResult {

  const placed: BlockMonster[] = [];

  const crushed: BlockMonster[] = [];

  const cells = pickBluePatternCells();



  for (const { row, col } of cells) {

    if (cellBlocksAirDrop(grid, row, col)) continue;

    placeAirdrop(grid, 'airdrop_blue', row, col, growthStep, placed, crushed);

  }



  return { grid, placed, crushed };

}



/** 每列最前砖块前方（不低于第 3 行），精英/首领占用格跳过 */

export function getFrontRowInColumn(

  grid: MonsterGrid,

  col: number,

): number | null {

  let minRow: number | null = null;

  for (const m of collectUniqueMonsters(grid)) {

    if (col < m.anchorCol || col >= m.anchorCol + m.footprintW) continue;

    if (minRow === null || m.anchorRow < minRow) minRow = m.anchorRow;

  }

  return minRow;

}



export function applyRedAirDrop(
  grid: MonsterGrid,
  growthStep: number,
): AirDropApplyResult {

  const placed: BlockMonster[] = [];

  const crushed: BlockMonster[] = [];



  for (let col = 0; col < BLOCK_COLS; col++) {

    const front = getFrontRowInColumn(grid, col);

    let row = front !== null ? front - 1 : AIRDROP_MAX_ROW;

    row = Math.max(AIRDROP_MIN_ROW, row);



    if (cellBlocksAirDrop(grid, row, col)) continue;

    placeAirdrop(grid, 'airdrop_red', row, col, growthStep, placed, crushed);

  }



  return { grid, placed, crushed };

}



export function applyAirDrop(

  grid: MonsterGrid,

  variant: AirDropVariant,

  growthStep: number,

): AirDropApplyResult {

  if (variant === 'airdrop_red') return applyRedAirDrop(grid, growthStep);

  return applyBlueAirDrop(grid, growthStep);

}


