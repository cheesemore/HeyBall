import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import {
  SPECIAL_MONSTER_TABLE,
  type SpecialMonsterKind,
} from '../config/specialMonsters';
import type { MonsterGroupDraftOption } from '../logic/monsterGroupDraft';
import type { MonsterGroupDifficultyId } from '../config/monsterGroup';
import { GAME_WIDTH } from '../layout';

const CARD_W = 960;
const CARD_GAP = 14;
const SWATCH = 36;
const PAD_X = 28;

function strokeColor(difficulty: MonsterGroupDifficultyId, hover: boolean): number {
  if (difficulty === 'hell') return hover ? 0xff8888 : 0xcc4444;
  return hover ? 0x8ab4ff : 0x4a6a9a;
}

function titleColor(difficulty: MonsterGroupDifficultyId): number {
  return difficulty === 'hell' ? 0xff8a8a : 0xffd56a;
}

function drawSpecialSwatch(
  parent: Container,
  x: number,
  y: number,
  kind: SpecialMonsterKind,
): number {
  const def = SPECIAL_MONSTER_TABLE[kind];
  const sw = new Graphics();
  const inset = 5;
  sw.roundRect(0, 0, SWATCH, SWATCH, 6);
  sw.fill({ color: def.shellColor, alpha: 0.95 });
  sw.stroke({ width: 2, color: def.shellStroke });
  sw.roundRect(inset, inset, SWATCH - inset * 2, SWATCH - inset * 2, 4);
  sw.fill({ color: def.innerColor, alpha: 0.95 });
  sw.position.set(x, y);
  parent.addChild(sw);
  return SWATCH + 10;
}

function measureCardHeight(opt: MonsterGroupDraftOption): number {
  const descLines = opt.specialKinds.length > 0 ? 1 : 0;
  const effectLines = opt.specialKinds.length;
  const easyExtra = opt.specialKinds.length === 0 ? 28 : 0;
  const top = 20 + 38 + 26;
  const mid = descLines > 0 ? Math.max(22, SWATCH) + 14 : 0;
  const effects = effectLines * 22 + (effectLines > 0 ? 8 : 0);
  return top + mid + effects + easyExtra + 24;
}

export class MonsterGroupPickScreen extends Container {
  constructor(
    options: MonsterGroupDraftOption[],
    onPick: (index: number) => void,
  ) {
    super();
    this.eventMode = 'static';

    const cardHeights = options.map((o) => measureCardHeight(o));
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
        bg.stroke({ width: 2, color: strokeColor(opt.difficulty, hover) });
      };
      redraw(false);
      card.addChild(bg);

      const name = new Text({
        text: opt.name,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 30,
          fill: titleColor(opt.difficulty),
          fontWeight: 'bold',
        },
      });
      name.position.set(PAD_X, 20);
      card.addChild(name);

      const goldLine = new Text({
        text: `开局金币：${opt.startingGold}`,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 18,
          fill: 0xffd56a,
          fontWeight: 'bold',
        },
      });
      goldLine.position.set(PAD_X, 58);
      card.addChild(goldLine);

      const desc = new Text({
        text: opt.shortDesc,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 18,
          fill: 0xc8daf0,
        },
      });
      desc.position.set(PAD_X, 84);
      card.addChild(desc);

      let contentBottom = 84 + desc.height;

      if (opt.specialKinds.length > 0) {
        let sx = PAD_X + desc.width + 16;
        const sy = 84 + Math.max(0, (desc.height - SWATCH) / 2);
        for (const kind of opt.specialKinds) {
          sx += drawSpecialSwatch(card, sx, sy, kind);
        }
        contentBottom = Math.max(contentBottom, 84 + SWATCH);

        let ty = contentBottom + 14;
        for (const kind of opt.specialKinds) {
          const def = SPECIAL_MONSTER_TABLE[kind];
          const line = new Text({
            text: `${def.name}：${def.effectBrief}`,
            style: {
              fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
              fontSize: 14,
              fill: 0xd8e8ff,
              wordWrap: true,
              wordWrapWidth: CARD_W - PAD_X * 2,
            },
          });
          line.position.set(PAD_X, ty);
          card.addChild(line);
          ty += line.height + 6;
        }
        contentBottom = ty;
      } else {
        const none = new Text({
          text: '仅普通灰砖',
          style: {
            fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
            fontSize: 16,
            fill: 0x8ab4e8,
          },
        });
        none.position.set(PAD_X, contentBottom + 10);
        card.addChild(none);
      }

      card.on('pointerover', () => redraw(true));
      card.on('pointerout', () => redraw(false));
      card.on('pointertap', () => onPick(i));

      this.addChild(card);
    });
  }
}
