import { BallTier } from '../ballTypes';

/** 每次合成按参与球数累计：每个球 +5% 基础攻击 */
export const MERGE_ATTACK_BONUS_PER_BALL_PERCENT = 5;

/** 同阶合成时计入的球数（单+单→+10%，双+双→+10%，大双+大双→+15%） */
const MERGE_CONSUMED_BALLS: Partial<Record<BallTier, number>> = {
  [BallTier.Single]: 2,
  [BallTier.Dual]: 2,
  [BallTier.BigDual]: 3,
};

export function getMergeAttackBonusIncrement(tier: BallTier): number {
  const n = MERGE_CONSUMED_BALLS[tier] ?? 0;
  return n * MERGE_ATTACK_BONUS_PER_BALL_PERCENT;
}
