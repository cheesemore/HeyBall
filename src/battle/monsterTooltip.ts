import { Container, Graphics, Text } from 'pixi.js';
import type { MonsterTipInfo } from '../config/monsterTips';
import { BATTLE_WIDTH } from '../layout';

const PANEL_W = 600;
const PAD = 24;
const TITLE_SIZE = 36;
const DESC_SIZE = 28;
const DESC_LINE_HEIGHT = 40;
const GAP = 12;
const CORNER = 20;

export class MonsterTooltip extends Container {
  private readonly panel: Container;
  private readonly bg: Graphics;
  private readonly titleText: Text;
  private readonly descText: Text;
  private pinnedInstanceId: string | null = null;
  private wrapWidth = PANEL_W - PAD * 2;

  constructor() {
    super();
    this.eventMode = 'none';
    this.visible = false;

    this.panel = new Container();
    this.panel.eventMode = 'static';
    this.panel.on('pointertap', (e) => e.stopPropagation());
    this.addChild(this.panel);

    this.bg = new Graphics();
    this.panel.addChild(this.bg);

    this.titleText = new Text({
      text: '',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: TITLE_SIZE,
        fill: 0xffd56a,
        fontWeight: 'bold',
        wordWrap: true,
        wordWrapWidth: this.wrapWidth,
      },
    });
    this.titleText.position.set(PAD, PAD);
    this.panel.addChild(this.titleText);

    this.descText = new Text({
      text: '',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: DESC_SIZE,
        fill: 0xd8e8ff,
        lineHeight: DESC_LINE_HEIGHT,
        wordWrap: true,
        wordWrapWidth: this.wrapWidth,
      },
    });
    this.panel.addChild(this.descText);
  }

  show(
    tip: MonsterTipInfo,
    instanceId: string,
    anchorX: number,
    anchorY: number,
    panelH: number,
  ) {
    this.pinnedInstanceId = instanceId;
    this.titleText.style.wordWrapWidth = this.wrapWidth;
    this.descText.style.wordWrapWidth = this.wrapWidth;
    this.titleText.text = tip.name;
    this.descText.text = tip.description;
    this.descText.position.set(PAD, PAD + this.titleText.height + GAP);

    const contentH =
      PAD + this.titleText.height + GAP + this.descText.height + PAD;
    this.bg.clear();
    this.bg.roundRect(0, 0, PANEL_W, contentH, CORNER);
    this.bg.fill({ color: 0x0a1428, alpha: 0.94 });
    this.bg.stroke({ width: 4, color: 0x5a8ac8, alpha: 0.9 });

    let x = anchorX - PANEL_W / 2;
    let y = anchorY - contentH - 20;
    x = Math.max(8, Math.min(BATTLE_WIDTH - PANEL_W - 8, x));
    if (y < 8) y = anchorY + panelH + 16;
    this.panel.position.set(x, y);
    this.visible = true;
  }

  hide() {
    this.visible = false;
    this.pinnedInstanceId = null;
  }

  isShowing(): boolean {
    return this.visible;
  }

  toggle(
    tip: MonsterTipInfo,
    instanceId: string,
    anchorX: number,
    anchorY: number,
    panelH: number,
  ): boolean {
    if (this.visible && this.pinnedInstanceId === instanceId) {
      this.hide();
      return false;
    }
    this.show(tip, instanceId, anchorX, anchorY, panelH);
    return true;
  }
}
