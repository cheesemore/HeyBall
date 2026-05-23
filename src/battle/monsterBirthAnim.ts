import type { Container } from 'pixi.js';

export const MONSTER_BIRTH_DURATION = 0.32;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
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
  body.scale.set(0.001);
  return { body, w, h, age: 0 };
}

export function tickMonsterBirthAnim(anim: MonsterBirthAnim, dt: number): boolean {
  anim.age += dt;
  const t = Math.min(1, anim.age / MONSTER_BIRTH_DURATION);
  const s = easeOutBack(t);
  anim.body.scale.set(Math.max(0.001, s));
  if (t >= 1) {
    anim.body.scale.set(1);
    anim.body.pivot.set(0, 0);
    anim.body.position.set(0, 0);
    return false;
  }
  return true;
}
