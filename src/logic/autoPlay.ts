import { canBuyRogue, getRogueShopPrice } from '../config/rogueShop';
import { getRecruitCost } from '../config/recruitCost';
import {
  canRecruit,
  collectLaunchUnitsFromSlots,
  findEmptySlot,
  findMergePair,
  hasAnyBall,
} from './controlGrid';
import { aimAngleAtMaxHpMonster } from './targeting';
import type { GameState, PrepareAction } from './types';

/** 招募价超过肉鸽价 × 该比例时，改为存钱买肉鸽（例：肉鸽 500，招募 ≤200 可招，>200 存钱） */
const ROGUE_SAVE_THRESHOLD_RATIO = 0.4;

/** 是否应存钱买肉鸽（招募价已超过肉鸽价的 40%） */
function shouldSaveForRogue(
  recruitCost: number,
  rogueCost: number | null,
): boolean {
  if (rogueCost === null) return false;
  return recruitCost > rogueCost * ROGUE_SAVE_THRESHOLD_RATIO;
}

/**
 * 自动备战：招募/肉鸽按价格比 → 仅满格才合成 → 发射。
 */
export function decidePrepareAction(state: GameState): PrepareAction {
  if (state.phase !== 'prepare' || !state.runBallColors?.length) {
    return { type: 'wait' };
  }

  const recruitCost = getRecruitCost(state.recruitCount);
  const rogueCost = getRogueShopPrice(state.roguePurchaseCount);
  const saveForRogue = shouldSaveForRogue(recruitCost, rogueCost);

  if (
    !saveForRogue &&
    canRecruit(state.gold, state.controlSlots, state.recruitCount)
  ) {
    return { type: 'recruit' };
  }

  if (saveForRogue && rogueCost !== null && canBuyRogue(state.gold, state.roguePurchaseCount)) {
    return { type: 'rogue' };
  }

  const gridFull = findEmptySlot(state.controlSlots) === null;
  if (gridFull) {
    const pair = findMergePair(state.controlSlots);
    if (pair) {
      return { type: 'merge', from: pair.from, to: pair.to };
    }
  }

  const units = collectLaunchUnitsFromSlots(state.controlSlots);
  if (hasAnyBall(state.controlSlots) && units.length > 0) {
    return {
      type: 'launch',
      aimAngleRad: aimAngleAtMaxHpMonster(state.battleMonsters),
    };
  }

  return { type: 'wait' };
}
