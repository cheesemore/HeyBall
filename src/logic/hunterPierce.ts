import type { BlockMonster } from '../battle/monster';
import { getFootprintAabb } from '../battle/monsterFootprint';
import type { MonsterGrid } from '../battle/monsterGrid';
import { collectUniqueMonsters } from '../battle/monsterFootprint';
import {
  HUNTER_VOLLEY_ARROW_COUNT,
  HUNTER_VOLLEY_PARALLEL_SPACING,
} from '../config/ballSkills';

export interface HunterPierceLine {
  targetX: number;
  targetY: number;
  endX: number;
  endY: number;
}

export interface HunterVolleyPlan {
  originX: number;
  originY: number;
  lines: HunterPierceLine[];
}

export function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function aabbHitsLine(
  left: number,
  top: number,
  right: number,
  bottom: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  halfWidth: number,
): boolean {
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const samples = [
    { x: cx, y: cy },
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ];
  return samples.some(
    (p) => distancePointToSegment(p.x, p.y, x1, y1, x2, y2) <= halfWidth,
  );
}

/** 直线上（含延长）与线段相交的全部怪物 */
export function collectMonstersOnPenetratingLine(
  grid: MonsterGrid,
  ox: number,
  oy: number,
  throughX: number,
  throughY: number,
  extendLength: number,
  halfWidth: number,
): BlockMonster[] {
  const dx = throughX - ox;
  const dy = throughY - oy;
  const len = Math.hypot(dx, dy) || 1;
  const ex = ox + (dx / len) * extendLength;
  const ey = oy + (dy / len) * extendLength;

  const seen = new Set<string>();
  const hits: BlockMonster[] = [];
  for (const m of collectUniqueMonsters(grid)) {
    if (m.hp <= 0 || seen.has(m.instanceId)) continue;
    const { left, top, right, bottom } = getFootprintAabb(m);
    if (aabbHitsLine(left, top, right, bottom, ox, oy, ex, ey, halfWidth)) {
      seen.add(m.instanceId);
      hits.push(m);
    }
  }
  return hits;
}

/** 从原点向随机目标并排规划贯通箭 */
export function planHunterVolley(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  extendLength: number,
): HunterVolleyPlan {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const count = HUNTER_VOLLEY_ARROW_COUNT;
  const spacing = HUNTER_VOLLEY_PARALLEL_SPACING;
  const center = (count - 1) / 2;

  const lines: HunterPierceLine[] = [];
  for (let i = 0; i < count; i++) {
    const off = (i - center) * spacing;
    const tx = targetX + nx * off;
    const ty = targetY + ny * off;
    const tdx = tx - originX;
    const tdy = ty - originY;
    const tlen = Math.hypot(tdx, tdy) || 1;
    lines.push({
      targetX: tx,
      targetY: ty,
      endX: originX + (tdx / tlen) * extendLength,
      endY: originY + (tdy / tlen) * extendLength,
    });
  }

  return { originX, originY, lines };
}

export function pickRandomPointInBattle(
  monsters: BlockMonster[],
  battleWidth: number,
  battleHeight: number,
): { x: number; y: number } {
  const living = monsters.filter((m) => m.hp > 0);
  if (living.length > 0) {
    const m = living[Math.floor(Math.random() * living.length)]!;
    const { left, top, right, bottom } = getFootprintAabb(m);
    return { x: (left + right) / 2, y: (top + bottom) / 2 };
  }
  return {
    x: 80 + Math.random() * (battleWidth - 160),
    y: 120 + Math.random() * (battleHeight - 240),
  };
}
