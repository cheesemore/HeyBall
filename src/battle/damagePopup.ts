import { Container, Text } from 'pixi.js';

const POPUP_DURATION = 0.95;
const POP_PEAK_TIME = 0.16;
const POP_SETTLE_TIME = 0.34;
const PEAK_SCALE = 1.42;
const START_SCALE = 0.35;
const BURST_SPEED_MIN = 115;
const BURST_SPEED_MAX = 210;
const DRAG = 3.0;

const FONT_NORMAL = 32;
const FONT_CRIT = 48;
const FONT_ASSASSIN = 72;
const FONT_ASSASSIN_ELITE = 96;
const FONT_POISON = 34;
const FONT_POISON_HEAVY = 52;
const FONT_CLAW = 40;
const STROKE_COLOR = 0xffffff;
const FILL_COLOR = 0xff3333;
const FILL_ASSASSIN = 0xffd700;
const FILL_POISON = 0xda70d6;
const STROKE_POISON = 0x4a1060;
const FILL_CLAW = 0x7cfc00;
const STROKE_CLAW = 0x1a4a20;

export type PopupStyle =
  | 'normal'
  | 'crit'
  | 'assassin'
  | 'assassinElite'
  | 'heal'
  | 'poison'
  | 'poisonHeavy'
  | 'claw';

interface PopupEntry {
  text: Text;
  age: number;
  vx: number;
  vy: number;
  style: PopupStyle;
}

function popupScale(age: number, style: PopupStyle): number {
  const peak =
    style === 'assassinElite'
      ? 1.65
      : style === 'assassin'
        ? 1.5
        : style === 'poisonHeavy'
          ? 1.35
          : style === 'claw'
            ? 1.32
            : PEAK_SCALE;
  if (age < POP_PEAK_TIME) {
    const u = age / POP_PEAK_TIME;
    const eased = 1 - (1 - u) ** 3;
    return START_SCALE + eased * (peak - START_SCALE);
  }
  if (age < POP_SETTLE_TIME) {
    const u = (age - POP_PEAK_TIME) / (POP_SETTLE_TIME - POP_PEAK_TIME);
    const eased = 1 - (1 - u) ** 2;
    return peak + eased * (1 - peak);
  }
  return 1;
}

function popupAlpha(age: number): number {
  const fadeStart = POPUP_DURATION * 0.42;
  if (age < fadeStart) return 1;
  return Math.max(0, 1 - (age - fadeStart) / (POPUP_DURATION - fadeStart));
}

function makeDamageText(damage: number, style: PopupStyle): Text {
  let fontSize = FONT_NORMAL;
  let fill = FILL_COLOR;
  if (style === 'crit') fontSize = FONT_CRIT;
  if (style === 'assassin') {
    fontSize = FONT_ASSASSIN;
    fill = FILL_ASSASSIN;
  }
  if (style === 'assassinElite') {
    fontSize = FONT_ASSASSIN_ELITE;
    fill = FILL_ASSASSIN;
  }
  if (style === 'heal') {
    fontSize = 28;
    fill = 0x66ff88;
  }
  if (style === 'poison') {
    fontSize = FONT_POISON;
    fill = FILL_POISON;
  }
  if (style === 'poisonHeavy') {
    fontSize = FONT_POISON_HEAVY;
    fill = FILL_POISON;
  }
  if (style === 'claw') {
    fontSize = FONT_CLAW;
    fill = FILL_CLAW;
  }

  const strokeColor =
    style === 'poison' || style === 'poisonHeavy'
      ? STROKE_POISON
      : style === 'claw'
        ? STROKE_CLAW
        : STROKE_COLOR;
  const strokeWidth =
    style === 'assassinElite' || style === 'poisonHeavy' || style === 'claw' ? 2 : 1;

  return new Text({
    text: style === 'heal' ? `+${damage}` : String(damage),
    style: {
      fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
      fontSize,
      fill,
      fontWeight: 'bold',
      stroke: {
        color: strokeColor,
        width: strokeWidth,
        join: 'round',
      },
    },
  });
}

interface SkillPopupEntry {
  text: Text;
  age: number;
  vy: number;
}

export class DamagePopupLayer extends Container {
  private readonly entries: PopupEntry[] = [];
  private readonly skillEntries: SkillPopupEntry[] = [];

  /** 技能名瓢字（复制/召唤/治疗/湮灭） */
  spawnSkillText(x: number, y: number, label: string, fill: number) {
    const t = new Text({
      text: label,
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 34,
        fill,
        fontWeight: 'bold',
        stroke: { color: 0xffffff, width: 2, join: 'round' },
      },
    });
    t.anchor.set(0.5);
    t.position.set(x, y - 28);
    t.scale.set(START_SCALE);
    this.addChild(t);
    this.skillEntries.push({ text: t, age: 0, vy: -85 });
  }

  spawn(x: number, y: number, damage: number, style: PopupStyle = 'normal') {
    const angle = Math.random() * Math.PI * 2;
    const speed =
      BURST_SPEED_MIN + Math.random() * (BURST_SPEED_MAX - BURST_SPEED_MIN);
    const t = makeDamageText(damage, style);
    t.anchor.set(0.5);
    t.position.set(x, y);
    t.scale.set(START_SCALE);
    this.addChild(t);
    this.entries.push({
      text: t,
      age: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      style,
    });
  }

  update(dt: number) {
    for (let i = this.skillEntries.length - 1; i >= 0; i--) {
      const e = this.skillEntries[i]!;
      e.age += dt;
      e.text.y += e.vy * dt;
      e.vy *= Math.exp(-DRAG * dt);
      e.text.scale.set(popupScale(e.age, 'normal'));
      e.text.alpha = popupAlpha(e.age);
      if (e.age >= POPUP_DURATION) {
        e.text.destroy();
        this.skillEntries.splice(i, 1);
      }
    }

    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i]!;
      e.age += dt;
      const drag = Math.exp(-DRAG * dt);
      e.vx *= drag;
      e.vy *= drag;
      e.text.x += e.vx * dt;
      e.text.y += e.vy * dt;
      e.text.scale.set(popupScale(e.age, e.style));
      e.text.alpha = popupAlpha(e.age);
      if (e.age >= POPUP_DURATION) {
        e.text.destroy();
        this.entries.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const e of this.entries) e.text.destroy();
    this.entries.length = 0;
    for (const e of this.skillEntries) e.text.destroy();
    this.skillEntries.length = 0;
  }
}
