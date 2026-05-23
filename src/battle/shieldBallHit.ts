import type { BlockMonster } from './monster';
import { getFootprintAabb } from './monsterFootprint';

/** 弹球是否从朝城墙一侧（砖块顶边）正面撞击 */
export function isBallFrontHitTowardWall(
  monster: BlockMonster,
  impactX: number,
  impactY: number,
  ballVy: number,
): boolean {
  const { left, top, right, bottom } = getFootprintAabb(monster);
  const distTop = Math.abs(impactY - top);
  const distBottom = Math.abs(impactY - bottom);
  const distLeft = Math.abs(impactX - left);
  const distRight = Math.abs(impactX - right);
  const minEdge = Math.min(distTop, distBottom, distLeft, distRight);
  if (minEdge !== distTop) return false;
  return ballVy > 0;
}
