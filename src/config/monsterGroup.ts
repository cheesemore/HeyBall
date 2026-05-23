import type { SpecialMonsterKind } from './specialMonsters';
import { SPECIAL_MONSTER_KINDS } from './specialMonsters';

export type MonsterGroupDifficultyId = 'easy' | 'normal' | 'hard' | 'hell';

export interface MonsterGroupDifficultyDef {
  id: MonsterGroupDifficultyId;
  name: string;
  /** 选定该难度后的开局金币 */
  startingGold: number;
  shortDesc: string;
  specialKindCount: number;
}

export const MONSTER_GROUP_DIFFICULTIES: Record<
  MonsterGroupDifficultyId,
  MonsterGroupDifficultyDef
> = {
  easy: {
    id: 'easy',
    name: '简单',
    startingGold: 5000,
    shortDesc: '无额外特殊怪物',
    specialKindCount: 0,
  },
  normal: {
    id: 'normal',
    name: '普通',
    startingGold: 600,
    shortDesc: '灰砖10%变为1种特殊怪（全局）',
    specialKindCount: 1,
  },
  hard: {
    id: 'hard',
    name: '困难',
    startingGold: 400,
    shortDesc: '灰砖各10%变为2种特殊怪（全局）',
    specialKindCount: 2,
  },
  hell: {
    id: 'hell',
    name: '地狱',
    startingGold: 200,
    shortDesc: '灰砖各10%变为4种特殊怪（全局）',
    specialKindCount: 4,
  },
};

export const ALL_MONSTER_GROUP_DIFFICULTY_IDS: MonsterGroupDifficultyId[] = [
  'easy',
  'normal',
  'hard',
  'hell',
];

/** 灰砖变为特殊怪的单项概率 */
export const SPECIAL_SPAWN_CHANCE_PER_KIND = 0.1;

export const MONSTER_GROUP_DRAFT_OPTION_COUNT = 4;

export function pickRandomSpecialKinds(count: number): SpecialMonsterKind[] {
  const pool = [...SPECIAL_MONSTER_KINDS];
  shuffle(pool);
  return pool.slice(0, Math.min(count, pool.length));
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
