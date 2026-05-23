import type { MonsterTypeId } from '../config/monsterTable';
import {
  getSpecialMonsterDef,
  INVINCIBLE_TURNS,
  type SpecialMonsterKind,
} from '../config/specialMonsters';

export interface MonsterRuntimeEntry {
  invincibleTurnsLeft: number;
  frozen: boolean;
}

export class SpecialMonsterRuntime {
  private readonly entries = new Map<string, MonsterRuntimeEntry>();

  get(instanceId: string): MonsterRuntimeEntry | undefined {
    return this.entries.get(instanceId);
  }

  isFrozen(instanceId: string): boolean {
    return this.entries.get(instanceId)?.frozen ?? false;
  }

  ensure(instanceId: string, typeId: MonsterTypeId): MonsterRuntimeEntry {
    let e = this.entries.get(instanceId);
    if (!e) {
      const kind = getSpecialMonsterDef(typeId)?.kind;
      e = {
        invincibleTurnsLeft: kind === 'invincible' ? INVINCIBLE_TURNS : 0,
        frozen: false,
      };
      this.entries.set(instanceId, e);
    }
    return e;
  }

  onMonsterSpawned(instanceId: string, typeId: MonsterTypeId): void {
    this.ensure(instanceId, typeId);
  }

  remove(instanceId: string): void {
    this.entries.delete(instanceId);
  }

  pruneMissing(livingIds: Set<string>): void {
    for (const id of this.entries.keys()) {
      if (!livingIds.has(id)) this.entries.delete(id);
    }
  }

  setFrozen(instanceId: string, on: boolean): void {
    const e = this.entries.get(instanceId);
    if (!e) return;
    e.frozen = on;
    if (on) e.invincibleTurnsLeft = 0;
  }

  clearAllFrozen(): void {
    for (const e of this.entries.values()) e.frozen = false;
  }

  invincibleDamageCap(instanceId: string): number | null {
    const e = this.entries.get(instanceId);
    if (!e || e.invincibleTurnsLeft <= 0 || e.frozen) return null;
    return 1;
  }

  tickInvincibleEndOfTurn(skipInstanceIds?: ReadonlySet<string>): void {
    for (const [id, e] of this.entries) {
      if (skipInstanceIds?.has(id)) continue;
      if (e.invincibleTurnsLeft > 0) e.invincibleTurnsLeft--;
    }
  }

  kindOf(typeId: MonsterTypeId): SpecialMonsterKind | null {
    return getSpecialMonsterDef(typeId)?.kind ?? null;
  }
}
