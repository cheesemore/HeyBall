import type { LaunchBallUnit } from '../ballComposition';
import { getBallCombatStats } from '../config/ballStats';
import type { BallItem } from '../ballTypes';
import { expandCellToLaunchUnits } from '../ballComposition';

export function sumAttackFromLaunchUnits(
  units: LaunchBallUnit[],
  mergeAttackBonusPercent = 0,
): number {
  let total = 0;
  for (const u of units) {
    total += getBallCombatStats(
      u.color,
      u.isBig,
      mergeAttackBonusPercent,
    ).attack;
  }
  return total;
}

export function sumAttackFromSlots(
  slots: (BallItem | null)[],
  mergeAttackBonusPercent = 0,
): number {
  const units = [];
  for (const item of slots) {
    if (item) units.push(...expandCellToLaunchUnits(item));
  }
  return sumAttackFromLaunchUnits(units, mergeAttackBonusPercent);
}
