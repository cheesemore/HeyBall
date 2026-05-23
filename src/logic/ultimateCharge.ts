import type { UltimateSkillId } from '../config/ultimateSkills';
import { ULTIMATE_SKILLS } from '../config/ultimateSkills';

export interface UltimateChargeState {
  skill: UltimateSkillId | null;
  progress: number;
}

export function createUltimateChargeState(): UltimateChargeState {
  return { skill: null, progress: 0 };
}

export function getChargeMax(skill: UltimateSkillId): number {
  return ULTIMATE_SKILLS[skill].chargeMax;
}

export function isUltimateReady(state: UltimateChargeState): boolean {
  if (!state.skill) return false;
  return state.progress >= getChargeMax(state.skill);
}

export function addJudgmentCharge(state: UltimateChargeState, damage: number): void {
  if (state.skill !== 'judgment') return;
  state.progress = Math.min(
    getChargeMax('judgment'),
    state.progress + damage,
  );
}

export function addPhaseCharge(state: UltimateChargeState, hits = 1): void {
  if (state.skill !== 'phase') return;
  state.progress = Math.min(
    getChargeMax('phase'),
    state.progress + hits,
  );
}

export function addFrostCharge(state: UltimateChargeState, kills = 1): void {
  if (state.skill !== 'frost') return;
  state.progress = Math.min(
    getChargeMax('frost'),
    state.progress + kills,
  );
}

export function consumeUltimateCharge(state: UltimateChargeState): void {
  state.progress = 0;
}
