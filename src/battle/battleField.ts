import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import type { LaunchBallUnit } from '../ballComposition';
import {
  BALL_GRAVITY,
  CRIT_DAMAGE_MULTIPLIER,
  getBallCombatStats,
} from '../config/ballStats';
import {
  WARRIOR_BIG_SPLIT_CHANCE,
  WARRIOR_BIG_SPLIT_COUNT,
  WARRIOR_SPLIT_ANGLE_SPREAD_DEG,
  WARRIOR_SPLIT_ATTACK_RATIO,
  WARRIOR_SPLIT_BOUNCES_RATIO,
  WARRIOR_SPLIT_CHANCE,
  WARRIOR_SPLIT_COUNT,
  WARRIOR_SPLIT_SIZE_RATIO,
} from '../config/ballSkills';
import { getBattleBallRadius } from '../config/gameBalance';
import {
  getMonsterType,
  type MonsterTypeId,
} from '../config/monsterTable';
import {
  BLOCK_COLS,
  BLOCK_ROWS,
  BALL_LAUNCH_INTERVAL,
  BLOCK_HIT_FLASH_DURATION,
  POISON_FLASH_DURATION,
  CLAW_FLASH_DURATION,
  INITIAL_SPAWN_ROWS,
  ROW_SPAWN_ANIM_STEP_SEC,
} from '../config/gameBalance';
import {
  battleGridRowTopY,
  battleLaunchLocalY,
  battleSpawnLineLocalY,
  layout,
  MONSTER_SIZE,
  BATTLE_WIDTH,
  BATTLE_HEIGHT,
} from '../layout';
import {
  collectMonstersOnPenetratingLine,
  planHunterVolley,
  pickRandomPointInBattle,
  type HunterVolleyPlan,
} from '../logic/hunterPierce';
import {
  HUNTER_PIERCE_LINE_HALF_WIDTH,
  HUNTER_VOLLEY_INTERVAL_SEC,
} from '../config/ballSkills';
import { pickLightningChainTargets } from '../logic/shamanChain';
import { getMonsterGrowthStep } from '../config/monsterScaling';
import { getMonsterTip } from '../config/monsterTips';
import { applyAirDrop, type AirDropVariant } from './airdropLogic';
import {
  AIRDROP_FALL_DURATION_SEC,
  AIRDROP_FALL_START_OFFSET,
  AIRDROP_STAGGER_SEC,
} from '../config/airdrop';
import { resolveCircleAABB } from './ballCollision';
import { BallEntity } from './ballEntity';
import { LaunchCone } from './launchCone';
import { sfxBlockHit, sfxWallBounce } from '../audio/collisionSfx';
import { sfxAirdropLand, sfxSpawnRowPush } from '../audio/worldSfx';
import {
  sfxAnnihilate,
  sfxArrowRainHit,
  sfxAssassinAmbush,
  sfxBossCrush,
  sfxDruidClaw,
  sfxHunterStack,
  sfxJudgmentStart,
  sfxJudgmentWave,
  sfxKnightCross,
  sfxMageArcane,
  sfxShamanChain,
  sfxSpecialDetonate,
  sfxSpecialHeal,
  sfxSpecialJump,
  sfxSpecialSpawn,
  sfxUltimateFrost,
  sfxUltimatePhase,
  sfxWarlockPoisonApply,
  sfxWarlockPoisonTick,
  sfxWarriorSplit,
} from '../audio/skillSfx';
import {
  createMonsterInstance,
  isAnchorCell,
  type BlockMonster,
} from './monster';
import {
  ANNIHILATE_DESTROY_BALL_CHANCE,
  REBIRTH_GRAY_BASE_HP,
  getSpecialMonsterDef,
  isSpecialMonsterType,
} from '../config/specialMonsters';
import { SpecialMonsterRuntime } from './specialMonsterRuntime';
import { isBallFrontHitTowardWall } from './shieldBallHit';
import {
  MONSTER_BIRTH_DURATION,
  startMonsterBirthAnim,
  tickMonsterBirthAnim,
  type MonsterBirthAnim,
} from './monsterBirthAnim';
import {
  planAndApplySpecialMonsterTurn,
  type SpecialEnemyAction,
} from './specialMonsterTurnEnd';
import { MonsterTooltip } from './monsterTooltip';
import {
  canPlaceFootprint,
  collectUniqueMonsters,
  getFootprintAabb,
  placeFootprintPartial,
} from './monsterFootprint';
import {
  createEmptyGrid,
  damageBlock,
  fillRowsFromSpawn,
  killMonsterOnGrid,
  pushGridOneRow,
  resolveTurnSpawnRowCount,
  type MonsterGrid,
} from './monsterGrid';
import type { MonsterSnapshot } from '../logic/types';
import type { SpawnSessionState } from './monsterSpawnLogic';
import {
  BLOCK_CORNER_RADIUS,
  createShakeState,
  drawMonsterBlock,
  extendHitShake,
  MONSTER_HP_TEXT_FILL,
  MONSTER_HP_TEXT_INSET,
  MONSTER_HP_TEXT_STROKE,
  MONSTER_HP_TEXT_STROKE_WIDTH,
  createSlimeUvGlow,
  updateMonsterShake,
  type MonsterShakeState,
} from './blockHitFeedback';
import {
  createMonsterSlimeSprite,
  createSlimeIdleState,
  notifySlimeHit,
  placeMonsterSlimeSprite,
  slimeIdleKeyForType,
  slimeIdleTextureAtPhase,
  tickSlimeIdle,
  type SlimeIdleState,
} from '../game/monsterTextures';
import { DamagePopupLayer, type PopupStyle } from './damagePopup';
import { SkillVfxLayer } from './skillVfx';
import { UltimateVfxLayer } from './ultimateVfx';
import {
  FROST_DAMAGE_RATIO,
  FROST_DAMAGE_TAKEN_MULT,
  JUDGMENT_DAMAGE_RATIO,
  PHASE_CRIT_BONUS,
  PHASE_EXTRA_BOUNCES,
  PHASE_SPEED_MULT,
} from '../config/ultimateSkills';
import { CombatSessionState } from '../logic/combatSession';
import {
  DRUID_CLAW_DAMAGE_RATIO,
  WARLOCK_POISON_HEAVY_STACKS,
} from '../config/ballSkills';
import {
  getMageArcaneRadius,
  knightCrossDamage,
  mageArcaneDamage,
  rollDruidClawProc,
  rollHitDamage,
  rollKnightCrossProc,
  rollMageArcaneProc,
  rollShamanChainProc,
  shamanChainBaseDamage,
} from '../logic/skillResolver';

const LAUNCH_X = BATTLE_WIDTH / 2;
const LAUNCH_Y = battleLaunchLocalY();
/** 砖块逻辑顶行（黄线） */
const BATTLE_TOP_LINE_Y = battleGridRowTopY(0);
const SPAWN_LINE_LOCAL_Y = battleSpawnLineLocalY();
const POISON_TICK_STAGGER_SEC = 0.045;
const SPECIAL_LINE_SEC = 0.22;
const SPECIAL_JUMP_SEC = 0.36;
const SPECIAL_ACTION_GAP_SEC = 0.05;

interface BlockView {
  root: Container;
  shakeBody: Container;
  idleSprite: Sprite | null;
  slimeGlow: Container | null;
  slimeIdle: SlimeIdleState | null;
  hpText: Text;
  flashOverlay: Graphics;
  frostOverlay: Graphics | null;
  poisonBadgeBg: Graphics | null;
  poisonBadgeText: Text | null;
  flashTime: number;
  flashDuration: number;
  flashPoison: boolean;
  flashClaw: boolean;
  shake: MonsterShakeState;
  anchorRow: number;
  anchorCol: number;
}

interface TurnSpawnAnim {
  stepsLeft: number;
  stepTime: number;
  wallHits: BlockMonster[];
  onComplete: (wallHits: BlockMonster[]) => void;
}

interface AirDropFallState {
  age: number;
}

interface AirDropAnim {
  fallQueue: string[];
  nextRelease: number;
  activeFalls: Map<string, AirDropFallState>;
  staggerTimer: number;
  onComplete: (wallHits: BlockMonster[]) => void;
}

interface JumpAnimState {
  age: number;
  duration: number;
  fromY: number;
  toY: number;
}

interface SpecialTurnPlayback {
  actions: SpecialEnemyAction[];
  index: number;
  phase: 'line' | 'wait' | 'gap';
  timer: number;
  wallHits: BlockMonster[];
  onComplete: (wallHits: BlockMonster[]) => void;
}

export class BattleField extends Container {
  private grid: MonsterGrid = createEmptyGrid();
  private readonly blockLayer = new Container();
  private readonly coneLayer = new Container();
  private readonly fxLayer = new DamagePopupLayer();
  private readonly skillVfx = new SkillVfxLayer();
  private readonly ballLayer = new Container();
  private readonly monsterTooltip = new MonsterTooltip();
  private readonly tipDismissLayer = new Graphics();
  readonly combatSession = new CombatSessionState();
  private readonly launchCone: LaunchCone;
  private onMonsterKill: ((monster: BlockMonster) => void) | null = null;
  private onBossDefeated: (() => void) | null = null;
  private readonly blockViews = new Map<string, BlockView>();
  private balls: BallEntity[] = [];
  private combatActive = false;
  private onCombatEnd: (() => void) | null = null;
  private launchQueue: LaunchBallUnit[] = [];
  private launchCooldown = 0;
  private launchConeDismissed = false;
  private spawnState: SpawnSessionState = {
    spawnRowOrdinal: 0,
    bossActive: false,
    bossesDefeated: 0,
    specialTypeIds: [],
  };
  private runMonsterGroupSpecialIds: MonsterTypeId[] = [];
  private readonly specialRuntime = new SpecialMonsterRuntime();
  private battleClock = 0;
  private turnSpawnAnim: TurnSpawnAnim | null = null;
  private airdropAnim: AirDropAnim | null = null;
  private specialTurnPlayback: SpecialTurnPlayback | null = null;
  private readonly jumpAnims = new Map<string, JumpAnimState>();
  private readonly birthAnims = new Map<string, MonsterBirthAnim>();
  private spawnSlideOffsetY = 0;
  private readonly monsterFallOffsetY = new Map<string, number>();
  private onHunterCountChange: (() => void) | null = null;
  private triggerScreenShake: ((sec: number, mag: number) => void) | null = null;
  private hunterVolleyPlayback: {
    volleysLeft: number;
    stagger: number;
  } | null = null;
  private pendingHunterVolley: HunterVolleyPlan | null = null;
  private poisonTickPlayback: {
    instanceIds: string[];
    nextIndex: number;
    stagger: number;
  } | null = null;
  private readonly ultimateVfx = new UltimateVfxLayer();
  private judgmentPlayback: {
    wavesLeft: number;
    damage: number;
    stagger: number;
  } | null = null;
  private phaseBuffActive = false;
  private mergeAttackBonusPercent = 0;
  private frostDamageMult = 1;
  private onUltimateDamage: ((amount: number) => void) | null = null;
  private onUltimateCollision: (() => void) | null = null;
  private onUltimateKill: (() => void) | null = null;
  private ultimateChargeSuppress = 0;
  private judgmentOnComplete: (() => void) | null = null;

  constructor() {
    super();
    this.position.set(layout.battle.x, layout.battle.y);
    this.launchCone = new LaunchCone(LAUNCH_X, LAUNCH_Y);
    this.tipDismissLayer.rect(0, 0, BATTLE_WIDTH, BATTLE_HEIGHT);
    this.tipDismissLayer.fill({ color: 0x000000, alpha: 0.001 });
    this.tipDismissLayer.visible = false;
    this.tipDismissLayer.eventMode = 'none';
    this.tipDismissLayer.on('pointertap', () => this.hideMonsterTip());
    this.addChild(this.tipDismissLayer);
    this.addChild(this.blockLayer);
    this.coneLayer.addChild(this.launchCone);
    this.addChild(this.coneLayer);
    this.addChild(this.fxLayer);
    this.addChild(this.skillVfx);
    this.addChild(this.ultimateVfx);
    this.addChild(this.ballLayer);
    this.addChild(this.monsterTooltip);
    this.initBattle();
    this.showLaunchCone();
  }

  setRunMonsterGroupConfig(specialTypeIds: readonly MonsterTypeId[]) {
    this.runMonsterGroupSpecialIds = [...specialTypeIds];
  }

  initBattle() {
    this.grid = createEmptyGrid();
    this.spawnState = {
      spawnRowOrdinal: 0,
      bossActive: false,
    bossesDefeated: 0,
      specialTypeIds: [...this.runMonsterGroupSpecialIds],
    };
    const savedSpecials = this.spawnState.specialTypeIds;
    this.spawnState.specialTypeIds = [];
    fillRowsFromSpawn(this.grid, INITIAL_SPAWN_ROWS, this.spawnState);
    this.spawnState.specialTypeIds = savedSpecials;
    this.refreshBlocks();
    this.initSpecialRuntimeForGrid();
  }

  private initSpecialRuntimeForGrid(): void {
    for (const m of collectUniqueMonsters(this.grid)) {
      if (isSpecialMonsterType(m.typeId)) {
        this.specialRuntime.onMonsterSpawned(m.instanceId, m.typeId);
      }
    }
  }

  /** 回合末：敌人特殊怪行动（带动画），完成后回调撞墙列表 */
  runSpecialMonstersEndOfTurn(
    onComplete: (wallHits: BlockMonster[]) => void,
  ): void {
    const { actions, wallHits } = planAndApplySpecialMonsterTurn(
      this.grid,
      this.specialRuntime,
      this.combatSession,
      this.spawnState.spawnRowOrdinal,
    );

    this.refreshBlocks();
    for (const m of collectUniqueMonsters(this.grid)) {
      this.updateMonsterHp(m);
      this.updatePoisonBadge(m.instanceId);
    }
    this.hidePendingSpawnViews(actions);

    if (actions.length === 0) {
      onComplete(wallHits);
      return;
    }

    this.specialTurnPlayback = {
      actions,
      index: 0,
      phase: 'line',
      timer: 0,
      wallHits,
      onComplete,
    };
    this.beginSpecialTurnAction();
  }

  isSpecialTurnAnimating(): boolean {
    return this.specialTurnPlayback !== null;
  }

  showLaunchCone() {
    this.launchConeDismissed = false;
    this.launchCone.showStatic();
  }

  /** 按住发射键：扇形开始摆动 */
  beginLaunchAimSweep() {
    if (this.launchConeDismissed) return;
    this.launchCone.startSweeping();
  }

  /** 未发射（条件不满足等）：扇形回到固定瞄准 */
  cancelLaunchAimSweep() {
    if (this.launchConeDismissed) return;
    this.launchCone.stopSweepingToStatic();
  }

  /** 备战阶段瞄准扇形当前指向（松开发射时读取） */
  getLaunchAimAngle(): number {
    return this.launchCone.getAimAngle();
  }

  hideLaunchCone() {
    this.launchCone.hide();
  }

  /** 胜负后重开：清空战斗动画与战场（不触发 onCombatEnd） */
  resetForNewRun(): void {
    this.abortCombat();
    this.hunterVolleyPlayback = null;
    this.pendingHunterVolley = null;
    this.poisonTickPlayback = null;
    this.clearUltimateRoundState();
    this.combatSession.reset();
    this.onCombatEnd = null;
    this.turnSpawnAnim = null;
    this.airdropAnim = null;
    this.specialTurnPlayback = null;
    this.judgmentPlayback = null;
    this.judgmentOnComplete = null;
    this.hunterVolleyPlayback = null;
    this.pendingHunterVolley = null;
    this.poisonTickPlayback = null;
    this.jumpAnims.clear();
    this.birthAnims.clear();
    this.monsterFallOffsetY.clear();
    this.spawnSlideOffsetY = 0;
    this.skillVfx.clear();
    this.ultimateVfx.clear();
    this.fxLayer.clear();
    this.hideMonsterTip();
    this.runMonsterGroupSpecialIds = [];
    this.initBattle();
    this.hideLaunchCone();
  }

  setOnMonsterKill(handler: (monster: BlockMonster) => void) {
    this.onMonsterKill = handler;
  }

  setOnBossDefeated(handler: () => void) {
    this.onBossDefeated = handler;
  }

  setOnHunterCountChange(handler: () => void) {
    this.onHunterCountChange = handler;
  }

  setScreenShakeTrigger(handler: (sec: number, mag: number) => void) {
    this.triggerScreenShake = handler;
  }

  setUltimateChargeHandlers(handlers: {
    onDamage?: (amount: number) => void;
    onCollision?: () => void;
    onKill?: () => void;
  }) {
    this.onUltimateDamage = handlers.onDamage ?? null;
    this.onUltimateCollision = handlers.onCollision ?? null;
    this.onUltimateKill = handlers.onKill ?? null;
  }

  isPrepareUltimateBusy(): boolean {
    return this.judgmentPlayback !== null;
  }

  private pushUltimateChargeSuppress() {
    this.ultimateChargeSuppress++;
  }

  private popUltimateChargeSuppress() {
    this.ultimateChargeSuppress = Math.max(0, this.ultimateChargeSuppress - 1);
  }

  /** 备战立刻发动末日审判，期间不计入充能 */
  startJudgmentImmediate(
    attackSum: number,
    waveCount: number,
    onComplete?: () => void,
  ) {
    if (attackSum <= 0) {
      onComplete?.();
      return;
    }
    const waveDmg = Math.max(
      1,
      Math.round(attackSum * JUDGMENT_DAMAGE_RATIO),
    );
    this.pushUltimateChargeSuppress();
    this.judgmentOnComplete = onComplete ?? null;
    this.judgmentPlayback = {
      wavesLeft: Math.max(1, waveCount),
      damage: waveDmg,
      stagger: 0.05,
    };
    this.ultimateVfx.startMeteorShower();
    sfxJudgmentStart();
  }

  /** 备战发动相位空间：立刻显示特效，战斗回合发射后生效 */
  startPreparePhaseBuff() {
    this.ultimateVfx.startPhaseSpace();
    sfxUltimatePhase();
  }

  /** 备战发动冻狱：立刻全场伤害 + 暴雪与蓝罩，不计入充能 */
  applyFrostUltimateStrike(attackSum: number, damageTakenMult: number) {
    const dmg = Math.max(1, Math.round(attackSum * FROST_DAMAGE_RATIO));
    this.pushUltimateChargeSuppress();
    this.frostDamageMult = damageTakenMult;
    this.ultimateVfx.startBlizzard();
    sfxUltimateFrost();
    for (const m of collectUniqueMonsters(this.grid)) {
      if (m.hp <= 0) continue;
      const { x, y } = this.monsterCenter(m);
      this.fxLayer.spawn(x, y, dmg, 'normal');
      this.applyFrozenToMonster(m);
      this.damageMonster(m, dmg, false);
    }
    this.popUltimateChargeSuppress();
  }

  private phaseCritBonus = PHASE_CRIT_BONUS;

  configureCombatUltimates(opts: {
    judgment: boolean;
    attackSum: number;
    phaseBuff: boolean;
    phaseCritBonus?: number;
    frostDebuff: boolean;
    frostDamageMult?: number;
  }) {
    this.phaseBuffActive = opts.phaseBuff;
    this.phaseCritBonus = opts.phaseCritBonus ?? PHASE_CRIT_BONUS;
    if (opts.phaseBuff) {
      this.ultimateVfx.startPhaseSpace();
    }
    if (opts.frostDebuff) {
      this.frostDamageMult = opts.frostDamageMult ?? FROST_DAMAGE_TAKEN_MULT;
      this.ultimateVfx.startBlizzard();
      for (const m of collectUniqueMonsters(this.grid)) {
        if (m.hp > 0) {
          const found = this.findMonsterByInstanceId(m.instanceId);
          if (found) this.applyFrozenToMonster(found);
        }
      }
    }
  }

  private applyFrozenToMonster(monster: BlockMonster): void {
    this.specialRuntime.setFrozen(monster.instanceId, true);
    this.setFrostOverlay(monster.instanceId, true);
  }

  clearUltimateRoundState() {
    this.judgmentPlayback = null;
    this.phaseBuffActive = false;
    this.phaseCritBonus = PHASE_CRIT_BONUS;
    this.frostDamageMult = 1;
    this.ultimateVfx.stopPhaseSpace();
    this.ultimateVfx.stopBlizzard();
    this.ultimateVfx.clear();
    for (const [id, view] of this.blockViews) {
      this.setFrostOverlayOnView(view, this.findMonsterByInstanceId(id), false);
    }
  }

  getHunterRainLayers(): number {
    return this.combatSession.hunterRainLayers;
  }

  /** 导出战场怪物快照（逻辑层瞄准等） */
  getMonsterSnapshots(): MonsterSnapshot[] {
    return collectUniqueMonsters(this.grid).map((m) => ({
      instanceId: m.instanceId,
      typeId: m.typeId,
      hp: m.hp,
      anchorRow: m.anchorRow,
      anchorCol: m.anchorCol,
      footprintW: m.footprintW,
      footprintH: m.footprintH,
    }));
  }

  /** 强制中止战斗（重开等）；不触发 onCombatEnd */
  abortCombat() {
    this.combatActive = false;
    this.launchQueue = [];
    this.launchCooldown = 0;
    this.onCombatEnd = null;
    this.launchCone.hide();
    for (const b of this.balls) b.removeFromDisplay();
    this.balls = [];
    this.ballLayer.removeChildren();
  }

  /** 仅由控制区槽位 collectLaunchUnits 填入 */
  launchBallsSequential(
    units: LaunchBallUnit[],
    aimAngleRad: number,
    mergeAttackBonusPercent: number,
    onEnd: () => void,
  ) {
    if (this.combatActive || units.length === 0) return;
    this.mergeAttackBonusPercent = mergeAttackBonusPercent;
    this.launchConeDismissed = false;
    this.launchCone.freezeAtAngle(aimAngleRad);
    this.combatActive = true;
    this.combatSession.reset();
    this.onCombatEnd = onEnd;
    this.launchQueue = [...units];
    this.launchCooldown = 0;
    this.spawnBallFromQueue();
  }

  update(dt: number) {
    this.battleClock += dt;
    this.launchCone.update(dt);
    this.fxLayer.update(dt);
    this.skillVfx.update(dt);
    this.ultimateVfx.update(dt);
    this.updateJudgmentWaves(dt);
    this.updatePoisonTicks(dt);
    this.updateHunterVolley(dt);
    this.updateBlockFlashes(dt);
    this.updateBlockShakes(dt);
    this.updateJumpAnims(dt);
    this.updateBirthAnims(dt);
    this.updateSlimeIdleAnims(dt);
    this.updateSpecialTurnPlayback(dt);
    this.updateTurnSpawnAnim(dt);
    this.updateAirDropAnim(dt);
    if (!this.combatActive) return;

    if (this.launchQueue.length > 0) {
      this.launchCooldown += dt;
      while (this.launchCooldown >= BALL_LAUNCH_INTERVAL && this.launchQueue.length > 0) {
        this.launchCooldown -= BALL_LAUNCH_INTERVAL;
        this.spawnBallFromQueue();
      }
    }

    if (!this.launchConeDismissed && this.launchQueue.length === 0) {
      this.launchCone.hideAfterLaunch();
      this.launchConeDismissed = true;
    }

    for (const ball of [...this.balls]) {
      if (!ball.alive) continue;
      this.simulateBall(ball, dt);
    }

    this.purgeDeadBalls();

    if (
      this.launchQueue.length === 0 &&
      !this.hasActiveSlotBalls() &&
      !this.hunterVolleyPlayback &&
      !this.poisonTickPlayback
    ) {
      this.beginEndCombatSequence();
    }
  }

  /** 自定义碰撞：分步位移 + 圆与 AABB 分离，避免嵌入 */
  private simulateBall(ball: BallEntity, dt: number) {
    const speed = Math.hypot(ball.vx, ball.vy);
    const maxStep = ball.radius * 0.45;
    const steps = Math.max(1, Math.ceil((speed * dt) / maxStep));
    const subDt = dt / steps;

    const bounds = {
      left: ball.radius,
      right: BATTLE_WIDTH - ball.radius,
      top: ball.radius,
    };

    for (let s = 0; s < steps; s++) {
      if (!ball.alive) return;

      ball.vy += BALL_GRAVITY * subDt;

      let nx = ball.x + ball.vx * subDt;
      let ny = ball.y + ball.vy * subDt;

      const spawnClampY = SPAWN_LINE_LOCAL_Y - ball.radius;
      if (ny > spawnClampY) ny = spawnClampY;

      if (nx < bounds.left) {
        nx = bounds.left;
        ball.vx = Math.abs(ball.vx);
        ball.x = nx;
        ball.y = ny;
        sfxWallBounce(ball.vx, ball.vy);
        if (this.afterBounce(ball)) return;
      } else if (nx > bounds.right) {
        nx = bounds.right;
        ball.vx = -Math.abs(ball.vx);
        ball.x = nx;
        ball.y = ny;
        sfxWallBounce(ball.vx, ball.vy);
        if (this.afterBounce(ball)) return;
      }

      if (
        !ball.clearedTopLine &&
        (ball.y >= BATTLE_TOP_LINE_Y || ny >= BATTLE_TOP_LINE_Y)
      ) {
        ball.clearedTopLine = true;
      }

      const yellowCeilingY = BATTLE_TOP_LINE_Y + ball.radius;
      if (
        ball.clearedTopLine &&
        ball.vy < 0 &&
        ny < yellowCeilingY
      ) {
        ny = yellowCeilingY;
        ball.vy = Math.abs(ball.vy);
        ball.x = nx;
        ball.y = ny;
        sfxWallBounce(ball.vx, ball.vy);
        if (this.afterBounce(ball)) return;
      }

      for (let guard = 0; guard < 5; guard++) {
        const blockHit = this.findDeepestBlockHit(nx, ny, ball.radius);
        if (!blockHit) break;

        const { monster, left, top, right, bottom, row, col } = blockHit;
        const popupX = (left + right) / 2;
        const popupY = (top + bottom) / 2;
        const impactX = Math.max(left, Math.min(nx, right));
        const impactY = Math.max(top, Math.min(ny, bottom));

        this.applyBallHit(
          ball,
          monster,
          row,
          col,
          popupX,
          popupY,
          impactX,
          impactY,
        );

        const sep = resolveCircleAABB(nx, ny, ball.radius, ball.vx, ball.vy, left, top, right, bottom);
        nx = sep.x;
        ny = sep.y;
        ball.vx = sep.vx;
        ball.vy = sep.vy;
        ball.x = nx;
        ball.y = ny;
        if (sep.hit) sfxBlockHit(ball.vx, ball.vy);
        if (this.afterBounce(ball)) return;
      }

      if (!ball.alive) return;

      ball.x = nx;
      ball.y = ny;

      if (ball.y >= spawnClampY - 0.5) {
        this.purgeBall(ball);
        return;
      }
    }

    if (ball.alive) ball.syncView();
  }

  private hasActiveSlotBalls(): boolean {
    return this.balls.some((b) => b.alive);
  }

  private afterBounce(ball: BallEntity): boolean {
    this.onUltimateCollision?.();
    if (ball.color === 'green' && !ball.isTemporary) {
      if (this.combatSession.tryAddHunterRainLayer(ball.isBig)) {
        sfxHunterStack();
        this.onHunterCountChange?.();
      }
    }
    if (ball.onCollision()) {
      this.purgeBall(ball);
      return true;
    }
    if (ball.canSplit && ball.color === 'brown') {
      if (ball.isBig) {
        if (this.tryWarriorBigSplit(ball)) sfxWarriorSplit();
      } else if (this.tryWarriorSplit(ball)) {
        sfxWarriorSplit();
      }
    }
    return false;
  }

  private applyBallHit(
    ball: BallEntity,
    monster: BlockMonster,
    row: number,
    col: number,
    popupX: number,
    popupY: number,
    impactX: number,
    impactY: number,
  ) {
    if (
      getSpecialMonsterDef(monster.typeId)?.kind === 'annihilate' &&
      Math.random() < ANNIHILATE_DESTROY_BALL_CHANCE
    ) {
      this.fxLayer.spawnSkillText(popupX, popupY, '湮灭!', 0xce93d8);
      sfxAnnihilate();
      this.purgeBall(ball);
      return;
    }

    const hit = rollHitDamage(
      {
        color: ball.color,
        isBig: ball.isBig,
        attack: ball.attack,
        baseCritRate: ball.critRate,
        baseCritMult: ball.critDamageMult,
        monsterInstanceId: monster.instanceId,
        monsterTypeId: monster.typeId,
      },
      this.combatSession,
    );

    let popupStyle: PopupStyle = 'normal';
    if (hit.isCrit) popupStyle = 'crit';
    if (hit.assassinAmbush) {
      popupStyle = hit.assassinEliteAmbush ? 'assassinElite' : 'assassin';
      this.skillVfx.spawnAssassinFlash(popupX, popupY, hit.assassinEliteAmbush);
      sfxAssassinAmbush(hit.assassinEliteAmbush);
      this.triggerScreenShake?.(
        hit.assassinEliteAmbush ? 0.26 : 0.2,
        hit.assassinEliteAmbush ? 14 : 11,
      );
    }

    let damage = hit.damage;
    if (
      getSpecialMonsterDef(monster.typeId)?.kind === 'shield' &&
      isBallFrontHitTowardWall(monster, impactX, impactY, ball.vy)
    ) {
      damage = 1;
    }

    this.flashMonster(monster);
    this.fxLayer.spawn(popupX, popupY, damage, popupStyle);
    this.damageMonster(monster, damage);

    if (ball.color === 'purple') {
      const stacks = this.combatSession.addWarlockPoison(
        monster.instanceId,
        ball.isBig,
      );
      this.updatePoisonBadge(monster.instanceId, stacks);
      sfxWarlockPoisonApply();
    }
    if (ball.color === 'blue' && rollMageArcaneProc()) {
      this.procMageArcane(ball, impactX, impactY);
    }
    if (ball.color === 'pink' && rollKnightCrossProc()) {
      this.procKnightCross(ball, row, col);
    }
    if (ball.color === 'navy' && rollShamanChainProc()) {
      this.procShamanChain(ball, monster, hit.damage);
    }
    if (ball.color === 'orange' && rollDruidClawProc(ball.isBig)) {
      this.procDruidClaw(ball);
    }
  }

  private dealBallDamage(
    ball: BallEntity,
    monster: BlockMonster,
    popupX: number,
    popupY: number,
    baseDamage: number,
  ) {
    const hit = rollHitDamage(
      {
        color: ball.color,
        isBig: ball.isBig,
        attack: baseDamage,
        baseCritRate: ball.critRate,
        baseCritMult: ball.critDamageMult,
        monsterInstanceId: monster.instanceId,
        monsterTypeId: monster.typeId,
      },
      this.combatSession,
    );

    let popupStyle: PopupStyle = hit.isCrit ? 'crit' : 'normal';
    if (hit.assassinAmbush) {
      popupStyle = hit.assassinEliteAmbush ? 'assassinElite' : 'assassin';
      this.skillVfx.spawnAssassinFlash(popupX, popupY, hit.assassinEliteAmbush);
      this.triggerScreenShake?.(
        hit.assassinEliteAmbush ? 0.26 : 0.2,
        hit.assassinEliteAmbush ? 14 : 11,
      );
    }

    this.flashMonster(monster);
    this.fxLayer.spawn(popupX, popupY, hit.damage, popupStyle);
    this.damageMonster(monster, hit.damage);
  }

  private dealWarlockPoisonDamage(monster: BlockMonster, popupX: number, popupY: number) {
    const base = this.combatSession.warlockPoisonTickBaseDamage(monster.instanceId);
    if (base <= 0) return;

    const stacks = this.combatSession.getWarlockPoisonStacks(monster.instanceId);
    const hit = rollHitDamage(
      {
        color: 'purple',
        isBig: false,
        attack: base,
        baseCritRate: this.combatSession.warlockCritRate,
        baseCritMult: this.combatSession.warlockCritMult,
        monsterInstanceId: monster.instanceId,
        monsterTypeId: monster.typeId,
      },
      this.combatSession,
    );

    const popupStyle: PopupStyle =
      stacks >= WARLOCK_POISON_HEAVY_STACKS ? 'poisonHeavy' : 'poison';

    this.skillVfx.spawnPoisonBurst(popupX, popupY);
    sfxWarlockPoisonTick();
    this.flashMonsterPoison(monster);
    this.fxLayer.spawn(popupX, popupY, hit.damage, popupStyle);
    this.damageMonster(monster, hit.damage);
  }

  private monsterCenter(monster: BlockMonster): { x: number; y: number } {
    const { left, top, right, bottom } = getFootprintAabb(monster);
    return { x: (left + right) / 2, y: (top + bottom) / 2 };
  }

  private procShamanChain(
    ball: BallEntity,
    primary: BlockMonster,
    mainHitDamage: number,
  ) {
    const living = collectUniqueMonsters(this.grid).filter((m) => m.hp > 0);
    const extras = pickLightningChainTargets(
      living,
      primary.instanceId,
      3,
    );
    if (extras.length === 0) return;

    const chainPoints = [
      this.monsterCenter(primary),
      ...extras.map((m) => this.monsterCenter(m)),
    ];
    this.skillVfx.spawnLightningChain(chainPoints);
    sfxShamanChain();

    const chainBase = shamanChainBaseDamage(mainHitDamage);
    for (const target of extras) {
      const { x, y } = this.monsterCenter(target);
      this.dealBallDamage(ball, target, x, y, chainBase);
    }
  }

  private findNearestMonsterToWall(): BlockMonster | null {
    const living = collectUniqueMonsters(this.grid).filter((m) => m.hp > 0);
    if (living.length === 0) return null;
    return living.reduce((best, m) => {
      if (m.anchorRow < best.anchorRow) return m;
      if (m.anchorRow > best.anchorRow) return best;
      return m.anchorCol < best.anchorCol ? m : best;
    });
  }

  private procDruidClaw(ball: BallEntity) {
    const target = this.findNearestMonsterToWall();
    if (!target) return;

    const { x, y } = this.monsterCenter(target);
    this.skillVfx.spawnColorLine(ball.x, ball.y, x, y, 0x55ff77);
    this.skillVfx.spawnDruidClaw(ball.x, ball.y, x, y);
    sfxDruidClaw(ball.isBig);
    this.triggerScreenShake?.(ball.isBig ? 0.17 : 0.12, ball.isBig ? 10 : 7);
    const base = Math.max(
      1,
      Math.round(this.combatSession.druidSmallAttack * DRUID_CLAW_DAMAGE_RATIO),
    );
    this.dealDruidClawDamage(ball, target, x, y, base);
  }

  private dealDruidClawDamage(
    ball: BallEntity,
    monster: BlockMonster,
    popupX: number,
    popupY: number,
    baseDamage: number,
  ) {
    const hit = rollHitDamage(
      {
        color: 'orange',
        isBig: ball.isBig,
        attack: baseDamage,
        baseCritRate: this.combatSession.druidCritRate,
        baseCritMult: this.combatSession.druidCritMult,
        monsterInstanceId: monster.instanceId,
        monsterTypeId: monster.typeId,
      },
      this.combatSession,
    );
    const popupStyle: PopupStyle = hit.isCrit ? 'crit' : 'claw';
    this.flashMonsterClaw(monster);
    this.fxLayer.spawn(popupX, popupY, hit.damage, popupStyle);
    this.damageMonster(monster, hit.damage);
  }

  private damageMonster(
    monster: BlockMonster,
    damage: number,
    reportUltimate = true,
  ) {
    const cap = this.specialRuntime.invincibleDamageCap(monster.instanceId);
    const base = damage;
    const final =
      cap !== null
        ? cap
        : Math.max(1, Math.round(base * this.frostDamageMult));
    if (reportUltimate && this.ultimateChargeSuppress === 0) {
      this.onUltimateDamage?.(final);
    }
    if (damageBlock(monster, final)) {
      this.handleMonsterDestroyed(monster);
    } else {
      this.updateMonsterHp(monster);
    }
  }

  /** 魔爆以球体与砖块的碰撞点为圆心（非砖块中心） */
  private procMageArcane(ball: BallEntity, impactX: number, impactY: number) {
    const dmg = mageArcaneDamage(ball.attack);
    const radius = getMageArcaneRadius(ball.isBig);
    this.skillVfx.spawnArcaneExplosion(impactX, impactY, radius);
    sfxMageArcane(ball.isBig);
    this.triggerScreenShake?.(
      ball.isBig ? 0.32 : 0.22,
      ball.isBig ? 18 : 12,
    );
    for (const m of this.collectMonstersInRadius(impactX, impactY, radius)) {
      const { x, y } = this.monsterCenter(m);
      this.dealBallDamage(ball, m, x, y, dmg);
    }
  }

  private procKnightCross(ball: BallEntity, row: number, col: number) {
    const dmg = knightCrossDamage(ball.attack, ball.isBig);
    this.skillVfx.spawnKnightCross(row, col, ball.isBig);
    sfxKnightCross(ball.isBig);
    for (const m of this.collectMonstersOnCross(row, col)) {
      const { x, y } = this.monsterCenter(m);
      this.dealBallDamage(ball, m, x, y, dmg);
    }
  }

  private collectMonstersInRadius(cx: number, cy: number, r: number) {
    const r2 = r * r;
    const seen = new Set<string>();
    const list: BlockMonster[] = [];
    for (const m of collectUniqueMonsters(this.grid)) {
      if (seen.has(m.instanceId)) continue;
      const { left, top, right, bottom } = getFootprintAabb(m);
      const mx = (left + right) / 2;
      const my = (top + bottom) / 2;
      if ((mx - cx) ** 2 + (my - cy) ** 2 <= r2) {
        seen.add(m.instanceId);
        list.push(m);
      }
    }
    return list;
  }

  private collectMonstersOnCross(row: number, col: number) {
    const seen = new Set<string>();
    const list: BlockMonster[] = [];
    for (let r = 0; r < BLOCK_ROWS; r++) {
      for (let c = 0; c < BLOCK_COLS; c++) {
        if (r !== row && c !== col) continue;
        const m = this.grid[r]![c];
        if (!m || seen.has(m.instanceId)) continue;
        seen.add(m.instanceId);
        list.push(m);
      }
    }
    return list;
  }

  private tryWarriorBigSplit(parent: BallEntity): boolean {
    if (!parent.canSplit || !parent.alive) return false;
    if (Math.random() >= WARRIOR_BIG_SPLIT_CHANCE) return false;
    const speed = Math.hypot(parent.vx, parent.vy);
    if (speed < 1) return false;
    const baseAngle = Math.atan2(parent.vy, parent.vx);
    const spreadRad = (WARRIOR_SPLIT_ANGLE_SPREAD_DEG * Math.PI) / 180;
    const childRadius = getBattleBallRadius(false);
    const remaining = Math.max(0, parent.maxBounces - parent.bounces);
    const childAttack = Math.max(
      1,
      Math.round(parent.attack * WARRIOR_SPLIT_ATTACK_RATIO),
    );

    for (let i = 0; i < WARRIOR_BIG_SPLIT_COUNT; i++) {
      const offset = (Math.random() * 2 - 1) * spreadRad;
      const angle = baseAngle + offset;
      const child = new BallEntity(
        parent.color,
        false,
        parent.x,
        parent.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        childAttack,
        remaining,
        parent.critRate,
        parent.critDamageMult,
        {
          radius: childRadius,
          isTemporary: true,
          clearedTopLine: true,
          canSplit: false,
        },
      );
      this.balls.push(child);
      this.ballLayer.addChild(child.view);
    }
    return true;
  }

  private tryWarriorSplit(parent: BallEntity): boolean {
    if (!parent.canSplit || !parent.alive) return false;
    if (Math.random() >= WARRIOR_SPLIT_CHANCE) return false;
    const speed = Math.hypot(parent.vx, parent.vy);
    if (speed < 1) return false;
    const baseAngle = Math.atan2(parent.vy, parent.vx);
    const spreadRad = (WARRIOR_SPLIT_ANGLE_SPREAD_DEG * Math.PI) / 180;
    const childRadius = Math.max(5, parent.radius * WARRIOR_SPLIT_SIZE_RATIO);
    const childAttack = Math.max(1, Math.round(parent.attack * WARRIOR_SPLIT_ATTACK_RATIO));
    const remaining = Math.max(0, parent.maxBounces - parent.bounces);
    const childMaxBounces = Math.max(1, Math.floor(remaining * WARRIOR_SPLIT_BOUNCES_RATIO));

    for (let i = 0; i < WARRIOR_SPLIT_COUNT; i++) {
      const offset = (Math.random() * 2 - 1) * spreadRad;
      const angle = baseAngle + offset;
      const child = new BallEntity(
        parent.color,
        parent.isBig,
        parent.x,
        parent.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        childAttack,
        childMaxBounces,
        parent.critRate,
        parent.critDamageMult,
        {
          radius: childRadius,
          isTemporary: true,
          clearedTopLine: true,
        },
      );
      this.balls.push(child);
      this.ballLayer.addChild(child.view);
    }
    return true;
  }

  private beginEndCombatSequence() {
    if (this.shouldResolvePoisonTicks()) {
      this.beginPoisonTickSequence();
      return;
    }
    this.beginHunterVolleyOrFinish();
  }

  private shouldResolvePoisonTicks(): boolean {
    if (!this.combatSession.hasPoisonToResolve()) return false;
    return collectUniqueMonsters(this.grid).some(
      (m) =>
        m.hp > 0 && this.combatSession.getWarlockPoisonStacks(m.instanceId) > 0,
    );
  }

  private beginPoisonTickSequence() {
    const instanceIds = collectUniqueMonsters(this.grid)
      .filter(
        (m) =>
          m.hp > 0 && this.combatSession.getWarlockPoisonStacks(m.instanceId) > 0,
      )
      .map((m) => m.instanceId);

    if (instanceIds.length === 0) {
      this.beginHunterVolleyOrFinish();
      return;
    }

    this.poisonTickPlayback = { instanceIds, nextIndex: 0, stagger: 0 };
    this.launchNextPoisonTick();
  }

  private launchNextPoisonTick() {
    if (this.abortPoisonIfAllDead()) return;

    const pb = this.poisonTickPlayback;
    if (!pb || pb.nextIndex >= pb.instanceIds.length) {
      this.poisonTickPlayback = null;
      this.beginHunterVolleyOrFinish();
      return;
    }

    const id = pb.instanceIds[pb.nextIndex]!;
    pb.nextIndex++;
    const monster = this.findMonsterByInstanceId(id);
    if (monster && monster.hp > 0) {
      const { x, y } = this.monsterCenter(monster);
      this.dealWarlockPoisonDamage(monster, x, y);
    }
    if (this.abortPoisonIfAllDead()) return;
    pb.stagger = POISON_TICK_STAGGER_SEC;
  }

  private abortPoisonIfAllDead(): boolean {
    if (this.hasLivingMonsters()) return false;
    this.poisonTickPlayback = null;
    this.hunterVolleyPlayback = null;
    this.pendingHunterVolley = null;
    this.skillVfx.cancelFlyingArrow();
    this.skillVfx.cancelHunterVolley();
    this.finishCombat();
    return true;
  }

  private updatePoisonTicks(dt: number) {
    const pb = this.poisonTickPlayback;
    if (!pb) return;

    if (this.abortPoisonIfAllDead()) return;

    pb.stagger -= dt;
    if (pb.stagger > 0) return;

    if (pb.nextIndex >= pb.instanceIds.length) {
      this.poisonTickPlayback = null;
      this.beginHunterVolleyOrFinish();
      return;
    }

    this.launchNextPoisonTick();
  }

  private beginHunterVolleyOrFinish() {
    const volleys = this.combatSession.consumeHunterVolleys();
    if (volleys <= 0) {
      this.finishCombat();
      return;
    }

    this.hunterVolleyPlayback = { volleysLeft: volleys, stagger: 0 };
    this.fireNextHunterVolley();
  }

  private hasLivingMonsters(): boolean {
    return collectUniqueMonsters(this.grid).some((m) => m.hp > 0);
  }

  private fireNextHunterVolley() {
    const pb = this.hunterVolleyPlayback;
    if (!pb || pb.volleysLeft <= 0) return;

    pb.volleysLeft--;

    const monsters = collectUniqueMonsters(this.grid);
    const target = pickRandomPointInBattle(
      monsters,
      BATTLE_WIDTH,
      BATTLE_HEIGHT,
    );
    const extendLen = Math.hypot(BATTLE_WIDTH, BATTLE_HEIGHT) * 1.25;
    const plan = planHunterVolley(
      LAUNCH_X,
      LAUNCH_Y,
      target.x,
      target.y,
      extendLen,
    );
    this.pendingHunterVolley = plan;

    for (const line of plan.lines) {
      this.skillVfx.spawnColorLine(
        plan.originX,
        plan.originY,
        line.endX,
        line.endY,
        0x5a9a00,
      );
    }

    this.skillVfx.spawnHunterVolley(
      plan.originX,
      plan.originY,
      plan.lines.map((l) => ({ toX: l.targetX, toY: l.targetY })),
    );
  }

  private applyPendingHunterVolley() {
    const plan = this.pendingHunterVolley;
    this.pendingHunterVolley = null;
    if (!plan) return;

    const damage = this.combatSession.getHunterPierceArrowDamage();
    const extendLen = Math.hypot(BATTLE_WIDTH, BATTLE_HEIGHT) * 1.25;

    for (const line of plan.lines) {
      const hits = collectMonstersOnPenetratingLine(
        this.grid,
        plan.originX,
        plan.originY,
        line.targetX,
        line.targetY,
        extendLen,
        HUNTER_PIERCE_LINE_HALF_WIDTH,
      );
      for (const m of hits) {
        if (m.hp <= 0) continue;
        const { x, y } = this.monsterCenter(m);
        this.dealHunterPierceDamage(m, x, y, damage);
      }
    }
  }

  private dealHunterPierceDamage(
    monster: BlockMonster,
    popupX: number,
    popupY: number,
    damage: number,
  ) {
    this.flashMonster(monster);
    sfxArrowRainHit();
    this.fxLayer.spawn(popupX, popupY, damage, 'normal');
    this.damageMonster(monster, damage);
  }

  private updateHunterVolley(dt: number) {
    const pb = this.hunterVolleyPlayback;
    if (!pb && !this.skillVfx.isHunterVolleyFlying()) return;

    if (this.skillVfx.isHunterVolleyFlying()) {
      if (this.skillVfx.updateHunterVolley(dt)) {
        this.applyPendingHunterVolley();
        if (pb) pb.stagger = HUNTER_VOLLEY_INTERVAL_SEC;
      }
      return;
    }

    if (!pb) return;

    if (pb.volleysLeft > 0) {
      pb.stagger -= dt;
      if (pb.stagger > 0) return;
      this.fireNextHunterVolley();
      return;
    }

    this.hunterVolleyPlayback = null;
    this.finishCombat();
  }

  private findMonsterByInstanceId(id: string): BlockMonster | null {
    for (const m of collectUniqueMonsters(this.grid)) {
      if (m.instanceId === id) return m;
    }
    return null;
  }

  private handleMonsterDestroyed(monster: BlockMonster) {
    const rebirthAnchor =
      getSpecialMonsterDef(monster.typeId)?.kind === 'rebirth'
        ? { row: monster.anchorRow, col: monster.anchorCol }
        : null;

    this.combatSession.clearWarlockPoison(monster.instanceId);
    this.specialRuntime.remove(monster.instanceId);
    killMonsterOnGrid(this.grid, monster);
    this.removeMonsterView(monster);

    if (rebirthAnchor) {
      this.spawnRebirthGrayAt(rebirthAnchor.row, rebirthAnchor.col);
    }

    if (monster.typeId === 'boss') {
      this.spawnState.bossActive = false;
      this.spawnState.bossesDefeated += 1;
      this.onBossDefeated?.();
    }

    this.onMonsterKill?.(monster);
    if (this.ultimateChargeSuppress === 0) this.onUltimateKill?.();
  }

  private spawnRebirthGrayAt(anchorRow: number, anchorCol: number): void {
    if (!canPlaceFootprint(this.grid, anchorRow, anchorCol, 1, 1)) return;
    const growthStep = getMonsterGrowthStep(this.spawnState.spawnRowOrdinal);
    const gray = createMonsterInstance(
      'normal',
      anchorRow,
      anchorCol,
      growthStep,
      REBIRTH_GRAY_BASE_HP,
    );
    if (placeFootprintPartial(this.grid, gray) <= 0) return;
    this.createBlockView(gray);
    this.startSpawnBirthAnim(gray.instanceId);
  }

  private finishJudgmentPlayback() {
    this.judgmentPlayback = null;
    this.popUltimateChargeSuppress();
    const done = this.judgmentOnComplete;
    this.judgmentOnComplete = null;
    done?.();
  }

  private updateJudgmentWaves(dt: number) {
    const jb = this.judgmentPlayback;
    if (!jb) return;

    jb.stagger -= dt;
    if (jb.stagger > 0) return;

    if (jb.wavesLeft <= 0) {
      this.finishJudgmentPlayback();
      return;
    }

    jb.wavesLeft--;
    jb.stagger = 0.28;
    sfxJudgmentWave();

    for (const m of collectUniqueMonsters(this.grid)) {
      if (m.hp <= 0) continue;
      const { x, y } = this.monsterCenter(m);
      this.fxLayer.spawn(x, y, jb.damage, 'normal');
      this.damageMonster(m, jb.damage, false);
    }
    this.triggerScreenShake?.(0.22, 12);
  }

  isBossActive(): boolean {
    return this.spawnState.bossActive;
  }

  /** @deprecated 使用 isBossActive */
  isBossSpawned(): boolean {
    return this.isBossActive();
  }

  getBossesDefeated(): number {
    return this.spawnState.bossesDefeated;
  }

  /** 本局累计刷出行序号（首领战期间暂停增长） */
  getSpawnRowOrdinal(): number {
    return this.spawnState.spawnRowOrdinal;
  }

  /** 空降波：不推进，按扫描顺序依次从高空落下 */
  startAirDropAnim(
    variant: AirDropVariant,
    onComplete: (wallHits: BlockMonster[]) => void,
  ) {
    const growthStep = getMonsterGrowthStep(this.spawnState.spawnRowOrdinal);
    const result = applyAirDrop(this.grid, variant, growthStep);
    this.grid = result.grid;
    this.monsterFallOffsetY.clear();

    const sorted = this.sortAirdropPlaced(result.placed);
    const fallQueue = sorted.map((m) => m.instanceId);

    for (const id of fallQueue) {
      this.monsterFallOffsetY.set(id, -AIRDROP_FALL_START_OFFSET);
    }
    this.refreshBlocks();
    for (const id of fallQueue) {
      const view = this.blockViews.get(id);
      if (view) view.root.alpha = 0;
    }
    this.syncBlockSlideOffset();

    this.airdropAnim = {
      fallQueue,
      nextRelease: 0,
      activeFalls: new Map(),
      staggerTimer: 0,
      onComplete,
    };
  }

  /** 随机：左→右或右→左，均从上到下 */
  private sortAirdropPlaced(placed: BlockMonster[]): BlockMonster[] {
    const ltr = Math.random() < 0.5;
    return [...placed].sort((a, b) => {
      if (a.anchorRow !== b.anchorRow) return a.anchorRow - b.anchorRow;
      return ltr ? a.anchorCol - b.anchorCol : b.anchorCol - a.anchorCol;
    });
  }

  /** 从底线逐行推进刷怪，动画结束后回调（含撞墙砖列表） */
  startTurnSpawnAnim(onComplete: (wallHits: BlockMonster[]) => void) {
    const rowCount = resolveTurnSpawnRowCount(this.grid, this.spawnState);
    if (rowCount <= 0) {
      onComplete([]);
      return;
    }
    this.turnSpawnAnim = {
      stepsLeft: rowCount,
      stepTime: 0,
      wallHits: [],
      onComplete,
    };
    this.beginTurnSpawnStep();
  }

  isTurnSpawnAnimating(): boolean {
    return (
      this.turnSpawnAnim !== null ||
      this.airdropAnim !== null ||
      this.specialTurnPlayback !== null
    );
  }

  private beginTurnSpawnStep() {
    sfxSpawnRowPush();
    const result = pushGridOneRow(this.grid, { ...this.spawnState });
    this.grid = result.grid;
    this.spawnState.spawnRowOrdinal = result.spawnRowOrdinal;
    this.spawnState.bossActive = result.bossActive;
    for (const hit of result.wallHits) {
      const { x, y } = this.monsterCenter(hit);
      this.playWallDetonateExplosion(x, y);
    }
    for (const crushed of result.bossCrushed) {
      this.combatSession.clearWarlockPoison(crushed.instanceId);
      this.specialRuntime.remove(crushed.instanceId);
      const { x, y } = this.monsterCenter(crushed);
      this.playWallDetonateExplosion(x, y, 0.9);
      sfxBossCrush();
    }
    this.turnSpawnAnim!.wallHits.push(...result.wallHits);
    this.refreshBlocks();
    this.spawnSlideOffsetY = MONSTER_SIZE;
    this.turnSpawnAnim!.stepTime = 0;
    this.syncBlockSlideOffset();
  }

  private updateTurnSpawnAnim(dt: number) {
    const anim = this.turnSpawnAnim;
    if (!anim) return;

    anim.stepTime += dt;
    const t = Math.min(1, anim.stepTime / ROW_SPAWN_ANIM_STEP_SEC);
    const eased = 1 - (1 - t) ** 3;
    this.spawnSlideOffsetY = (1 - eased) * MONSTER_SIZE;
    this.syncBlockSlideOffset();

    if (t < 1) return;

    anim.stepsLeft--;
    if (anim.stepsLeft > 0 && !this.spawnState.bossActive) {
      this.beginTurnSpawnStep();
      return;
    }
    if (anim.stepsLeft > 0 && this.spawnState.bossActive) {
      anim.stepsLeft = 0;
    }

    this.spawnSlideOffsetY = 0;
    this.syncBlockSlideOffset();
    const hits = anim.wallHits;
    const done = anim.onComplete;
    this.turnSpawnAnim = null;
    done(hits);
  }

  private syncBlockSlideOffset() {
    for (const [id, view] of this.blockViews) {
      const extra =
        this.monsterFallOffsetY.get(id) ?? this.spawnSlideOffsetY;
      view.root.y = battleGridRowTopY(view.anchorRow) + extra;
    }
  }

  private updateAirDropAnim(dt: number) {
    const anim = this.airdropAnim;
    if (!anim) return;

    anim.staggerTimer += dt;
    while (
      anim.nextRelease < anim.fallQueue.length &&
      anim.staggerTimer >= AIRDROP_STAGGER_SEC
    ) {
      anim.staggerTimer -= AIRDROP_STAGGER_SEC;
      const id = anim.fallQueue[anim.nextRelease]!;
      anim.nextRelease++;
      anim.activeFalls.set(id, { age: 0 });
      const view = this.blockViews.get(id);
      if (view) view.root.alpha = 1;
    }

    const finished: string[] = [];
    for (const [id, fall] of anim.activeFalls) {
      fall.age += dt;
      const t = Math.min(1, fall.age / AIRDROP_FALL_DURATION_SEC);
      const eased = 1 - (1 - t) ** 3;
      this.monsterFallOffsetY.set(
        id,
        -AIRDROP_FALL_START_OFFSET * (1 - eased),
      );
      if (t >= 1) finished.push(id);
    }

    for (const id of finished) {
      anim.activeFalls.delete(id);
      this.monsterFallOffsetY.delete(id);
      const monster = this.findMonsterByInstanceId(id);
      const variant =
        monster?.typeId === 'airdrop_red' ? 'airdrop_red' : 'airdrop_blue';
      sfxAirdropLand(variant);
    }
    this.syncBlockSlideOffset();

    const allReleased = anim.nextRelease >= anim.fallQueue.length;
    if (allReleased && anim.activeFalls.size === 0) {
      const done = anim.onComplete;
      this.airdropAnim = null;
      done([]);
    }
  }

  private spawnBallFromQueue() {
    const unit = this.launchQueue.shift();
    if (!unit) return;

    const stats = getBallCombatStats(
      unit.color,
      unit.isBig,
      this.mergeAttackBonusPercent,
    );
    const angle = this.launchCone.randomLaunchAngle();
    const speed = stats.speed;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    let maxBounces = stats.maxBounces;
    let critRate = stats.critRate;
    let speedMult = 1;
    if (this.phaseBuffActive) {
      maxBounces += PHASE_EXTRA_BOUNCES;
      critRate = Math.min(1, critRate + this.phaseCritBonus);
      speedMult = PHASE_SPEED_MULT;
    }

    const ball = new BallEntity(
      unit.color,
      unit.isBig,
      LAUNCH_X,
      LAUNCH_Y,
      vx * speedMult,
      vy * speedMult,
      stats.attack,
      maxBounces,
      critRate,
      CRIT_DAMAGE_MULTIPLIER,
    );
    const smallStats = getBallCombatStats(
      unit.color,
      false,
      this.mergeAttackBonusPercent,
    );
    if (unit.color === 'green') {
      this.combatSession.registerHunterBall(smallStats.attack);
    }
    if (unit.color === 'purple') {
      this.combatSession.registerWarlockBall(smallStats.attack, smallStats.critRate);
    }
    if (unit.color === 'orange') {
      this.combatSession.registerDruidBall(smallStats.attack, smallStats.critRate);
    }

    this.balls.push(ball);
    this.ballLayer.addChild(ball.view);
  }

  private findDeepestBlockHit(cx: number, cy: number, r: number) {
    let best: {
      monster: BlockMonster;
      left: number;
      top: number;
      right: number;
      bottom: number;
      row: number;
      col: number;
      depth: number;
    } | null = null;

    for (const monster of collectUniqueMonsters(this.grid)) {
      const { left, top, right, bottom } = getFootprintAabb(monster);
      const sep = resolveCircleAABB(cx, cy, r, 0, 0, left, top, right, bottom);
      if (!sep.hit) continue;
      const depth = Math.hypot(cx - sep.x, cy - sep.y);
      if (!best || depth > best.depth) {
        const mx = (left + right) / 2;
        const my = (top + bottom) / 2;
        const row = Math.min(
          BLOCK_ROWS - 1,
          Math.max(
            0,
            Math.floor((my - battleGridRowTopY(0)) / MONSTER_SIZE),
          ),
        );
        const col = Math.min(
          BLOCK_COLS - 1,
          Math.max(0, Math.floor(mx / MONSTER_SIZE)),
        );
        best = { monster, left, top, right, bottom, row, col, depth };
      }
    }
    return best;
  }

  private purgeBall(ball: BallEntity) {
    const i = this.balls.indexOf(ball);
    if (i >= 0) this.balls.splice(i, 1);
    ball.removeFromDisplay();
  }

  private purgeDeadBalls() {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i]!;
      if (!ball.alive) {
        ball.removeFromDisplay();
        this.balls.splice(i, 1);
      }
    }
  }

  private finishCombat() {
    this.combatActive = false;
    this.hunterVolleyPlayback = null;
    this.pendingHunterVolley = null;
    this.poisonTickPlayback = null;
    this.clearUltimateRoundState();
    this.combatSession.reset();
    this.onHunterCountChange?.();
    this.launchQueue = [];
    this.launchCooldown = 0;
    this.launchConeDismissed = false;
    this.launchCone.hide();
    for (const b of this.balls) b.removeFromDisplay();
    this.balls = [];
    this.ballLayer.removeChildren();
    this.onCombatEnd?.();
    this.onCombatEnd = null;
  }

  private hideMonsterTip(): void {
    this.monsterTooltip.hide();
    this.tipDismissLayer.visible = false;
    this.tipDismissLayer.eventMode = 'none';
  }

  private syncTipDismissLayer(): void {
    const on = this.monsterTooltip.isShowing();
    this.tipDismissLayer.visible = on;
    this.tipDismissLayer.eventMode = on ? 'static' : 'none';
  }

  private refreshBlocks() {
    this.hideMonsterTip();
    for (const [, v] of this.blockViews) v.root.destroy();
    this.blockViews.clear();
    this.blockLayer.removeChildren();

    for (let r = 0; r < BLOCK_ROWS; r++) {
      for (let c = 0; c < BLOCK_COLS; c++) {
        const m = this.grid[r]![c];
        if (m && isAnchorCell(m, r, c)) this.createBlockView(m);
      }
    }
  }

  private createBlockView(m: BlockMonster) {
    const typeRow = getMonsterType(m.typeId);
    const root = new Container();
    root.position.set(
      m.anchorCol * MONSTER_SIZE,
      battleGridRowTopY(m.anchorRow),
    );

    const w = m.footprintW * MONSTER_SIZE;
    const h = m.footprintH * MONSTER_SIZE;
    const strokeW = m.typeId === 'boss' ? 3 : 2;

    root.eventMode = 'static';
    root.cursor = 'help';
    root.hitArea = new Rectangle(0, 0, w, h);
    root.on('pointertap', (e) => {
      e.stopPropagation();
      const tip = getMonsterTip(m.typeId);
      const extra =
        this.monsterFallOffsetY.get(m.instanceId) ?? this.spawnSlideOffsetY;
      this.monsterTooltip.toggle(
        tip,
        m.instanceId,
        root.x + w / 2,
        root.y + h / 2 + extra,
        h,
      );
      this.syncTipDismissLayer();
    });

    const shakeBody = new Container();
    root.addChild(shakeBody);

    const g = new Graphics();
    drawMonsterBlock(
      g,
      w,
      h,
      m.typeId,
      typeRow.fillColor,
      typeRow.strokeColor,
      strokeW,
    );
    shakeBody.addChild(g);

    let idleSprite: Sprite | null = null;
    let slimeGlow: Container | null = null;
    let slimeIdle: SlimeIdleState | null = null;
    const slimeSpr = createMonsterSlimeSprite(m.typeId);
    if (slimeSpr) {
      const key = slimeIdleKeyForType(m.typeId);
      if (key) {
        slimeIdle = createSlimeIdleState(key);
        idleSprite = slimeSpr;
        const { displayW, displayH } = placeMonsterSlimeSprite(
          slimeSpr,
          m.typeId,
          w,
          h,
        );
        if (m.typeId === 'elite' || m.typeId === 'boss') {
          const glow = createSlimeUvGlow(m.typeId, displayW, displayH);
          glow.position.copyFrom(slimeSpr.position);
          shakeBody.addChild(glow);
          slimeGlow = glow;
        }
        shakeBody.addChild(slimeSpr);
      }
    }

    const flashOverlay = new Graphics();
    const pad = 2;
    flashOverlay.roundRect(pad, pad, w - pad * 2, h - pad * 2, BLOCK_CORNER_RADIUS);
    flashOverlay.fill({ color: 0xffffff, alpha: 0.92 });
    flashOverlay.visible = false;
    shakeBody.addChild(flashOverlay);

    const fontSize =
      m.typeId === 'boss'
        ? 28
        : m.typeId === 'elite'
          ? 24
          : m.typeId === 'airdrop_blue' || m.typeId === 'airdrop_red'
            ? 20
            : 22;
    const hpText = new Text({
      text: String(m.hp),
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize,
        fill: MONSTER_HP_TEXT_FILL,
        fontWeight: 'bold',
        stroke: {
          color: MONSTER_HP_TEXT_STROKE,
          width: MONSTER_HP_TEXT_STROKE_WIDTH,
          join: 'round',
        },
      },
    });
    hpText.anchor.set(1, 1);
    hpText.position.set(w - MONSTER_HP_TEXT_INSET, h - MONSTER_HP_TEXT_INSET);
    shakeBody.addChild(hpText);

    this.blockLayer.addChild(root);
    const view: BlockView = {
      root,
      shakeBody,
      idleSprite,
      slimeGlow,
      slimeIdle,
      hpText,
      flashOverlay,
      frostOverlay: null,
      poisonBadgeBg: null,
      poisonBadgeText: null,
      flashTime: 0,
      flashDuration: BLOCK_HIT_FLASH_DURATION,
      flashPoison: false,
      flashClaw: false,
      shake: createShakeState(),
      anchorRow: m.anchorRow,
      anchorCol: m.anchorCol,
    };
    this.blockViews.set(m.instanceId, view);
    if (isSpecialMonsterType(m.typeId)) {
      this.specialRuntime.onMonsterSpawned(m.instanceId, m.typeId);
    }
    this.updatePoisonBadge(m.instanceId);
    root.y =
      battleGridRowTopY(m.anchorRow) +
      (this.monsterFallOffsetY.get(m.instanceId) ?? this.spawnSlideOffsetY);
  }

  private setFrostOverlay(instanceId: string, on: boolean) {
    const view = this.blockViews.get(instanceId);
    const monster = this.findMonsterByInstanceId(instanceId);
    if (!view) return;
    this.setFrostOverlayOnView(view, monster, on);
  }

  private setFrostOverlayOnView(
    view: BlockView,
    monster: BlockMonster | null,
    on: boolean,
  ) {
    if (!on) {
      view.frostOverlay?.destroy();
      view.frostOverlay = null;
      return;
    }

    if (!monster || view.frostOverlay) return;
    const w = monster.footprintW * MONSTER_SIZE;
    const h = monster.footprintH * MONSTER_SIZE;
    const pad = 2;
    const overlay = new Graphics();
    overlay.roundRect(pad, pad, w - pad * 2, h - pad * 2, BLOCK_CORNER_RADIUS);
    overlay.fill({ color: 0x4488ff, alpha: 0.38 });
    overlay.stroke({ width: 2, color: 0xaaeeff, alpha: 0.65 });
    view.shakeBody.addChild(overlay);
    view.frostOverlay = overlay;
  }

  private updatePoisonBadge(instanceId: string, stacksOverride?: number) {
    const view = this.blockViews.get(instanceId);
    const monster = this.findMonsterByInstanceId(instanceId);
    if (!view || !monster) return;

    const stacks =
      stacksOverride ?? this.combatSession.getWarlockPoisonStacks(instanceId);
    const w = monster.footprintW * MONSTER_SIZE;

    if (stacks <= 0) {
      view.poisonBadgeBg?.destroy();
      view.poisonBadgeText?.destroy();
      view.poisonBadgeBg = null;
      view.poisonBadgeText = null;
      return;
    }

    if (!view.poisonBadgeBg || !view.poisonBadgeText) {
      const bg = new Graphics();
      const label = new Text({
        text: '',
        style: {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: 13,
          fill: 0xffffff,
          fontWeight: 'bold',
          stroke: { color: 0x000000, width: 1, join: 'round' },
        },
      });
      label.anchor.set(0.5);
      label.position.set(w - 10, 10);
      bg.position.set(w - 10, 10);
      view.shakeBody.addChild(bg, label);
      view.poisonBadgeBg = bg;
      view.poisonBadgeText = label;
    }

    const r = 11;
    view.poisonBadgeBg.clear();
    view.poisonBadgeBg.circle(0, 0, r);
    view.poisonBadgeBg.fill({ color: 0x9b59b6, alpha: 0.95 });
    view.poisonBadgeBg.stroke({ width: 1.5, color: 0xda70d6, alpha: 0.95 });
    view.poisonBadgeText.text = stacks > 99 ? '99+' : String(stacks);
  }

  private flashOverlayFootprint(
    view: BlockView,
    fillColor: number,
    fillAlpha: number,
  ): void {
    const w = (view.root.hitArea as Rectangle).width;
    const h = (view.root.hitArea as Rectangle).height;
    const pad = 2;
    view.flashOverlay.clear();
    view.flashOverlay.roundRect(pad, pad, w - pad * 2, h - pad * 2, BLOCK_CORNER_RADIUS);
    view.flashOverlay.fill({ color: fillColor, alpha: fillAlpha });
    view.flashOverlay.tint = 0xffffff;
  }

  private flashMonster(monster: BlockMonster) {
    const view = this.blockViews.get(monster.instanceId);
    if (!view) return;
    view.flashPoison = false;
    view.flashClaw = false;
    this.flashOverlayFootprint(view, 0xffffff, 0.92);
    view.flashTime = BLOCK_HIT_FLASH_DURATION;
    view.flashDuration = BLOCK_HIT_FLASH_DURATION;
    view.flashOverlay.visible = true;
    view.flashOverlay.alpha = 1;
    extendHitShake(view.shake, this.battleClock);
    this.notifySlimeHitView(view);
  }

  /** 德鲁伊爪击：整块 footprint 绿色闪烁 */
  private flashMonsterClaw(monster: BlockMonster) {
    const view = this.blockViews.get(monster.instanceId);
    if (!view) return;
    view.flashClaw = true;
    view.flashPoison = false;
    this.flashOverlayFootprint(view, 0x55ee66, 0.9);
    view.flashTime = CLAW_FLASH_DURATION;
    view.flashDuration = CLAW_FLASH_DURATION;
    view.flashOverlay.visible = true;
    view.flashOverlay.alpha = 0.95;
    extendHitShake(view.shake, this.battleClock);
    this.notifySlimeHitView(view);
  }

  /** 术士毒发：整块 footprint 紫色闪烁 */
  private flashMonsterPoison(monster: BlockMonster) {
    const view = this.blockViews.get(monster.instanceId);
    if (!view) return;
    view.flashPoison = true;
    view.flashClaw = false;
    this.flashOverlayFootprint(view, 0xcc66ff, 0.88);
    view.flashTime = POISON_FLASH_DURATION;
    view.flashDuration = POISON_FLASH_DURATION;
    view.flashOverlay.visible = true;
    view.flashOverlay.alpha = 0.95;
    extendHitShake(view.shake, this.battleClock);
    this.notifySlimeHitView(view);
  }

  private notifySlimeHitView(view: BlockView): void {
    if (view.slimeIdle) notifySlimeHit(view.slimeIdle);
  }

  private updateBlockFlashes(dt: number) {
    for (const view of this.blockViews.values()) {
      if (view.flashTime <= 0) continue;
      view.flashTime -= dt;
      if (view.flashTime <= 0) {
        view.flashOverlay.visible = false;
        if (view.flashPoison || view.flashClaw) {
          view.flashPoison = false;
          view.flashClaw = false;
          this.flashOverlayFootprint(view, 0xffffff, 0.92);
        }
        continue;
      }
      const dur = view.flashDuration > 0 ? view.flashDuration : BLOCK_HIT_FLASH_DURATION;
      const t = view.flashTime / dur;
      view.flashOverlay.alpha =
        view.flashPoison || view.flashClaw
          ? 0.35 + 0.6 * Math.sin(t * Math.PI)
          : t;
    }
  }

  private updateBlockShakes(dt: number) {
    const now = this.battleClock;
    for (const view of this.blockViews.values()) {
      updateMonsterShake(view.shake, view.shakeBody, now, dt);
    }
  }

  private updateMonsterHp(monster: BlockMonster) {
    const view = this.blockViews.get(monster.instanceId);
    if (view) view.hpText.text = String(monster.hp);
  }

  private removeMonsterView(monster: BlockMonster) {
    const view = this.blockViews.get(monster.instanceId);
    view?.root.destroy();
    this.blockViews.delete(monster.instanceId);
  }

  private hidePendingSpawnViews(actions: SpecialEnemyAction[]): void {
    for (const action of actions) {
      if (action.kind !== 'spawn') continue;
      const view = this.blockViews.get(action.spawnedId);
      if (view) view.root.visible = false;
    }
  }

  private playWallDetonateExplosion(x: number, y: number, scale = 1): void {
    this.skillVfx.spawnWallDetonateExplosion(x, y, scale);
    this.triggerScreenShake?.(0.38, 18 * scale);
  }

  private beginSpecialTurnAction(): void {
    const pb = this.specialTurnPlayback;
    if (!pb) return;

    const action = pb.actions[pb.index];
    if (!action) {
      this.finishSpecialTurnPlayback();
      return;
    }

    if (action.kind === 'heal') {
      sfxSpecialHeal();
      for (const t of action.targets) {
        this.skillVfx.spawnColorLine(
          action.fromX,
          action.fromY,
          t.x,
          t.y,
          action.color,
        );
      }
    } else if (action.kind === 'jump') {
      if (!action.detonate) {
        sfxSpecialJump();
        this.skillVfx.spawnColorLine(
          action.fromX,
          action.fromY,
          action.toX,
          action.toY,
          action.color,
        );
      }
    } else if (action.kind === 'spawn') {
      sfxSpecialSpawn();
      this.skillVfx.spawnColorLine(
        action.fromX,
        action.fromY,
        action.toX,
        action.toY,
        action.color,
      );
    } else if (action.kind === 'regen') {
      sfxSpecialHeal();
      this.skillVfx.spawnColorLine(
        action.fromX,
        action.fromY,
        action.toX,
        action.toY,
        action.color,
      );
    }

    pb.phase = 'line';
    pb.timer = action.kind === 'jump' && action.detonate ? 0 : SPECIAL_LINE_SEC;
    if (pb.timer <= 0) this.onSpecialTurnLineDone();
  }

  private onSpecialTurnLineDone(): void {
    const pb = this.specialTurnPlayback;
    if (!pb) return;

    const action = pb.actions[pb.index]!;

    if (action.kind === 'heal') {
      this.fxLayer.spawnSkillText(action.fromX, action.fromY, '治疗!', action.color);
      for (const t of action.targets) {
        this.fxLayer.spawn(t.x, t.y, t.amount, 'heal');
        const m = this.findMonsterByInstanceId(t.instanceId);
        if (m) this.updateMonsterHp(m);
      }
      pb.phase = 'wait';
      pb.timer = MONSTER_BIRTH_DURATION * 0.65;
      return;
    }

    if (action.kind === 'jump') {
      if (action.detonate) {
        sfxSpecialDetonate();
        this.playWallDetonateExplosion(action.fromX, action.fromY);
        pb.phase = 'wait';
        pb.timer = 0.45;
        return;
      }
      this.startJumpAnim(action);
      pb.phase = 'wait';
      pb.timer = SPECIAL_JUMP_SEC;
      return;
    }

    if (action.kind === 'spawn') {
      const src = this.findMonsterByInstanceId(action.sourceId);
      const sk = src ? getSpecialMonsterDef(src.typeId)?.kind : null;
      const label = sk === 'copy' ? '复制!' : '召唤!';
      this.fxLayer.spawnSkillText(action.toX, action.toY, label, action.color);
      this.startSpawnBirthAnim(action.spawnedId);
      pb.phase = 'wait';
      pb.timer = MONSTER_BIRTH_DURATION;
      return;
    }

    if (action.kind === 'regen') {
      this.fxLayer.spawnSkillText(action.toX, action.toY, '再生', action.color);
      this.fxLayer.spawn(action.toX, action.toY, action.amount, 'heal');
      const m = this.findMonsterByInstanceId(action.sourceId);
      if (m) this.updateMonsterHp(m);
      pb.phase = 'wait';
      pb.timer = MONSTER_BIRTH_DURATION * 0.65;
      return;
    }

    pb.phase = 'wait';
    pb.timer = 0;
  }

  private startJumpAnim(
    action: Extract<SpecialEnemyAction, { kind: 'jump' }>,
  ): void {
    const view = this.blockViews.get(action.sourceId);
    if (!view) return;

    const extra =
      this.monsterFallOffsetY.get(action.sourceId) ?? this.spawnSlideOffsetY;
    const fromY = battleGridRowTopY(action.fromRow) + extra;
    const toY = battleGridRowTopY(action.toRow) + extra;
    view.root.y = fromY;
    view.anchorRow = action.toRow;
    this.jumpAnims.set(action.sourceId, {
      age: 0,
      duration: SPECIAL_JUMP_SEC,
      fromY,
      toY,
    });
  }

  private startSpawnBirthAnim(instanceId: string): void {
    const view = this.blockViews.get(instanceId);
    const monster = this.findMonsterByInstanceId(instanceId);
    if (!view || !monster) return;
    view.root.visible = true;
    const w = monster.footprintW * MONSTER_SIZE;
    const h = monster.footprintH * MONSTER_SIZE;
    const anim = startMonsterBirthAnim(view.shakeBody, w, h);
    this.birthAnims.set(instanceId, anim);
  }

  private advanceSpecialTurnAction(): void {
    const pb = this.specialTurnPlayback;
    if (!pb) return;
    pb.index++;
    if (pb.index >= pb.actions.length) {
      this.finishSpecialTurnPlayback();
      return;
    }
    pb.phase = 'gap';
    pb.timer = SPECIAL_ACTION_GAP_SEC;
  }

  private finishSpecialTurnPlayback(): void {
    const pb = this.specialTurnPlayback;
    if (!pb) return;
    const hits = pb.wallHits;
    const done = pb.onComplete;
    this.specialTurnPlayback = null;
    done(hits);
  }

  private updateSpecialTurnPlayback(dt: number): void {
    const pb = this.specialTurnPlayback;
    if (!pb) return;

    if (pb.phase === 'gap') {
      pb.timer -= dt;
      if (pb.timer <= 0) this.beginSpecialTurnAction();
      return;
    }

    if (pb.phase === 'line') {
      pb.timer -= dt;
      if (pb.timer <= 0) this.onSpecialTurnLineDone();
      return;
    }

    if (pb.phase === 'wait') {
      pb.timer -= dt;
      if (pb.timer <= 0) this.advanceSpecialTurnAction();
    }
  }

  private updateJumpAnims(dt: number): void {
    for (const [id, anim] of this.jumpAnims) {
      anim.age += dt;
      const t = Math.min(1, anim.age / anim.duration);
      const eased = 1 - (1 - t) ** 3;
      const view = this.blockViews.get(id);
      if (view) {
        view.root.y = anim.fromY + (anim.toY - anim.fromY) * eased;
      }
      if (t >= 1) this.jumpAnims.delete(id);
    }
  }

  private updateBirthAnims(dt: number): void {
    for (const [id, anim] of this.birthAnims) {
      if (!tickMonsterBirthAnim(anim, dt)) {
        this.birthAnims.delete(id);
      }
    }
  }

  private updateSlimeIdleAnims(dt: number): void {
    for (const view of this.blockViews.values()) {
      const spr = view.idleSprite;
      const state = view.slimeIdle;
      if (!spr || !state) continue;
      tickSlimeIdle(state, dt);
      spr.texture = slimeIdleTextureAtPhase(
        state.slimeKey,
        state.phase,
        state.hitMode,
      );
      if (view.slimeGlow) {
        const pulse = 0.72 + 0.28 * Math.sin(state.phase * Math.PI * 2);
        view.slimeGlow.alpha = pulse;
      }
    }
  }

}
