import type { BallColor } from '../ballTypes';

import {
  HUNTER_ARROW_DAMAGE_RATIO,
  HUNTER_LAYER_CHANCE_BIG,
  HUNTER_LAYER_CHANCE_SMALL,
  WARLOCK_POISON_DAMAGE_PER_STACK,
  WARLOCK_POISON_STACKS_BIG,
  WARLOCK_POISON_STACKS_SMALL,
} from '../config/ballSkills';

import { CRIT_DAMAGE_MULTIPLIER } from '../config/ballStats';



/** 单回合战斗中的技能统计（纯逻辑，可单测） */

export class CombatSessionState {

  hunterRainLayers = 0;

  hunterArrowDamage = 0;

  hasHunterBall = false;

  warlockSmallAttack = 0;

  warlockCritRate = 0;

  warlockCritMult = CRIT_DAMAGE_MULTIPLIER;

  hasWarlockBall = false;

  readonly warlockPoisonStacks = new Map<string, number>();

  druidSmallAttack = 0;

  druidCritRate = 0;

  druidCritMult = CRIT_DAMAGE_MULTIPLIER;

  hasDruidBall = false;

  readonly assassinFirstCritUsed = new Set<string>();



  reset(): void {

    this.hunterRainLayers = 0;

    this.hunterArrowDamage = 0;

    this.hasHunterBall = false;

    this.warlockSmallAttack = 0;

    this.warlockCritRate = 0;

    this.warlockCritMult = CRIT_DAMAGE_MULTIPLIER;

    this.hasWarlockBall = false;

    /* 术士毒层永久保留，不在回合重置时清除 */

    this.druidSmallAttack = 0;

    this.druidCritRate = 0;

    this.druidCritMult = CRIT_DAMAGE_MULTIPLIER;

    this.hasDruidBall = false;

    this.assassinFirstCritUsed.clear();

  }



  registerHunterBall(smallBallAttack: number): void {

    this.hasHunterBall = true;

    this.hunterArrowDamage = Math.max(

      1,

      Math.round(smallBallAttack * HUNTER_ARROW_DAMAGE_RATIO),

    );

  }



  registerWarlockBall(smallBallAttack: number, critRate: number): void {

    this.hasWarlockBall = true;

    this.warlockSmallAttack = smallBallAttack;

    this.warlockCritRate = critRate;

  }



  registerDruidBall(smallBallAttack: number, critRate: number): void {

    this.hasDruidBall = true;

    this.druidSmallAttack = smallBallAttack;

    this.druidCritRate = critRate;

  }



  tryAddHunterRainLayer(isBig: boolean): boolean {

    if (!this.hasHunterBall) return false;

    const chance = isBig ? HUNTER_LAYER_CHANCE_BIG : HUNTER_LAYER_CHANCE_SMALL;

    if (Math.random() >= chance) return false;

    this.hunterRainLayers++;

    return true;

  }



  getArrowRainCount(): number {

    if (!this.hasHunterBall) return 0;

    return this.hunterRainLayers;

  }



  addWarlockPoison(instanceId: string, isBig: boolean): number {

    const add = isBig ? WARLOCK_POISON_STACKS_BIG : WARLOCK_POISON_STACKS_SMALL;

    const next = (this.warlockPoisonStacks.get(instanceId) ?? 0) + add;

    this.warlockPoisonStacks.set(instanceId, next);

    return next;

  }



  getWarlockPoisonStacks(instanceId: string): number {

    return this.warlockPoisonStacks.get(instanceId) ?? 0;

  }

  setWarlockPoisonStacks(instanceId: string, stacks: number): void {
    if (stacks <= 0) this.warlockPoisonStacks.delete(instanceId);
    else this.warlockPoisonStacks.set(instanceId, stacks);
  }



  clearWarlockPoison(instanceId: string): void {

    this.warlockPoisonStacks.delete(instanceId);

  }



  warlockPoisonTickBaseDamage(instanceId: string): number {

    const stacks = this.getWarlockPoisonStacks(instanceId);

    if (stacks <= 0 || this.warlockSmallAttack <= 0) return 0;

    return Math.max(

      1,

      Math.round(

        stacks * this.warlockSmallAttack * WARLOCK_POISON_DAMAGE_PER_STACK,

      ),

    );

  }



  hasPoisonToResolve(): boolean {

    if (!this.hasWarlockBall) return false;

    for (const stacks of this.warlockPoisonStacks.values()) {

      if (stacks > 0) return true;

    }

    return false;

  }



  isAssassinFirstCrit(instanceId: string): boolean {

    return !this.assassinFirstCritUsed.has(instanceId);

  }



  markAssassinFirstCrit(instanceId: string): void {

    this.assassinFirstCritUsed.add(instanceId);

  }

}



export function ballHasSplitSkill(color: BallColor): boolean {

  return color === 'brown';

}
