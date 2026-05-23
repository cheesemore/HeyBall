import {
  canRecruit,
  collectLaunchUnitsFromSlots,
  findMergePair,
  hasAnyBall,
} from './controlGrid';
import { aimAngleAtMaxHpMonster } from './targeting';
import type { GameState, PrepareAction } from './types';

/**
 * 自动战斗备战策略：有钱招募 → 能合就合 → 否则瞄准最高血量怪发射。
 */
export function decidePrepareAction(state: GameState): PrepareAction {
    if (state.phase !== 'prepare' || !state.runBallColors?.length) {
      return { type: 'wait' };
    }

  if (canRecruit(state.gold, state.controlSlots, state.recruitCount)) {
    return { type: 'recruit' };
  }

  const pair = findMergePair(state.controlSlots);
  if (pair) {
    return { type: 'merge', from: pair.from, to: pair.to };
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
