import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { formatRunBallEffectsLines } from '../config/ballCatalog';
import { getRecruitCost } from '../config/recruitCost';
import {
  getMonsterGrowthStep,
  getMonsterHpMultiplier,
} from '../config/monsterScaling';
import { getNextBossSpawnOrdinal } from '../config/monsterSpawn';
import { getRogueShopPrice, ROGUE_SHOP_MAX_PURCHASES } from '../config/rogueShop';
import type { RogueUpgradeId } from '../config/rogueUpgrades';
import {
  AUTO_PLAY_ULTIMATE_SKILL,
  type UltimateSkillId,
} from '../config/ultimateSkills';
import { hasMonsterFromTopRows } from '../logic/ultimateAuto';
import { sumAttackFromSlots } from '../logic/ballAttackSum';
import { RogueSkillPickScreen } from './rogueSkillPickScreen';
import { RogueUpgradePickScreen } from './rogueUpgradePickScreen';
import { SuperRoguePickScreen } from './superRoguePickScreen';
import {
  formatSuperRogueHudLines,
  SUPER_ROGUE_CARD_DEFS,
  type SuperRogueCardId,
} from '../config/superRogueCards';
import { BallTier } from '../ballTypes';
import { UltimateSkillPanel } from './ultimateSkillPanel';
import { BattleField } from '../battle/battleField';
import { ControlArea, CONTROL_RIGHT_W } from '../controlArea';
import { BATTLE_WIDTH, battleLaunchLocalY, layout } from '../layout';
import { ScreenShake } from './screenShake';
import { DraftScreen } from './draftScreen';
import { MonsterGroupPickScreen } from './monsterGroupPickScreen';
import { GameResultOverlay } from './gameResultOverlay';
import { createEmptyControlSlots } from '../logic/controlGrid';
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
  private rogueUpgradeOverlay: RogueUpgradePickScreen | null = null;
  private superRogueOverlay: SuperRoguePickScreen | null = null;
  private monsterGroupOverlay: MonsterGroupPickScreen | null = null;
  private resultOverlay: GameResultOverlay | null = null;
  private readonly ultimatePanel: UltimateSkillPanel;
  private autoPlayEnabled = false;
  private autoPlayTimer = 0;
  /** 每回合仅自动尝试一次末日审判（备战阶段） */
  private autoJudgmentTurn = -1;
  private timeScale = 1;

  private wallText!: Text;
  private turnText!: Text;
  private mergeAttackBonusText!: Text;
  private mergeBonusPopT = -1;
  private phaseText!: Text;
  private runBallEffectsText!: Text;
  private hudHintText!: Text;
  private superRogueListText!: Text;
  private bossCountdownText!: Text;

  constructor(root: Container) {
    this.root = root;
    this.logic = new GameLogic();
    this.battle = new BattleField();
    this.control = new ControlArea({
      onRecruit: () => this.handleRecruit(),
      onRogue: () => this.handleRogue(),
      onLaunchAimStart: () => this.battle.beginLaunchAimSweep(),
      onLaunchRelease: () => this.handleLaunch(this.battle.getLaunchAimAngle()),
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
      text: '猎人齐射：0 轮',
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
      this.logic.recordMonsterKill();
      this.logic.addGold(GameLogic.goldForKill(monster.typeId));
    });
    this.battle.setOnBossDefeated(() => this.updateHud());

    this.bossCountdownText = new Text({
      text: '',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 16,
        fill: 0xc8daf0,
      },
    });
    this.bossCountdownText.anchor.set(0, 0.5);
    this.bossCountdownText.position.set(BATTLE_WIDTH / 2 + 24, battleLaunchLocalY());
    this.battle.addChild(this.bossCountdownText);

    this.syncPresentation();
    this.refreshDraftOverlay();
  }

  private refreshDraftOverlay() {
    const state = this.logic.getState();

    if (state.phase === 'settled') {
      this.clearDraftOverlays();
      this.battle.visible = true;
      this.rightPanel.visible = true;
      this.showResultOverlayIfNeeded();
      return;
    }

    if (this.resultOverlay) {
      this.resultOverlay.destroy();
      this.resultOverlay = null;
    }

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

    if (state.phase === 'rogue_upgrade_pick') {
      const options = this.logic.getRogueUpgradePickOptions();
      if (this.rogueUpgradeOverlay) {
        this.rogueUpgradeOverlay.destroy();
        this.rogueUpgradeOverlay = null;
      }
      this.rogueUpgradeOverlay = new RogueUpgradePickScreen(options, (id) =>
        this.pickRogueUpgrade(id),
      );
      this.root.addChild(this.rogueUpgradeOverlay);
      this.control.setInteractable(false);
      this.battle.visible = false;
      this.rightPanel.visible = false;
      return;
    }

    if (this.rogueUpgradeOverlay) {
      this.rogueUpgradeOverlay.destroy();
      this.rogueUpgradeOverlay = null;
    }

    if (state.phase === 'super_rogue_pick') {
      const ids = this.logic.getSuperRoguePickOptionIds();
      const options = ids
        .map((id) => SUPER_ROGUE_CARD_DEFS[id])
        .filter((d): d is NonNullable<typeof d> => d != null);
      if (this.superRogueOverlay) {
        this.superRogueOverlay.destroy();
        this.superRogueOverlay = null;
      }
      this.superRogueOverlay = new SuperRoguePickScreen(options, (def) =>
        this.pickSuperRogueCard(def.id),
      );
      this.root.addChild(this.superRogueOverlay);
      this.control.setInteractable(false);
      this.battle.visible = false;
      this.rightPanel.visible = true;
      return;
    }

    if (this.superRogueOverlay) {
      this.superRogueOverlay.destroy();
      this.superRogueOverlay = null;
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

  private pickRogueUpgrade(id: RogueUpgradeId) {
    if (!this.logic.selectRogueUpgrade(id)) return;
    this.refreshDraftOverlay();
    this.syncPresentation();
  }

  private pickSuperRogueCard(id: SuperRogueCardId) {
    if (!this.logic.selectSuperRogueCard(id)) return;
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
    this.mergeAttackBonusText = new Text({
      text: '合成攻击 +0%',
      style: { ...style, fontSize: 16, fill: 0xffcc66 },
    });
    this.mergeAttackBonusText.position.set(0, 60);
    this.phaseText = new Text({ text: '', style: { ...style, fontSize: 16, fill: 0x8ab4e8 } });
    this.phaseText.position.set(0, 86);

    const hudTextW = layout.reserved.width - 24;
    this.runBallEffectsText = new Text({
      text: '',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 14,
        fill: 0xb8d8f8,
        wordWrap: true,
        wordWrapWidth: hudTextW,
        lineHeight: 20,
      },
    });
    this.runBallEffectsText.position.set(0, 112);

    this.hudHintText = new Text({
      text: '手动：招募/合成/按住发射键瞄准\n自动：招募≤肉鸽40%先招，否则存钱肉鸽',
      style: {
        ...style,
        fontSize: 14,
        fill: 0x6a8ab0,
        wordWrap: true,
        wordWrapWidth: hudTextW,
      },
    });
    this.hudHintText.position.set(0, 200);

    this.superRogueListText = new Text({
      text: '',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 13,
        fill: 0x9fd4ff,
        wordWrap: true,
        wordWrapWidth: hudTextW,
        lineHeight: 16,
      },
    });
    this.superRogueListText.position.set(0, 248);

    parent.addChild(
      this.wallText,
      this.turnText,
      this.mergeAttackBonusText,
      this.phaseText,
      this.runBallEffectsText,
      this.hudHintText,
      this.superRogueListText,
    );
  }

  private layoutLowerRightHud() {
    const bottom =
      this.runBallEffectsText.position.y + this.runBallEffectsText.height + 10;
    this.hudHintText.position.set(0, Math.max(200, bottom));

    const picks = formatSuperRogueHudLines(this.logic.getSuperRoguePicks());
    this.superRogueListText.text = picks;
    this.superRogueListText.visible = picks.length > 0;
    this.superRogueListText.position.set(
      0,
      this.hudHintText.position.y + this.hudHintText.height + 6,
    );
  }

  tick(dt: number) {
    const scaled = dt * this.timeScale;
    this.control.update(scaled);
    this.battle.update(scaled);
    this.screenShake.update(scaled);
    this.tickMergeBonusPop(scaled);
    this.tickAutoPlay(scaled);
  }

  private tickMergeBonusPop(dt: number) {
    if (this.mergeBonusPopT < 0) return;
    this.mergeBonusPopT -= dt;
    const duration = 0.42;
    const t = Math.max(0, this.mergeBonusPopT / duration);
    const scale = 1 + 0.42 * Math.sin((1 - t) * Math.PI);
    this.mergeAttackBonusText.scale.set(scale);
    if (this.mergeBonusPopT <= 0) {
      this.mergeBonusPopT = -1;
      this.mergeAttackBonusText.scale.set(1);
    }
  }

  private triggerMergeBonusPop() {
    this.mergeBonusPopT = 0.42;
  }

  private updateHunterHud() {
    const n = this.battle.getHunterRainLayers();
    this.hunterCountText.text = `猎人齐射：${n} 轮`;
  }

  private tickAutoPlay(dt: number) {
    if (!this.autoPlayEnabled) return;

    const state = this.logic.getState();

    if (state.phase === 'rogue_skill_pick') {
      this.pickRogueSkill(AUTO_PLAY_ULTIMATE_SKILL);
      return;
    }

    if (state.phase === 'super_rogue_pick') {
      const ids = this.logic.getSuperRoguePickOptionIds();
      if (ids[0]) this.pickSuperRogueCard(ids[0]);
      return;
    }

    if (
      state.phase !== 'prepare' ||
      !this.logic.getRunPool().length ||
      this.battle.isTurnSpawnAnimating()
    ) {
      return;
    }

    this.logic.syncBattleMonsters(this.battle.getMonsterSnapshots());

    if (this.tryAutoJudgmentAtTurnStart()) {
      return;
    }

    if (this.battle.isPrepareUltimateBusy()) {
      return;
    }

    this.autoPlayTimer -= dt;
    if (this.autoPlayTimer > 0) return;
    this.autoPlayTimer = AUTO_PLAY_INTERVAL_SEC;

    const action = decidePrepareAction(state);
    this.executePrepareAction(action);
  }

  /** 回合备战开始：城墙侧第3行内有怪且末日审判可用则自动释放 */
  private tryAutoJudgmentAtTurnStart(): boolean {
    const state = this.logic.getState();
    if (state.phase !== 'prepare') return false;
    if (state.turn === this.autoJudgmentTurn) return false;
    if (state.ultimate.skill !== 'judgment') return false;
    if (!this.logic.isUltimateReady()) return false;
    if (this.battle.isPrepareUltimateBusy()) return false;
    if (!hasMonsterFromTopRows(state.battleMonsters)) return false;

    this.autoJudgmentTurn = state.turn;
    this.handleUltimateActivate();
    return true;
  }

  private executePrepareAction(action: PrepareAction) {
    switch (action.type) {
      case 'recruit':
        this.handleRecruit();
        break;
      case 'rogue':
        this.handleRogue();
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

    const sum = sumAttackFromSlots(
      state.controlSlots,
      state.mergeAttackBonusPercent,
    );
    if (!this.logic.tryActivateUltimate()) return;

    if (skill === 'judgment') {
      this.control.setInteractable(false);
      this.battle.startJudgmentImmediate(
        sum,
        this.logic.getJudgmentWaveCount(),
        () => {
        this.syncBattleTargets();
        this.control.setInteractable(true);
        this.syncPresentation();
        },
      );
      this.syncUltimatePanel();
      return;
    }

    if (skill === 'frost') {
      this.battle.applyFrostUltimateStrike(
        sum,
        this.logic.getFrostDamageTakenMult(),
      );
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
    if (
      state.phase === 'draft' ||
      state.phase === 'monster_group_draft' ||
      state.phase === 'rogue_upgrade_pick' ||
      state.phase === 'super_rogue_pick'
    ) {
      return;
    }
    if (state.phase === 'settled') {
      this.showResultOverlayIfNeeded();
      this.updateHud();
      return;
    }
    this.syncControlView();
    this.updateHud();
  }

  private syncBattleTargets() {
    this.logic.syncBattleMonsters(this.battle.getMonsterSnapshots());
  }

  private onRunSettled() {
    this.autoPlayEnabled = false;
    this.control.setInteractable(false);
    this.battle.hideLaunchCone();
    this.syncPresentation();
  }

  private showResultOverlayIfNeeded() {
    const state = this.logic.getState();
    if (state.phase !== 'settled' || !state.settlement) return;
    if (this.resultOverlay) return;

    this.resultOverlay = new GameResultOverlay(state.settlement, () =>
      this.restartRun(),
    );
    this.root.addChild(this.resultOverlay);
    this.control.setInteractable(false);
  }

  private clearDraftOverlays() {
    if (this.rogueSkillOverlay) {
      this.rogueSkillOverlay.destroy();
      this.rogueSkillOverlay = null;
    }
    if (this.rogueUpgradeOverlay) {
      this.rogueUpgradeOverlay.destroy();
      this.rogueUpgradeOverlay = null;
    }
    if (this.superRogueOverlay) {
      this.superRogueOverlay.destroy();
      this.superRogueOverlay = null;
    }
    if (this.monsterGroupOverlay) {
      this.monsterGroupOverlay.destroy();
      this.monsterGroupOverlay = null;
    }
    if (this.draftOverlay) {
      this.draftOverlay.destroy();
      this.draftOverlay = null;
    }
  }

  private restartRun() {
    if (this.resultOverlay) {
      this.resultOverlay.destroy();
      this.resultOverlay = null;
    }
    this.clearDraftOverlays();
    this.autoPlayEnabled = false;
    this.autoPlayTimer = 0;
    this.autoJudgmentTurn = -1;
    this.mergeBonusPopT = -1;

    this.logic.restart();
    this.battle.resetForNewRun();
    this.control.restoreBallsAfterLaunch();
    this.control.applyControlState({
      gold: 0,
      recruitCost: getRecruitCost(0),
      rogueCost: getRogueShopPrice(0),
      rogueDisabled: false,
      slots: createEmptyControlSlots(),
    });
    this.updateHunterHud();
    this.refreshDraftOverlay();
    this.syncPresentation();
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
    const before = this.logic.getMergeAttackBonusPercent();
    const mergedTier = this.logic.tryMerge(from, to);
    if (mergedTier === null) return;
    if (this.logic.getMergeAttackBonusPercent() > before) {
      this.triggerMergeBonusPop();
    }
    this.syncControlView();
    this.control.showMergeAt(to);
    this.updateHud();
    if (mergedTier === BallTier.TripleBig) {
      this.logic.beginSuperRoguePick();
      this.refreshDraftOverlay();
      this.syncPresentation();
    }
  }

  private handleLaunch(aimAngleRad?: number) {
    if (
      this.logic.getState().phase !== 'prepare' ||
      this.battle.isTurnSpawnAnimating() ||
      this.battle.isSpecialTurnAnimating() ||
      this.battle.isPrepareUltimateBusy()
    ) {
      this.battle.cancelLaunchAimSweep();
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
      phaseCritBonus: this.logic.getPhaseCritBonus(),
      frostDebuff: false,
      frostDamageMult: 1,
    });
    this.logic.consumePhaseBuff();

    const payload = this.logic.beginLaunch(angle);
    if (!payload) {
      this.battle.cancelLaunchAimSweep();
      return;
    }

    this.control.hideBallsForLaunch();
    this.control.setInteractable(false);
    this.updateHud();

    this.updateHunterHud();
    this.battle.launchBallsSequential(
      payload.units,
      payload.aimAngleRad,
      state.mergeAttackBonusPercent,
      () => this.onCombatFinished(),
    );
  }

  private onCombatFinished() {
    const phase = this.logic.getState().phase;
    if (phase === 'settled') return;

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
        this.logic.onSpawnFinished(
          dmg,
          this.battle.getSpawnRowOrdinal(),
          this.battle.getBossesDefeated(),
        );
        this.control.restoreBallsAfterLaunch();
        if (this.logic.getState().phase === 'settled') {
          this.onRunSettled();
          this.syncPresentation();
          return;
        }
        this.battle.showLaunchCone();
        this.control.setInteractable(true);
        this.syncPresentation();
      });
    };

    if (shouldTriggerAirDrop(turn, this.battle.isBossActive())) {
      const variant = resolveAirDropVariant(turn);
      this.battle.startAirDropAnim(variant, finishSpawn);
    } else {
      this.battle.startTurnSpawnAnim(finishSpawn);
    }
  }

  private updateHud() {
    const state = this.logic.getState();
    this.wallText.text = `城墙 ${state.wallHp} / ${state.wallMaxHp}`;
    const rowOrdinal = this.battle.getSpawnRowOrdinal();
    const nextBoss = getNextBossSpawnOrdinal(this.battle.getBossesDefeated());
    const bossRowsLeft = Math.max(0, nextBoss - rowOrdinal);
    const bossTag = this.battle.isBossActive() ? ' · 首领战' : '';
    this.turnText.text = `回合 ${state.turn} · 波次 ${rowOrdinal}${bossTag}`;
    const growthStep = getMonsterGrowthStep(rowOrdinal);
    const hpMult = getMonsterHpMultiplier(growthStep);
    const multLabel = Number.isInteger(hpMult)
      ? String(hpMult)
      : hpMult.toFixed(1);
    this.bossCountdownText.text = `首领倒计行数：${bossRowsLeft} · 怪物档次：${growthStep} · 怪物倍率：${multLabel}×`;
    this.mergeAttackBonusText.text = `合成攻击 +${state.mergeAttackBonusPercent}%`;
    const autoTag =
      this.autoPlayEnabled && state.phase === 'prepare' ? ' · 自动' : '';
    const spawnTag =
      state.phase === 'spawn' && shouldTriggerAirDrop(state.turn, this.battle.isBossActive())
        ? ' · 空降'
        : '';
    const colors = state.runBallColors;
    if (colors?.length) {
      this.runBallEffectsText.text = formatRunBallEffectsLines(colors);
      this.runBallEffectsText.visible = true;
    } else {
      this.runBallEffectsText.text = '';
      this.runBallEffectsText.visible = false;
    }
    this.layoutLowerRightHud();

    this.phaseText.text =
      state.phase === 'settled'
        ? '阶段：结算'
        : state.phase === 'monster_group_draft'
          ? '阶段：怪物组四选一'
          : state.phase === 'draft'
            ? '阶段：球组三选一'
            : state.phase === 'rogue_skill_pick'
            ? '阶段：肉鸽选技能'
            : state.phase === 'super_rogue_pick'
            ? '阶段：超级肉鸽'
            : state.phase === 'prepare'
            ? `阶段：备战${autoTag}`
            : state.phase === 'spawn'
              ? `阶段：刷怪推进中…${spawnTag}`
              : '阶段：战斗中…';
  }
}
