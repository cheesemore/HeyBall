export type UltimateSkillId = 'judgment' | 'phase' | 'frost';

export interface UltimateSkillDef {
  id: UltimateSkillId;
  name: string;
  shortDesc: string;
  chargeLabel: string;
  chargeMax: number;
}

export const ULTIMATE_SKILLS: Record<UltimateSkillId, UltimateSkillDef> = {
  judgment: {
    id: 'judgment',
    name: '末日审判',
    shortDesc: '流星雨五波，全场40%攻击总和伤害',
    chargeLabel: '造成伤害充能',
    chargeMax: 50_000,
  },
  phase: {
    id: 'phase',
    name: '相位空间',
    shortDesc: '本回合撞击+20、暴击+10%、速度+100%',
    chargeLabel: '撞击充能（含撞墙）',
    chargeMax: 20_000,
  },
  frost: {
    id: 'frost',
    name: '冻狱冥啸',
    shortDesc: '全场50%攻击总和伤害，本回合受伤+50%',
    chargeLabel: '击杀充能',
    chargeMax: 100,
  },
};

export const JUDGMENT_WAVES = 5;
export const JUDGMENT_DAMAGE_RATIO = 0.4;
export const FROST_DAMAGE_RATIO = 0.5;
export const FROST_DAMAGE_TAKEN_MULT = 1.5;

export const PHASE_EXTRA_BOUNCES = 20;
export const PHASE_CRIT_BONUS = 0.1;
export const PHASE_SPEED_MULT = 2;

export const ROGUE_SKILL_PICK_OPTIONS: UltimateSkillId[] = [
  'judgment',
  'phase',
  'frost',
];
