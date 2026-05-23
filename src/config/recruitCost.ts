/** 招募第 1～11 次固定价格 */
const RECRUIT_COST_TABLE: readonly number[] = [
  10, 20, 30, 40, 50, 60, 70, 80, 100, 120, 140,
];

const RECRUIT_COST_AFTER_TABLE = 140;
const RECRUIT_COST_STEP = 20;
const RECRUIT_COST_CAP = 1000;

/**
 * @param recruitIndex 本局已招募次数（0 = 下一次为第 1 次，价格 10）
 */
export function getRecruitCost(recruitIndex: number): number {
  if (recruitIndex < 0) return RECRUIT_COST_TABLE[0]!;
  if (recruitIndex < RECRUIT_COST_TABLE.length) {
    return RECRUIT_COST_TABLE[recruitIndex]!;
  }
  const cost =
    RECRUIT_COST_AFTER_TABLE +
    RECRUIT_COST_STEP * (recruitIndex - (RECRUIT_COST_TABLE.length - 1));
  return Math.min(RECRUIT_COST_CAP, cost);
}
