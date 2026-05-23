import { Container, Graphics, Rectangle, Text } from 'pixi.js';

import {
  BALL_COLOR_HEX,
  BALL_COLOR_LABEL,
  createSingle,
  type BallColor,
} from '../ballTypes';
import { BALL_SKILL_DESC } from '../config/ballCatalog';
import { createBallVisual } from '../ballVisual';
import { GAME_WIDTH } from '../layout';

const BANNER_W = 900;
const BANNER_H = 300;
const BANNER_GAP = 20;
const GRID_CELL = 120;
const GRID_GAP = 12;
const DRAFT_BALL_RADIUS_SCALE = 2;
const GRID_ORIGIN_X = 24;
const GRID_ORIGIN_Y = (BANNER_H - (GRID_CELL * 2 + GRID_GAP)) / 2;
const GRID_W = GRID_CELL * 2 + GRID_GAP;
const DIVIDER_X = GRID_ORIGIN_X + GRID_W + 20;
const DESC_ORIGIN_X = DIVIDER_X + 42;
const DESC_TOP = 38;
const DESC_ROW_H = (BANNER_H - DESC_TOP - 28) / 4;
const DESC_TEXT_W = BANNER_W - DESC_ORIGIN_X - 24;

export class DraftScreen extends Container {
  private readonly onPick: (index: number) => void;
  private readonly banners: Container[] = [];

  constructor(options: BallColor[][], onPick: (index: number) => void) {
    super();
    this.onPick = onPick;
    this.eventMode = 'static';

    const totalH = BANNER_H * 3 + BANNER_GAP * 2;
    const startX = (GAME_WIDTH - BANNER_W) / 2;
    const startY = (1280 - totalH) / 2;

    const title = new Text({
      text: '选择本局球组（三选一）',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 28,
        fill: 0xe8f0ff,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5, 1);
    title.position.set(GAME_WIDTH / 2, startY - 16);
    this.addChild(title);

    const dim = new Graphics();
    dim.rect(0, 0, GAME_WIDTH, 1280);
    dim.fill({ color: 0x050a18, alpha: 0.82 });
    this.addChildAt(dim, 0);

    options.forEach((colors, i) => {
      const banner = this.createBanner(colors, i);
      banner.position.set(startX, startY + i * (BANNER_H + BANNER_GAP));
      this.addChild(banner);
      this.banners.push(banner);
    });
  }

  private createBanner(colors: BallColor[], index: number): Container {
    const banner = new Container();
    banner.eventMode = 'static';
    banner.cursor = 'pointer';
    banner.hitArea = new Rectangle(0, 0, BANNER_W, BANNER_H);

    const bg = new Graphics();
    const redraw = (hover: boolean) => {
      bg.clear();
      bg.roundRect(0, 0, BANNER_W, BANNER_H, 12);
      bg.fill({ color: hover ? 0x243a6e : 0x1a2d52, alpha: 0.95 });
      bg.stroke({ width: 2, color: hover ? 0x6a9fff : 0x3d5a9a });
    };
    redraw(false);
    banner.addChild(bg);

    const divider = new Graphics();
    divider.moveTo(DIVIDER_X, 22);
    divider.lineTo(DIVIDER_X, BANNER_H - 22);
    divider.stroke({ width: 1.5, color: 0x5a7ab8, alpha: 0.85 });
    banner.addChild(divider);

    const professionLine = colors.map((c) => BALL_COLOR_LABEL[c]).join(' · ');
    const label = new Text({
      text: `方案${index + 1}  ${professionLine}`,
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 20,
        fill: 0xffd56a,
        fontWeight: 'bold',
        wordWrap: true,
        wordWrapWidth: DIVIDER_X - 28,
        lineHeight: 26,
      },
    });
    label.position.set(20, 14);
    banner.addChild(label);

    colors.forEach((color, ci) => {
      const col = ci % 2;
      const row = Math.floor(ci / 2);
      const cx = GRID_ORIGIN_X + col * (GRID_CELL + GRID_GAP);
      const cy = GRID_ORIGIN_Y + row * (GRID_CELL + GRID_GAP);
      const cell = createBallVisual(
        createSingle([color], color),
        GRID_CELL,
        DRAFT_BALL_RADIUS_SCALE,
      );
      cell.position.set(cx, cy);
      banner.addChild(cell);
    });

    colors.forEach((color, ci) => {
      const ty = DESC_TOP + ci * DESC_ROW_H;
      const dot = new Graphics();
      dot.circle(DESC_ORIGIN_X - 14, ty + 11, 7);
      dot.fill(BALL_COLOR_HEX[color]);
      dot.stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
      banner.addChild(dot);

      const line = new Text({
        text: `${BALL_COLOR_LABEL[color]}：${BALL_SKILL_DESC[color]}`,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 16,
          fill: 0xc8daf0,
          wordWrap: true,
          wordWrapWidth: DESC_TEXT_W,
          lineHeight: 22,
        },
      });
      line.position.set(DESC_ORIGIN_X, ty);
      banner.addChild(line);
    });

    banner.on('pointerover', () => redraw(true));
    banner.on('pointerout', () => redraw(false));
    banner.on('pointertap', () => this.onPick(index));

    return banner;
  }
}
