import { Container, Graphics } from 'pixi.js';

export const BALL_BIRTH_DURATION = 0.32;
export const MERGE_CELL_FX_DURATION = 0.28;

export interface TickableEffect {
  tick(dt: number): boolean;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** 从 0% 缩放到正常大小（以格子中心为原点） */
export function createBallBirthEffect(
  visual: Container,
  cellSize: number,
): TickableEffect {
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  visual.pivot.set(cx, cy);
  visual.position.set(cx, cy);
  visual.scale.set(0.001);

  let elapsed = 0;
  return {
    tick(dt: number) {
      elapsed += dt;
      const t = Math.min(1, elapsed / BALL_BIRTH_DURATION);
      const s = easeOutBack(t);
      visual.scale.set(Math.max(0.001, s));
      if (t >= 1) {
        visual.scale.set(1);
        visual.pivot.set(0, 0);
        visual.position.set(0, 0);
        return false;
      }
      return true;
    },
  };
}

/** 合成格子闪光 + 扩散环，结束后回调 */
export function createMergeCellEffect(
  fxLayer: Container,
  cellW: number,
  cellH: number,
  onComplete: () => void,
): TickableEffect {
  const cx = cellW / 2;
  const cy = cellH / 2;
  const gfx = new Graphics();
  gfx.eventMode = 'none';
  fxLayer.addChild(gfx);

  let elapsed = 0;
  let done = false;

  return {
    tick(dt: number) {
      elapsed += dt;
      const t = Math.min(1, elapsed / MERGE_CELL_FX_DURATION);
      const expand = easeOutBack(t);
      const fade = 1 - t * t;

      gfx.clear();

      const innerR = Math.min(cellW, cellH) * 0.42 * expand;
      gfx.circle(cx, cy, innerR);
      gfx.fill({ color: 0xffffff, alpha: 0.55 * fade });

      const ringR = Math.min(cellW, cellH) * (0.28 + 0.55 * expand);
      gfx.circle(cx, cy, ringR);
      gfx.stroke({ width: 3 + 5 * (1 - t), color: 0xffd54f, alpha: 0.95 * fade });

      const outerR = Math.min(cellW, cellH) * (0.5 + 0.35 * t);
      gfx.circle(cx, cy, outerR);
      gfx.stroke({ width: 2, color: 0x5fcf7a, alpha: 0.5 * fade });

      if (t >= 1 && !done) {
        done = true;
        gfx.destroy();
        onComplete();
        return false;
      }
      return t < 1;
    },
  };
}
