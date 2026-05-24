import { Container, Graphics } from 'pixi.js';
import { BALL_COLOR_HEX, type BallColor } from '../ballTypes';
import { createBallSprite } from '../game/ballTextures';
import { getBattleBallRadius } from '../config/gameBalance';
import { ballHasSplitSkill } from '../logic/combatSession';

export interface BallEntityOptions {
  /** 自定义半径（分裂球等） */
  radius?: number;
  /** 是否还能再分裂 */
  canSplit?: boolean;
  /** 已穿越战场顶线，可参与顶部墙碰撞（分裂球等已在场内生成） */
  clearedTopLine?: boolean;
  /** 分裂等临时球：不参与发射队列，回合结束由战场统一清除 */
  isTemporary?: boolean;
}

export class BallEntity {
  readonly view: Container;
  readonly color: BallColor;
  readonly isBig: boolean;
  readonly radius: number;
  readonly attack: number;
  readonly maxBounces: number;
  readonly critRate: number;
  readonly critDamageMult: number;
  readonly canSplit: boolean;
  /** 槽位发射球 false；分裂球 true */
  readonly isTemporary: boolean;
  /** 已进入黄线下方的战场区；为 true 后上弹至黄线（~100px）会反弹下落 */
  clearedTopLine: boolean;
  bounces = 0;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive = true;
  private readonly gfx: Graphics | null;

  constructor(
    color: BallColor,
    isBig: boolean,
    x: number,
    y: number,
    vx: number,
    vy: number,
    attack: number,
    maxBounces: number,
    critRate: number,
    critDamageMult: number,
    options: BallEntityOptions = {},
  ) {
    this.color = color;
    this.isBig = isBig;
    this.radius = options.radius ?? getBattleBallRadius(isBig);
    this.canSplit =
      options.canSplit ?? (ballHasSplitSkill(color) && !(options.isTemporary ?? false));
    this.isTemporary = options.isTemporary ?? false;
    this.clearedTopLine = options.clearedTopLine ?? false;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.attack = attack;
    this.maxBounces = maxBounces;
    this.critRate = critRate;
    this.critDamageMult = critDamageMult;

    this.view = new Container();
    const sprite = createBallSprite(color, this.radius * 2);
    if (sprite) {
      this.gfx = null;
      this.view.addChild(sprite);
    } else {
      this.gfx = new Graphics();
      this.drawVector();
      this.view.addChild(this.gfx);
    }
    this.syncView();
  }

  private drawVector() {
    if (!this.gfx) return;
    const hex = BALL_COLOR_HEX[this.color];
    const r = this.radius;
    this.gfx.clear();
    this.gfx.circle(0, 0, r);
    this.gfx.fill(hex);
    const hl = Math.max(2, r * 0.28);
    this.gfx.circle(-r * 0.28, -r * 0.28, hl);
    this.gfx.fill({ color: 0xffffff, alpha: this.isBig ? 0.45 : 0.35 });
    if (this.isBig && r >= getBattleBallRadius(false) * 1.1) {
      this.gfx.circle(0, 0, r);
      this.gfx.stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
    }
  }

  syncView() {
    this.view.position.set(this.x, this.y);
  }

  removeFromDisplay() {
    if (this.view.destroyed) return;
    this.alive = false;
    if (this.view.parent) this.view.parent.removeChild(this.view);
    this.view.visible = false;
    this.view.destroy({ children: true });
  }

  rollDamage(): { damage: number; isCrit: boolean } {
    const isCrit = Math.random() < this.critRate;
    const damage = isCrit
      ? Math.round(this.attack * this.critDamageMult)
      : this.attack;
    return { damage, isCrit };
  }

  vanishAtSpawnLine() {
    this.removeFromDisplay();
  }

  onCollision(): boolean {
    this.bounces++;
    if (this.bounces >= this.maxBounces) {
      this.removeFromDisplay();
      return true;
    }
    return false;
  }
}
