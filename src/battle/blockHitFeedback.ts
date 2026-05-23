import type { Container, Graphics } from 'pixi.js';

import type { MonsterTypeId } from '../config/monsterTable';
import { getSpecialMonsterDef, isSpecialMonsterType } from '../config/specialMonsters';



export const BLOCK_CORNER_RADIUS = 6;

export const HIT_SHAKE_GRACE_SEC = 0.14;

export const HIT_SHAKE_AMP_PX = 1.35;

export const HIT_SHAKE_FREQ = 50;

export const HIT_SHAKE_AMP_DECAY = 18;



export interface MonsterShakeState {

  shakeUntil: number;

  shakePhase: number;

  shakeAmp: number;

}



export function createShakeState(): MonsterShakeState {

  return {

    shakeUntil: 0,

    shakePhase: Math.random() * Math.PI * 2,

    shakeAmp: 0,

  };

}



export function extendHitShake(state: MonsterShakeState, now: number): void {

  const next = now + HIT_SHAKE_GRACE_SEC;

  if (next > state.shakeUntil) state.shakeUntil = next;

}



export function drawMonsterRoundRect(

  g: Graphics,

  w: number,

  h: number,

  fill: number,

  strokeColor: number,

  strokeWidth: number,

  alpha = 0.9,

): void {

  const pad = 2;

  const r = BLOCK_CORNER_RADIUS;

  g.roundRect(pad, pad, w - pad * 2, h - pad * 2, r);

  g.fill({ color: fill, alpha });

  g.stroke({ width: strokeWidth, color: strokeColor, alpha });

}



/** 中灰底 + 圆角内框（空降蓝：金框，空降红：红框） */

export function drawMonsterBlock(

  g: Graphics,

  w: number,

  h: number,

  typeId: MonsterTypeId,

  fill: number,

  strokeColor: number,

  strokeWidth: number,

): void {

  const pad = 2;

  const r = BLOCK_CORNER_RADIUS;

  const innerR = Math.max(3, r - 1);



  g.roundRect(pad, pad, w - pad * 2, h - pad * 2, r);

  g.fill({ color: fill, alpha: 0.92 });

  g.stroke({ width: strokeWidth, color: strokeColor, alpha: 0.95 });

  if (isSpecialMonsterType(typeId)) {
    const spec = getSpecialMonsterDef(typeId);
    if (spec) {
      const inset = 9;
      g.roundRect(
        inset,
        inset,
        w - inset * 2,
        h - inset * 2,
        innerR,
      );
      g.fill({ color: spec.innerColor, alpha: 0.95 });
    }
    return;
  }

  if (typeId === 'airdrop_blue' || typeId === 'airdrop_red') {

    const inset = 9;

    const innerColor = typeId === 'airdrop_blue' ? 0xffd700 : 0xff3333;

    g.roundRect(

      inset,

      inset,

      w - inset * 2,

      h - inset * 2,

      innerR,

    );

    g.stroke({ width: 2.5, color: innerColor, alpha: 0.95 });

  }

}



export function updateMonsterShake(

  state: MonsterShakeState,

  body: Container,

  now: number,

  dt: number,

): void {

  const targetAmp = now < state.shakeUntil ? HIT_SHAKE_AMP_PX : 0;

  const blend = 1 - Math.exp(-HIT_SHAKE_AMP_DECAY * dt);

  state.shakeAmp += (targetAmp - state.shakeAmp) * blend;



  if (state.shakeAmp > 0.02) {

    state.shakePhase += dt * HIT_SHAKE_FREQ;

    body.position.set(

      Math.sin(state.shakePhase) * state.shakeAmp,

      Math.cos(state.shakePhase * 1.37) * state.shakeAmp,

    );

  } else {

    state.shakeAmp = 0;

    body.position.set(0, 0);

  }

}


