import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Rectangle,
  Text,
} from 'pixi.js';
import { layout } from './layout';
import { canMerge, type BallItem } from './ballTypes';
import {
  CONTROL_SLOT_COUNT,
  createEmptyControlSlots,
} from './logic/controlGrid';
import { createBallVisual } from './ballVisual';
import {
  createBallBirthEffect,
  createMergeCellEffect,
  type TickableEffect,
} from './effects/slotBallEffects';
import type { UltimateSkillPanel } from './game/ultimateSkillPanel';

/** 终极技能面板高度（置于发射钮上方） */
export const ULTIMATE_PANEL_ABOVE_LAUNCH = 78;

const GRID_COLS = 6;
const GRID_ROWS = 2;
const CELL_COUNT = CONTROL_SLOT_COUNT;

const LEFT_W = 168;
export const CONTROL_RIGHT_W = 132;
const RIGHT_W = CONTROL_RIGHT_W;
const PAD = 10;


/** 左侧金币显示 Y */
const GOLD_LABEL_Y = 12;
/** 招募 / 肉鸽按钮起始 Y（在金币下方） */
const LEFT_BTN_TOP = 78;
const BTN_GAP = 12;
const BTN_H = 72;

const BTN_BG = 0x1e3a6e;
const BTN_BORDER = 0x4a7bc8;
const SLOT_BG = 0x0d2040;
const SLOT_BORDER = 0x2a5088;
const LAUNCH_RED = 0xcc2222;
const LAUNCH_RED_HOVER = 0xee3333;

interface CellSlot {
  root: Container;
  bg: Graphics;
  fxLayer: Container;
  ballLayer: Container;
  index: number;
}

export interface ControlViewState {
  gold: number;
  recruitCost: number;
  rogueCost: number | null;
  rogueDisabled: boolean;
  slots: (BallItem | null)[];
}

export interface ControlAreaHandlers {
  onRecruit: () => void;
  onRogue: () => void;
  onLaunch: () => void;
  onMerge: (from: number, to: number) => void;
}

export class ControlArea extends Container {
  private readonly slots: CellSlot[] = [];
  private gridData: (BallItem | null)[] = createEmptyControlSlots();
  private gold = 0;
  private interactable = true;
  private readonly handlers: ControlAreaHandlers;
  private readonly gridRoot: Container;
  private readonly cellW: number;
  private readonly cellH: number;

  private dragSource: number | null = null;
  private dragGhost: Container | null = null;
  private hoverTarget: number | null = null;
  private readonly areaBounds: Rectangle;
  private goldText!: Text;
  private recruitBtn!: Container;
  private rogueBtn!: Container;
  private launchBtn!: Container;
  private readonly onStageMove = (e: FederatedPointerEvent) => this.onGlobalMove(e);
  private readonly onStageUp = (e: FederatedPointerEvent) => this.onGlobalUp(e);
  private readonly runningEffects: TickableEffect[] = [];

  constructor(handlers: ControlAreaHandlers) {
    super();
    this.handlers = handlers;
    const { x, y, width, height } = layout.control;
    this.position.set(x, y);
    this.areaBounds = new Rectangle(0, 0, width, height);
    this.hitArea = this.areaBounds;

    const gridW = width - LEFT_W - RIGHT_W - PAD * 2;
    const gridH = height - PAD * 2;
    this.cellW = Math.floor(gridW / GRID_COLS);
    this.cellH = Math.floor(gridH / GRID_ROWS);

    this.drawBackground(width, height);
    this.createGoldLabel();
    this.createLeftButtons();
    this.createLaunchButton(width, height, ULTIMATE_PANEL_ABOVE_LAUNCH + 18);

    this.gridRoot = new Container();
    this.gridRoot.position.set(LEFT_W + PAD, PAD);
    this.addChild(this.gridRoot);

    for (let i = 0; i < CELL_COUNT; i++) {
      this.slots.push(this.createCell(i));
    }

    this.setupGlobalPointer();
  }

  /** 终极技能面板：置于右侧列顶部（与发射键同列，留在控制区内以接收点击） */
  mountUltimatePanel(panel: UltimateSkillPanel, areaW: number) {
    const launchX = areaW - RIGHT_W + PAD;
    panel.position.set(launchX, PAD);
    panel.eventMode = 'static';
    this.addChild(panel);
  }

  private drawBackground(w: number, h: number) {
    const bg = new Graphics();
    bg.rect(0, 0, w, h);
    bg.fill({ color: 0x0f2244, alpha: 0.92 });
    bg.stroke({ width: 1, color: 0x2a4a7a, alpha: 0.5 });
    this.addChild(bg);

    const label = new Text({
      text: '控制区',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 14,
        fill: 0x6a8ab8,
      },
      x: LEFT_W + PAD,
      y: 4,
    });
    this.addChild(label);
  }

  private createGoldLabel() {
    this.goldText = new Text({
      text: `金币 ${this.gold}`,
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 20,
        fill: 0xffd54f,
        fontWeight: 'bold',
      },
      x: PAD,
      y: GOLD_LABEL_Y,
    });
    this.addChild(this.goldText);
  }

  private updateGoldLabel() {
    this.goldText.text = `金币 ${this.gold}`;
  }

  private updateRogueButton(cost: number | null, disabled: boolean) {
    const priceText = this.rogueBtn.children.find(
      (c) => c instanceof Text && c.label === 'price',
    ) as Text | undefined;
    const title = this.rogueBtn.children.find(
      (c) => c instanceof Text && c.y === 14,
    ) as Text | undefined;
    if (priceText) {
      priceText.text = cost === null ? '已满' : String(cost);
    }
    if (title) title.text = '肉鸽';
    this.rogueBtn.alpha = disabled ? 0.45 : 1;
    this.rogueBtn.eventMode = disabled ? 'none' : 'static';
    this.rogueBtn.cursor = disabled ? 'default' : 'pointer';
  }

  private updateRecruitPrice(cost: number) {
    const priceText = this.recruitBtn.children.find(
      (c) => c instanceof Text && c.label === 'price',
    ) as Text | undefined;
    if (priceText) priceText.text = String(cost);
  }

  private createLeftButtons() {
    this.recruitBtn = this.makePriceButton(
      '招募',
      0,
      PAD,
      LEFT_BTN_TOP,
      () => this.onRecruit(),
    );
    this.rogueBtn = this.makePriceButton(
      '肉鸽',
      500,
      PAD,
      LEFT_BTN_TOP + BTN_H + BTN_GAP,
      () => this.onRogue(),
    );
    this.addChild(this.recruitBtn, this.rogueBtn);
  }

  private makePriceButton(
    label: string,
    price: number,
    x: number,
    y: number,
    onClick: () => void,
  ): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const w = LEFT_W - PAD * 2;
    const h = 72;
    const bg = new Graphics();
    const drawBg = (hover: boolean) => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 8);
      bg.fill(hover ? 0x284878 : BTN_BG);
      bg.stroke({ width: 2, color: BTN_BORDER });
    };
    drawBg(false);
    btn.addChild(bg);

    const title = new Text({
      text: label,
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 20,
        fill: 0xe8f0ff,
        fontWeight: 'bold',
      },
      x: 0,
      y: 14,
    });
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    btn.addChild(title);

    const priceText = new Text({
      text: String(price),
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 18,
        fill: 0xffd54f,
      },
      x: 0,
      y: 42,
    });
    priceText.anchor.set(0.5, 0);
    priceText.x = w / 2;
    priceText.label = 'price';
    btn.addChild(priceText);

    btn.on('pointertap', onClick);
    btn.on('pointerover', () => drawBg(true));
    btn.on('pointerout', () => drawBg(false));
    return btn;
  }

  private createLaunchButton(areaW: number, areaH: number, topReserve: number) {
    const btn = new Container();
    const bw = RIGHT_W - PAD * 2;
    const launchY = PAD + topReserve;
    const bh = areaH - launchY - PAD;
    btn.position.set(areaW - RIGHT_W + PAD, launchY);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      bg.roundRect(0, 0, bw, bh, 12);
      bg.fill(hover ? LAUNCH_RED_HOVER : LAUNCH_RED);
      bg.stroke({ width: 3, color: 0xff6666 });
    };
    draw(false);
    btn.addChild(bg);

    const t = new Text({
      text: '发射',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 26,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    t.anchor.set(0.5);
    t.position.set(bw / 2, bh / 2);
    btn.addChild(t);

    btn.on('pointertap', () => this.onLaunch());
    btn.on('pointerover', () => draw(true));
    btn.on('pointerout', () => draw(false));
    this.launchBtn = btn;
    this.addChild(btn);
  }

  private createCell(index: number): CellSlot {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);

    const root = new Container();
    root.position.set(col * this.cellW, row * this.cellH);
    root.eventMode = 'static';
    root.hitArea = new Rectangle(0, 0, this.cellW, this.cellH);

    const bg = new Graphics();
    bg.roundRect(2, 2, this.cellW - 4, this.cellH - 4, 6);
    bg.fill(SLOT_BG);
    bg.stroke({ width: 2, color: SLOT_BORDER, alpha: 0.8 });
    bg.eventMode = 'none';
    root.addChild(bg);

    const fxLayer = new Container();
    fxLayer.eventMode = 'none';
    root.addChild(fxLayer);

    const ballLayer = new Container();
    ballLayer.eventMode = 'none';
    root.addChild(ballLayer);

    root.cursor = 'grab';
    root.on('pointerdown', (e: FederatedPointerEvent) => this.onCellPointerDown(index, e));
    this.gridRoot.addChild(root);

    return { root, bg, fxLayer, ballLayer, index };
  }

  /** 驱动出生 / 合成特效 */
  update(dt: number) {
    for (let i = this.runningEffects.length - 1; i >= 0; i--) {
      if (!this.runningEffects[i]!.tick(dt)) {
        this.runningEffects.splice(i, 1);
      }
    }
  }

  private setupGlobalPointer() {
    this.eventMode = 'static';
  }

  private getStageRoot(): Container {
    let node: Container = this;
    while (node.parent) node = node.parent;
    return node;
  }

  private attachStageDragListeners() {
    const stage = this.getStageRoot();
    stage.eventMode = 'static';
    stage.on('pointermove', this.onStageMove);
    stage.on('pointerup', this.onStageUp);
    stage.on('pointerupoutside', this.onStageUp);
  }

  private detachStageDragListeners() {
    const stage = this.getStageRoot();
    stage.off('pointermove', this.onStageMove);
    stage.off('pointerup', this.onStageUp);
    stage.off('pointerupoutside', this.onStageUp);
  }

  /** 从逻辑层状态同步显示（无特效） */
  applyControlState(view: ControlViewState) {
    this.gold = view.gold;
    this.gridData = [...view.slots];
    this.updateGoldLabel();
    this.updateRecruitPrice(view.recruitCost);
    this.updateRogueButton(view.rogueCost, view.rogueDisabled);
    for (let i = 0; i < CELL_COUNT; i++) {
      this.paintCell(i, this.gridData[i], false);
    }
  }

  showRecruitBirth(index: number) {
    const item = this.gridData[index];
    if (item) this.paintCell(index, item, true);
  }

  showMergeAt(to: number) {
    const item = this.gridData[to];
    if (item) this.playMergeThenBirth(to, item);
  }

  setInteractable(value: boolean) {
    this.interactable = value;
    const mode = value ? 'static' : 'none';
    const cursor = value ? 'pointer' : 'default';

    this.recruitBtn.eventMode = mode;
    this.recruitBtn.cursor = cursor;
    this.rogueBtn.eventMode = mode;
    this.rogueBtn.cursor = cursor;
    this.launchBtn.eventMode = mode;
    this.launchBtn.cursor = cursor;

    for (const slot of this.slots) {
      slot.root.eventMode = mode;
      slot.root.cursor = value ? 'grab' : 'default';
    }

    if (!value) this.cancelDrag();
  }

  /** 发射开始：隐藏格子内弹球外观，数据保留 */
  hideBallsForLaunch() {
    for (const slot of this.slots) {
      slot.ballLayer.visible = false;
    }
  }

  /** 战斗结束：恢复格子内弹球显示 */
  restoreBallsAfterLaunch() {
    for (let i = 0; i < CELL_COUNT; i++) {
      const item = this.gridData[i];
      const slot = this.slots[i]!;
      slot.ballLayer.visible = true;
      slot.ballLayer.removeChildren();
      if (item) {
        slot.ballLayer.addChild(createBallVisual(item, Math.min(this.cellW, this.cellH)));
      }
    }
  }

  private onRecruit() {
    if (!this.interactable) return;
    this.handlers.onRecruit();
  }

  private onRogue() {
    if (!this.interactable) return;
    this.handlers.onRogue();
  }

  private onLaunch() {
    if (!this.interactable) return;
    this.handlers.onLaunch();
  }

  private onCellPointerDown(index: number, e: FederatedPointerEvent) {
    if (!this.interactable) return;
    const item = this.gridData[index];
    if (!item || this.dragSource !== null) return;

    this.dragSource = index;
    this.attachStageDragListeners();

    const ghost = createBallVisual(item, Math.min(this.cellW, this.cellH));
    ghost.alpha = 0.85;
    ghost.eventMode = 'none';
    this.addChild(ghost);
    this.dragGhost = ghost;
    this.updateGhostPosition(e);

    this.slots[index]!.ballLayer.removeChildren();
    this.highlightCell(index, true);
  }

  private onGlobalMove(e: FederatedPointerEvent) {
    if (this.dragGhost) this.updateGhostPosition(e);
    if (this.dragSource === null) return;

    const target = this.cellAtEvent(e);
    const source = this.dragSource;
    const sourceItem = this.gridData[source];

    if (this.hoverTarget !== null && this.hoverTarget !== target) {
      this.highlightCell(this.hoverTarget, false);
      this.hoverTarget = null;
    }

    if (
      target !== null &&
      target !== source &&
      sourceItem &&
      this.gridData[target] &&
      canMerge(sourceItem, this.gridData[target]!)
    ) {
      this.highlightCell(target, true, 0x2a6a3a, 0x5fcf7a);
      this.hoverTarget = target;
    }
  }

  private onGlobalUp(e: FederatedPointerEvent) {
    if (this.dragSource === null) {
      this.cancelDrag();
      return;
    }

    const target = this.cellAtEvent(e);
    const source = this.dragSource;
    const sourceItem = this.gridData[source];
    const targetItem = target !== null ? this.gridData[target] : null;

    if (
      target !== null &&
      target !== source &&
      sourceItem &&
      targetItem &&
      canMerge(sourceItem, targetItem)
    ) {
      this.handlers.onMerge(source, target);
      this.cancelDrag();
      return;
    }

    if (sourceItem) {
      this.paintCell(source, sourceItem, false);
    }
    this.cancelDrag();
  }

  private cancelDrag() {
    this.detachStageDragListeners();
    if (this.dragSource !== null) this.highlightCell(this.dragSource, false);
    if (this.hoverTarget !== null) this.highlightCell(this.hoverTarget, false);
    this.dragSource = null;
    this.hoverTarget = null;
    if (this.dragGhost) {
      this.dragGhost.destroy();
      this.dragGhost = null;
    }
  }

  private updateGhostPosition(e: FederatedPointerEvent) {
    if (!this.dragGhost) return;
    const local = e.getLocalPosition(this);
    const size = Math.min(this.cellW, this.cellH);
    this.dragGhost.position.set(local.x - size / 2, local.y - size / 2);
  }

  private cellAtEvent(e: FederatedPointerEvent): number | null {
    const local = e.getLocalPosition(this.gridRoot);
    const col = Math.floor(local.x / this.cellW);
    const row = Math.floor(local.y / this.cellH);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return row * GRID_COLS + col;
  }

  private paintCell(
    index: number,
    item: BallItem | null,
    withBirth: boolean,
  ) {
    this.gridData[index] = item;
    const slot = this.slots[index]!;
    slot.fxLayer.removeChildren();
    slot.ballLayer.removeChildren();
    if (item) {
      this.mountBallVisual(index, item, withBirth);
    }
    this.highlightCell(index, false);
  }

  private mountBallVisual(index: number, item: BallItem, withBirth: boolean) {
    const slot = this.slots[index]!;
    const size = Math.min(this.cellW, this.cellH);
    const visual = createBallVisual(item, size);
    slot.ballLayer.addChild(visual);
    if (withBirth) {
      this.runningEffects.push(createBallBirthEffect(visual, size));
    }
  }

  /** 合成：先播格子特效，再让新弹球整体做出生缩放 */
  private playMergeThenBirth(index: number, item: BallItem) {
    this.gridData[index] = item;
    const slot = this.slots[index]!;
    slot.fxLayer.removeChildren();
    slot.ballLayer.removeChildren();
    this.highlightCell(index, false);

    this.runningEffects.push(
      createMergeCellEffect(slot.fxLayer, this.cellW, this.cellH, () => {
        this.mountBallVisual(index, item, true);
      }),
    );
  }

  private highlightCell(
    index: number,
    active: boolean,
    fill = 0x1a3560,
    stroke = 0x6ab0ff,
  ) {
    const slot = this.slots[index]!;
    slot.bg.clear();
    slot.bg.roundRect(2, 2, this.cellW - 4, this.cellH - 4, 6);
    slot.bg.fill(active ? fill : SLOT_BG);
    slot.bg.stroke({
      width: active ? 3 : 2,
      color: active ? stroke : SLOT_BORDER,
      alpha: 0.9,
    });
  }
}
