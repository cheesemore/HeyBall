import { Container, Graphics } from 'pixi.js';
import { BATTLE_WIDTH, battleGridRowTopY, battleSpawnLineLocalY } from '../layout';

const METEOR_DURATION = 2.2;

interface MeteorParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  len: number;
}

interface MeteorVfx {
  kind: 'meteor';
  gfx: Graphics;
  particles: MeteorParticle[];
  age: number;
  duration: number;
}

interface PhaseBorderVfx {
  kind: 'phaseBorder';
  gfx: Graphics;
  age: number;
}

interface PhaseLinesVfx {
  kind: 'phaseLines';
  gfx: Graphics;
  age: number;
}

interface BlizzardVfx {
  kind: 'blizzard';
  gfx: Graphics;
  flakes: { x: number; y: number; vy: number; vx: number; size: number }[];
  age: number;
}

type UltVfx = MeteorVfx | PhaseBorderVfx | PhaseLinesVfx | BlizzardVfx;

export class UltimateVfxLayer extends Container {
  private readonly entries: UltVfx[] = [];

  startMeteorShower(): void {
    const g = new Graphics();
    this.addChild(g);
    const particles: MeteorParticle[] = [];
    for (let i = 0; i < 48; i++) {
      particles.push({
        x: Math.random() * BATTLE_WIDTH,
        y: -Math.random() * 400,
        vy: 420 + Math.random() * 380,
        vx: (Math.random() - 0.5) * 80,
        len: 12 + Math.random() * 28,
      });
    }
    this.entries.push({
      kind: 'meteor',
      gfx: g,
      particles,
      age: 0,
      duration: METEOR_DURATION,
    });
  }

  startPhaseSpace(): void {
    const border = new Graphics();
    this.addChild(border);
    this.entries.push({ kind: 'phaseBorder', gfx: border, age: 0 });

    const lines = new Graphics();
    this.addChild(lines);
    const flakes: PhaseLinesVfx = { kind: 'phaseLines', gfx: lines, age: 0 };
    this.entries.push(flakes);
  }

  stopPhaseSpace(): void {
    this.removeByKind('phaseBorder');
    this.removeByKind('phaseLines');
  }

  startBlizzard(): void {
    const g = new Graphics();
    this.addChild(g);
    const flakes = [];
    for (let i = 0; i < 90; i++) {
      flakes.push({
        x: Math.random() * BATTLE_WIDTH,
        y: Math.random() * (battleSpawnLineLocalY() - battleGridRowTopY(0)),
        vy: 60 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 40,
        size: 1.5 + Math.random() * 3,
      });
    }
    this.entries.push({ kind: 'blizzard', gfx: g, flakes, age: 0 });
  }

  stopBlizzard(): void {
    this.removeByKind('blizzard');
  }

  private removeByKind(kind: UltVfx['kind']) {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i]!.kind === kind) {
        this.entries[i]!.gfx.destroy();
        this.entries.splice(i, 1);
      }
    }
  }

  update(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i]!;
      e.age += dt;

      if (e.kind === 'meteor') {
        this.drawMeteor(e, dt);
        if (e.age >= e.duration) {
          e.gfx.destroy();
          this.entries.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'phaseBorder') {
        this.drawPhaseBorder(e);
        continue;
      }

      if (e.kind === 'phaseLines') {
        this.drawPhaseLines(e);
        continue;
      }

      if (e.kind === 'blizzard') {
        this.drawBlizzard(e, dt);
        continue;
      }
    }
  }

  private drawMeteor(e: MeteorVfx, dt: number) {
    const g = e.gfx;
    g.clear();
    const top = battleGridRowTopY(0);
    const bottom = battleSpawnLineLocalY();
    for (const p of e.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > bottom + 40) {
        p.y = top - Math.random() * 120;
        p.x = Math.random() * BATTLE_WIDTH;
      }
      const tailY = p.y - p.len;
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 0.08, tailY);
      g.stroke({ width: 2.5, color: 0xff6622, alpha: 0.85 });
      g.circle(p.x, p.y, 3);
      g.fill({ color: 0xffdd88, alpha: 0.95 });
    }
    const flash = Math.sin(e.age * 14) * 0.5 + 0.5;
    g.rect(0, top, BATTLE_WIDTH, bottom - top);
    g.fill({ color: 0xff4400, alpha: 0.04 * flash });
  }

  private drawPhaseBorder(e: PhaseBorderVfx) {
    const g = e.gfx;
    g.clear();
    const top = battleGridRowTopY(0);
    const bottom = battleSpawnLineLocalY();
    const w = BATTLE_WIDTH;
    const h = bottom - top;
    const pulse = Math.sin(e.age * 5) * 0.5 + 0.5;
    const colors = [0xff66cc, 0x66ccff, 0xffdd44, 0x88ff66];
    const thick = 5 + pulse * 3;
    for (let i = 0; i < 4; i++) {
      const c = colors[(Math.floor(e.age * 3) + i) % colors.length]!;
      g.roundRect(2 + i, top + 2 + i, w - 4 - i * 2, h - 4 - i * 2, 8);
      g.stroke({ width: thick - i, color: c, alpha: 0.35 + pulse * 0.25 });
    }
  }

  private drawPhaseLines(e: PhaseLinesVfx) {
    const g = e.gfx;
    g.clear();
    const top = battleGridRowTopY(0);
    const bottom = battleSpawnLineLocalY();
    const zoneH = bottom - top;
    const count = 28;
    for (let i = 0; i < count; i++) {
      const x = ((i + 0.5) / count) * BATTLE_WIDTH;
      const len = 36 + (i % 5) * 16;
      const travel = Math.max(1, zoneH - len);
      const y = top + ((e.age * 220 + i * 41) % travel);
      const hue = (i * 47 + e.age * 80) % 360;
      const color =
        hue < 120 ? 0xff66aa : hue < 240 ? 0x66aaff : 0xffcc55;
      g.moveTo(x, y);
      g.lineTo(x, y + len);
      g.stroke({ width: 2, color, alpha: 0.38 });
    }
  }

  private drawBlizzard(e: BlizzardVfx, dt: number) {
    const g = e.gfx;
    g.clear();
    const top = battleGridRowTopY(0);
    const bottom = battleSpawnLineLocalY();
    g.rect(0, top, BATTLE_WIDTH, bottom - top);
    g.fill({ color: 0xaaccff, alpha: 0.12 });

    for (const f of e.flakes) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y > bottom) {
        f.y = top - 4;
        f.x = Math.random() * BATTLE_WIDTH;
      }
      g.circle(f.x, f.y, f.size);
      g.fill({ color: 0xffffff, alpha: 0.55 });
    }
  }

  clear(): void {
    for (const e of this.entries) e.gfx.destroy();
    this.entries.length = 0;
  }
}
