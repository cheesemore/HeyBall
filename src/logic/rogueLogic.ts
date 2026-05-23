import {
  canBuyRogue,
  getRogueShopPrice,
  ROGUE_SHOP_MAX_PURCHASES,
} from '../config/rogueShop';

export function trySpendRogueGold(
  gold: number,
  purchaseCount: number,
): {
  gold: number;
  purchaseCount: number;
  needsSkillPick: boolean;
  needsUpgradePick: boolean;
} | null {
  if (purchaseCount >= ROGUE_SHOP_MAX_PURCHASES) return null;
  const price = getRogueShopPrice(purchaseCount);
  if (price === null || !canBuyRogue(gold, purchaseCount)) return null;
  const nextCount = purchaseCount + 1;
  return {
    gold: gold - price,
    purchaseCount: nextCount,
    needsSkillPick: purchaseCount === 0,
    needsUpgradePick: purchaseCount >= 1,
  };
}
