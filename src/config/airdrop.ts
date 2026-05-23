/** 每 N 回合触发一次空降（回合末，首领出现后不再触发） */

export const AIRDROP_INTERVAL_TURNS = 8;



/** 空降落点行范围（从顶数第 3–7 行 → 0-based row 2–6） */

export const AIRDROP_MIN_ROW = 2;

export const AIRDROP_MAX_ROW = 6;



/** 空降基准血量（随刷怪成长档位等比放大，与普通砖块同一套公式） */
export const AIRDROP_BLUE_BASE_HP = 200;

export const AIRDROP_RED_BASE_HP = 300;

export const AIRDROP_BLUE_GOLD_MULT = 2;



/** 第 80 波起，空降有概率变为红色 */

export const AIRDROP_RED_START_TURN = 80;

export const AIRDROP_RED_CHANCE = 0.5;



/** 空降下落动画 */

export const AIRDROP_FALL_START_OFFSET = 520;

export const AIRDROP_FALL_DURATION_SEC = 0.42;

/** 相邻空降砖块开始下落的间隔（秒） */
export const AIRDROP_STAGGER_SEC = 0.1;

