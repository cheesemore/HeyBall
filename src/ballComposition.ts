import { BallTier, type BallColor, type BallItem } from './ballTypes';

/** 战场上实际发射的一颗球 */
export interface LaunchBallUnit {
  color: BallColor;
  isBig: boolean;
}

/** 将格子内合成结果展开为应发射的全部弹球 */
export function expandCellToLaunchUnits(item: BallItem): LaunchBallUnit[] {
  const { color, tier } = item;
  switch (tier) {
    case BallTier.Single:
      return [{ color, isBig: false }];
    case BallTier.Dual:
      return [
        { color, isBig: false },
        { color, isBig: false },
      ];
    case BallTier.BigDual:
      return [
        { color, isBig: true },
        { color, isBig: false },
        { color, isBig: false },
      ];
    case BallTier.TripleBig:
      return [
        { color, isBig: true },
        { color, isBig: true },
        { color, isBig: true },
      ];
    default:
      return [{ color, isBig: false }];
  }
}
