import { BLOCK_BASE_HP } from './gameBalance';
import { isSpecialMonsterType } from './specialMonsters';
import { SPECIAL_MONSTER_TABLE, type SpecialMonsterKind } from './specialMonsters';

import { AIRDROP_BLUE_BASE_HP, AIRDROP_RED_BASE_HP } from './airdrop';

import {

  BOSS_BASE_HP,

  BOSS_FOOTPRINT_H,

  BOSS_FOOTPRINT_W,

  ELITE_BASE_HP,

  ELITE_FOOTPRINT_H,

  ELITE_FOOTPRINT_W,

} from './monsterSpawn';



export type MonsterTypeId =

  | 'normal'

  | 'elite'

  | 'boss'

  | 'airdrop_blue'

  | 'airdrop_red'

  | 'special_copy'

  | 'special_invincible'

  | 'special_heal'

  | 'special_annihilate'

  | 'special_jump'

  | 'special_summon';



export interface MonsterTypeRow {

  id: MonsterTypeId;

  name: string;

  baseHp: number;

  footprintW: number;

  footprintH: number;

  fillColor: number;

  strokeColor: number;

}



export const MONSTER_TABLE: Record<MonsterTypeId, MonsterTypeRow> = {

  normal: {

    id: 'normal',

    name: '普通砖块',

    baseHp: BLOCK_BASE_HP,

    footprintW: 1,

    footprintH: 1,

    fillColor: 0xc8c8c8,

    strokeColor: 0xdedede,

  },

  elite: {

    id: 'elite',

    name: '精英',

    baseHp: ELITE_BASE_HP,

    footprintW: ELITE_FOOTPRINT_W,

    footprintH: ELITE_FOOTPRINT_H,

    fillColor: 0xdd3333,

    strokeColor: 0xff5555,

  },

  boss: {

    id: 'boss',

    name: '首领',

    baseHp: BOSS_BASE_HP,

    footprintW: BOSS_FOOTPRINT_W,

    footprintH: BOSS_FOOTPRINT_H,

    fillColor: 0x660018,

    strokeColor: 0x990022,

  },

  airdrop_blue: {

    id: 'airdrop_blue',

    name: '蓝色空降',

    baseHp: AIRDROP_BLUE_BASE_HP,

    footprintW: 1,

    footprintH: 1,

    fillColor: 0x888888,

    strokeColor: 0xa0a0a0,

  },

  airdrop_red: {

    id: 'airdrop_red',

    name: '红色空降',

    baseHp: AIRDROP_RED_BASE_HP,

    footprintW: 1,

    footprintH: 1,

    fillColor: 0x444444,

    strokeColor: 0x666666,

  },

  special_copy: rowForSpecial('copy'),

  special_invincible: rowForSpecial('invincible'),

  special_heal: rowForSpecial('heal'),

  special_annihilate: rowForSpecial('annihilate'),

  special_jump: rowForSpecial('jump'),

  special_summon: rowForSpecial('summon'),

};

function rowForSpecial(kind: SpecialMonsterKind): MonsterTypeRow {
  const s = SPECIAL_MONSTER_TABLE[kind];
  return {
    id: s.typeId,
    name: s.name,
    baseHp: BLOCK_BASE_HP,
    footprintW: 1,
    footprintH: 1,
    fillColor: s.shellColor,
    strokeColor: s.shellStroke,
  };
}



export const DEFAULT_MONSTER_TYPE: MonsterTypeId = 'normal';



export function getMonsterType(id: MonsterTypeId): MonsterTypeRow {

  return MONSTER_TABLE[id];

}



export function isAirDropType(id: MonsterTypeId): boolean {

  return id === 'airdrop_blue' || id === 'airdrop_red';

}



/** 砖块血量数字颜色（浅灰黑字，中灰/深灰/首领等白字） */

export function getMonsterHpTextFill(typeId: MonsterTypeId): number {

  if (typeId === 'normal') return 0x000000;

  if (isSpecialMonsterType(typeId)) return 0xffffff;

  return 0xffffff;

}

export { isSpecialMonsterType } from './specialMonsters';


