/** 招募价格：10、20、30… 每次 +10，上限 1000 */
export const RECRUIT_COST_START = 10;
export const RECRUIT_COST_STEP = 10;
export const RECRUIT_COST_CAP = 1000;

/**
 * @param recruitIndex 本局已招募次数（0 = 下一次为第 1 次，价格 10）
 */
export function getRecruitCost(recruitIndex: number): number {
  if (recruitIndex < 0) return RECRUIT_COST_START;
  const cost = RECRUIT_COST_START + RECRUIT_COST_STEP * recruitIndex;
  return Math.min(RECRUIT_COST_CAP, cost);
}
