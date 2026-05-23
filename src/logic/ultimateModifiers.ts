import type { RogueUpgradeId } from '../config/rogueUpgrades';
import { ROGUE_CHARGE_OVERCAP_RATIO } from '../config/rogueUpgrades';
import {
  FROST_DAMAGE_TAKEN_MULT,
  JUDGMENT_WAVES,
  PHASE_CRIT_BONUS,
  ULTIMATE_SKILLS,
  type UltimateSkillId,
} from '../config/ultimateSkills';

export interface UltimateRunModifiers {
  chargeMax: number;
  /** 充能进度上限（满额需求；有溢出升级时为需求的 200%） */
  progressCap: number;
  judgmentExtraWaves: number;
  phaseExtraCrit: number;
  frostExtraVuln: number;
}

export function computeUltimateModifiers(
  skill: UltimateSkillId,
  upgrades: readonly RogueUpgradeId[],
): UltimateRunModifiers {
  let chargeMax = ULTIMATE_SKILLS[skill].chargeMax;
  let overcapEnabled = false;
  let judgmentExtraWaves = 0;
  let phaseExtraCrit = 0;
  let frostExtraVuln = 0;

  for (const id of upgrades) {
    switch (id) {
      case 'judgment_waves_plus2':
        judgmentExtraWaves += 2;
        break;
      case 'judgment_charge_minus_10k':
        chargeMax -= 10_000;
        break;
      case 'judgment_overcap':
        overcapEnabled = true;
        break;
      case 'phase_crit_plus20':
        phaseExtraCrit += 0.2;
        break;
      case 'phase_charge_minus_2k':
        chargeMax -= 2000;
        break;
      case 'phase_overcap':
        overcapEnabled = true;
        break;
      case 'frost_vuln_plus':
        frostExtraVuln += 0.25;
        break;
      case 'frost_charge_minus_24':
        chargeMax -= 24;
        break;
      case 'frost_overcap':
        overcapEnabled = true;
        break;
      default:
        break;
    }
  }

  const need = Math.max(1, chargeMax);
  const progressCap = overcapEnabled
    ? need * (1 + ROGUE_CHARGE_OVERCAP_RATIO)
    : need;

  return {
    chargeMax: need,
    progressCap,
    judgmentExtraWaves,
    phaseExtraCrit,
    frostExtraVuln,
  };
}

export function getJudgmentWaveCount(
  upgrades: readonly RogueUpgradeId[],
): number {
  const mods = computeUltimateModifiers('judgment', upgrades);
  return JUDGMENT_WAVES + mods.judgmentExtraWaves;
}

export function getPhaseCritBonus(upgrades: readonly RogueUpgradeId[]): number {
  const mods = computeUltimateModifiers('phase', upgrades);
  return PHASE_CRIT_BONUS + mods.phaseExtraCrit;
}

export function getFrostDamageTakenMult(
  upgrades: readonly RogueUpgradeId[],
): number {
  const mods = computeUltimateModifiers('frost', upgrades);
  return FROST_DAMAGE_TAKEN_MULT + mods.frostExtraVuln;
}
