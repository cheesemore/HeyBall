import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { GAME_WIDTH } from '../layout';

const PANEL_W = 520;
const PANEL_H = 280;

export class GameResultOverlay extends Container {
  constructor(victory: boolean, onConfirm: () => void) {
    super();
    this.eventMode = 'static';

    const dim = new Graphics();
    dim.rect(0, 0, GAME_WIDTH, 1280);
    dim.fill({ color: 0x02060f, alpha: 0.82 });
    this.addChild(dim);

    const panel = new Container();
    panel.position.set((GAME_WIDTH - PANEL_W) / 2, (1280 - PANEL_H) / 2);
    panel.eventMode = 'static';
    this.addChild(panel);

    const bg = new Graphics();
    bg.roundRect(0, 0, PANEL_W, PANEL_H, 16);
    bg.fill({ color: victory ? 0x1a3d28 : 0x3d1a1a, alpha: 0.98 });
    bg.stroke({
      width: 3,
      color: victory ? 0x6fcf7a : 0xff6666,
    });
    panel.addChild(bg);

    const title = new Text({
      text: victory ? '胜利！' : '战败',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 42,
        fill: victory ? 0xffe566 : 0xff8888,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(PANEL_W / 2, 36);
    panel.addChild(title);

    const desc = new Text({
      text: victory
        ? '击破最终首领，本局通关！'
        : '城墙生命值归零，本局失败。',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 20,
        fill: 0xd8e8ff,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: PANEL_W - 48,
      },
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(PANEL_W / 2, 100);
    panel.addChild(desc);

    const btnW = 200;
    const btnH = 52;
    const btn = new Container();
    btn.position.set((PANEL_W - btnW) / 2, PANEL_H - btnH - 36);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.hitArea = new Rectangle(0, 0, btnW, btnH);

    const btnBg = new Graphics();
    const redrawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.roundRect(0, 0, btnW, btnH, 10);
      btnBg.fill({ color: hover ? 0x3a6ad8 : 0x2a4a8a });
      btnBg.stroke({ width: 2, color: hover ? 0x9ac4ff : 0x6a9fff });
    };
    redrawBtn(false);
    btn.addChild(btnBg);

    const btnLabel = new Text({
      text: '确定',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 22,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    btnLabel.anchor.set(0.5);
    btnLabel.position.set(btnW / 2, btnH / 2);
    btn.addChild(btnLabel);

    btn.on('pointerover', () => redrawBtn(true));
    btn.on('pointerout', () => redrawBtn(false));
    btn.on('pointertap', () => onConfirm());

    panel.addChild(btn);
  }
}
