import type { Container } from 'pixi.js';

/** 复制/召唤：从格子中心放大至撑满 */
export const MONSTER_BIRTH_DURATION = 0.48;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export interface MonsterBirthAnim {
  body: Container;
  w: number;
  h: number;
  age: number;
}

export function startMonsterBirthAnim(
  body: Container,
  w: number,
  h: number,
): MonsterBirthAnim {
  body.pivot.set(w / 2, h / 2);
  body.position.set(w / 2, h / 2);
  body.scale.set(0.02);
  return { body, w, h, age: 0 };
}

export function tickMonsterBirthAnim(anim: MonsterBirthAnim, dt: number): boolean {
  anim.age += dt;
  const t = Math.min(1, anim.age / MONSTER_BIRTH_DURATION);
  const s = easeOutCubic(t);
  anim.body.scale.set(s);
  if (t >= 1) {
    anim.body.scale.set(1);
    anim.body.pivot.set(0, 0);
    anim.body.position.set(0, 0);
    return false;
  }
  return true;
}
