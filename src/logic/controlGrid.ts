import { expandCellToLaunchUnits } from '../ballComposition';

import type { BallColor, BallItem } from '../ballTypes';

import { canMerge, createSingle, mergeResult } from '../ballTypes';

import { getMergeAttackBonusIncrement } from '../config/mergeAttackBonus';
import { getRecruitCost } from '../config/recruitCost';



export const CONTROL_GRID_COLS = 6;

export const CONTROL_GRID_ROWS = 2;

export const CONTROL_SLOT_COUNT = CONTROL_GRID_COLS * CONTROL_GRID_ROWS;

export { getRecruitCost } from '../config/recruitCost';


export const INITIAL_GOLD = 1000;



export function createEmptyControlSlots(): (BallItem | null)[] {

  return Array.from({ length: CONTROL_SLOT_COUNT }, () => null);

}



export function findEmptySlot(slots: (BallItem | null)[]): number | null {

  const i = slots.findIndex((v) => v === null);

  return i >= 0 ? i : null;

}



export function hasAnyBall(slots: (BallItem | null)[]): boolean {

  return slots.some((v) => v !== null);

}



export function collectLaunchUnitsFromSlots(slots: (BallItem | null)[]) {

  const units = [];

  for (const item of slots) {

    if (item) units.push(...expandCellToLaunchUnits(item));

  }

  return units;

}



export function canRecruit(
  gold: number,
  slots: (BallItem | null)[],
  recruitCount: number,
): boolean {

  return gold >= getRecruitCost(recruitCount) && findEmptySlot(slots) !== null;

}



export function applyRecruit(

  slots: (BallItem | null)[],

  gold: number,

  pool: readonly BallColor[],

  recruitCount: number,

): {
  slots: (BallItem | null)[];
  gold: number;
  index: number;
  recruitCount: number;
} | null {

  const index = findEmptySlot(slots);

  const cost = getRecruitCost(recruitCount);

  if (index === null || gold < cost) return null;

  const next = [...slots];

  next[index] = createSingle(pool);

  return {
    slots: next,
    gold: gold - cost,
    index,
    recruitCount: recruitCount + 1,
  };

}



export function findMergePair(slots: (BallItem | null)[]): { from: number; to: number } | null {

  for (let from = 0; from < CONTROL_SLOT_COUNT; from++) {

    const a = slots[from];

    if (!a) continue;

    for (let to = 0; to < CONTROL_SLOT_COUNT; to++) {

      if (from === to) continue;

      const b = slots[to];

      if (b && canMerge(a, b)) return { from, to };

    }

  }

  return null;

}



export function applyMerge(

  slots: (BallItem | null)[],

  from: number,

  to: number,

  pool: readonly BallColor[],

): {
  slots: (BallItem | null)[];
  merged: BallItem;
  attackBonusPercentAdd: number;
} | null {

  if (from === to) return null;

  const a = slots[from];

  const b = slots[to];

  if (!a || !b || !canMerge(a, b)) return null;

  const attackBonusPercentAdd = getMergeAttackBonusIncrement(a.tier);

  const next = [...slots];

  next[from] = null;

  next[to] = mergeResult(a, pool);

  return { slots: next, merged: next[to]!, attackBonusPercentAdd };

}


