import { JUDGMENT_AUTO_TOP_ROW_COUNT } from '../config/ultimateSkills';
import type { MonsterSnapshot } from './types';

/** 城墙侧第 1 行起算，第 topRowCount 行及以上（含）是否存在怪物 */
export function hasMonsterFromTopRows(
  monsters: readonly MonsterSnapshot[],
  topRowCount = JUDGMENT_AUTO_TOP_ROW_COUNT,
): boolean {
  if (topRowCount <= 0) return false;
  const maxAnchorRow = topRowCount - 1;
  return monsters.some((m) => m.hp > 0 && m.anchorRow <= maxAnchorRow);
}
