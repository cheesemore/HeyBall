import { getMonsterGrowthStep } from '../config/monsterScaling';
import {
  getSpecialMonsterDef,
  HEAL_MAX_TARGETS_PER_CAST,
  SPECIAL_MONSTER_TABLE,
  type SpecialMonsterKind,
} from '../config/specialMonsters';
import type { CombatSessionState } from '../logic/combatSession';
import { getFrontRowInColumn } from './airdropLogic';
import {
  canPlaceFootprint,
  clearMonsterFromGrid,
  collectUniqueMonsters,
  getFootprintAabb,
  placeFootprintPartial,
} from './monsterFootprint';
import { cloneMonsterFrom, createMonsterInstance, type BlockMonster } from './monster';
import { TOP_GRID_ROW, type MonsterGrid } from './monsterGrid';
import type { SpecialMonsterRuntime } from './specialMonsterRuntime';

export interface SpecialTurnEndResult {
  wallHits: BlockMonster[];
  actions: SpecialEnemyAction[];
}

export interface HealTargetFx {
  instanceId: string;
  col: number;
  amount: number;
  x: number;
  y: number;
}

export type SpecialEnemyAction =
  | {
      kind: 'heal';
      sourceId: string;
      color: number;
      fromX: number;
      fromY: number;
      targets: HealTargetFx[];
    }
  | {
      kind: 'jump';
      sourceId: string;
      color: number;
      fromRow: number;
      toRow: number;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      detonate: boolean;
    }
  | {
      kind: 'spawn';
      sourceId: string;
      color: number;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      spawnedId: string;
    }
  | { kind: 'charge'; sourceId: string };

export function sortMonstersGridOrder(monsters: BlockMonster[]): BlockMonster[] {
  return [...monsters].sort(
    (a, b) => a.anchorRow - b.anchorRow || a.anchorCol - b.anchorCol,
  );
}

function monsterCenter(m: BlockMonster): { x: number; y: number } {
  const { left, top, right, bottom } = getFootprintAabb(m);
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

function kindColor(typeId: BlockMonster['typeId']): number {
  const def = getSpecialMonsterDef(typeId);
  return def?.shellColor ?? 0xffffff;
}

function emptyNeighborAnchors(
  grid: MonsterGrid,
  m: BlockMonster,
): { row: number; col: number }[] {
  const candidates = [
    { row: m.anchorRow, col: m.anchorCol - 1 },
    { row: m.anchorRow, col: m.anchorCol + 1 },
    { row: m.anchorRow + 1, col: m.anchorCol },
  ];
  const out: { row: number; col: number }[] = [];
  for (const { row, col } of candidates) {
    if (canPlaceFootprint(grid, row, col, m.footprintW, m.footprintH)) {
      out.push({ row, col });
    }
  }
  return out;
}

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** 落在本列最前怪前方一格；已在该格或无法再靠前则自爆 */
function resolveJump(
  grid: MonsterGrid,
  m: BlockMonster,
  runtime: SpecialMonsterRuntime,
  wallHits: BlockMonster[],
): Extract<SpecialEnemyAction, { kind: 'jump' }> | null {
  const col = m.anchorCol;
  const frontRow = getFrontRowInColumn(grid, col);
  const from = monsterCenter(m);
  const color = kindColor(m.typeId);

  const detonate = (): Extract<SpecialEnemyAction, { kind: 'jump' }> => {
    wallHits.push(m);
    clearMonsterFromGrid(grid, m);
    runtime.remove(m.instanceId);
    return {
      kind: 'jump',
      sourceId: m.instanceId,
      color,
      fromRow: m.anchorRow,
      toRow: m.anchorRow,
      fromX: from.x,
      fromY: from.y,
      toX: from.x,
      toY: from.y,
      detonate: true,
    };
  };

  if (frontRow === null) {
    if (m.anchorRow <= TOP_GRID_ROW) return detonate();
    const targetRow = TOP_GRID_ROW;
    if (!canPlaceFootprint(grid, targetRow, col, m.footprintW, m.footprintH, m)) {
      return null;
    }
    const fromRow = m.anchorRow;
    clearMonsterFromGrid(grid, m);
    m.anchorRow = targetRow;
    placeFootprintPartial(grid, m);
    const to = monsterCenter(m);
    return {
      kind: 'jump',
      sourceId: m.instanceId,
      color,
      fromRow,
      toRow: targetRow,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      detonate: false,
    };
  }

  const targetRow = frontRow - 1;
  if (targetRow < TOP_GRID_ROW) {
    if (m.anchorRow === frontRow) return detonate();
    return null;
  }

  if (m.anchorRow === targetRow) return detonate();

  if (m.anchorRow < targetRow) {
    if (m.anchorRow === frontRow) return detonate();
    return null;
  }

  if (!canPlaceFootprint(grid, targetRow, col, m.footprintW, m.footprintH, m)) {
    return null;
  }

  const fromRow = m.anchorRow;
  clearMonsterFromGrid(grid, m);
  m.anchorRow = targetRow;
  placeFootprintPartial(grid, m);
  const to = monsterCenter(m);
  return {
    kind: 'jump',
    sourceId: m.instanceId,
    color,
    fromRow,
    toRow: targetRow,
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    detonate: false,
  };
}

function tryCopySelf(
  grid: MonsterGrid,
  source: BlockMonster,
  combat: CombatSessionState,
  runtime: SpecialMonsterRuntime,
): BlockMonster | null {
  const spots = emptyNeighborAnchors(grid, source);
  const spot = pickRandom(spots);
  if (!spot) return null;

  const clone = cloneMonsterFrom(source, spot.row, spot.col);
  if (placeFootprintPartial(grid, clone) <= 0) return null;

  const stacks = combat.getWarlockPoisonStacks(source.instanceId);
  if (stacks > 0) {
    combat.setWarlockPoisonStacks(clone.instanceId, stacks);
  }
  runtime.onMonsterSpawned(clone.instanceId, clone.typeId);
  const ce = runtime.get(clone.instanceId);
  const se = runtime.get(source.instanceId);
  if (ce && se) {
    ce.invincibleTurnsLeft = se.invincibleTurnsLeft;
    ce.frozen = se.frozen;
    ce.charging = false;
  }
  return clone;
}

function trySummonGray(
  grid: MonsterGrid,
  source: BlockMonster,
  runtime: SpecialMonsterRuntime,
  spawnRowOrdinal: number,
): BlockMonster | null {
  const spots = emptyNeighborAnchors(grid, source);
  const spot = pickRandom(spots);
  if (!spot) return null;

  const growthStep = getMonsterGrowthStep(spawnRowOrdinal);
  const gray = createMonsterInstance('normal', spot.row, spot.col, growthStep);
  if (placeFootprintPartial(grid, gray) <= 0) return null;
  runtime.onMonsterSpawned(gray.instanceId, gray.typeId);
  return gray;
}

function processHeal(
  grid: MonsterGrid,
  healer: BlockMonster,
): Extract<SpecialEnemyAction, { kind: 'heal' }> | null {
  const amount = Math.max(1, Math.round(healer.maxHp * 0.3));
  const from = monsterCenter(healer);
  const targets: HealTargetFx[] = [];
  const living = collectUniqueMonsters(grid).filter((m) => m.hp > 0);
  if (living.length === 0) return null;

  const frontRow = Math.min(...living.map((m) => m.anchorRow));
  const candidates = living
    .filter((m) => m.anchorRow === frontRow && m.hp < m.maxHp)
    .sort((a, b) => a.anchorCol - b.anchorCol || a.anchorRow - b.anchorRow);

  for (const m of candidates) {
    if (targets.length >= HEAL_MAX_TARGETS_PER_CAST) break;
    const heal = Math.min(amount, m.maxHp - m.hp);
    m.hp += heal;
    const { x, y } = monsterCenter(m);
    targets.push({
      instanceId: m.instanceId,
      col: m.anchorCol,
      amount: heal,
      x,
      y,
    });
  }

  if (targets.length === 0) return null;

  return {
    kind: 'heal',
    sourceId: healer.instanceId,
    color: kindColor(healer.typeId),
    fromX: from.x,
    fromY: from.y,
    targets,
  };
}

function processCharge(
  grid: MonsterGrid,
  m: BlockMonster,
  kind: 'copy' | 'summon',
  runtime: SpecialMonsterRuntime,
  combat: CombatSessionState,
  spawnRowOrdinal: number,
): SpecialEnemyAction | null {
  const e = runtime.ensure(m.instanceId, m.typeId);
  if (e.frozen) {
    e.charging = false;
    return null;
  }

  if (!e.charging) {
    e.charging = true;
    return { kind: 'charge', sourceId: m.instanceId };
  }

  const from = monsterCenter(m);
  const color = kindColor(m.typeId);

  const placed =
    kind === 'copy'
      ? tryCopySelf(grid, m, combat, runtime)
      : trySummonGray(grid, m, runtime, spawnRowOrdinal);

  if (!placed) return null;

  e.charging = false;
  const to = monsterCenter(placed);
  return {
    kind: 'spawn',
    sourceId: m.instanceId,
    color,
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    spawnedId: placed.instanceId,
  };
}

function isSpecialActor(
  m: BlockMonster,
  runtime: SpecialMonsterRuntime,
): SpecialMonsterKind | null {
  return runtime.kindOf(m.typeId);
}

/** 规划并立刻应用逻辑；返回按 上→下、左→右 顺序的演出动作 */
export function planAndApplySpecialMonsterTurn(
  grid: MonsterGrid,
  runtime: SpecialMonsterRuntime,
  combat: CombatSessionState,
  spawnRowOrdinal: number,
): SpecialTurnEndResult {
  const result: SpecialTurnEndResult = { wallHits: [], actions: [] };
  const living = collectUniqueMonsters(grid).filter((m) => m.hp > 0);
  runtime.pruneMissing(new Set(living.map((m) => m.instanceId)));

  const actors = sortMonstersGridOrder(
    living.filter((m) => isSpecialActor(m, runtime) !== null),
  );

  for (const m of actors) {
    if (m.hp <= 0) continue;
    const kind = isSpecialActor(m, runtime);
    if (!kind) continue;

    if (kind === 'heal') {
      if (runtime.isFrozen(m.instanceId)) continue;
      const action = processHeal(grid, m);
      if (action) result.actions.push(action);
      continue;
    }

    if (kind === 'jump') {
      const action = resolveJump(grid, m, runtime, result.wallHits);
      if (action) result.actions.push(action);
      continue;
    }

    if (kind === 'copy' || kind === 'summon') {
      const action = processCharge(
        grid,
        m,
        kind,
        runtime,
        combat,
        spawnRowOrdinal,
      );
      if (action) result.actions.push(action);
    }
  }

  const skipInvincibleTick = new Set(
    result.actions
      .filter((a): a is Extract<SpecialEnemyAction, { kind: 'spawn' }> => a.kind === 'spawn')
      .map((a) => a.spawnedId),
  );
  runtime.tickInvincibleEndOfTurn(skipInvincibleTick);
  runtime.clearAllFrozen();

  return result;
}

/** @deprecated 使用 planAndApplySpecialMonsterTurn */
export function processSpecialMonstersEndOfTurn(
  grid: MonsterGrid,
  runtime: SpecialMonsterRuntime,
  combat: CombatSessionState,
  spawnRowOrdinal: number,
): { wallHits: BlockMonster[]; placedIds: string[] } {
  const r = planAndApplySpecialMonsterTurn(
    grid,
    runtime,
    combat,
    spawnRowOrdinal,
  );
  const placedIds = r.actions
    .filter((a): a is Extract<SpecialEnemyAction, { kind: 'spawn' }> => a.kind === 'spawn')
    .map((a) => a.spawnedId);
  return { wallHits: r.wallHits, placedIds };
}

export { SPECIAL_MONSTER_TABLE };
