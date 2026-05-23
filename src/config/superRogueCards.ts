import type { BallColor } from '../ballTypes';
import { BALL_COLOR_LABEL } from '../ballTypes';

export type SuperRogueCardId =
  | 'uni_crit_rate'
  | 'uni_crit_damage'
  | 'uni_attack'
  | 'uni_wall_armor'
  | 'pro_warrior'
  | 'pro_mage'
  | 'pro_warlock'
  | 'pro_hunter'
  | 'pro_assassin'
  | 'pro_druid'
  | 'pro_shaman'
  | 'pro_knight';

export type SuperRogueCardKind = 'universal' | 'profession';

export interface SuperRogueCardDef {
  id: SuperRogueCardId;
  kind: SuperRogueCardKind;
  /** 右侧 HUD 单行文案 */
  hudLine: string;
  /** 三选一卡片标题 */
  name: string;
  /** 三选一卡片说明 */
  desc: string;
  color?: BallColor;
}

export const SUPER_ROGUE_CARD_DEFS: Record<SuperRogueCardId, SuperRogueCardDef> = {
  uni_crit_rate: {
    id: 'uni_crit_rate',
    kind: 'universal',
    name: '锐利',
    hudLine: '锐利 · 暴击率 +15%',
    desc: '暴击率 +15%',
  },
  uni_crit_damage: {
    id: 'uni_crit_damage',
    kind: 'universal',
    name: '致命',
    hudLine: '致命 · 暴击伤害 +36%',
    desc: '暴击伤害 +36%',
  },
  uni_attack: {
    id: 'uni_attack',
    kind: 'universal',
    name: '强攻',
    hudLine: '强攻 · 攻击 +20%（计入合成攻击）',
    desc: '攻击 +20%，计入合成攻击加成',
  },
  uni_wall_armor: {
    id: 'uni_wall_armor',
    kind: 'universal',
    name: '铁壁',
    hudLine: '铁壁 · 护甲 +300，城墙回满',
    desc: '城墙护甲 +300，生命回满',
  },
  pro_warrior: {
    id: 'pro_warrior',
    kind: 'profession',
    color: 'brown',
    name: '双生分裂',
    hudLine: '战士 · 分裂数量加倍',
    desc: '分裂球数量 ×2',
  },
  pro_mage: {
    id: 'pro_mage',
    kind: 'profession',
    color: 'blue',
    name: '奥术回响',
    hudLine: '法师 · 魔爆率 +20%，圆周次级魔爆',
    desc: '魔爆率 +20%；主爆后圆周次级魔爆（半径/伤害减半）',
  },
  pro_warlock: {
    id: 'pro_warlock',
    kind: 'profession',
    color: 'purple',
    name: '瘟毒蔓延',
    hudLine: '术士 · 毒伤后传染相邻，可叠层',
    desc: '回合末毒发后随机传染相邻 1 敌，可叠毒层',
  },
  pro_hunter: {
    id: 'pro_hunter',
    kind: 'profession',
    color: 'green',
    name: '彩虹九矢',
    hudLine: '猎人 · 回合末 9 箭横排（炫彩）',
    desc: '回合末穿透箭改为 9 支横排，炫彩',
  },
  pro_assassin: {
    id: 'pro_assassin',
    kind: 'profession',
    color: 'yellow',
    name: '首刃裁决',
    hudLine: '刺客 · 首暴附加 20% 最大生命',
    desc: '每只怪首次暴击额外 20% 最大生命伤害',
  },
  pro_druid: {
    id: 'pro_druid',
    kind: 'profession',
    color: 'orange',
    name: '野性咆哮',
    hudLine: '德鲁伊 · 5% 咆哮，本回合伤害 +25%',
    desc: '碰撞 5% 咆哮（5 秒共 CD），弹球本回合 +25% 伤',
  },
  pro_shaman: {
    id: 'pro_shaman',
    kind: 'profession',
    color: 'navy',
    name: '雷网扩张',
    hudLine: '萨满 · 闪电链率 +20%，目标 +3',
    desc: '闪电链触发率 +20%，链接 +3 目标',
  },
  pro_knight: {
    id: 'pro_knight',
    kind: 'profession',
    color: 'pink',
    name: '炫光扫射',
    hudLine: '骑士 · 5 次十字后左→右贯穿扫射',
    desc: '5 次十字后从左到右贯穿扫射（炫彩）',
  },
};

const PROFESSION_CARD_BY_COLOR: Record<BallColor, SuperRogueCardId> = {
  brown: 'pro_warrior',
  pink: 'pro_knight',
  blue: 'pro_mage',
  green: 'pro_hunter',
  yellow: 'pro_assassin',
  navy: 'pro_shaman',
  purple: 'pro_warlock',
  orange: 'pro_druid',
};

const UNIVERSAL_CARD_IDS: SuperRogueCardId[] = [
  'uni_crit_rate',
  'uni_crit_damage',
  'uni_attack',
  'uni_wall_armor',
];

export function getProfessionSuperRogueId(color: BallColor): SuperRogueCardId {
  return PROFESSION_CARD_BY_COLOR[color];
}

export function listUniversalSuperRogueIds(): SuperRogueCardId[] {
  return [...UNIVERSAL_CARD_IDS];
}

/** 已选超级肉鸽：按顺序生成右侧 HUD 行 */
export function formatSuperRogueHudLines(pickIds: readonly SuperRogueCardId[]): string {
  if (pickIds.length === 0) return '';
  return pickIds
    .map((id) => SUPER_ROGUE_CARD_DEFS[id]?.hudLine ?? id)
    .join('\n');
}

export function superRogueCardLabel(id: SuperRogueCardId): string {
  const def = SUPER_ROGUE_CARD_DEFS[id];
  if (!def) return id;
  if (def.kind === 'profession' && def.color) {
    return `${BALL_COLOR_LABEL[def.color]} · ${def.name}`;
  }
  return def.name;
}
