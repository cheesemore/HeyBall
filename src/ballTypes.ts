/** 弹球颜色（8 种） */

export type BallColor =

  | 'brown'

  | 'pink'

  | 'blue'

  | 'green'

  | 'yellow'

  | 'navy'

  | 'purple'

  | 'orange';



/** 本局可选的全集（招募池从中抽取） */

export const ALL_BALL_COLORS: BallColor[] = [

  'brown',

  'pink',

  'blue',

  'green',

  'yellow',

  'navy',

  'purple',

  'orange',

];



export const BALL_COLOR_HEX: Record<BallColor, number> = {

  brown: 0xa0522d,

  pink: 0xff69b4,

  blue: 0x4a90e2,

  green: 0x3cb371,

  yellow: 0xffd700,

  navy: 0x1e4a8c,

  purple: 0x9b59b6,

  orange: 0xff8c32,

};



export const BALL_COLOR_LABEL: Record<BallColor, string> = {

  brown: '战士球',

  pink: '骑士球',

  blue: '法师球',

  green: '猎人球',

  yellow: '刺客球',

  navy: '萨满球',

  purple: '术士球',

  orange: '德鲁伊球',

};



/** @deprecated 使用 ALL_BALL_COLORS */

export const BALL_COLORS = ALL_BALL_COLORS;



export enum BallTier {

  Single = 0,

  Dual = 1,

  BigDual = 2,

  TripleBig = 3,

}



export interface BallItem {

  color: BallColor;

  tier: BallTier;

}



export function randomColorFromPool(pool: readonly BallColor[]): BallColor {

  return pool[Math.floor(Math.random() * pool.length)]!;

}



export function createSingle(

  pool: readonly BallColor[],

  color?: BallColor,

): BallItem {

  return {

    color: color ?? randomColorFromPool(pool),

    tier: BallTier.Single,

  };

}



export function canMerge(a: BallItem, b: BallItem): boolean {

  if (a.tier !== b.tier || a.color !== b.color) return false;

  return a.tier < BallTier.TripleBig;

}



export function mergeResult(

  _a: BallItem,

  pool: readonly BallColor[],

): BallItem {

  return {

    color: randomColorFromPool(pool),

    tier: (_a.tier + 1) as BallTier,

  };

}



export function ballsEqual(a: BallItem, b: BallItem): boolean {

  return a.tier === b.tier && a.color === b.color;

}


