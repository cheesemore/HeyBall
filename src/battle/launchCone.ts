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

type ConeMode = 'hidden' | 'static' | 'sweeping' | 'frozen';

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

  /** 备战：显示固定扇形，不摆动 */
  showStatic() {
    this.mode = 'static';
    this.centerAngle = BASE_AIM;
    this.visible = true;
    this.redraw();
  }

  /** 按住发射键：扇形开始左右摆动 */
  startSweeping() {
    if (this.mode === 'hidden') return;
    this.mode = 'sweeping';
    const offset = this.centerAngle - BASE_AIM;
    if (this.sweepAmpRad > 1e-6) {
      const s = Math.max(-1, Math.min(1, offset / this.sweepAmpRad));
      this.sweepPhase = Math.asin(s);
    } else {
      this.sweepPhase = 0;
    }
    this.visible = true;
    this.redraw();
  }

  /** 松开未发射时回到固定扇形 */
  stopSweepingToStatic() {
    if (this.mode !== 'sweeping') return;
    this.mode = 'static';
    this.centerAngle = BASE_AIM;
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

  /** 当前瞄准中心角（弧度，Pixi 坐标系；摇摆中为实时值） */
  getAimAngle(): number {
    return this.centerAngle;
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
    const fillAlpha =
      this.mode === 'frozen' ? 0.28 : this.mode === 'sweeping' ? 0.22 : 0.16;
    g.fill({ color: 0xff3333, alpha: fillAlpha });

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
