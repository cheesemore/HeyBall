import type { MonsterTypeId } from './monsterTable';

/** 特殊怪物种类 */
export type SpecialMonsterKind =
  | 'copy'
  | 'invincible'
  | 'heal'
  | 'annihilate'
  | 'jump'
  | 'summon';

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
}

/** 单个治疗怪每回合最多治疗目标数 */
export const HEAL_MAX_TARGETS_PER_CAST = 3;

export const SPECIAL_MONSTER_KINDS: SpecialMonsterKind[] = [
  'copy',
  'invincible',
  'heal',
  'annihilate',
  'jump',
  'summon',
];

export const SPECIAL_MONSTER_TABLE: Record<SpecialMonsterKind, SpecialMonsterDef> =
  {
    copy: {
      kind: 'copy',
      typeId: 'special_copy',
      name: '复制',
      effectBrief:
        '回合末蓄力；蓄力完成在左/右/下空格复制自身（含血量与毒层），冰封打断',
      shellColor: 0x00acc1,
      shellStroke: 0x00838f,
      innerColor: 0xd4d4d4,
    },
    invincible: {
      kind: 'invincible',
      typeId: 'special_invincible',
      name: '无敌',
      effectBrief: '出生后2回合内受伤恒为1；被冰封立刻解除',
      shellColor: 0xffb300,
      shellStroke: 0xff8f00,
      innerColor: 0xd8d8d8,
    },
    heal: {
      kind: 'heal',
      typeId: 'special_heal',
      name: '恢复',
      effectBrief:
        '回合末为最前排最多3个未满血砖块各回复自身30%最大生命；冰封不发动',
      shellColor: 0x43a047,
      shellStroke: 0x2e7d32,
      innerColor: 0xd6d6d6,
    },
    annihilate: {
      kind: 'annihilate',
      typeId: 'special_annihilate',
      name: '湮灭',
      effectBrief: '被弹球撞击时10%概率消灭该弹球',
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
      effectBrief:
        '回合末蓄力；蓄力完成在左/右/下空格召唤灰砖，冰封与打断类技能打断',
      shellColor: 0xe91e63,
      shellStroke: 0xc2185b,
      innerColor: 0xd4d4d4,
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
