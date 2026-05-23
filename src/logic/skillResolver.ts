import type { BallColor } from '../ballTypes';
import type { MonsterTypeId } from '../config/monsterTable';

import { CRIT_DAMAGE_MULTIPLIER } from '../config/ballStats';

import {

  ASSASSIN_BIG_CRIT_DAMAGE_BONUS,

  ASSASSIN_BIG_CRIT_RATE_BONUS,

  ASSASSIN_BIG_FIRST_CRIT_ELITE_EXTRA,

  ASSASSIN_CRIT_RATE_BONUS,

  ASSASSIN_FIRST_CRIT_BONUS_ELITE,

  ASSASSIN_FIRST_CRIT_BONUS_NORMAL,

  KNIGHT_BIG_CROSS_DAMAGE_RATIO,

  KNIGHT_CROSS_DAMAGE_RATIO,

  KNIGHT_CROSS_CHANCE,

  MAGE_ARCANE_BIG_RADIUS_MULT,

  MAGE_ARCANE_CHANCE,

  MAGE_ARCANE_DAMAGE_RATIO,

  MAGE_ARCANE_RADIUS,

  DRUID_CLAW_CHANCE_BIG,

  DRUID_CLAW_CHANCE_SMALL,

  SHAMAN_CHAIN_CHANCE,

  SHAMAN_CHAIN_DAMAGE_RATIO,

} from '../config/ballSkills';

import type { CombatSessionState } from './combatSession';



export interface HitDamageInput {

  color: BallColor;

  isBig: boolean;

  attack: number;

  baseCritRate: number;

  baseCritMult: number;

  monsterInstanceId: string;

  monsterTypeId: MonsterTypeId;

}



export interface HitDamageResult {

  damage: number;

  isCrit: boolean;

  assassinAmbush: boolean;

  assassinEliteAmbush: boolean;

}



export function getEffectiveCritRate(

  color: BallColor,

  baseCritRate: number,

  isBig: boolean,

): number {

  if (color === 'yellow') {

    let rate = baseCritRate + ASSASSIN_CRIT_RATE_BONUS;

    if (isBig) rate += ASSASSIN_BIG_CRIT_RATE_BONUS;

    return Math.min(1, rate);

  }

  return baseCritRate;

}



export function rollHitDamage(

  input: HitDamageInput,

  session: CombatSessionState,

): HitDamageResult {

  const critRate = getEffectiveCritRate(

    input.color,

    input.baseCritRate,

    input.isBig,

  );

  const isCrit = Math.random() < critRate;



  let critMult = input.baseCritMult;

  let assassinAmbush = false;

  let assassinEliteAmbush = false;



  if (isCrit && input.color === 'yellow' && session.isAssassinFirstCrit(input.monsterInstanceId)) {

    session.markAssassinFirstCrit(input.monsterInstanceId);

    let bonus =

      input.monsterTypeId === 'elite'

        ? ASSASSIN_FIRST_CRIT_BONUS_ELITE

        : ASSASSIN_FIRST_CRIT_BONUS_NORMAL;

    if (input.isBig && input.monsterTypeId === 'elite') {

      bonus += ASSASSIN_BIG_FIRST_CRIT_ELITE_EXTRA;

    }

    critMult = input.baseCritMult + bonus;

    assassinAmbush = true;

    assassinEliteAmbush = input.monsterTypeId === 'elite';

  }



  if (isCrit && input.color === 'yellow' && input.isBig) {

    critMult += ASSASSIN_BIG_CRIT_DAMAGE_BONUS;

  }



  const damage = isCrit

    ? Math.round(input.attack * critMult)

    : input.attack;



  return { damage, isCrit, assassinAmbush, assassinEliteAmbush };

}



export function rollMageArcaneProc(): boolean {

  return Math.random() < MAGE_ARCANE_CHANCE;

}



export function rollKnightCrossProc(): boolean {

  return Math.random() < KNIGHT_CROSS_CHANCE;

}



export function rollShamanChainProc(): boolean {

  return Math.random() < SHAMAN_CHAIN_CHANCE;

}



export function rollDruidClawProc(isBig: boolean): boolean {

  const chance = isBig ? DRUID_CLAW_CHANCE_BIG : DRUID_CLAW_CHANCE_SMALL;

  return Math.random() < chance;

}



export function shamanChainBaseDamage(mainHitDamage: number): number {

  return Math.max(1, Math.round(mainHitDamage * SHAMAN_CHAIN_DAMAGE_RATIO));

}



export function mageArcaneDamage(attack: number): number {

  return Math.max(1, Math.round(attack * MAGE_ARCANE_DAMAGE_RATIO));

}



export function knightCrossDamage(attack: number, isBig: boolean): number {

  const ratio = isBig ? KNIGHT_BIG_CROSS_DAMAGE_RATIO : KNIGHT_CROSS_DAMAGE_RATIO;

  return Math.max(1, Math.round(attack * ratio));

}



export function getMageArcaneRadius(isBig: boolean): number {

  return isBig ? MAGE_ARCANE_RADIUS * MAGE_ARCANE_BIG_RADIUS_MULT : MAGE_ARCANE_RADIUS;

}



export { MAGE_ARCANE_RADIUS };

export { CRIT_DAMAGE_MULTIPLIER };


