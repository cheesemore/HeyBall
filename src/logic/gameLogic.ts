import { WALL_MAX_HP } from '../config/gameBalance';

import type { BallColor } from '../ballTypes';

import { goldForMonsterKill } from './rewards';

import type { MonsterTypeId } from '../config/monsterTable';

import {

  applyMerge,

  applyRecruit,

  collectLaunchUnitsFromSlots,

  createEmptyControlSlots,

} from './controlGrid';

import { createRunDraft } from './runDraft';
import {
  configFromOption,
  createMonsterGroupDraftOptions,
  type RunMonsterGroupConfig,
} from './monsterGroupDraft';

import type { RogueUpgradeId } from '../config/rogueUpgrades';
import { listAvailableRogueUpgrades } from '../config/rogueUpgrades';
import { MONSTER_GROUP_DIFFICULTIES } from '../config/monsterGroup';
import type { UltimateSkillId } from '../config/ultimateSkills';
import { ULTIMATE_SKILLS } from '../config/ultimateSkills';

import { trySpendRogueGold } from './rogueLogic';

import {
  addFrostCharge,
  addJudgmentCharge,
  addPhaseCharge,
  consumeUltimateCharge,
  createUltimateChargeState,
  isUltimateReady,
} from './ultimateCharge';
import {
  computeUltimateModifiers,
  getFrostDamageTakenMult,
  getJudgmentWaveCount,
  getPhaseCritBonus,
  type UltimateRunModifiers,
} from './ultimateModifiers';

import { BallTier } from '../ballTypes';
import type { SuperRogueCardId } from '../config/superRogueCards';
import { rollSuperRogueOptions } from './superRoguePick';
import type { GameState, LaunchPayload, MonsterSnapshot } from './types';



export type StateListener = (state: GameState) => void;



export function createInitialGameState(): GameState {

  return {

    phase: 'monster_group_draft',

    turn: 1,

    wallHp: WALL_MAX_HP,

    wallMaxHp: WALL_MAX_HP,

    gold: 0,

    recruitCount: 0,

    mergeAttackBonusPercent: 0,

    controlSlots: createEmptyControlSlots(),

    battleMonsters: [],

    draftOptions: [],

    runBallColors: null,

    monsterGroupDraftOptions: createMonsterGroupDraftOptions(),

    runMonsterGroup: null,

    roguePurchaseCount: 0,

    rogueUpgradeIds: [],

    ultimate: createUltimateChargeState(),

    phaseBuffPending: false,

    frostDebuffPending: false,

    judgmentPending: false,

    monstersKilled: 0,

    settlement: null,

    superRoguePicks: [],

    superRoguePickOptions: [],

  };

}



export class GameLogic {

  private state: GameState;

  private readonly listeners = new Set<StateListener>();



  constructor(initial?: GameState) {

    this.state = initial ?? createInitialGameState();

  }



  getState(): Readonly<GameState> {

    return this.state;

  }



  getRunPool(): readonly BallColor[] {

    return this.state.runBallColors ?? [];

  }



  subscribe(fn: StateListener): () => void {

    this.listeners.add(fn);

    return () => this.listeners.delete(fn);

  }



  private emit() {

    const snap = this.state;

    for (const fn of this.listeners) fn(snap);

  }



  private patch(partial: Partial<GameState>) {

    this.state = { ...this.state, ...partial };

    this.emit();

  }



  /** 怪物组三选一 → 进入球组三选一 */

  selectMonsterGroupOption(optionIndex: number): boolean {

    if (this.state.phase !== 'monster_group_draft') return false;

    const opt = this.state.monsterGroupDraftOptions[optionIndex];

    if (!opt) return false;

    const ballDraft = createRunDraft();

    this.patch({

      phase: 'draft',

      runMonsterGroup: configFromOption(opt),

      draftOptions: ballDraft.options,

      gold: MONSTER_GROUP_DIFFICULTIES[opt.difficulty].startingGold,

    });

    return true;

  }



  /** 球组三选一 → 进入备战 */

  selectDraftOption(optionIndex: number): boolean {

    if (this.state.phase !== 'draft') return false;

    const opt = this.state.draftOptions[optionIndex];

    if (!opt || opt.length === 0) return false;

    this.patch({

      phase: 'prepare',

      runBallColors: [...opt],

    });

    return true;

  }



  getRunMonsterGroupConfig(): RunMonsterGroupConfig {

    return (

      this.state.runMonsterGroup ?? {

        difficulty: 'easy',

        specialTypeIds: [],

      }

    );

  }



  syncBattleMonsters(monsters: MonsterSnapshot[]) {

    this.patch({ battleMonsters: monsters });

  }



  recordMonsterKill(): void {
    if (this.state.phase === 'settled') return;
    this.patch({ monstersKilled: this.state.monstersKilled + 1 });
  }

  addGold(amount: number) {

    this.patch({ gold: this.state.gold + amount });

  }



  tryRecruit(): number | null {

    if (this.state.phase !== 'prepare' || !this.state.runBallColors) return null;

    const result = applyRecruit(

      this.state.controlSlots,

      this.state.gold,

      this.state.runBallColors,

      this.state.recruitCount,

    );

    if (!result) return null;

    this.patch({
      controlSlots: result.slots,
      gold: result.gold,
      recruitCount: result.recruitCount,
    });

    return result.index;

  }



  tryMerge(from: number, to: number): BallTier | null {

    if (this.state.phase !== 'prepare' || !this.state.runBallColors) return null;

    const result = applyMerge(

      this.state.controlSlots,

      from,

      to,

      this.state.runBallColors,

    );

    if (!result) return null;

    this.patch({
      controlSlots: result.slots,
      mergeAttackBonusPercent:
        this.state.mergeAttackBonusPercent + result.attackBonusPercentAdd,
    });

    return result.merged.tier;

  }

  beginSuperRoguePick(): void {
    if (this.state.phase !== 'prepare' || !this.state.runBallColors) return;
    const options = rollSuperRogueOptions(
      this.state.runBallColors,
      this.state.superRoguePicks,
    );
    if (options.length === 0) return;
    this.patch({
      phase: 'super_rogue_pick',
      superRoguePickOptions: options.map((o) => o.id),
    });
  }

  getSuperRoguePickOptionIds(): SuperRogueCardId[] {
    return [...this.state.superRoguePickOptions];
  }

  selectSuperRogueCard(cardId: SuperRogueCardId): boolean {
    if (this.state.phase !== 'super_rogue_pick') return false;
    if (!this.state.superRoguePickOptions.includes(cardId)) return false;
    this.patch({
      phase: 'prepare',
      superRoguePicks: [...this.state.superRoguePicks, cardId],
      superRoguePickOptions: [],
    });
    return true;
  }

  getSuperRoguePicks(): readonly SuperRogueCardId[] {
    return this.state.superRoguePicks;
  }

  getMergeAttackBonusPercent(): number {
    return this.state.mergeAttackBonusPercent;
  }



  tryRoguePurchase(): boolean {
    if (this.state.phase !== 'prepare') return false;
    const spent = trySpendRogueGold(
      this.state.gold,
      this.state.roguePurchaseCount,
    );
    if (!spent) return false;

    if (spent.needsSkillPick) {
      this.patch({
        gold: spent.gold,
        roguePurchaseCount: spent.purchaseCount,
        phase: 'rogue_skill_pick',
      });
      return true;
    }

    if (spent.needsUpgradePick) {
      this.patch({
        gold: spent.gold,
        roguePurchaseCount: spent.purchaseCount,
        phase: 'rogue_upgrade_pick',
      });
      return true;
    }

    this.patch({
      gold: spent.gold,
      roguePurchaseCount: spent.purchaseCount,
    });
    return true;
  }



  selectUltimateSkill(skill: UltimateSkillId): boolean {
    if (this.state.phase !== 'rogue_skill_pick') return false;
    const ultimate = createUltimateChargeState();
    ultimate.skill = skill;
    this.patch({
      phase: 'prepare',
      ultimate,
      rogueUpgradeIds: [],
      phaseBuffPending: false,
      frostDebuffPending: false,
      judgmentPending: false,
    });
    return true;
  }

  selectRogueUpgrade(upgradeId: RogueUpgradeId): boolean {
    if (this.state.phase !== 'rogue_upgrade_pick') return false;
    const skill = this.state.ultimate.skill;
    if (!skill) return false;
    const available = listAvailableRogueUpgrades(
      skill,
      this.state.rogueUpgradeIds,
    );
    if (!available.some((u) => u.id === upgradeId)) return false;
    this.patch({
      phase: 'prepare',
      rogueUpgradeIds: [...this.state.rogueUpgradeIds, upgradeId],
    });
    return true;
  }

  getRogueUpgradePickOptions() {
    const skill = this.state.ultimate.skill;
    if (!skill) return [];
    return listAvailableRogueUpgrades(skill, this.state.rogueUpgradeIds);
  }

  private getUltimateMods(): UltimateRunModifiers | null {
    const skill = this.state.ultimate.skill;
    if (!skill) return null;
    return computeUltimateModifiers(skill, this.state.rogueUpgradeIds);
  }

  getJudgmentWaveCount(): number {
    return getJudgmentWaveCount(this.state.rogueUpgradeIds);
  }

  getPhaseCritBonus(): number {
    return getPhaseCritBonus(this.state.rogueUpgradeIds);
  }

  getFrostDamageTakenMult(): number {
    return getFrostDamageTakenMult(this.state.rogueUpgradeIds);
  }

  tryActivateUltimate(): boolean {
    const mods = this.getUltimateMods();
    if (
      this.state.phase !== 'prepare' ||
      !mods ||
      !isUltimateReady(this.state.ultimate, mods)
    ) {
      return false;
    }
    const skill = this.state.ultimate.skill;
    if (!skill) return false;

    const ultimate = { ...this.state.ultimate };
    consumeUltimateCharge(ultimate, mods);

    const next: Partial<GameState> = { ultimate };

    if (skill === 'phase') {
      next.phaseBuffPending = true;
    }

    this.patch(next);
    return true;
  }



  getUltimateSkill(): UltimateSkillId | null {
    return this.state.ultimate.skill;
  }



  isUltimateReady(): boolean {
    const mods = this.getUltimateMods();
    if (!mods) return false;
    return isUltimateReady(this.state.ultimate, mods);
  }



  getUltimateChargeView(): {
    skill: UltimateSkillId | null;
    progress: number;
    max: number;
    ready: boolean;
    name: string;
  } {
    const skill = this.state.ultimate.skill;
    const mods = skill
      ? computeUltimateModifiers(skill, this.state.rogueUpgradeIds)
      : null;
    return {
      skill,
      progress: this.state.ultimate.progress,
      max: mods?.chargeMax ?? 0,
      ready: mods ? isUltimateReady(this.state.ultimate, mods) : false,
      name: skill ? ULTIMATE_SKILLS[skill].name : '',
    };
  }



  addUltimateDamageCharge(damage: number) {
    const mods = this.getUltimateMods();
    if (!mods || this.state.ultimate.skill !== 'judgment') return;
    const ultimate = { ...this.state.ultimate };
    addJudgmentCharge(ultimate, damage, mods);
    this.patch({ ultimate });
  }



  addUltimateCollisionCharge(count = 1) {
    const mods = this.getUltimateMods();
    if (!mods || this.state.ultimate.skill !== 'phase') return;
    const ultimate = { ...this.state.ultimate };
    addPhaseCharge(ultimate, count, mods);
    this.patch({ ultimate });
  }



  addUltimateKillCharge(kills = 1) {
    const mods = this.getUltimateMods();
    if (!mods || this.state.ultimate.skill !== 'frost') return;
    const ultimate = { ...this.state.ultimate };
    addFrostCharge(ultimate, kills, mods);
    this.patch({ ultimate });
  }



  clearJudgmentPending() {
    if (!this.state.judgmentPending) return;
    this.patch({ judgmentPending: false });
  }



  hasJudgmentPending(): boolean {
    return this.state.judgmentPending;
  }



  consumePhaseBuff(): boolean {
    if (!this.state.phaseBuffPending) return false;
    this.patch({ phaseBuffPending: false });
    return true;
  }



  consumeFrostDebuff(): boolean {
    if (!this.state.frostDebuffPending) return false;
    this.patch({ frostDebuffPending: false });
    return true;
  }



  beginLaunch(aimAngleRad: number): LaunchPayload | null {

    if (this.state.phase !== 'prepare') return null;

    const units = collectLaunchUnitsFromSlots(this.state.controlSlots);

    if (units.length === 0) return null;

    this.patch({ phase: 'combat' });

    return { units, aimAngleRad };

  }



  onCombatEndedStartSpawn() {
    if (this.state.phase === 'settled') return;
    this.patch({ phase: 'spawn' });
  }

  onSpawnFinished(
    wallDamage: number,
    waveOrdinal: number,
    bossesDefeated: number,
  ) {
    if (this.state.phase === 'settled') return;

    const newWallHp = Math.max(0, this.state.wallHp - wallDamage);

    if (newWallHp <= 0) {
      this.patch({
        wallHp: 0,
        phase: 'settled',
        settlement: {
          waveOrdinal,
          monstersKilled: this.state.monstersKilled,
          bossesDefeated,
          turn: this.state.turn,
        },
      });
      return;
    }

    this.patch({
      phase: 'prepare',
      turn: this.state.turn + 1,
      wallHp: newWallHp,
    });
  }

  restart(): void {

    this.state = createInitialGameState();

    this.emit();

  }



  static wallDamageFromHits(hits: { hp: number }[]): number {

    let dmg = 0;

    for (const b of hits) dmg += b.hp;

    return dmg;

  }



  static goldForKill(typeId: MonsterTypeId): number {

    return goldForMonsterKill(typeId);

  }

}


