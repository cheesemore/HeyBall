import { BLOCK_COLS } from '../config/gameBalance';

import {

  AIRDROP_INTERVAL_TURNS,

  AIRDROP_MAX_ROW,

  AIRDROP_MIN_ROW,

  AIRDROP_RED_CHANCE,

  AIRDROP_RED_START_TURN,

} from '../config/airdrop';

import type { BlockMonster } from './monster';

import { createMonsterInstance } from './monster';

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



export function shouldTriggerAirDrop(turn: number, bossSpawned: boolean): boolean {

  if (bossSpawned) return false;

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



function getAnchorMonster(

  grid: MonsterGrid,

  row: number,

  col: number,

): BlockMonster | null {

  const m = grid[row]?.[col];

  if (!m) return null;

  if (m.anchorRow === row && m.anchorCol === col) return m;

  return null;

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



  const existing = getAnchorMonster(grid, row, col);

  if (existing) {

    if (blocksAirDropLanding(existing)) return;

    const c = crushAt(grid, row, col);

    if (c) crushed.push(c);

  }



  const monster = createMonsterInstance(typeId, row, col, growthStep);

  grid[row]![col] = monster;

  placed.push(monster);

}



/** 蓝色空降：图案落在 3–7 行，精英格不降落，其余击碎 */

export function applyBlueAirDrop(
  grid: MonsterGrid,
  growthStep: number,
): AirDropApplyResult {

  const placed: BlockMonster[] = [];

  const crushed: BlockMonster[] = [];

  const cells = pickBluePatternCells();



  for (const { row, col } of cells) {

    const occ = getAnchorMonster(grid, row, col);

    if (occ && blocksAirDropLanding(occ)) continue;

    placeAirdrop(grid, 'airdrop_blue', row, col, growthStep, placed, crushed);

  }



  return { grid, placed, crushed };

}



/** 每列最前砖块前方（不低于第 3 行），精英列跳过 */

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



    const occ = getAnchorMonster(grid, row, col);

    if (occ && blocksAirDropLanding(occ)) continue;



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


