import type { MonsterTypeId } from './monsterTable';
import { getMonsterType } from './monsterTable';
import { getSpecialMonsterDef } from './specialMonsters';

export interface MonsterTipInfo {
  name: string;
  description: string;
}

const TIPS: Partial<Record<MonsterTypeId, MonsterTipInfo>> = {
  normal: {
    name: '普通砖块',
    description: '最常见的灰色砖块，击破可获得金币。',
  },
  elite: {
    name: '精英',
    description: '精英：血量很多，占据 2×2 格，击破奖励丰厚。',
  },
  boss: {
    name: '首领',
    description: '首领：血量超多，占据 4×4 格，击破即可通关。',
  },
  airdrop_blue: {
    name: '蓝色空降',
    description: '空降奖励砖（金框），初始血量较低，击破金币翻倍。',
  },
  airdrop_red: {
    name: '红色空降',
    description: '空降强化砖（红框），初始血量较高，击破金币翻倍。',
  },
};

export function getMonsterTip(typeId: MonsterTypeId): MonsterTipInfo {
  const special = getSpecialMonsterDef(typeId);
  if (special) {
    return {
      name: special.name,
      description: special.effectBrief,
    };
  }

  const fixed = TIPS[typeId];
  if (fixed) return fixed;

  const row = getMonsterType(typeId);
  return {
    name: row.name,
    description: '敌方砖块。',
  };
}
