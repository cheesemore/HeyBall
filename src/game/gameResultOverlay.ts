import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { RunSettlement } from '../logic/types';
import { GAME_WIDTH } from '../layout';

const PANEL_W = 520;
const PANEL_H = 340;

export class GameResultOverlay extends Container {
  constructor(stats: RunSettlement, onConfirm: () => void) {
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
    bg.fill({ color: 0x1a2844, alpha: 0.98 });
    bg.stroke({ width: 3, color: 0x6a9fff });
    panel.addChild(bg);

    const title = new Text({
      text: '本局结算',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 42,
        fill: 0xffe566,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(PANEL_W / 2, 32);
    panel.addChild(title);

    const desc = new Text({
      text: '城墙失守，无尽挑战结束。',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 18,
        fill: 0x94a3b8,
        align: 'center',
      },
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(PANEL_W / 2, 88);
    panel.addChild(desc);

    const statLines = [
      `波次　${stats.waveOrdinal}`,
      `消灭怪物　${stats.monstersKilled}`,
      `击败首领　${stats.bossesDefeated}`,
      `生存回合　${stats.turn}`,
    ];

    const statsText = new Text({
      text: statLines.join('\n'),
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 26,
        fill: 0xe8f0ff,
        fontWeight: '600',
        align: 'center',
        lineHeight: 40,
      },
    });
    statsText.anchor.set(0.5, 0);
    statsText.position.set(PANEL_W / 2, 128);
    panel.addChild(statsText);

    const btnW = 200;
    const btnH = 52;
    const btn = new Container();
    btn.position.set((PANEL_W - btnW) / 2, PANEL_H - btnH - 32);
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
      text: '再来一局',
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
