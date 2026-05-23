/** 圆与轴对齐矩形：分离并反射速度，减少嵌入 */
export function resolveCircleAABB(
  cx: number,
  cy: number,
  r: number,
  vx: number,
  vy: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): { x: number; y: number; vx: number; vy: number; hit: boolean } {
  const closestX = Math.max(left, Math.min(cx, right));
  const closestY = Math.max(top, Math.min(cy, bottom));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;
  const rSq = r * r;

  if (distSq >= rSq) {
    return { x: cx, y: cy, vx, vy, hit: false };
  }

  let nx: number;
  let ny: number;
  let penetration: number;

  if (distSq < 1e-6) {
    const dl = cx - left;
    const dr = right - cx;
    const dt = cy - top;
    const db = bottom - cy;
    const min = Math.min(dl, dr, dt, db);
    if (min === dl) {
      nx = -1;
      ny = 0;
      penetration = r + dl;
    } else if (min === dr) {
      nx = 1;
      ny = 0;
      penetration = r + dr;
    } else if (min === dt) {
      nx = 0;
      ny = -1;
      penetration = r + dt;
    } else {
      nx = 0;
      ny = 1;
      penetration = r + db;
    }
  } else {
    const dist = Math.sqrt(distSq);
    nx = dx / dist;
    ny = dy / dist;
    penetration = r - dist + 0.5;
  }

  const outX = cx + nx * penetration;
  const outY = cy + ny * penetration;
  const dot = vx * nx + vy * ny;
  let outVx = vx;
  let outVy = vy;
  if (dot < 0) {
    outVx = vx - 2 * dot * nx;
    outVy = vy - 2 * dot * ny;
  }

  return { x: outX, y: outY, vx: outVx, vy: outVy, hit: true };
}

export function circleOverlapsAABB(
  cx: number,
  cy: number,
  r: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  const closestX = Math.max(left, Math.min(cx, right));
  const closestY = Math.max(top, Math.min(cy, bottom));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}
