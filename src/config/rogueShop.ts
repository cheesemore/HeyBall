/** 肉鸽购买价格（共 4 次） */
export const ROGUE_SHOP_PRICES: readonly number[] = [500, 1000, 1500, 2000];

export const ROGUE_SHOP_MAX_PURCHASES = ROGUE_SHOP_PRICES.length;

export function getRogueShopPrice(purchaseCount: number): number | null {
  if (purchaseCount < 0 || purchaseCount >= ROGUE_SHOP_MAX_PURCHASES) return null;
  return ROGUE_SHOP_PRICES[purchaseCount]!;
}

export function canBuyRogue(gold: number, purchaseCount: number): boolean {
  const price = getRogueShopPrice(purchaseCount);
  return price !== null && gold >= price;
}
