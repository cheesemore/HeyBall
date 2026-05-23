import { Container } from 'pixi.js';

/** 参考 HeyBro 范克里夫伏击：短促随机位移震屏 */
export class ScreenShake {
  private remain = 0;
  private mag = 0;

  constructor(private readonly target: Container) {}

  trigger(sec: number, mag: number): void {
    this.remain = Math.max(this.remain, sec);
    this.mag = Math.max(this.mag, mag);
  }

  update(dt: number): void {
    if (this.remain <= 0) {
      this.target.position.set(0, 0);
      this.mag = 0;
      return;
    }
    this.remain -= dt;
    const m = this.mag * Math.min(1, this.remain / 0.06);
    this.target.position.set(
      (Math.random() - 0.5) * 2 * m,
      (Math.random() - 0.5) * 2 * m,
    );
  }
}
