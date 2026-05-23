import { Container, Graphics } from 'pixi.js';
import {
  LAUNCH_CONE_ANGLE,
  LAUNCH_CONE_RADIUS,
  LAUNCH_CONE_SWEEP_AMPLITUDE,
  LAUNCH_CONE_SWEEP_SPEED,
} from '../config/gameBalance';

const DEG = Math.PI / 180;
/** 默认朝向：向下（战场内） */
const BASE_AIM = Math.PI / 2;

type ConeMode = 'hidden' | 'sweeping' | 'frozen';

export class LaunchCone extends Container {
  private readonly gfx: Graphics;
  private readonly apexX: number;
  private readonly apexY: number;
  private readonly halfAngleRad: number;
  private readonly radius: number;
  private readonly sweepAmpRad: number;
  private mode: ConeMode = 'hidden';
  private sweepPhase = 0;
  private centerAngle = BASE_AIM;

  constructor(apexX: number, apexY: number) {
    super();
    this.apexX = apexX;
    this.apexY = apexY;
    this.halfAngleRad = (LAUNCH_CONE_ANGLE / 2) * DEG;
    this.radius = LAUNCH_CONE_RADIUS;
    this.sweepAmpRad = LAUNCH_CONE_SWEEP_AMPLITUDE * DEG;

    this.gfx = new Graphics();
    this.addChild(this.gfx);
    this.visible = false;
  }

  showSweeping() {
    this.mode = 'sweeping';
    this.visible = true;
    this.redraw();
  }

  freeze() {
    this.mode = 'frozen';
    this.redraw();
  }

  /** 冻结扇形并固定瞄准角（逻辑层给定） */
  freezeAtAngle(angleRad: number) {
    this.centerAngle = angleRad;
    this.mode = 'frozen';
    this.redraw();
  }

  hide() {
    this.mode = 'hidden';
    this.visible = false;
    this.gfx.clear();
  }

  /** 发射队列打完后隐藏扇形，保留冻结角度供已生成弹球逻辑使用 */
  hideAfterLaunch() {
    if (this.mode === 'hidden') return;
    this.visible = false;
    this.gfx.clear();
  }

  get isFrozen(): boolean {
    return this.mode === 'frozen';
  }

  get isShown(): boolean {
    return this.visible;
  }

  /** 在冻结锥形张角内随机取发射角（弧度，Pixi 坐标系） */
  randomLaunchAngle(): number {
    const offset = (Math.random() * 2 - 1) * this.halfAngleRad;
    return this.centerAngle + offset;
  }

  update(dt: number) {
    if (this.mode !== 'sweeping') return;
    this.sweepPhase += dt * LAUNCH_CONE_SWEEP_SPEED;
    this.centerAngle = BASE_AIM + Math.sin(this.sweepPhase) * this.sweepAmpRad;
    this.redraw();
  }

  private redraw() {
    const g = this.gfx;
    g.clear();

    const cx = this.apexX;
    const cy = this.apexY;
    const center = this.centerAngle;
    const a1 = center - this.halfAngleRad;
    const a2 = center + this.halfAngleRad;

    const x1 = cx + Math.cos(a1) * this.radius;
    const y1 = cy + Math.sin(a1) * this.radius;
    const x2 = cx + Math.cos(a2) * this.radius;
    const y2 = cy + Math.sin(a2) * this.radius;

    g.moveTo(cx, cy);
    g.lineTo(x1, y1);
    g.arc(cx, cy, this.radius, a1, a2);
    g.lineTo(cx, cy);
    g.fill({ color: 0xff3333, alpha: this.mode === 'frozen' ? 0.28 : 0.18 });

    g.moveTo(cx, cy);
    g.lineTo(x1, y1);
    g.moveTo(cx, cy);
    g.lineTo(x2, y2);
    g.stroke({ width: 2, color: 0xff6666, alpha: 0.75 });

    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(center) * this.radius, cy + Math.sin(center) * this.radius);
    g.stroke({ width: 1, color: 0xffaaaa, alpha: 0.5 });
  }
}
