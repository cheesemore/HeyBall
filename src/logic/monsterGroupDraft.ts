import {
  ALL_MONSTER_GROUP_DIFFICULTY_IDS,
  MONSTER_GROUP_DIFFICULTIES,
  pickRandomSpecialKinds,
  type MonsterGroupDifficultyId,
} from '../config/monsterGroup';
import {
  SPECIAL_MONSTER_TABLE,
  type SpecialMonsterKind,
} from '../config/specialMonsters';
import type { MonsterTypeId } from '../config/monsterTable';

export interface MonsterGroupDraftOption {
  difficulty: MonsterGroupDifficultyId;
  name: string;
  shortDesc: string;
  /** 本局若选此方案，启用的特殊怪种类 */
  specialKinds: SpecialMonsterKind[];
  specialTypeIds: MonsterTypeId[];
}

function buildOption(
  difficulty: MonsterGroupDifficultyId,
): MonsterGroupDraftOption {
  const def = MONSTER_GROUP_DIFFICULTIES[difficulty];
  const specialKinds = pickRandomSpecialKinds(def.specialKindCount);
  const specialTypeIds = specialKinds.map(
    (k) => SPECIAL_MONSTER_TABLE[k].typeId,
  );
  return {
    difficulty,
    name: def.name,
    shortDesc: def.shortDesc,
    specialKinds,
    specialTypeIds,
  };
}

/** 四选一：简单 → 普通 → 困难 → 地狱（固定顺序，均可选） */
export function createMonsterGroupDraftOptions(): MonsterGroupDraftOption[] {
  return ALL_MONSTER_GROUP_DIFFICULTY_IDS.map((d) => buildOption(d));
}

export interface RunMonsterGroupConfig {
  difficulty: MonsterGroupDifficultyId;
  specialTypeIds: MonsterTypeId[];
}

export function configFromOption(
  opt: MonsterGroupDraftOption,
): RunMonsterGroupConfig {
  return {
    difficulty: opt.difficulty,
    specialTypeIds: [...opt.specialTypeIds],
  };
}
