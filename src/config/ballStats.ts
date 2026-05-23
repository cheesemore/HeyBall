import type { BallColor } from '../ballTypes';

export interface BallStatsRow {
  attack: number;
  maxBounces: number;
  speed: number;
  critRate: number;
}

export const BALL_SPEED = 1000;
export const BALL_GRAVITY = 2100;
export const BALL_CRIT_RATE = 0.05;
export const CRIT_DAMAGE_MULTIPLIER = 2;
export const BIG_BALL_ATTACK_MULT = 2;
export const BALL_BASE_ATTACK = 10;
export const BALL_BASE_MAX_BOUNCES = 20;

const baseRow: BallStatsRow = {
  attack: BALL_BASE_ATTACK,
  maxBounces: BALL_BASE_MAX_BOUNCES,
  speed: BALL_SPEED,
  critRate: BALL_CRIT_RATE,
};

export const BALL_STATS_TABLE: Record<BallColor, BallStatsRow> = {
  brown: { ...baseRow },
  pink: { ...baseRow },
  blue: { ...baseRow },
  green: { ...baseRow },
  yellow: { ...baseRow },
  navy: { ...baseRow },
  purple: { ...baseRow },
  orange: { ...baseRow },
};

export function getSmallBallStats(color: BallColor): BallStatsRow {
  return BALL_STATS_TABLE[color];
}

export function getBallCombatStats(
  color: BallColor,
  isBig: boolean,
  mergeAttackBonusPercent = 0,
): BallStatsRow {
  const b = getSmallBallStats(color);
  const mult = 1 + mergeAttackBonusPercent / 100;
  const baseAttack = Math.round(b.attack * mult);
  return {
    attack: isBig
      ? Math.round(baseAttack * BIG_BALL_ATTACK_MULT)
      : baseAttack,
    maxBounces: b.maxBounces,
    speed: b.speed,
    critRate: b.critRate,
  };
}

