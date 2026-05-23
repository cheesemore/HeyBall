import {
  getProfessionSuperRogueId,
  listUniversalSuperRogueIds,
  SUPER_ROGUE_CARD_DEFS,
  type SuperRogueCardDef,
  type SuperRogueCardId,
} from '../config/superRogueCards';
import type { BallColor } from '../ballTypes';

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

/** 随机 3 张超级肉鸽候选（本局职业 + 通用规则） */
export function rollSuperRogueOptions(
  runColors: readonly BallColor[],
  picked: readonly SuperRogueCardId[],
  count = 3,
): SuperRogueCardDef[] {
  const pickedPro = new Set(
    picked.filter((id) => SUPER_ROGUE_CARD_DEFS[id]?.kind === 'profession'),
  );

  const proPool: SuperRogueCardId[] = [];
  for (const color of runColors) {
    const id = getProfessionSuperRogueId(color);
    if (!pickedPro.has(id)) proPool.push(id);
  }

  const uniPool = listUniversalSuperRogueIds();
  const bag: SuperRogueCardId[] = [...proPool, ...uniPool];
  if (bag.length === 0) return [];

  shuffle(bag);
  const chosen: SuperRogueCardId[] = [];
  const seen = new Set<SuperRogueCardId>();

  for (const id of bag) {
    if (chosen.length >= count) break;
    const def = SUPER_ROGUE_CARD_DEFS[id];
    if (!def) continue;
    if (def.kind === 'profession' && pickedPro.has(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    chosen.push(id);
  }

  while (chosen.length < count && uniPool.length > 0) {
    const id = uniPool[Math.floor(Math.random() * uniPool.length)]!;
    chosen.push(id);
  }

  return chosen.map((id) => SUPER_ROGUE_CARD_DEFS[id]!);
}
