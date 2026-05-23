import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { RogueUpgradeDef } from '../config/rogueUpgrades';
import type { RogueUpgradeId } from '../config/rogueUpgrades';
import { GAME_WIDTH } from '../layout';

const CARD_W = 880;
const CARD_H = 120;
const CARD_GAP = 14;

export class RogueUpgradePickScreen extends Container {
  constructor(
    upgrades: RogueUpgradeDef[],
    onPick: (id: RogueUpgradeId) => void,
  ) {
    super();
    this.eventMode = 'static';

    const totalH = CARD_H * upgrades.length + CARD_GAP * (upgrades.length - 1);
    const startX = (GAME_WIDTH - CARD_W) / 2;
    const startY = (1280 - totalH) / 2;

    const dim = new Graphics();
    dim.rect(0, 0, GAME_WIDTH, 1280);
    dim.fill({ color: 0x050a18, alpha: 0.88 });
    this.addChild(dim);

    const title = new Text({
      text: '肉鸽强化：选择法术升级',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 28,
        fill: 0xe8f0ff,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5, 1);
    title.position.set(GAME_WIDTH / 2, startY - 20);
    this.addChild(title);

    upgrades.forEach((def, i) => {
      const card = new Container();
      card.position.set(startX, startY + i * (CARD_H + CARD_GAP));
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.hitArea = new Rectangle(0, 0, CARD_W, CARD_H);

      const bg = new Graphics();
      const redraw = (hover: boolean) => {
        bg.clear();
        bg.roundRect(0, 0, CARD_W, CARD_H, 12);
        bg.fill({ color: hover ? 0x2a4478 : 0x1a2d52, alpha: 0.96 });
        bg.stroke({ width: 2, color: hover ? 0x8ab4ff : 0x4a6a9a });
      };
      redraw(false);
      card.addChild(bg);

      const name = new Text({
        text: def.name,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 24,
          fill: 0xffd56a,
          fontWeight: 'bold',
        },
      });
      name.position.set(24, 18);
      card.addChild(name);

      const desc = new Text({
        text: def.desc,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 18,
          fill: 0xc8daf0,
          wordWrap: true,
          wordWrapWidth: CARD_W - 48,
        },
      });
      desc.position.set(24, 54);
      card.addChild(desc);

      card.on('pointerover', () => redraw(true));
      card.on('pointerout', () => redraw(false));
      card.on('pointertap', () => onPick(def.id));

      this.addChild(card);
    });
  }
}
