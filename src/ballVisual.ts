import { Container, Graphics } from 'pixi.js';
import { getTableBallRadius } from './config/gameBalance';
import { BALL_COLOR_HEX, type BallItem, BallTier } from './ballTypes';

/** 格子内绘制略缩小，避免贴边；表底半径见 getTableBallRadius */
const GRID_CELL_DRAW_SCALE = 0.85;

/** 格子内展示：小球/大球固定半径，仅表示数量与大小类型 */
export function createBallVisual(
  item: BallItem,
  cellSize: number,
  radiusScale = 1,
): Container {
  const root = new Container();
  const g = new Graphics();
  const hex = BALL_COLOR_HEX[item.color];
  const cx = cellSize / 2;
  const cy = cellSize / 2;

  const drawBall = (x: number, y: number, isBig: boolean) => {
    const r = getTableBallRadius(isBig) * GRID_CELL_DRAW_SCALE * radiusScale;
    g.circle(x, y, r);
    g.fill(isBig ? shade(hex, 0.82) : hex);
    g.circle(x - r * 0.25, y - r * 0.25, r * 0.28);
    g.fill({ color: 0xffffff, alpha: 0.35 });
    if (isBig) {
      g.circle(x, y, r);
      g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.3 });
    }
  };

  switch (item.tier) {
    case BallTier.Single:
      drawBall(cx, cy, false);
      break;
    case BallTier.Dual:
      drawBall(cx - cellSize * 0.18, cy, false);
      drawBall(cx + cellSize * 0.18, cy, false);
      break;
    case BallTier.BigDual:
      drawBall(cx, cy - cellSize * 0.1, true);
      drawBall(cx - cellSize * 0.2, cy + cellSize * 0.16, false);
      drawBall(cx + cellSize * 0.2, cy + cellSize * 0.16, false);
      break;
    case BallTier.TripleBig:
      drawBall(cx, cy - cellSize * 0.14, true);
      drawBall(cx - cellSize * 0.2, cy + cellSize * 0.12, true);
      drawBall(cx + cellSize * 0.2, cy + cellSize * 0.12, true);
      break;
  }

  root.addChild(g);
  root.eventMode = 'none';
  return root;
}

function shade(color: number, factor: number): number {
  const r = ((color >> 16) & 0xff) * factor;
  const g = ((color >> 8) & 0xff) * factor;
  const b = (color & 0xff) * factor;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
