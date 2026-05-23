import { Container, Graphics } from 'pixi.js';
import {
  HUNTER_ARROW_FLIGHT_SEC,
  KNIGHT_BIG_CROSS_THICK_MULT,
  KNIGHT_CROSS_THICK,
  MAGE_ARCANE_RADIUS,
} from '../config/ballSkills';
import {
  BATTLE_WIDTH,
  battleGridRowTopY,
  battleSpawnLineLocalY,
  MONSTER_SIZE,
} from '../layout';

const ARROW_FLIGHT_SEC = 0.2;
const ARROW_STAGGER_SEC = 0.032;
const ARROW_TRAIL_SEGMENTS = 24;
const ARROW_IMPACT_DURATION = 0.32;

const ARCANE_BURST_DURATION = 0.58;
const CROSS_SLASH_DURATION = 0.36;
const CROSS_EXTEND_PEAK = 0.16;

interface TimedFade {
  kind: 'fade';
  gfx: Graphics;
  age: number;
  duration: number;
}

interface ArcaneBurstVfx {
  kind: 'arcane';
  gfx: Graphics;
  x: number;
  y: number;
  age: number;
  duration: number;
  maxR: number;
}

interface KnightCrossVfx {
  kind: 'cross';
  gfx: Graphics;
  cx: number;
  cy: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  thick: number;
  age: number;
  duration: number;
}

interface LightningChainVfx {
  kind: 'lightning';
  gfx: Graphics;
  points: { x: number; y: number }[];
  age: number;
  duration: number;
}

interface PoisonBurstVfx {
  kind: 'poison';
  gfx: Graphics;
  x: number;
  y: number;
  age: number;
  duration: number;
}

interface DruidClawVfx {
  kind: 'claw';
  gfx: Graphics;
  /** 目标中心（本地原点） */
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  age: number;
  duration: number;
}

interface ColorLineVfx {
  kind: 'colorLine';
  gfx: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: number;
  age: number;
  duration: number;
}

interface WallExplosionVfx {
  kind: 'wallExplosion';
  gfx: Graphics;
  x: number;
  y: number;
  age: number;
  duration: number;
  scale: number;
}

interface ArrowImpactVfx {
  kind: 'arrowImpact';
  gfx: Graphics;
  x: number;
  y: number;
  age: number;
  duration: number;
}

type VfxEntry =
  | TimedFade
  | ArcaneBurstVfx
  | KnightCrossVfx
  | LightningChainVfx
  | PoisonBurstVfx
  | DruidClawVfx
  | ColorLineVfx
  | WallExplosionVfx
  | ArrowImpactVfx;

const LIGHTNING_CHAIN_DURATION = 0.42;
const LIGHTNING_LAYERS = 5;
const POISON_BURST_DURATION = 0.28;
const DRUID_CLAW_DURATION = 0.42;
const COLOR_LINE_DURATION = 0.28;
const WALL_EXPLOSION_DURATION = 0.55;

interface FlyingArrow {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  age: number;
  duration: number;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) ** 2;
}

/** 技能特效层（魔爆圈、十字斩、剑雨等） */
export class SkillVfxLayer extends Container {
  private readonly entries: VfxEntry[] = [];
  private flyingArrow: FlyingArrow | null = null;
  private flyingVolley: FlyingArrow[] | null = null;

  spawnArcaneExplosion(x: number, y: number, radius = MAGE_ARCANE_RADIUS): void {
    const g = new Graphics();
    g.position.set(x, y);
    this.addChild(g);
    this.entries.push({
      kind: 'arcane',
      gfx: g,
      x,
      y,
      age: 0,
      duration: ARCANE_BURST_DURATION,
      maxR: radius,
    });
  }

  spawnLightningChain(points: { x: number; y: number }[]): void {
    if (points.length < 2) return;
    const g = new Graphics();
    this.addChild(g);
    this.entries.push({
      kind: 'lightning',
      gfx: g,
      points: [...points],
      age: 0,
      duration: LIGHTNING_CHAIN_DURATION,
    });
    this.drawLightningChain(
      this.entries[this.entries.length - 1] as LightningChainVfx,
      0,
    );
  }

  spawnPoisonBurst(x: number, y: number): void {
    const g = new Graphics();
    g.position.set(x, y);
    this.addChild(g);
    this.entries.push({
      kind: 'poison',
      gfx: g,
      x,
      y,
      age: 0,
      duration: POISON_BURST_DURATION,
    });
  }

  spawnDruidClaw(fromX: number, fromY: number, toX: number, toY: number): void {
    const g = new Graphics();
    g.position.set(toX, toY);
    this.addChild(g);
    this.entries.push({
      kind: 'claw',
      gfx: g,
      fromX,
      fromY,
      x: toX,
      y: toY,
      age: 0,
      duration: DRUID_CLAW_DURATION,
    });
  }

  spawnKnightCross(row: number, col: number, isBig = false): void {
    const g = new Graphics();
    const cx = col * MONSTER_SIZE + MONSTER_SIZE / 2;
    const cy = battleGridRowTopY(row) + MONSTER_SIZE / 2;
    const top = battleGridRowTopY(0);
    const bottom = battleSpawnLineLocalY();
    this.addChild(g);
    this.entries.push({
      kind: 'cross',
      gfx: g,
      cx,
      cy,
      top,
      bottom,
      left: 0,
      right: BATTLE_WIDTH,
      thick: isBig ? KNIGHT_CROSS_THICK * KNIGHT_BIG_CROSS_THICK_MULT : KNIGHT_CROSS_THICK,
      age: 0,
      duration: CROSS_SLASH_DURATION,
    });
  }

  /** @deprecated 旧箭雨；猎人改用 spawnHunterVolley */
  spawnArrowFall(fromX: number, fromY: number, toX: number, toY: number): void {
    this.spawnHunterVolley(fromX, fromY, [{ toX, toY }]);
  }

  /** 猎人：从原点并排射出多支贯通箭 */
  spawnHunterVolley(
    fromX: number,
    fromY: number,
    shots: { toX: number; toY: number }[],
  ): void {
    this.cancelFlyingArrow();
    this.cancelHunterVolley();
    this.flyingVolley = shots.map((s) => {
      const g = new Graphics();
      this.addChild(g);
      const arrow: FlyingArrow = {
        gfx: g,
        fromX,
        fromY,
        toX: s.toX,
        toY: s.toY,
        age: 0,
        duration: HUNTER_ARROW_FLIGHT_SEC,
      };
      this.drawFlyingArrow(arrow, 0);
      return arrow;
    });
  }

  isArrowFlying(): boolean {
    return this.flyingArrow !== null || this.isHunterVolleyFlying();
  }

  isHunterVolleyFlying(): boolean {
    return this.flyingVolley !== null && this.flyingVolley.length > 0;
  }

  cancelFlyingArrow(): void {
    if (!this.flyingArrow) return;
    this.flyingArrow.gfx.destroy();
    this.flyingArrow = null;
  }

  cancelHunterVolley(): void {
    if (!this.flyingVolley) return;
    for (const a of this.flyingVolley) a.gfx.destroy();
    this.flyingVolley = null;
  }

  /** 猎人齐射飞行；全部到达返回 true */
  updateHunterVolley(dt: number): boolean {
    const volley = this.flyingVolley;
    if (!volley || volley.length === 0) return false;

    let allDone = true;
    for (const a of volley) {
      a.age += dt;
      const t = Math.min(1, a.age / a.duration);
      const eased = easeOutQuad(t);
      this.drawFlyingArrow(a, eased);
      if (t < 1) allDone = false;
    }

    if (!allDone) return false;

    for (const a of volley) {
      this.spawnArrowImpact(a.toX, a.toY);
      a.gfx.destroy();
    }
    this.flyingVolley = null;
    return true;
  }

  updateArrowFall(dt: number): boolean {
    const a = this.flyingArrow;
    if (!a) return false;
    a.age += dt;
    const t = Math.min(1, a.age / a.duration);
    const eased = easeOutQuad(t);
    this.drawFlyingArrow(a, eased);
    if (t >= 1) {
      a.gfx.destroy();
      this.flyingArrow = null;
      this.spawnArrowImpact(a.toX, a.toY);
      return true;
    }
    return false;
  }

  private drawFlyingArrow(a: FlyingArrow, u: number): void {
    const x = a.fromX + (a.toX - a.fromX) * u;
    const y = a.fromY + (a.toY - a.fromY) * u;
    const g = a.gfx;
    g.clear();

    const dx = a.toX - a.fromX;
    const dy = a.toY - a.fromY;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    for (let i = ARROW_TRAIL_SEGMENTS; i >= 1; i--) {
      const tu = Math.max(0, u - i * 0.038);
      const tx = a.fromX + (a.toX - a.fromX) * tu;
      const ty = a.fromY + (a.toY - a.fromY) * tu;
      const fade = (1 - i / ARROW_TRAIL_SEGMENTS) * u;
      const alpha = fade * 0.65;
      const w = 2 + (1 - i / ARROW_TRAIL_SEGMENTS) * 7;
      if (alpha < 0.04) continue;

      g.moveTo(tx - nx * 3, ty - ny * 3 - 8);
      g.lineTo(tx + nx * 3, ty + ny * 3 + 4);
      g.stroke({ width: w, color: 0x5a9a00, alpha: alpha * 0.45 });
      g.moveTo(tx - nx * 2, ty - ny * 2 - 7);
      g.lineTo(tx + nx * 2, ty + ny * 2 + 3);
      g.stroke({ width: w * 0.65, color: 0xadff2f, alpha });

      if (i % 3 === 0) {
        const spark = 2 + (i % 5);
        g.circle(tx + nx * 4, ty + ny * 4, spark);
        g.fill({ color: 0xe8ff9a, alpha: alpha * 0.55 });
      }
    }

    g.moveTo(a.fromX, a.fromY);
    g.lineTo(x, y);
    g.stroke({ width: 5, color: 0x3d6b00, alpha: 0.4 * u });
    g.stroke({ width: 3, color: 0x7cfc00, alpha: 0.55 * u });

    const headLen = 22;
    const tipX = x - (dx / len) * headLen;
    const tipY = y - (dy / len) * headLen;
    g.moveTo(tipX, tipY);
    g.lineTo(x + nx * 7, y + ny * 7);
    g.lineTo(x - nx * 7, y - ny * 7);
    g.closePath();
    g.fill({ color: 0xc8ff70, alpha: 0.95 });
    g.stroke({ width: 2.5, color: 0xffffff, alpha: 0.85 });

    g.moveTo(x - nx * 4, y - ny * 4 - 10);
    g.lineTo(x + nx * 4, y + ny * 4 + 6);
    g.stroke({ width: 6, color: 0x7cfc00, alpha: 0.92 });
    g.circle(x, y + 2, 6);
    g.fill({ color: 0xadff2f, alpha: 0.9 });
    g.circle(x, y + 2, 10);
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.5 * u });
  }

  private spawnArrowImpact(x: number, y: number): void {
    const g = new Graphics();
    g.position.set(x, y);
    this.addChild(g);
    this.entries.push({
      kind: 'arrowImpact',
      gfx: g,
      x,
      y,
      age: 0,
      duration: ARROW_IMPACT_DURATION,
    });
  }

  private drawArrowImpact(e: ArrowImpactVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const fade = Math.max(0, 1 - t * 1.1);
    const g = e.gfx;
    g.clear();

    const ring = 12 + t * 38;
    g.circle(0, 0, ring);
    g.stroke({ width: 5, color: 0x7cfc00, alpha: fade * 0.75 });
    g.circle(0, 0, ring * 0.55);
    g.fill({ color: 0xadff2f, alpha: fade * 0.5 });

    g.circle(0, 0, 8 * (1 - t * 0.5));
    g.fill({ color: 0xffffff, alpha: fade * 0.85 });

    const particleN = 14;
    for (let i = 0; i < particleN; i++) {
      const ang = (i / particleN) * Math.PI * 2 + e.age * 2.2;
      const dist = 6 + t * (22 + (i % 3) * 8);
      const px = Math.cos(ang) * dist;
      const py = Math.sin(ang) * dist;
      const pr = 2.5 + (i % 2) * 1.5;
      g.circle(px, py, pr);
      g.fill({ color: i % 2 === 0 ? 0xe8ff9a : 0x7cfc00, alpha: fade * 0.9 });
    }

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.4;
      const len = 10 + t * 28;
      g.moveTo(0, 0);
      g.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      g.stroke({ width: 3, color: 0xadff2f, alpha: fade * 0.65 });
    }
  }

  private drawArcaneBurst(e: ArcaneBurstVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const wave = easeOutCubic(t);
    const r = e.maxR * wave;
    const g = e.gfx;
    g.clear();

    const flashT = Math.max(0, 1 - t * 4.5);
    if (flashT > 0.02) {
      g.circle(0, 0, 28 + e.maxR * 0.08 * (1 - t));
      g.fill({ color: 0xffffff, alpha: flashT * 0.75 });
      g.circle(0, 0, 14);
      g.fill({ color: 0xccf0ff, alpha: flashT * 0.9 });
    }

    const fillA = Math.max(0, 0.55 * (1 - t * 0.75));
    if (r > 4 && fillA > 0.02) {
      g.circle(0, 0, r);
      g.fill({ color: 0x2288dd, alpha: fillA * 0.45 });
      g.circle(0, 0, r * 0.82);
      g.fill({ color: 0x66ccff, alpha: fillA * 0.65 });
      g.circle(0, 0, r * 0.45);
      g.fill({ color: 0xaaeeff, alpha: fillA * 0.35 });
    }

    const ringA = Math.max(0, 1 - Math.abs(t - 0.28) * 2.8);
    if (r > 2 && ringA > 0.05) {
      g.circle(0, 0, r);
      g.stroke({ width: 7, color: 0x3399ee, alpha: ringA * 0.55 });
      g.circle(0, 0, r);
      g.stroke({ width: 3.5, color: 0xffffff, alpha: ringA * 0.85 });
      g.circle(0, 0, r * 0.68);
      g.stroke({ width: 2, color: 0xaaeeff, alpha: ringA * 0.7 });
    }

    const t2 = Math.max(0, (t - 0.08) / 0.92);
    const r2 = e.maxR * easeOutCubic(t2);
    const ring2A = Math.max(0, 0.65 * (1 - t2 * 1.1));
    if (r2 > r * 0.25 && ring2A > 0.05) {
      g.circle(0, 0, r2);
      g.stroke({ width: 4, color: 0x2266aa, alpha: ring2A * 0.7 });
    }

    const particleFade = Math.max(0, 1 - t * 1.15);
    if (particleFade > 0.04) {
      const count = 14;
      for (let i = 0; i < count; i++) {
        const baseAng = (i / count) * Math.PI * 2 + e.age * 2.2;
        const dist = r * (0.55 + 0.45 * wave) + 8 + (i % 3) * 6;
        const px = Math.cos(baseAng) * dist;
        const py = Math.sin(baseAng) * dist;
        const sparkR = 3 + (i % 2) * 2;
        g.circle(px, py, sparkR + 2);
        g.fill({ color: 0x4488cc, alpha: particleFade * 0.35 });
        g.circle(px, py, sparkR);
        g.fill({ color: 0xffffff, alpha: particleFade * 0.8 });
      }
    }

    const runeFade = Math.max(0, 0.5 * (1 - Math.abs(t - 0.45) * 3));
    if (runeFade > 0.05 && r > 20) {
      const runeR = r * 0.55;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const rx = Math.cos(ang) * runeR;
        const ry = Math.sin(ang) * runeR;
        g.moveTo(rx * 0.7, ry * 0.7);
        g.lineTo(rx, ry);
        g.stroke({ width: 2.5, color: 0x88ddff, alpha: runeFade });
      }
    }
  }

  private lightningBoltPath(
    g: Graphics,
    a: { x: number; y: number },
    b: { x: number; y: number },
    segIndex: number,
    pulse: number,
    layerSeed: number,
  ): void {
    const segments = 9;
    const jitterScale = (10 + layerSeed * 2.5) * pulse;
    g.moveTo(a.x, a.y);
    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      const mx = a.x + (b.x - a.x) * t;
      const my = a.y + (b.y - a.y) * t;
      const envelope = 1 - Math.abs(t - 0.5) * 1.6;
      const jitter = envelope * jitterScale;
      const jx =
        mx +
        Math.sin(t * 19 + segIndex * 3.1 + layerSeed) * jitter +
        Math.sin(t * 7 + layerSeed * 2) * jitter * 0.35;
      const jy =
        my +
        Math.cos(t * 15 + segIndex * 2.7 + layerSeed) * jitter +
        Math.cos(t * 11 + layerSeed) * jitter * 0.35;
      g.lineTo(jx, jy);
    }
  }

  private drawLightningChain(e: LightningChainVfx, pulse: number): void {
    const g = e.gfx;
    g.clear();
    const alpha = Math.max(0, 1 - e.age / e.duration);
    if (alpha <= 0.02) return;

    const layerStyles: { width: number; color: number; alphaMult: number }[] = [
      { width: 16, color: 0x1a4a8a, alphaMult: 0.35 },
      { width: 11, color: 0x3399dd, alphaMult: 0.5 },
      { width: 7, color: 0x55ccff, alphaMult: 0.75 },
      { width: 4, color: 0xaaeeff, alphaMult: 0.9 },
      { width: 2, color: 0xffffff, alphaMult: 1 },
    ];

    for (let layer = 0; layer < LIGHTNING_LAYERS; layer++) {
      const style = layerStyles[layer]!;
      for (let i = 1; i < e.points.length; i++) {
        this.lightningBoltPath(
          g,
          e.points[i - 1]!,
          e.points[i]!,
          i,
          pulse,
          layer * 1.7 + e.age * 8,
        );
        g.stroke({
          width: style.width,
          color: style.color,
          alpha: alpha * style.alphaMult,
        });
      }
    }

    for (const p of e.points) {
      const nodeR = 10 + pulse * 5;
      g.circle(p.x, p.y, nodeR + 6);
      g.fill({ color: 0x2288cc, alpha: alpha * 0.35 });
      g.circle(p.x, p.y, nodeR);
      g.fill({ color: 0x66ccff, alpha: alpha * 0.75 });
      g.circle(p.x, p.y, nodeR * 0.45);
      g.fill({ color: 0xffffff, alpha: alpha * 0.95 });
    }
  }

  private drawPoisonBurst(e: PoisonBurstVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const fade = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 0.6);
    const g = e.gfx;
    g.clear();
    const r = 10 + t * 22;
    g.circle(0, 0, r);
    g.fill({ color: 0x9b59b6, alpha: 0.45 * fade });
    g.circle(0, 0, r * 0.55);
    g.fill({ color: 0xda70d6, alpha: 0.65 * fade });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + e.age * 4;
      const dist = r * 0.75;
      g.circle(Math.cos(ang) * dist, Math.sin(ang) * dist, 4);
      g.fill({ color: 0xcc66ff, alpha: 0.7 * fade });
    }
  }

  private drawDruidClaw(e: DruidClawVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const fade = t < 0.28 ? t / 0.28 : Math.max(0, 1 - (t - 0.28) / 0.72);
    const g = e.gfx;
    g.clear();

    const dx = e.x - e.fromX;
    const dy = e.y - e.fromY;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const trailLen = Math.min(len, 120 + t * 40);
    const trailStart = -trailLen;

    const trailEnd = 8 + t * 18;
    const drawTrail = (w: number, color: number, alpha: number) => {
      g.moveTo(ux * trailStart, uy * trailStart);
      g.lineTo(ux * trailEnd, uy * trailEnd);
      g.stroke({ width: w, color, alpha });
    };
    drawTrail(14, 0x2d8a3e, 0.35 * fade);
    drawTrail(6, 0x66ff88, 0.55 * fade);
    drawTrail(2.5, 0xe8ffe8, 0.75 * fade);

    const slash = 36 + t * 22;
    const slashAngles = [-0.75, -0.42, -0.1];
    for (let i = 0; i < slashAngles.length; i++) {
      const ang = slashAngles[i]! + uy * 0.08;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const x0 = -cos * slash;
      const y0 = -sin * slash;
      const x1 = cos * slash * 0.35;
      const y1 = sin * slash * 0.35;
      const off = (i - 1) * 12;
      const sx0 = x0 + off;
      const sy0 = y0;
      const sx1 = x1 + off;
      const sy1 = y1;
      const drawSlash = (w: number, color: number, alpha: number) => {
        g.moveTo(sx0, sy0);
        g.lineTo(sx1, sy1);
        g.stroke({ width: w, color, alpha });
      };
      drawSlash(10 - i * 2, 0x1a6b28, 0.45 * fade);
      drawSlash(6 - i, 0x44cc55, 0.75 * fade);
      drawSlash(2.5, 0xffe8a0, 0.9 * fade);
    }

    const burstR = 14 + t * 28;
    g.circle(0, 0, burstR);
    g.fill({ color: 0x33aa44, alpha: 0.4 * fade });
    g.circle(0, 0, burstR * 0.55);
    g.fill({ color: 0xffcc66, alpha: 0.65 * fade });
    g.circle(0, 0, burstR * 1.35);
    g.stroke({ width: 3, color: 0x88ff99, alpha: 0.7 * fade });

    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + e.age * 5;
      const dist = burstR * 0.85;
      g.circle(Math.cos(ang) * dist, Math.sin(ang) * dist, 3 + (1 - t) * 2);
      g.fill({ color: 0xaaff88, alpha: 0.8 * fade });
    }
  }

  private drawKnightCross(e: KnightCrossVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const extend = Math.min(1, t / CROSS_EXTEND_PEAK);
    const u = easeOutCubic(extend);
    const fade = t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.5);
    const flash = u >= 0.92 ? Math.sin((t - 0.5) * 28) * 0.5 + 0.5 : 0;

    const halfW = (e.right - e.left) / 2;
    const halfH = (e.bottom - e.top) / 2;
    const armW = halfW * u;
    const armH = halfH * u;
    const { cx, cy, thick } = e;
    const g = e.gfx;
    g.clear();

    const glow = thick * 1.85;
    const core = thick * 0.42;
    const fillA = 0.82 * fade;
    const glowA = 0.28 * fade;

    const drawArmH = (y0: number, h: number, w: number, color: number, a: number) => {
      g.roundRect(cx - w, y0, w * 2, h, Math.min(h / 2, w * 0.35));
      g.fill({ color, alpha: a });
    };
    const drawArmV = (x0: number, w: number, h: number, color: number, a: number) => {
      g.roundRect(x0, cy - h, w, h * 2, Math.min(w / 2, h * 0.35));
      g.fill({ color, alpha: a });
    };

    drawArmH(cy - glow / 2, glow, armW, 0xff1493, glowA);
    drawArmV(cx - glow / 2, glow, armH, 0xff1493, glowA);

    drawArmH(cy - thick / 2, thick, armW, 0xff69b4, fillA);
    drawArmV(cx - thick / 2, thick, armH, 0xff69b4, fillA);

    drawArmH(cy - core / 2, core, armW * 0.98, 0xffb6e8, fillA * 0.9);
    drawArmV(cx - core / 2, core, armH * 0.98, 0xffb6e8, fillA * 0.9);

    g.rect(cx - armW, cy - thick / 2, armW * 2, thick);
    g.stroke({ width: 3, color: 0xffffff, alpha: 0.55 * fade });
    g.rect(cx - thick / 2, cy - armH, thick, armH * 2);
    g.stroke({ width: 3, color: 0xffffff, alpha: 0.55 * fade });

    if (u > 0.15) {
      const slashLen = Math.min(armW, armH) * 0.35 * u;
      for (const sign of [-1, 1]) {
        g.moveTo(cx - slashLen, cy - slashLen * sign);
        g.lineTo(cx + slashLen, cy + slashLen * sign);
        g.stroke({ width: 2.5, color: 0xffffff, alpha: 0.4 * fade });
      }
    }

    if (u >= 0.95) {
      const burst = thick * (1.2 + flash * 0.5);
      g.circle(cx, cy, burst);
      g.fill({ color: 0xffffff, alpha: (0.45 + flash * 0.35) * fade });
      g.circle(cx, cy, burst * 1.8);
      g.stroke({ width: 4, color: 0xff69b4, alpha: 0.5 * fade });
    }
  }

  spawnColorLine(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: number,
  ): void {
    const g = new Graphics();
    this.addChild(g);
    this.entries.push({
      kind: 'colorLine',
      gfx: g,
      fromX,
      fromY,
      toX,
      toY,
      color,
      age: 0,
      duration: COLOR_LINE_DURATION,
    });
    this.drawColorLine(this.entries[this.entries.length - 1] as ColorLineVfx);
  }

  spawnWallDetonateExplosion(x: number, y: number, scale = 1): void {
    const g = new Graphics();
    g.position.set(x, y);
    this.addChild(g);
    this.entries.push({
      kind: 'wallExplosion',
      gfx: g,
      x,
      y,
      age: 0,
      duration: WALL_EXPLOSION_DURATION,
      scale,
    });
  }

  private drawColorLine(e: ColorLineVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const g = e.gfx;
    g.clear();
    const ex = e.fromX + (e.toX - e.fromX) * t;
    const ey = e.fromY + (e.toY - e.fromY) * t;
    const alpha = 0.35 + 0.55 * (1 - Math.abs(t - 0.5) * 2);

    g.moveTo(e.fromX, e.fromY);
    g.lineTo(ex, ey);
    g.stroke({ width: 8, color: e.color, alpha: alpha * 0.35 });

    g.moveTo(e.fromX, e.fromY);
    g.lineTo(ex, ey);
    g.stroke({ width: 4, color: e.color, alpha: alpha * 0.65 });

    g.moveTo(e.fromX, e.fromY);
    g.lineTo(ex, ey);
    g.stroke({ width: 1.5, color: 0xffffff, alpha: alpha * 0.9 });

    const pulse = 4 + 3 * Math.sin(e.age * 40);
    g.circle(ex, ey, pulse);
    g.fill({ color: e.color, alpha: alpha * 0.9 });
    g.circle(ex, ey, pulse + 3);
    g.stroke({ width: 2, color: 0xffffff, alpha: alpha * 0.6 });
  }

  private drawWallExplosion(e: WallExplosionVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const g = e.gfx;
    g.clear();
    const s = e.scale;
    const core = 28 * s * (0.4 + t * 1.4);
    const ring = 55 * s * easeOutCubic(t);
    const fade = Math.max(0, 1 - t * 1.05);

    g.circle(0, 0, core);
    g.fill({ color: 0xffffff, alpha: fade * 0.95 });
    g.circle(0, 0, core * 0.55);
    g.fill({ color: 0xff6600, alpha: fade * 0.85 });
    g.circle(0, 0, ring);
    g.stroke({ width: 5 * s, color: 0xff3300, alpha: fade * 0.9 });
    g.circle(0, 0, ring * 1.35);
    g.stroke({ width: 3 * s, color: 0xffaa00, alpha: fade * 0.55 });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + e.age * 3;
      const len = ring * (0.7 + 0.35 * (1 - t));
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.stroke({ width: 2 * s, color: 0xffcc44, alpha: fade * 0.7 });
    }
  }

  spawnAssassinFlash(x: number, y: number, elite: boolean): void {
    const g = new Graphics();
    const r = elite ? 70 : 48;
    g.circle(0, 0, r);
    g.fill({ color: 0xffd700, alpha: elite ? 0.45 : 0.32 });
    g.stroke({ width: elite ? 4 : 2, color: 0xffffff, alpha: 0.8 });
    g.position.set(x, y);
    this.addChild(g);
    this.entries.push({
      kind: 'fade',
      gfx: g,
      age: 0,
      duration: elite ? 0.32 : 0.2,
    });
  }

  update(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i]!;
      e.age += dt;

      if (e.kind === 'arcane') {
        this.drawArcaneBurst(e);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'cross') {
        this.drawKnightCross(e);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'lightning') {
        const pulse = 1 - e.age / e.duration;
        this.drawLightningChain(e, pulse);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'arrowImpact') {
        this.drawArrowImpact(e);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'poison') {
        this.drawPoisonBurst(e);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'claw') {
        this.drawDruidClaw(e);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'colorLine') {
        this.drawColorLine(e);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'wallExplosion') {
        this.drawWallExplosion(e);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      e.gfx.alpha = Math.max(0, 1 - e.age / e.duration);
      if (e.age >= e.duration) {
        e.gfx.destroy();
        this.entries.splice(i, 1);
      }
    }
  }

  clear(): void {
    if (this.flyingArrow) {
      this.flyingArrow.gfx.destroy();
      this.flyingArrow = null;
    }
    for (const e of this.entries) e.gfx.destroy();
    this.entries.length = 0;
  }
}

export { ARROW_FLIGHT_SEC, ARROW_STAGGER_SEC };
