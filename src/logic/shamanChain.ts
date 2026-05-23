import type { BlockMonster } from '../battle/monster';

/** 从存活单位中随机选取额外链式目标（不回头、不重复） */
export function pickLightningChainTargets(
  living: BlockMonster[],
  originId: string,
  extraCount: number,
): BlockMonster[] {
  const chained = new Set<string>([originId]);
  const picks: BlockMonster[] = [];

  for (let i = 0; i < extraCount; i++) {
    const pool = living.filter(
      (m) => m.hp > 0 && !chained.has(m.instanceId),
    );
    if (pool.length === 0) break;
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    chained.add(pick.instanceId);
    picks.push(pick);
  }

  return picks;
}
