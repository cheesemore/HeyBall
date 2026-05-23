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

function addCharge(
  state: UltimateChargeState,
  amount: number,
  mods: UltimateRunModifiers,
): void {
  state.progress = Math.min(mods.progressCap, state.progress + amount);
}

export function addJudgmentCharge(
  state: UltimateChargeState,
  damage: number,
  mods: UltimateRunModifiers,
): void {
  if (state.skill !== 'judgment') return;
  addCharge(state, damage, mods);
}

export function addPhaseCharge(
  state: UltimateChargeState,
  hits: number,
  mods: UltimateRunModifiers,
): void {
  if (state.skill !== 'phase') return;
  addCharge(state, hits, mods);
}

export function addFrostCharge(
  state: UltimateChargeState,
  kills: number,
  mods: UltimateRunModifiers,
): void {
  if (state.skill !== 'frost') return;
  addCharge(state, kills, mods);
}

export function consumeUltimateCharge(
  state: UltimateChargeState,
  mods: UltimateRunModifiers,
): void {
  state.progress = Math.max(0, state.progress - mods.chargeMax);
}
