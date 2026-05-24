import { Container, Graphics } from 'pixi.js';
import type { BallColor } from '../ballTypes';
import { BALL_COLOR_HEX } from '../ballTypes';

/** 比球体本色更亮（向白色混合） */
export function brightenBallColor(hex: number, mixTowardWhite = 0.42): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const lr = Math.round(r + (255 - r) * mixTowardWhite);
  const lg = Math.round(g + (255 - g) * mixTowardWhite);
  const lb = Math.round(b + (255 - b) * mixTowardWhite);
  return (lr << 16) | (lg << 8) | lb;
}

/** 统一配色：球本色 + 发光色 + 高光（球色+白） */
export interface BallGlowPalette {
  ball: number;
  glow: number;
  white: number;
}

export function paletteForBall(color: BallColor): BallGlowPalette {
  const ball = BALL_COLOR_HEX[color];
  return {
    ball,
    glow: brightenBallColor(ball, 0.42),
    white: brightenBallColor(ball, 0.62),
  };
}

interface GlowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  tint: number;
}

const MAX_TRAIL = 72;
const TRAIL_SPAWN_EVERY_PX = 2.8;

function pickTint(palette: BallGlowPalette): number {
  const r = Math.random();
  if (r < 0.4) return palette.ball;
  if (r < 0.78) return palette.glow;
  return palette.white;
}

function drawGlowParticle(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  palette: BallGlowPalette,
  tint: number,
  alpha: number,
): void {
  const mid = tint === palette.ball ? palette.glow : tint;
  g.circle(x, y, r * 1.4);
  g.fill({ color: palette.ball, alpha: alpha * 0.22 });
  g.circle(x, y, r);
  g.fill({ color: mid, alpha: alpha * 0.52 });
  g.circle(x, y, r * 0.4);
  g.fill({ color: palette.white, alpha: alpha * 0.88 });
}

function shiftParticles(
  particles: GlowParticle[],
  dt: number,
  dx: number,
  dy: number,
): void {
  for (const p of particles) {
    p.x -= dx;
    p.y -= dy;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life += dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
  }
}

function cullParticles(particles: GlowParticle[]): void {
  let write = 0;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]!;
    if (p.life < p.maxLife) particles[write++] = p;
  }
  particles.length = write;
}

function redrawParticles(
  g: Graphics,
  particles: GlowParticle[],
  palette: BallGlowPalette,
): void {
  g.clear();
  for (const p of particles) {
    const t = p.life / p.maxLife;
    const fade = 1 - t;
    const alpha = fade * fade * 0.8;
    if (alpha < 0.02) continue;
    const r = p.size * (0.55 + fade * 0.65);
    drawGlowParticle(g, p.x, p.y, r, palette, p.tint, alpha);
  }
}

/** 大球运动拖尾粒子 */
export class BigBallParticleTrail {
  readonly display = new Graphics();
  private readonly particles: GlowParticle[] = [];
  private readonly palette: BallGlowPalette;
  private readonly radius: number;

  constructor(color: BallColor, radius: number) {
    this.palette = paletteForBall(color);
    this.radius = radius;
    this.display.blendMode = 'add';
  }

  update(dt: number, dx: number, dy: number): void {
    shiftParticles(this.particles, dt, dx, dy);
    cullParticles(this.particles);

    const dist = Math.hypot(dx, dy);
    if (dist >= 0.25) {
      const backX = -dx / dist;
      const backY = -dy / dist;
      const spawnN = Math.max(1, Math.floor(dist / TRAIL_SPAWN_EVERY_PX));
      const spread = this.radius * 0.5;

      for (let i = 0; i < spawnN; i++) {
        if (this.particles.length >= MAX_TRAIL) this.particles.shift();
        const along = 0.15 + Math.random() * 0.55;
        this.particles.push({
          x:
            backX * this.radius * along +
            (Math.random() - 0.5) * spread,
          y:
            backY * this.radius * along +
            (Math.random() - 0.5) * spread,
          vx: backX * (28 + Math.random() * 40) + (Math.random() - 0.5) * 18,
          vy: backY * (28 + Math.random() * 40) + (Math.random() - 0.5) * 18,
          life: 0,
          maxLife: 0.18 + Math.random() * 0.22,
          size: this.radius * (0.12 + Math.random() * 0.22),
          tint: pickTint(this.palette),
        });
      }
    }

    redrawParticles(this.display, this.particles, this.palette);
  }
}

/** 战场大球：粒子拖尾 */
export function attachBigBallTrail(
  root: Container,
  color: BallColor,
  radius: number,
): BigBallParticleTrail {
  const trail = new BigBallParticleTrail(color, radius);
  root.addChild(trail.display);
  return trail;
}
