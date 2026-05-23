import { SPECIAL_SPAWN_CHANCE_PER_KIND } from '../config/monsterGroup';
import type { MonsterTypeId } from '../config/monsterTable';

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

/** 普通灰砖刷怪：按启用种类各 10% 独立判定（先命中者优先） */
export function rollNormalSpawnTypeId(
  enabledSpecials: readonly MonsterTypeId[],
): MonsterTypeId {
  if (enabledSpecials.length === 0) return 'normal';
  const order = [...enabledSpecials];
  shuffle(order);
  for (const typeId of order) {
    if (Math.random() < SPECIAL_SPAWN_CHANCE_PER_KIND) return typeId;
  }
  return 'normal';
}
