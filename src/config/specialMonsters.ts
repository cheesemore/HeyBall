import type { MonsterTypeId } from './monsterTable';

/** 特殊怪物种类 */
export type SpecialMonsterKind =
  | 'copy'
  | 'invincible'
  | 'heal'
  | 'annihilate'
  | 'jump'
  | 'summon'
  | 'shield'
  | 'rebirth'
  | 'regen';

export type SpecialMonsterVisualStyle =
  | 'default'
  | 'shield'
  | 'flesh_shell'
  | 'crimson_shell';

export interface SpecialMonsterDef {
  kind: SpecialMonsterKind;
  typeId: MonsterTypeId;
  name: string;
  /** 效果说明（地狱方案卡片展示） */
  effectBrief: string;
  /** 外圈壳色 */
  shellColor: number;
  shellStroke: number;
  /** 内芯浅灰 */
  innerColor: number;
  visualStyle?: SpecialMonsterVisualStyle;
}

/** 特殊砖块初始生命值（含 scaling 基数） */
export const SPECIAL_MONSTER_BASE_HP = 150;

/** 复生怪死亡后召唤的灰砖初始生命值 */
export const REBIRTH_GRAY_BASE_HP = 100;

/** 无敌怪出生后持续回合数 */
export const INVINCIBLE_TURNS = 3;

/** 单个治疗怪每回合最多治疗目标数 */
export const HEAL_MAX_TARGETS_PER_CAST = 5;

/** 湮灭：弹球直接撞击时消灭该球的概率 */
export const ANNIHILATE_DESTROY_BALL_CHANCE = 0.15;

/** 再生：回合末回复最大生命比例 */
export const REGEN_HEAL_MAX_HP_RATIO = 0.5;

export const SPECIAL_MONSTER_KINDS: SpecialMonsterKind[] = [
  'copy',
  'invincible',
  'heal',
  'annihilate',
  'jump',
  'summon',
  'shield',
  'rebirth',
  'regen',
];

export const SPECIAL_MONSTER_TABLE: Record<SpecialMonsterKind, SpecialMonsterDef> =
  {
    copy: {
      kind: 'copy',
      typeId: 'special_copy',
      name: '复制',
      effectBrief:
        '回合末在左/右/下/前方空格复制自身（含血量与毒层）；前方仅复制可用',
      shellColor: 0x00acc1,
      shellStroke: 0x00838f,
      innerColor: 0xd4d4d4,
    },
    invincible: {
      kind: 'invincible',
      typeId: 'special_invincible',
      name: '无敌',
      effectBrief: '出生后3回合内受伤恒为1；被冰封立刻解除',
      shellColor: 0xffb300,
      shellStroke: 0xff8f00,
      innerColor: 0xd8d8d8,
    },
    heal: {
      kind: 'heal',
      typeId: 'special_heal',
      name: '恢复',
      effectBrief:
        '回合末为最前排最多5个未满血砖块各回复自身30%最大生命；冰封不发动',
      shellColor: 0x43a047,
      shellStroke: 0x2e7d32,
      innerColor: 0xd6d6d6,
    },
    annihilate: {
      kind: 'annihilate',
      typeId: 'special_annihilate',
      name: '湮灭',
      effectBrief: '被弹球撞击时15%概率消灭该弹球',
      shellColor: 0x8e24aa,
      shellStroke: 0x6a1b9a,
      innerColor: 0xd0d0d0,
    },
    jump: {
      kind: 'jump',
      typeId: 'special_jump',
      name: '跳跃',
      effectBrief: '回合末跳到本列最前怪前方一格；无法再靠前则自爆扣墙',
      shellColor: 0xfb8c00,
      shellStroke: 0xef6c00,
      innerColor: 0xd8d8d8,
    },
    summon: {
      kind: 'summon',
      typeId: 'special_summon',
      name: '召唤',
      effectBrief: '回合末在左/右/下空格召唤灰砖；冰封不发动',
      shellColor: 0xe91e63,
      shellStroke: 0xc2185b,
      innerColor: 0xd4d4d4,
    },
    shield: {
      kind: 'shield',
      typeId: 'special_shield',
      name: '盾挡',
      effectBrief:
        '朝城墙一面为黑盾面；弹球正面撞击仅受1点伤害，毒与范围伤害正常',
      shellColor: 0x4a4a4a,
      shellStroke: 0x212121,
      innerColor: 0x9e9e9e,
      visualStyle: 'shield',
    },
    rebirth: {
      kind: 'rebirth',
      typeId: 'special_rebirth',
      name: '复生',
      effectBrief:
        '肉色外框；死亡后在原地召唤灰砖（灰砖初始100血，加成与当前波次一致）',
      shellColor: 0xffab91,
      shellStroke: 0xff8a65,
      innerColor: 0xf5e6dc,
      visualStyle: 'flesh_shell',
    },
    regen: {
      kind: 'regen',
      typeId: 'special_regen',
      name: '再生',
      effectBrief:
        '暗红外框；回合末若未冰封则回复50%最大生命（飘字「再生」）',
      shellColor: 0x8b0000,
      shellStroke: 0x5c0000,
      innerColor: 0xc62828,
      visualStyle: 'crimson_shell',
    },
  };

export const ALL_SPECIAL_TYPE_IDS: MonsterTypeId[] = SPECIAL_MONSTER_KINDS.map(
  (k) => SPECIAL_MONSTER_TABLE[k].typeId,
);

export function isSpecialMonsterType(typeId: MonsterTypeId): boolean {
  return (ALL_SPECIAL_TYPE_IDS as string[]).includes(typeId);
}

export function getSpecialMonsterDef(
  typeId: MonsterTypeId,
): SpecialMonsterDef | null {
  for (const kind of SPECIAL_MONSTER_KINDS) {
    const def = SPECIAL_MONSTER_TABLE[kind];
    if (def.typeId === typeId) return def;
  }
  return null;
}
