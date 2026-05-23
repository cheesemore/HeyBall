import type { UltimateSkillId } from '../config/ultimateSkills';
import type { UltimateRunModifiers } from './ultimateModifiers';

export interface UltimateChargeState {
  skill: UltimateSkillId | null;
  progress: number;
}

export function createUltimateChargeState(): UltimateChargeState {
  return { skill: null, progress: 0 };
}

export function isUltimateReady(
  state: UltimateChargeState,
  mods: UltimateRunModifiers,
): boolean {
  if (!state.skill) return false;
  return state.progress >= mods.chargeMax;
}

export function addJudgmentCharge(
  state: UltimateChargeState,
  damage: number,
  mods: UltimateRunModifiers,
): void {
  if (state.skill !== 'judgment') return;
  if (mods.overcapStorage) {
    state.progress += damage;
  } else {
    state.progress = Math.min(
      mods.chargeMax,
      state.progress + damage,
    );
  }
}

export function addPhaseCharge(
  state: UltimateChargeState,
  hits: number,
  mods: UltimateRunModifiers,
): void {
  if (state.skill !== 'phase') return;
  if (mods.overcapStorage) {
    state.progress += hits;
  } else {
    state.progress = Math.min(mods.chargeMax, state.progress + hits);
  }
}

export function addFrostCharge(
  state: UltimateChargeState,
  kills: number,
  mods: UltimateRunModifiers,
): void {
  if (state.skill !== 'frost') return;
  if (mods.overcapStorage) {
    state.progress += kills;
  } else {
    state.progress = Math.min(mods.chargeMax, state.progress + kills);
  }
}

export function consumeUltimateCharge(
  state: UltimateChargeState,
  mods: UltimateRunModifiers,
): void {
  state.progress = Math.max(0, state.progress - mods.chargeMax);
}
