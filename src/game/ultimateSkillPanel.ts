import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { UltimateSkillId } from '../config/ultimateSkills';

export interface UltimatePanelView {
  skill: UltimateSkillId | null;
  name: string;
  progress: number;
  max: number;
  ready: boolean;
  canPress: boolean;
  /** 相位空间等：已在备战发动，待发射生效 */
  pendingBuff?: boolean;
}

export class UltimateSkillPanel extends Container {
  private readonly btn: Container;
  private readonly btnBg: Graphics;
  private readonly btnLabel: Text;
  private readonly barBg: Graphics;
  private readonly barFill: Graphics;
  private readonly chargeText: Text;
  private onActivate: (() => void) | null = null;

  constructor(panelW: number) {
    super();

    const btnH = 52;
    this.btn = new Container();
    this.btn.position.set(0, 0);
    this.btn.eventMode = 'static';
    this.btn.cursor = 'pointer';
    this.btn.hitArea = new Rectangle(0, 0, panelW, btnH);

    this.btnBg = new Graphics();
    this.btnLabel = new Text({
      text: '终极技能',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 17,
        fill: 0xc8daf0,
        fontWeight: 'bold',
      },
    });
    this.btnLabel.anchor.set(0.5);
    this.btnLabel.position.set(panelW / 2, btnH / 2);
    this.btn.addChild(this.btnBg, this.btnLabel);
    this.btn.on('pointertap', () => {
      if (this.onActivate) this.onActivate();
    });
    this.addChild(this.btn);

    const barY = btnH + 8;
    const barH = 14;
    this.barBg = new Graphics();
    this.barBg.roundRect(0, barY, panelW, barH, 6);
    this.barBg.fill({ color: 0x0d1830, alpha: 0.95 });
    this.barBg.stroke({ width: 1, color: 0x3a5a8a });
    this.addChild(this.barBg);

    this.barFill = new Graphics();
    this.addChild(this.barFill);

    this.chargeText = new Text({
      text: '',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 12,
        fill: 0x8ab4e8,
      },
    });
    this.chargeText.position.set(0, barY + barH + 4);
    this.addChild(this.chargeText);

    this.visible = false;
  }

  setOnActivate(handler: () => void) {
    this.onActivate = handler;
  }

  apply(view: UltimatePanelView, panelW: number) {
    if (!view.skill) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const btnH = 52;
    const pending = view.pendingBuff === true;
    const ready = view.ready && view.canPress && !pending;
    const active = ready || pending;
    this.btnBg.clear();
    this.btnBg.roundRect(0, 0, panelW, btnH, 8);
    this.btnBg.fill({ color: active ? 0x5a3a18 : 0x1e2a48, alpha: 0.95 });
    this.btnBg.stroke({
      width: 2,
      color: active ? 0xffaa44 : 0x4a6a9a,
    });
    this.btnLabel.text = pending ? `${view.name} · 已激活` : view.name;
    this.btnLabel.style.fill = active ? 0xffeecc : 0x9ab0d0;
    this.btn.eventMode = ready ? 'static' : 'none';
    this.btn.cursor = ready ? 'pointer' : 'default';
    this.btn.alpha = view.canPress ? 1 : 0.55;

    const barY = btnH + 8;
    const barH = 14;
    const ratio = view.max > 0 ? Math.min(1, view.progress / view.max) : 0;
    this.barFill.clear();
    if (!pending && ratio > 0.002) {
      this.barFill.roundRect(1, barY + 1, (panelW - 2) * ratio, barH - 2, 5);
      this.barFill.fill({
        color: ready ? 0xffcc66 : 0x4488cc,
        alpha: 0.95,
      });
    } else if (pending) {
      this.barFill.roundRect(1, barY + 1, panelW - 2, barH - 2, 5);
      this.barFill.fill({ color: 0xffcc66, alpha: 0.95 });
    }

    this.chargeText.text = pending
      ? '已发动 · 点击发射后本回合生效'
      : ready
        ? '充能完毕 · 回合开始前可发动'
        : `${view.progress} / ${view.max}`;
  }
}
