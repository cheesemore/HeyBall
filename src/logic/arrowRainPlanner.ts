export interface ArrowRainTarget {
  instanceId: string;
  hp: number;
  centerX: number;
  centerY: number;
}

export interface ArrowRainStrikePlan {
  instanceId: string;
  damage: number;
  targetX: number;
  targetY: number;
}

/**
 * 预先分配每支箭的落点与伤害；虚拟血量归零后不再分配剩余箭（防鞭尸）。
 */
export function planArrowRain(
  targets: ArrowRainTarget[],
  arrowCount: number,
  damagePerArrow: number,
): ArrowRainStrikePlan[] {
  if (arrowCount <= 0 || targets.length === 0) return [];

  const dmg = Math.max(1, damagePerArrow);
  const virtualHp = new Map<string, number>();
  for (const t of targets) virtualHp.set(t.instanceId, t.hp);

  const livingIds = (): string[] =>
    targets
      .filter((t) => (virtualHp.get(t.instanceId) ?? 0) > 0)
      .map((t) => t.instanceId);

  const byId = new Map(targets.map((t) => [t.instanceId, t]));
  const plans: ArrowRainStrikePlan[] = [];

  for (let i = 0; i < arrowCount; i++) {
    const alive = livingIds();
    if (alive.length === 0) break;

    const pickId = alive[Math.floor(Math.random() * alive.length)]!;
    virtualHp.set(pickId, (virtualHp.get(pickId) ?? 0) - dmg);

    const t = byId.get(pickId)!;
    plans.push({
      instanceId: pickId,
      damage: dmg,
      targetX: t.centerX,
      targetY: t.centerY,
    });
  }

  return plans;
}
