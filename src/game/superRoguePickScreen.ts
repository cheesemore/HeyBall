import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { SuperRogueCardDef } from '../config/superRogueCards';
import { BALL_COLOR_LABEL } from '../ballTypes';
import { GAME_WIDTH } from '../layout';

const CARD_W = 880;
const CARD_H = 118;
const CARD_GAP = 12;

export class SuperRoguePickScreen extends Container {
  constructor(
    options: SuperRogueCardDef[],
    onPick: (def: SuperRogueCardDef) => void,
  ) {
    super();
    this.eventMode = 'static';

    const totalH = CARD_H * options.length + CARD_GAP * (options.length - 1);
    const startX = (GAME_WIDTH - CARD_W) / 2;
    const startY = (1280 - totalH) / 2;

    const dim = new Graphics();
    dim.rect(0, 0, GAME_WIDTH, 1280);
    dim.fill({ color: 0x050a18, alpha: 0.9 });
    this.addChild(dim);

    const title = new Text({
      text: '超级肉鸽 · 三选一',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 28,
        fill: 0xffd56a,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5, 1);
    title.position.set(GAME_WIDTH / 2, startY - 18);
    this.addChild(title);

    options.forEach((def, i) => {
      const card = new Container();
      card.position.set(startX, startY + i * (CARD_H + CARD_GAP));
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.hitArea = new Rectangle(0, 0, CARD_W, CARD_H);

      const bg = new Graphics();
      const redraw = (hover: boolean) => {
        bg.clear();
        bg.roundRect(0, 0, CARD_W, CARD_H, 12);
        const fill = hover
          ? def.kind === 'profession'
            ? 0x3a3860
            : 0x2a4478
          : def.kind === 'profession'
            ? 0x2a2844
            : 0x1a2d52;
        bg.fill({ color: fill, alpha: 0.96 });
        bg.stroke({
          width: 2,
          color: def.kind === 'profession' ? 0xffd56a : 0x6a9fff,
          alpha: hover ? 1 : 0.75,
        });
      };
      redraw(false);
      card.addChild(bg);

      const tag =
        def.kind === 'profession' && def.color
          ? `${BALL_COLOR_LABEL[def.color]} · 职业`
          : '通用';

      const name = new Text({
        text: `${def.name}（${tag}）`,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 24,
          fill: 0xffe566,
          fontWeight: 'bold',
        },
      });
      name.position.set(22, 16);
      card.addChild(name);

      const desc = new Text({
        text: def.desc,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 17,
          fill: 0xc8daf0,
          wordWrap: true,
          wordWrapWidth: CARD_W - 44,
        },
      });
      desc.position.set(22, 52);
      card.addChild(desc);

      card.on('pointerover', () => redraw(true));
      card.on('pointerout', () => redraw(false));
      card.on('pointertap', () => onPick(def));

      this.addChild(card);
    });
  }
}
