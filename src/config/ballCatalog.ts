import { BALL_COLOR_LABEL, type BallColor } from '../ballTypes';

/** @deprecated 三选一请用 BALL_COLOR_LABEL */
export const BALL_DRAFT_COLOR_NAME: Record<BallColor, string> = {
  brown: '战士',
  pink: '骑士',
  blue: '法师',
  green: '猎人',
  yellow: '刺客',
  navy: '萨满',
  purple: '术士',
  orange: '德鲁伊',
};

/** 球种技能简介（三选一右侧，每条 ≤20 字） */
export const BALL_SKILL_DESC: Record<BallColor, string> = {
  brown: '碰撞30%几率分裂2球',
  blue: '碰撞15%触发范围魔爆',
  yellow: '暴击率+35%首暴增伤',
  pink: '碰撞15%十字斩贯通',
  green: '叠层后原点并排贯通箭',
  navy: '攻击15%概率触发闪电链',
  purple: '攻击叠毒回合末毒发',
  orange: '攻击概率爪击最近砖',
};

export const DRAFT_OPTION_SIZE = 4;

/** 本局已选球组效果（右侧 HUD，每条一行） */
export function formatRunBallEffectsLines(colors: readonly BallColor[]): string {
  return colors
    .map((c) => `${BALL_COLOR_LABEL[c]}：${BALL_SKILL_DESC[c]}`)
    .join('\n');
}
