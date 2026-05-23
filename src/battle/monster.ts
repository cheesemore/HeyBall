import { getMonsterHp } from '../config/monsterScaling';
import {
  getMonsterType,
  type MonsterTypeId,
} from '../config/monsterTable';

let nextInstanceId = 1;

export interface BlockMonster {
  typeId: MonsterTypeId;
  hp: number;
  maxHp: number;
  instanceId: string;
  anchorRow: number;
  anchorCol: number;
  footprintW: number;
  footprintH: number;
}

export function isAnchorCell(m: BlockMonster, row: number, col: number): boolean {
  return m.anchorRow === row && m.anchorCol === col;
}

/** 复制已有实例（新 instanceId，保留血量与类型） */
export function cloneMonsterFrom(
  source: BlockMonster,
  anchorRow: number,
  anchorCol: number,
): BlockMonster {
  return {
    typeId: source.typeId,
    hp: source.hp,
    maxHp: source.maxHp,
    instanceId: `m-${nextInstanceId++}`,
    anchorRow,
    anchorCol,
    footprintW: source.footprintW,
    footprintH: source.footprintH,
  };
}

export function createMonsterInstance(
  typeId: MonsterTypeId,
  anchorRow: number,
  anchorCol: number,
  growthStep = 0,
  baseHpOverride?: number,
): BlockMonster {
  const row = getMonsterType(typeId);
  const hp = getMonsterHp(growthStep, baseHpOverride ?? row.baseHp);
  return {
    typeId,
    hp,
    maxHp: hp,
    instanceId: `m-${nextInstanceId++}`,
    anchorRow,
    anchorCol,
    footprintW: row.footprintW,
    footprintH: row.footprintH,
  };
}

/** @deprecated 使用 createMonsterInstance */
export function createBlock(
  typeId: MonsterTypeId = 'normal',
  growthStep = 0,
): BlockMonster {
  return createMonsterInstance(typeId, 0, 0, growthStep);
}
