import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { SPECIAL_MONSTER_TABLE } from '../config/specialMonsters';
import type { MonsterGroupDraftOption } from '../logic/monsterGroupDraft';
import { GAME_WIDTH } from '../layout';

const CARD_W = 960;
const CARD_H_BASE = 128;
const CARD_H_HELL = 248;
const CARD_GAP = 14;
const SWATCH = 40;

export class MonsterGroupPickScreen extends Container {
  constructor(
    options: MonsterGroupDraftOption[],
    onPick: (index: number) => void,
  ) {
    super();
    this.eventMode = 'static';

    const cardHeights = options.map((o) =>
      o.difficulty === 'hell' ? CARD_H_HELL : CARD_H_BASE,
    );
    const totalH =
      cardHeights.reduce((a, h) => a + h, 0) + CARD_GAP * (options.length - 1);
    const startX = (GAME_WIDTH - CARD_W) / 2;
    let y = (1280 - totalH) / 2;

    const dim = new Graphics();
    dim.rect(0, 0, GAME_WIDTH, 1280);
    dim.fill({ color: 0x050a18, alpha: 0.88 });
    this.addChild(dim);

    const title = new Text({
      text: '选择本局怪物组（四选一）',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 32,
        fill: 0xe8f0ff,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5, 1);
    title.position.set(GAME_WIDTH / 2, y - 24);
    this.addChild(title);

    options.forEach((opt, i) => {
      const cardH = cardHeights[i]!;
      const card = new Container();
      card.position.set(startX, y);
      y += cardH + CARD_GAP;
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.hitArea = new Rectangle(0, 0, CARD_W, cardH);

      const bg = new Graphics();
      const redraw = (hover: boolean) => {
        bg.clear();
        bg.roundRect(0, 0, CARD_W, cardH, 14);
        bg.fill({ color: hover ? 0x2a4478 : 0x1a2d52, alpha: 0.96 });
        bg.stroke({
          width: 2,
          color:
            opt.difficulty === 'hell'
              ? hover
                ? 0xff8888
                : 0xcc4444
              : hover
                ? 0x8ab4ff
                : 0x4a6a9a,
        });
      };
      redraw(false);
      card.addChild(bg);

      const name = new Text({
        text: `${opt.name}`,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 30,
          fill: opt.difficulty === 'hell' ? 0xff8a8a : 0xffd56a,
          fontWeight: 'bold',
        },
      });
      name.position.set(28, 20);
      card.addChild(name);

      const desc = new Text({
        text: opt.shortDesc,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 18,
          fill: 0xc8daf0,
          wordWrap: true,
          wordWrapWidth: CARD_W - 56,
        },
      });
      desc.position.set(28, 58);
      card.addChild(desc);

      if (opt.difficulty === 'hell' && opt.specialKinds.length > 0) {
        let ty = 92;
        const header = new Text({
          text: '本局四种特殊怪：',
          style: {
            fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
            fontSize: 16,
            fill: 0xffb4b4,
            fontWeight: 'bold',
          },
        });
        header.position.set(28, ty);
        card.addChild(header);
        ty += 26;

        for (const kind of opt.specialKinds) {
          const def = SPECIAL_MONSTER_TABLE[kind];
          const line = new Text({
            text: `· ${def.name}：${def.effectBrief}`,
            style: {
              fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
              fontSize: 14,
              fill: 0xd8e8ff,
              wordWrap: true,
              wordWrapWidth: CARD_W - 56,
            },
          });
          line.position.set(32, ty);
          card.addChild(line);
          ty += line.height + 6;
        }
      } else {
        let sx = 28;
        const sy = opt.specialKinds.length > 0 ? 96 : 88;
        if (opt.specialKinds.length === 0) {
          const none = new Text({
            text: '仅普通灰砖',
            style: {
              fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
              fontSize: 16,
              fill: 0x8ab4e8,
            },
          });
          none.position.set(sx, sy + 4);
          card.addChild(none);
        } else {
          for (const kind of opt.specialKinds) {
            const def = SPECIAL_MONSTER_TABLE[kind];
            const sw = new Graphics();
            const inset = 6;
            sw.roundRect(0, 0, SWATCH, SWATCH, 6);
            sw.fill({ color: def.shellColor, alpha: 0.95 });
            sw.stroke({ width: 2, color: def.shellStroke });
            sw.roundRect(inset, inset, SWATCH - inset * 2, SWATCH - inset * 2, 4);
            sw.fill({ color: def.innerColor, alpha: 0.95 });
            sw.position.set(sx, sy);
            card.addChild(sw);

            const lbl = new Text({
              text: def.name,
              style: {
                fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
                fontSize: 14,
                fill: 0xd0daf0,
              },
            });
            lbl.position.set(sx, sy + SWATCH + 4);
            card.addChild(lbl);

            sx += SWATCH + 56;
          }
        }
      }

      card.on('pointerover', () => redraw(true));
      card.on('pointerout', () => redraw(false));
      card.on('pointertap', () => onPick(i));

      this.addChild(card);
    });
  }
}
