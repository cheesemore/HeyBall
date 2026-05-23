import type { UltimateSkillId } from './ultimateSkills';

export type RogueUpgradeId =
  | 'judgment_waves_plus2'
  | 'judgment_charge_minus_10k'
  | 'judgment_overcap'
  | 'phase_crit_plus20'
  | 'phase_charge_minus_2k'
  | 'phase_overcap'
  | 'frost_vuln_plus'
  | 'frost_charge_minus_24'
  | 'frost_overcap';

export interface RogueUpgradeDef {
  id: RogueUpgradeId;
  skill: UltimateSkillId;
  name: string;
  desc: string;
}

const OVERCAP_DESC =
  '充能可溢出上限继续存储；释放时仅扣除满额需求，每回合仍限施放一次';

export const ROGUE_UPGRADE_DEFS: Record<RogueUpgradeId, RogueUpgradeDef> = {
  judgment_waves_plus2: {
    id: 'judgment_waves_plus2',
    skill: 'judgment',
    name: '审判波次 +2',
    desc: '释放时流星雨波次 +2',
  },
  judgment_charge_minus_10k: {
    id: 'judgment_charge_minus_10k',
    skill: 'judgment',
    name: '审判充能 -10000',
    desc: '充能需求（造成伤害） -10000',
  },
  judgment_overcap: {
    id: 'judgment_overcap',
    skill: 'judgment',
    name: '审判溢出存储',
    desc: OVERCAP_DESC,
  },
  phase_crit_plus20: {
    id: 'phase_crit_plus20',
    skill: 'phase',
    name: '相位暴击 +20%',
    desc: '相位空间期间暴击率 +20%',
  },
  phase_charge_minus_2k: {
    id: 'phase_charge_minus_2k',
    skill: 'phase',
    name: '相位充能 -2000',
    desc: '充能需求（撞击次数） -2000',
  },
  phase_overcap: {
    id: 'phase_overcap',
    skill: 'phase',
    name: '相位溢出存储',
    desc: OVERCAP_DESC,
  },
  frost_vuln_plus: {
    id: 'frost_vuln_plus',
    skill: 'frost',
    name: '冻狱易伤强化',
    desc: '冻狱生效期间目标受伤倍率 +25%',
  },
  frost_charge_minus_24: {
    id: 'frost_charge_minus_24',
    skill: 'frost',
    name: '冻狱充能 -24',
    desc: '充能需求（击杀数） -24',
  },
  frost_overcap: {
    id: 'frost_overcap',
    skill: 'frost',
    name: '冻狱溢出存储',
    desc: OVERCAP_DESC,
  },
};

export const ROGUE_UPGRADES_BY_SKILL: Record<UltimateSkillId, RogueUpgradeId[]> = {
  judgment: [
    'judgment_waves_plus2',
    'judgment_charge_minus_10k',
    'judgment_overcap',
  ],
  phase: ['phase_crit_plus20', 'phase_charge_minus_2k', 'phase_overcap'],
  frost: ['frost_vuln_plus', 'frost_charge_minus_24', 'frost_overcap'],
};

export function listAvailableRogueUpgrades(
  skill: UltimateSkillId,
  picked: readonly RogueUpgradeId[],
): RogueUpgradeDef[] {
  const pickedSet = new Set(picked);
  return ROGUE_UPGRADES_BY_SKILL[skill]
    .filter((id) => !pickedSet.has(id))
    .map((id) => ROGUE_UPGRADE_DEFS[id]);
}
