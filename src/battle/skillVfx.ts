import { Container, Graphics } from 'pixi.js';
import {
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

const ARROW_FLIGHT_SEC = 0.18;
const ARROW_STAGGER_SEC = 0.032;
const ARROW_TRAIL_SEGMENTS = 14;

const ARCANE_BURST_DURATION = 0.38;
const CROSS_SLASH_DURATION = 0.28;
const CROSS_EXTEND_PEAK = 0.14;

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
  x: number;
  y: number;
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

type VfxEntry =
  | TimedFade
  | ArcaneBurstVfx
  | KnightCrossVfx
  | LightningChainVfx
  | PoisonBurstVfx
  | DruidClawVfx
  | ColorLineVfx
  | WallExplosionVfx;

const LIGHTNING_CHAIN_DURATION = 0.32;
const POISON_BURST_DURATION = 0.28;
const DRUID_CLAW_DURATION = 0.26;
const COLOR_LINE_DURATION = 0.22;
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

  spawnDruidClaw(x: number, y: number): void {
    const g = new Graphics();
    g.position.set(x, y);
    this.addChild(g);
    this.entries.push({
      kind: 'claw',
      gfx: g,
      x,
      y,
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

  spawnArrowFall(fromX: number, fromY: number, toX: number, toY: number): void {
    if (this.flyingArrow) {
      this.flyingArrow.gfx.destroy();
    }
    const g = new Graphics();
    this.addChild(g);
    this.flyingArrow = {
      gfx: g,
      fromX,
      fromY,
      toX,
      toY,
      age: 0,
      duration: ARROW_FLIGHT_SEC,
    };
    this.drawFlyingArrow(this.flyingArrow, 0);
  }

  isArrowFlying(): boolean {
    return this.flyingArrow !== null;
  }

  cancelFlyingArrow(): void {
    if (!this.flyingArrow) return;
    this.flyingArrow.gfx.destroy();
    this.flyingArrow = null;
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

    for (let i = ARROW_TRAIL_SEGMENTS; i >= 1; i--) {
      const tu = Math.max(0, u - i * 0.045);
      const tx = a.fromX + (a.toX - a.fromX) * tu;
      const ty = a.fromY + (a.toY - a.fromY) * tu;
      const alpha = (1 - i / ARROW_TRAIL_SEGMENTS) * 0.55 * u;
      const w = 1 + (1 - i / ARROW_TRAIL_SEGMENTS) * 2.5;
      if (alpha < 0.03) continue;
      g.moveTo(tx, ty - 6);
      g.lineTo(tx, ty + 2);
      g.stroke({ width: w, color: 0xadff2f, alpha });
    }

    g.moveTo(a.fromX, a.fromY);
    g.lineTo(x, y);
    g.stroke({ width: 2, color: 0x7cfc00, alpha: 0.35 * u });

    g.moveTo(x, y - 16);
    g.lineTo(x, y + 5);
    g.stroke({ width: 3, color: 0x7cfc00, alpha: 0.95 });
    g.circle(x, y + 5, 4);
    g.fill({ color: 0xadff2f, alpha: 0.95 });
  }

  private spawnArrowImpact(x: number, y: number): void {
    const g = new Graphics();
    g.circle(x, y, 8);
    g.fill({ color: 0xadff2f, alpha: 0.7 });
    g.stroke({ width: 2, color: 0x7cfc00, alpha: 0.9 });
    this.addChild(g);
    this.entries.push({ kind: 'fade', gfx: g, age: 0, duration: 0.16 });
  }

  private drawArcaneBurst(e: ArcaneBurstVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const wave = easeOutCubic(t);
    const r = e.maxR * wave;
    const g = e.gfx;
    g.clear();

    const coreA = Math.max(0, 1 - t * 3) * 0.9;
    if (coreA > 0.02) {
      g.circle(0, 0, 18 * (1 - t * 0.5));
      g.fill({ color: 0xffffff, alpha: coreA });
      g.circle(0, 0, 10);
      g.fill({ color: 0xaaeeff, alpha: coreA * 0.85 });
    }

    const fillA = Math.max(0, 0.42 * (1 - t * 0.85));
    if (r > 4 && fillA > 0.02) {
      g.circle(0, 0, r);
      g.fill({ color: 0x66ccff, alpha: fillA });
    }

    const ringA = Math.max(0, 0.95 * (1 - Math.abs(t - 0.35) * 2.2));
    if (r > 2 && ringA > 0.05) {
      g.circle(0, 0, r);
      g.stroke({ width: 4, color: 0xaaeeff, alpha: ringA });
      g.circle(0, 0, r * 0.72);
      g.stroke({ width: 2, color: 0xffffff, alpha: ringA * 0.55 });
    }

    const r2 = e.maxR * easeOutCubic(Math.max(0, t - 0.12) / 0.88);
    const ring2A = Math.max(0, 0.5 * (1 - t));
    if (r2 > r * 0.3 && ring2A > 0.05) {
      g.circle(0, 0, r2);
      g.stroke({ width: 2, color: 0x4488cc, alpha: ring2A });
    }
  }

  private drawLightningChain(e: LightningChainVfx, pulse: number): void {
    const g = e.gfx;
    g.clear();
    const alpha = Math.max(0, 1 - e.age / e.duration);
    if (alpha <= 0.02) return;

    for (let i = 1; i < e.points.length; i++) {
      const a = e.points[i - 1]!;
      const b = e.points[i]!;
      const segments = 5;
      let px = a.x;
      let py = a.y;
      g.moveTo(px, py);
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const mx = a.x + (b.x - a.x) * t;
        const my = a.y + (b.y - a.y) * t;
        const jitter = (1 - Math.abs(t - 0.5) * 2) * 14 * pulse;
        const jx = mx + (Math.sin(t * 17 + i) * jitter);
        const jy = my + (Math.cos(t * 13 + i) * jitter);
        g.lineTo(jx, jy);
        px = jx;
        py = jy;
      }
      g.stroke({ width: 3, color: 0x66ccff, alpha: alpha * 0.95 });
      g.stroke({ width: 1.5, color: 0xffffff, alpha: alpha * 0.75 });
    }

    for (const p of e.points) {
      g.circle(p.x, p.y, 6 + pulse * 3);
      g.fill({ color: 0xaaddff, alpha: alpha * 0.85 });
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
    const fade = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.65);
    const g = e.gfx;
    g.clear();
    const slash = 28 + t * 8;
    for (let i = -1; i <= 1; i++) {
      const off = i * 10;
      const ang = -0.55 + i * 0.22;
      g.moveTo(e.x - Math.cos(ang) * slash + off, e.y - Math.sin(ang) * slash);
      g.lineTo(e.x + Math.cos(ang) * slash * 0.2 + off, e.y + Math.sin(ang) * slash * 0.2);
      g.stroke({ width: 4 - Math.abs(i), color: 0xff8c32, alpha: 0.9 * fade });
      g.stroke({ width: 2, color: 0xffe0b0, alpha: 0.55 * fade });
    }
  }

  private drawKnightCross(e: KnightCrossVfx): void {
    const t = Math.min(1, e.age / e.duration);
    const extend = Math.min(1, t / CROSS_EXTEND_PEAK);
    const u = easeOutCubic(extend);
    const fade = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);

    const halfW = (e.right - e.left) / 2;
    const halfH = (e.bottom - e.top) / 2;
    const armW = halfW * u;
    const armH = halfH * u;
    const { cx, cy, thick } = e;
    const g = e.gfx;
    g.clear();

    const fillA = 0.78 * fade;
    const strokeA = 0.65 * fade;

    g.rect(cx - armW, cy - thick / 2, armW * 2, thick);
    g.fill({ color: 0xff69b4, alpha: fillA });
    g.rect(cx - thick / 2, cy - armH, thick, armH * 2);
    g.fill({ color: 0xff69b4, alpha: fillA });

    g.rect(cx - armW, cy - thick / 2, armW * 2, thick);
    g.stroke({ width: 2, color: 0xffffff, alpha: strokeA });
    g.rect(cx - thick / 2, cy - armH, thick, armH * 2);
    g.stroke({ width: 2, color: 0xffffff, alpha: strokeA });

    if (u >= 0.98) {
      g.circle(cx, cy, thick * 0.9);
      g.fill({ color: 0xffffff, alpha: 0.35 * fade });
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
    g.stroke({ width: 3, color: e.color, alpha: alpha * 0.5 });

    g.moveTo(e.fromX, e.fromY);
    g.lineTo(ex, ey);
    g.stroke({ width: 1.5, color: 0xffffff, alpha: alpha * 0.85 });

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
