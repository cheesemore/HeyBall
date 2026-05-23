import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { getRecruitCost } from '../config/recruitCost';
import { getRogueShopPrice, ROGUE_SHOP_MAX_PURCHASES } from '../config/rogueShop';
import type { UltimateSkillId } from '../config/ultimateSkills';
import { sumAttackFromSlots } from '../logic/ballAttackSum';
import { RogueSkillPickScreen } from './rogueSkillPickScreen';
import { UltimateSkillPanel } from './ultimateSkillPanel';
import { BattleField } from '../battle/battleField';
import { ControlArea, CONTROL_RIGHT_W } from '../controlArea';
import { layout } from '../layout';
import { ScreenShake } from './screenShake';
import { DraftScreen } from './draftScreen';
import { MonsterGroupPickScreen } from './monsterGroupPickScreen';
import {
  decidePrepareAction,
  GameLogic,
  aimAngleAtMaxHpMonster,
  shouldTriggerAirDrop,
  resolveAirDropVariant,
} from '../logic';
import type { PrepareAction } from '../logic';
import type { BlockMonster } from '../battle/monster';

const AUTO_PLAY_INTERVAL_SEC = 0.22;
const GAME_SPEED_OPTIONS = [1, 2, 3, 4] as const;

export class GameManager {
  readonly battle: BattleField;
  readonly control: ControlArea;
  private readonly logic: GameLogic;
  private readonly rightPanel: Container;
  private readonly autoPlayBtn: Container;
  private readonly hunterCountText: Text;
  private readonly speedBtns: Container[] = [];
  private readonly screenShake: ScreenShake;
  private readonly root: Container;
  private draftOverlay: DraftScreen | null = null;
  private rogueSkillOverlay: RogueSkillPickScreen | null = null;
  private monsterGroupOverlay: MonsterGroupPickScreen | null = null;
  private readonly ultimatePanel: UltimateSkillPanel;
  private autoPlayEnabled = false;
  private autoPlayTimer = 0;
  private timeScale = 1;

  private wallText!: Text;
  private turnText!: Text;
  private phaseText!: Text;

  constructor(root: Container) {
    this.root = root;
    this.logic = new GameLogic();
    this.battle = new BattleField();
    this.control = new ControlArea({
      onRecruit: () => this.handleRecruit(),
      onRogue: () => this.handleRogue(),
      onLaunch: () => this.handleLaunch(),
      onMerge: (from, to) => this.handleMerge(from, to),
    });

    this.ultimatePanel = new UltimateSkillPanel(CONTROL_RIGHT_W - 20);
    this.ultimatePanel.setOnActivate(() => this.handleUltimateActivate());

    this.rightPanel = new Container();
    this.rightPanel.position.set(layout.reserved.x, 0);

    this.autoPlayBtn = this.createAutoPlayButton();
    this.autoPlayBtn.position.set(12, 12);
    this.rightPanel.addChild(this.autoPlayBtn);

    this.hunterCountText = new Text({
      text: '猎人箭雨：0 支',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 15,
        fill: 0x7cfc00,
        fontWeight: 'bold',
      },
    });
    this.hunterCountText.position.set(12, 62);
    this.rightPanel.addChild(this.hunterCountText);

    const speedPanel = this.createSpeedControls();
    speedPanel.position.set(12, 88);
    this.rightPanel.addChild(speedPanel);

    const hud = new Container();
    hud.position.set(12, 148);
    this.buildHud(hud);
    this.rightPanel.addChild(hud);

    root.addChild(this.battle);
    root.addChild(this.control);
    this.control.mountUltimatePanel(
      this.ultimatePanel,
      layout.control.width,
    );
    root.addChild(this.rightPanel);

    this.screenShake = new ScreenShake(this.battle);
    this.battle.setScreenShakeTrigger((sec, mag) => this.screenShake.trigger(sec, mag));
    this.battle.setOnHunterCountChange(() => this.updateHunterHud());
    this.battle.setUltimateChargeHandlers({
      onDamage: (n) => this.logic.addUltimateDamageCharge(n),
      onCollision: () => this.logic.addUltimateCollisionCharge(1),
      onKill: () => this.logic.addUltimateKillCharge(1),
    });

    this.logic.subscribe(() => this.syncPresentation());
    this.battle.setOnMonsterKill((monster) => {
      this.logic.addGold(GameLogic.goldForKill(monster.typeId));
    });
    this.battle.setOnBossDefeated(() => this.onVictory());

    this.syncPresentation();
    this.refreshDraftOverlay();
  }

  private refreshDraftOverlay() {
    const state = this.logic.getState();

    if (state.phase === 'rogue_skill_pick') {
      if (!this.rogueSkillOverlay) {
        this.rogueSkillOverlay = new RogueSkillPickScreen((skill) =>
          this.pickRogueSkill(skill),
        );
        this.root.addChild(this.rogueSkillOverlay);
      }
      this.control.setInteractable(false);
      this.battle.visible = false;
      this.rightPanel.visible = false;
      return;
    }

    if (this.rogueSkillOverlay) {
      this.rogueSkillOverlay.destroy();
      this.rogueSkillOverlay = null;
    }

    if (state.phase === 'monster_group_draft') {
      if (!this.monsterGroupOverlay) {
        this.monsterGroupOverlay = new MonsterGroupPickScreen(
          state.monsterGroupDraftOptions,
          (i) => this.pickMonsterGroup(i),
        );
        this.root.addChild(this.monsterGroupOverlay);
      }
      this.control.setInteractable(false);
      this.battle.visible = false;
      this.rightPanel.visible = false;
      return;
    }

    if (this.monsterGroupOverlay) {
      this.monsterGroupOverlay.destroy();
      this.monsterGroupOverlay = null;
    }

    if (state.phase === 'draft') {
      if (!this.draftOverlay) {
        this.draftOverlay = new DraftScreen(state.draftOptions, (i) =>
          this.pickDraft(i),
        );
        this.root.addChild(this.draftOverlay);
      }
      this.control.setInteractable(false);
      this.battle.visible = false;
      this.rightPanel.visible = false;
      return;
    }

    if (this.draftOverlay) {
      this.draftOverlay.destroy();
      this.draftOverlay = null;
    }
    this.battle.visible = true;
    this.rightPanel.visible = true;
    if (state.phase === 'prepare') {
      this.battle.showLaunchCone();
      this.control.setInteractable(true);
    }
  }

  private pickRogueSkill(skill: UltimateSkillId) {
    if (!this.logic.selectUltimateSkill(skill)) return;
    this.refreshDraftOverlay();
    this.syncPresentation();
  }

  private pickMonsterGroup(index: number) {
    if (!this.logic.selectMonsterGroupOption(index)) return;
    this.refreshDraftOverlay();
    this.syncPresentation();
  }

  private pickDraft(index: number) {
    if (!this.logic.selectDraftOption(index)) return;
    const cfg = this.logic.getRunMonsterGroupConfig();
    this.battle.setRunMonsterGroupConfig(cfg.specialTypeIds);
    this.refreshDraftOverlay();
    this.battle.initBattle();
    this.battle.showLaunchCone();
    this.syncPresentation();
  }

  private createAutoPlayButton(): Container {
    const btnW = layout.reserved.width - 24;
    const btnH = 44;
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.hitArea = new Rectangle(0, 0, btnW, btnH);

    const bg = new Graphics();
    const label = new Text({
      text: '自动战斗：关',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 17,
        fill: 0xc8daf0,
        fontWeight: 'bold',
      },
    });
    label.anchor.set(0.5);
    label.position.set(btnW / 2, btnH / 2);
    btn.addChild(bg, label);

    const redraw = () => {
      const on = this.autoPlayEnabled;
      bg.clear();
      bg.roundRect(0, 0, btnW, btnH, 8);
      bg.fill(on ? 0x1a5c38 : 0x1e3a6e);
      bg.stroke({ width: 2, color: on ? 0x5fcf7a : 0x4a7bc8 });
      label.text = on ? '自动战斗：开' : '自动战斗：关';
      label.style.fill = on ? 0xe8ffe8 : 0xc8daf0;
    };

    btn.on('pointertap', () => {
      this.autoPlayEnabled = !this.autoPlayEnabled;
      this.autoPlayTimer = 0;
      redraw();
      this.updateHud();
    });

    redraw();
    return btn;
  }

  private createSpeedControls(): Container {
    const panel = new Container();
    const panelW = layout.reserved.width - 24;
    const label = new Text({
      text: '加速',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 14,
        fill: 0x8ab4e8,
        fontWeight: 'bold',
      },
    });
    panel.addChild(label);

    const gap = 6;
    const btnH = 32;
    const btnW = (panelW - gap * (GAME_SPEED_OPTIONS.length - 1)) / GAME_SPEED_OPTIONS.length;

    GAME_SPEED_OPTIONS.forEach((speed, i) => {
      const btn = new Container();
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.position.set(i * (btnW + gap), 22);
      btn.hitArea = new Rectangle(0, 0, btnW, btnH);

      const bg = new Graphics();
      const text = new Text({
        text: `×${speed}`,
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 15,
          fill: 0xc8daf0,
          fontWeight: 'bold',
        },
      });
      text.anchor.set(0.5);
      text.position.set(btnW / 2, btnH / 2);
      btn.addChild(bg, text);

      const redraw = () => {
        const active = this.timeScale === speed;
        bg.clear();
        bg.roundRect(0, 0, btnW, btnH, 6);
        bg.fill(active ? 0x2a4a8a : 0x152a4a);
        bg.stroke({ width: 2, color: active ? 0xffcc66 : 0x3a5a8a });
        text.style.fill = active ? 0xffeebb : 0x9ab0d0;
      };

      btn.on('pointertap', () => {
        this.timeScale = speed;
        this.redrawSpeedButtons();
      });

      (btn as Container & { __redraw?: () => void }).__redraw = redraw;
      this.speedBtns.push(btn);
      redraw();
      panel.addChild(btn);
    });

    return panel;
  }

  private redrawSpeedButtons(): void {
    for (const btn of this.speedBtns) {
      (btn as Container & { __redraw?: () => void }).__redraw?.();
    }
  }

  private buildHud(parent: Container) {
    const style = {
      fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
      fontSize: 18,
      fill: 0xc8daf0,
    };

    this.wallText = new Text({ text: '', style: { ...style, fontSize: 20, fill: 0xff8888 } });
    this.turnText = new Text({ text: '', style });
    this.turnText.position.set(0, 36);
    this.phaseText = new Text({ text: '', style: { ...style, fontSize: 16, fill: 0x8ab4e8 } });
    this.phaseText.position.set(0, 68);

    const hint = new Text({
      text: '手动：招募/合成/发射\n自动：招募→合成→瞄最高血',
      style: { ...style, fontSize: 14, fill: 0x6a8ab0, wordWrap: true, wordWrapWidth: 200 },
    });
    hint.position.set(0, 100);

    parent.addChild(this.wallText, this.turnText, this.phaseText, hint);
  }

  tick(dt: number) {
    const scaled = dt * this.timeScale;
    this.control.update(scaled);
    this.battle.update(scaled);
    this.screenShake.update(scaled);
    this.tickAutoPlay(scaled);
  }

  private updateHunterHud() {
    const n = this.battle.getHunterRainLayers();
    this.hunterCountText.text = `猎人箭雨：${n} 支`;
  }

  private tickAutoPlay(dt: number) {
    if (!this.autoPlayEnabled) return;

    const state = this.logic.getState();
    if (
      state.phase !== 'prepare' ||
      !this.logic.getRunPool().length ||
      this.battle.isTurnSpawnAnimating()
    ) {
      return;
    }

    this.logic.syncBattleMonsters(this.battle.getMonsterSnapshots());

    this.autoPlayTimer -= dt;
    if (this.autoPlayTimer > 0) return;
    this.autoPlayTimer = AUTO_PLAY_INTERVAL_SEC;

    const action = decidePrepareAction(state);
    this.executePrepareAction(action);
  }

  private executePrepareAction(action: PrepareAction) {
    switch (action.type) {
      case 'recruit':
        this.handleRecruit();
        break;
      case 'merge':
        this.handleMerge(action.from, action.to);
        break;
      case 'launch':
        this.handleLaunch(action.aimAngleRad);
        break;
      case 'wait':
        break;
    }
  }

  private syncControlView() {
    const state = this.logic.getState();
    const rogueCost = getRogueShopPrice(state.roguePurchaseCount);
    this.control.applyControlState({
      gold: state.gold,
      recruitCost: getRecruitCost(state.recruitCount),
      rogueCost,
      rogueDisabled:
        rogueCost === null ||
        state.roguePurchaseCount >= ROGUE_SHOP_MAX_PURCHASES ||
        (rogueCost !== null && state.gold < rogueCost),
      slots: [...state.controlSlots],
    });
    this.syncUltimatePanel();
  }

  private syncUltimatePanel() {
    const state = this.logic.getState();
    const charge = this.logic.getUltimateChargeView();
    this.ultimatePanel.apply(
      {
        skill: charge.skill,
        name: charge.name,
        progress: charge.progress,
        max: charge.max,
        ready: charge.ready,
        canPress: state.phase === 'prepare',
        pendingBuff:
          charge.skill === 'phase' && state.phaseBuffPending,
      },
      CONTROL_RIGHT_W - 20,
    );
  }

  private handleRogue() {
    if (this.logic.getState().phase !== 'prepare') return;
    if (!this.logic.tryRoguePurchase()) return;
    this.syncPresentation();
  }

  private handleUltimateActivate() {
    const state = this.logic.getState();
    if (
      state.phase !== 'prepare' ||
      !this.logic.isUltimateReady() ||
      this.battle.isPrepareUltimateBusy()
    ) {
      return;
    }

    const skill = state.ultimate.skill;
    if (skill === 'phase' && state.phaseBuffPending) return;

    const sum = sumAttackFromSlots(state.controlSlots);
    if (!this.logic.tryActivateUltimate()) return;

    if (skill === 'judgment') {
      this.control.setInteractable(false);
      this.battle.startJudgmentImmediate(sum, () => {
        this.syncBattleTargets();
        this.control.setInteractable(true);
        this.syncPresentation();
      });
      this.syncUltimatePanel();
      return;
    }

    if (skill === 'frost') {
      this.battle.applyFrostUltimateStrike(sum);
      this.syncBattleTargets();
      this.syncPresentation();
      return;
    }

    if (skill === 'phase') {
      this.battle.startPreparePhaseBuff();
      this.syncPresentation();
      return;
    }

    this.syncPresentation();
  }

  private syncPresentation() {
    const state = this.logic.getState();
    this.refreshDraftOverlay();
    if (state.phase === 'draft' || state.phase === 'monster_group_draft') return;
    this.syncControlView();
    this.updateHud();
  }

  private syncBattleTargets() {
    this.logic.syncBattleMonsters(this.battle.getMonsterSnapshots());
  }

  private onVictory() {
    this.logic.onVictory();
    this.autoPlayEnabled = false;
    this.control.setInteractable(false);
    this.updateHud();
  }

  private handleRecruit() {
    if (this.logic.getState().phase !== 'prepare' || !this.logic.getRunPool().length) return;
    const index = this.logic.tryRecruit();
    if (index === null) return;
    this.syncControlView();
    this.control.showRecruitBirth(index);
    this.updateHud();
  }

  private handleMerge(from: number, to: number) {
    if (this.logic.getState().phase !== 'prepare' || !this.logic.getRunPool().length) return;
    if (!this.logic.tryMerge(from, to)) return;
    this.syncControlView();
    this.control.showMergeAt(to);
    this.updateHud();
  }

  private handleLaunch(aimAngleRad?: number) {
    if (
      this.logic.getState().phase !== 'prepare' ||
      this.battle.isTurnSpawnAnimating() ||
      this.battle.isSpecialTurnAnimating() ||
      this.battle.isPrepareUltimateBusy()
    ) {
      return;
    }
    this.syncBattleTargets();
    const angle =
      aimAngleRad ?? aimAngleAtMaxHpMonster(this.logic.getState().battleMonsters);
    const state = this.logic.getState();

    this.battle.configureCombatUltimates({
      judgment: false,
      attackSum: 0,
      phaseBuff: state.phaseBuffPending,
      frostDebuff: false,
    });
    this.logic.consumePhaseBuff();

    const payload = this.logic.beginLaunch(angle);
    if (!payload) return;

    this.control.hideBallsForLaunch();
    this.control.setInteractable(false);
    this.updateHud();

    this.updateHunterHud();
    this.battle.launchBallsSequential(payload.units, payload.aimAngleRad, () =>
      this.onCombatFinished(),
    );
  }

  private onCombatFinished() {
    if (this.logic.getState().phase === 'victory') return;

    this.updateHunterHud();
    this.logic.onCombatEndedStartSpawn();
    this.control.setInteractable(false);
    this.updateHud();

    const turn = this.logic.getState().turn;
    const finishSpawn = (wallHits: BlockMonster[]) => {
      this.battle.runSpecialMonstersEndOfTurn((specialHits) => {
        const dmg = GameLogic.wallDamageFromHits([
          ...wallHits,
          ...specialHits,
        ]);
        this.logic.onSpawnFinished(dmg);
        this.control.restoreBallsAfterLaunch();
        this.battle.showLaunchCone();
        this.control.setInteractable(true);
        this.syncPresentation();
      });
    };

    if (shouldTriggerAirDrop(turn, this.battle.isBossSpawned())) {
      const variant = resolveAirDropVariant(turn);
      this.battle.startAirDropAnim(variant, finishSpawn);
    } else {
      this.battle.startTurnSpawnAnim(finishSpawn);
    }
  }

  private updateHud() {
    const state = this.logic.getState();
    this.wallText.text = `城墙 ${state.wallHp} / ${state.wallMaxHp}`;
    this.turnText.text = `回合 ${state.turn}`;
    const autoTag =
      this.autoPlayEnabled && state.phase === 'prepare' ? ' · 自动' : '';
    const spawnTag =
      state.phase === 'spawn' && shouldTriggerAirDrop(state.turn, this.battle.isBossSpawned())
        ? ' · 空降'
        : '';
    const poolTag =
      state.runBallColors?.length
        ? ` · ${state.runBallColors.map((c) => c).join('/')}`
        : '';
    this.phaseText.text =
      state.phase === 'victory'
        ? '阶段：通关！'
        : state.phase === 'monster_group_draft'
          ? '阶段：怪物组四选一'
          : state.phase === 'draft'
            ? '阶段：球组三选一'
            : state.phase === 'rogue_skill_pick'
            ? '阶段：肉鸽选技能'
            : state.phase === 'prepare'
            ? `阶段：备战${autoTag}${poolTag}`
            : state.phase === 'spawn'
              ? `阶段：刷怪推进中…${spawnTag}`
              : '阶段：战斗中…';
  }
}
