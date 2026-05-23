import { WALL_MAX_HP } from '../config/gameBalance';

import type { BallColor } from '../ballTypes';

import { goldForMonsterKill } from './rewards';

import type { MonsterTypeId } from '../config/monsterTable';

import {

  applyMerge,

  applyRecruit,

  collectLaunchUnitsFromSlots,

  createEmptyControlSlots,

  INITIAL_GOLD,

} from './controlGrid';

import { createRunDraft } from './runDraft';
import {
  configFromOption,
  createMonsterGroupDraftOptions,
  type RunMonsterGroupConfig,
} from './monsterGroupDraft';

import type { UltimateSkillId } from '../config/ultimateSkills';
import { ULTIMATE_SKILLS } from '../config/ultimateSkills';

import { trySpendRogueGold } from './rogueLogic';

import {
  addFrostCharge,
  addJudgmentCharge,
  addPhaseCharge,
  createUltimateChargeState,
  getChargeMax,
  isUltimateReady,
} from './ultimateCharge';

import type { GameState, LaunchPayload, MonsterSnapshot } from './types';



export type StateListener = (state: GameState) => void;



export function createInitialGameState(): GameState {

  return {

    phase: 'monster_group_draft',

    turn: 1,

    wallHp: WALL_MAX_HP,

    wallMaxHp: WALL_MAX_HP,

    gold: INITIAL_GOLD,

    recruitCount: 0,

    controlSlots: createEmptyControlSlots(),

    battleMonsters: [],

    draftOptions: [],

    runBallColors: null,

    monsterGroupDraftOptions: createMonsterGroupDraftOptions(),

    runMonsterGroup: null,

    roguePurchaseCount: 0,

    ultimate: createUltimateChargeState(),

    phaseBuffPending: false,

    frostDebuffPending: false,

    judgmentPending: false,

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



  tryMerge(from: number, to: number): boolean {

    if (this.state.phase !== 'prepare' || !this.state.runBallColors) return false;

    const result = applyMerge(

      this.state.controlSlots,

      from,

      to,

      this.state.runBallColors,

    );

    if (!result) return false;

    this.patch({ controlSlots: result.slots });

    return true;

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
      phaseBuffPending: false,
      frostDebuffPending: false,
      judgmentPending: false,
    });
    return true;
  }



  tryActivateUltimate(): boolean {
    if (this.state.phase !== 'prepare' || !isUltimateReady(this.state.ultimate)) {
      return false;
    }
    const skill = this.state.ultimate.skill;
    if (!skill) return false;

    const next: Partial<GameState> = {
      ultimate: { ...this.state.ultimate, progress: 0 },
    };

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
    return isUltimateReady(this.state.ultimate);
  }



  getUltimateChargeView(): {
    skill: UltimateSkillId | null;
    progress: number;
    max: number;
    ready: boolean;
    name: string;
  } {
    const skill = this.state.ultimate.skill;
    return {
      skill,
      progress: this.state.ultimate.progress,
      max: skill ? getChargeMax(skill) : 0,
      ready: isUltimateReady(this.state.ultimate),
      name: skill ? ULTIMATE_SKILLS[skill].name : '',
    };
  }



  addUltimateDamageCharge(damage: number) {
    if (this.state.ultimate.skill !== 'judgment') return;
    const ultimate = { ...this.state.ultimate };
    addJudgmentCharge(ultimate, damage);
    this.patch({ ultimate });
  }



  addUltimateCollisionCharge(count = 1) {
    if (this.state.ultimate.skill !== 'phase') return;
    const ultimate = { ...this.state.ultimate };
    addPhaseCharge(ultimate, count);
    this.patch({ ultimate });
  }



  addUltimateKillCharge(kills = 1) {
    if (this.state.ultimate.skill !== 'frost') return;
    const ultimate = { ...this.state.ultimate };
    addFrostCharge(ultimate, kills);
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

    this.patch({ phase: 'spawn' });

  }



  onSpawnFinished(wallDamage: number) {

    if (this.state.phase === 'victory') return;

    this.patch({

      phase: 'prepare',

      turn: this.state.turn + 1,

      wallHp: Math.max(0, this.state.wallHp - wallDamage),

    });

  }



  onVictory() {

    this.patch({ phase: 'victory' });

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


