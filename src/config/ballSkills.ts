/** 战士（褐）·分裂 — 小球 */

export const WARRIOR_SPLIT_CHANCE = 0.3;

export const WARRIOR_SPLIT_COUNT = 2;

export const WARRIOR_SPLIT_ANGLE_SPREAD_DEG = 45;

export const WARRIOR_SPLIT_SIZE_RATIO = 0.5;

export const WARRIOR_SPLIT_ATTACK_RATIO = 0.5;

export const WARRIOR_SPLIT_BOUNCES_RATIO = 0.5;



/** 战士大球：30% 直接分裂 4 颗最小球（攻击/碰撞继承大球） */

export const WARRIOR_BIG_SPLIT_CHANCE = 0.3;

export const WARRIOR_BIG_SPLIT_COUNT = 4;



/** 刺客（黄）·刺杀 */

export const ASSASSIN_CRIT_RATE_BONUS = 0.35;

export const ASSASSIN_BIG_CRIT_RATE_BONUS = 0.15;

export const ASSASSIN_BIG_CRIT_DAMAGE_BONUS = 1;

export const ASSASSIN_FIRST_CRIT_BONUS_NORMAL = 2;

export const ASSASSIN_FIRST_CRIT_BONUS_ELITE = 5;

export const ASSASSIN_BIG_FIRST_CRIT_ELITE_EXTRA = 2;



/** 法师（蓝）·魔爆 */

export const MAGE_ARCANE_CHANCE = 0.15;

export const MAGE_ARCANE_RADIUS = 150;

export const MAGE_ARCANE_BIG_RADIUS_MULT = 2;

export const MAGE_ARCANE_DAMAGE_RATIO = 1;



/** 猎人（绿）·贯通箭：每层消耗并排 3 支，每支 15% 小球攻击 */

export const HUNTER_LAYER_CHANCE_SMALL = 0.3;

export const HUNTER_LAYER_CHANCE_BIG = 1;

/** 单支贯通箭伤害 = 猎人球攻击 × 此比例（3 支合计 45%） */

export const HUNTER_PIERCE_DAMAGE_RATIO = 0.15;

export const HUNTER_VOLLEY_ARROW_COUNT = 3;

/** 并排箭横向间距（像素） */

export const HUNTER_VOLLEY_PARALLEL_SPACING = 16;

/** 猎人齐射：每秒发射轮数（每轮并排 3 支） */

export const HUNTER_VOLLEYS_PER_SEC = 10;

/** 两次齐射间隔（秒）；飞行结束后立即接下一轮 */

export const HUNTER_VOLLEY_INTERVAL_SEC = 0;

/** 贯通箭飞行时长（与齐射节奏一致：1 秒 10 射） */

export const HUNTER_ARROW_FLIGHT_SEC = 1 / HUNTER_VOLLEYS_PER_SEC;

/** 判定线宽（半宽，像素） */

export const HUNTER_PIERCE_LINE_HALF_WIDTH = 14;



/** 骑士（粉）·十字斩 */

export const KNIGHT_CROSS_CHANCE = 0.15;

export const KNIGHT_CROSS_DAMAGE_RATIO = 1;

export const KNIGHT_BIG_CROSS_DAMAGE_RATIO = 2;

export const KNIGHT_CROSS_THICK = 12;

export const KNIGHT_BIG_CROSS_THICK_MULT = 2;



/** 萨满（深蓝）·闪电链 */

export const SHAMAN_CHAIN_CHANCE = 0.15;

export const SHAMAN_CHAIN_EXTRA_TARGETS = 3;

export const SHAMAN_CHAIN_DAMAGE_RATIO = 0.75;



/** 术士（紫）·中毒 */

export const WARLOCK_POISON_STACKS_SMALL = 1;

export const WARLOCK_POISON_STACKS_BIG = 3;

export const WARLOCK_POISON_DAMAGE_PER_STACK = 0.05;

/** 毒层 ≥ 此值时毒发飘字放大 */
export const WARLOCK_POISON_HEAVY_STACKS = 5;



/** 德鲁伊（橙）·爪击 */

export const DRUID_CLAW_CHANCE_SMALL = 0.2;

export const DRUID_CLAW_CHANCE_BIG = 0.6;

export const DRUID_CLAW_DAMAGE_RATIO = 1;
