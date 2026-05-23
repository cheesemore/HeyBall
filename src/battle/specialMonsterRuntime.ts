import type { MonsterTypeId } from '../config/monsterTable';
import {
  getSpecialMonsterDef,
  type SpecialMonsterKind,
} from '../config/specialMonsters';

export type InterruptChargeReason = 'frost' | 'judgment' | 'interrupt_skill';

const INVINCIBLE_TURNS = 2;

export interface MonsterRuntimeEntry {
  charging: boolean;
  invincibleTurnsLeft: number;
  frozen: boolean;
}

export class SpecialMonsterRuntime {
  private readonly entries = new Map<string, MonsterRuntimeEntry>();

  get(instanceId: string): MonsterRuntimeEntry | undefined {
    return this.entries.get(instanceId);
  }

  isCharging(instanceId: string): boolean {
    return this.entries.get(instanceId)?.charging ?? false;
  }

  isFrozen(instanceId: string): boolean {
    return this.entries.get(instanceId)?.frozen ?? false;
  }

  ensure(instanceId: string, typeId: MonsterTypeId): MonsterRuntimeEntry {
    let e = this.entries.get(instanceId);
    if (!e) {
      const kind = getSpecialMonsterDef(typeId)?.kind;
      e = {
        charging: false,
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

  setCharging(instanceId: string, on: boolean): void {
    const e = this.entries.get(instanceId);
    if (e) e.charging = on;
  }

  setFrozen(instanceId: string, on: boolean): void {
    const e = this.entries.get(instanceId);
    if (!e) return;
    e.frozen = on;
    if (on) {
      e.charging = false;
      e.invincibleTurnsLeft = 0;
    }
  }

  clearAllFrozen(): void {
    for (const e of this.entries.values()) e.frozen = false;
  }

  interruptCharge(instanceId: string, _reason: InterruptChargeReason): void {
    const e = this.entries.get(instanceId);
    if (e) e.charging = false;
  }

  /** 打断类技能命中蓄力怪 */
  interruptChargeIfCharging(instanceId: string, reason: InterruptChargeReason): void {
    if (this.isCharging(instanceId)) this.interruptCharge(instanceId, reason);
  }

  invincibleDamageCap(instanceId: string): number | null {
    const e = this.entries.get(instanceId);
    if (!e || e.invincibleTurnsLeft <= 0 || e.frozen) return null;
    return 1;
  }

  tickInvincibleEndOfTurn(): void {
    for (const e of this.entries.values()) {
      if (e.invincibleTurnsLeft > 0) e.invincibleTurnsLeft--;
    }
  }

  kindOf(typeId: MonsterTypeId): SpecialMonsterKind | null {
    return getSpecialMonsterDef(typeId)?.kind ?? null;
  }
}
