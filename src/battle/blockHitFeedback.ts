import { Container, Graphics } from 'pixi.js';

import type { MonsterTypeId } from '../config/monsterTable';
import {
  BOSS_FOOTPRINT_W,
  ELITE_FOOTPRINT_W,
} from '../config/monsterSpawn';
import { getSpecialMonsterDef, isSpecialMonsterType } from '../config/specialMonsters';
import { MONSTER_SIZE } from '../layout';



export const BLOCK_CORNER_RADIUS = 6;

/** 灰砖内嵌中灰描边圈（与特殊砖 inset 一致） */
export const NORMAL_BLOCK_INNER_INSET = 9;

export const NORMAL_BLOCK_INNER_RING_COLOR = 0x888888;

export const NORMAL_BLOCK_INNER_RING_WIDTH = 2;

/** 灰砖内圈（中灰描边以内）边长，用于居中放置 64px 怪物贴图 */
export const NORMAL_BLOCK_CENTER_SIZE =
  MONSTER_SIZE - NORMAL_BLOCK_INNER_INSET * 2;

export const NORMAL_SLIME_ART_SIZE = 64;
export const ELITE_SLIME_ART_SIZE = 128;
export const BOSS_SLIME_ART_SIZE = 256;

/** 与灰砖相同比例：inset = 9px/格 */
export const ELITE_BLOCK_INNER_INSET =
  NORMAL_BLOCK_INNER_INSET * ELITE_FOOTPRINT_W;
export const BOSS_BLOCK_INNER_INSET =
  NORMAL_BLOCK_INNER_INSET * BOSS_FOOTPRINT_W;

export const ELITE_BLOCK_CENTER_SIZE =
  MONSTER_SIZE * ELITE_FOOTPRINT_W - ELITE_BLOCK_INNER_INSET * 2;
export const BOSS_BLOCK_CENTER_SIZE =
  MONSTER_SIZE * BOSS_FOOTPRINT_W - BOSS_BLOCK_INNER_INSET * 2;

/** 精英/首领 UV 活动区内侧（更深红） */
export const ELITE_BLOCK_INNER_FILL = 0x6b1010;
export const BOSS_BLOCK_INNER_FILL = 0x3d000c;
export const ELITE_SLIME_GLOW_COLOR = 0xff5533;
export const BOSS_SLIME_GLOW_COLOR = 0xff3366;

/** 血量数字：砖块右下角留白 */
export const MONSTER_HP_TEXT_INSET = 7;

export const MONSTER_HP_TEXT_FILL = 0xffffff;

export const MONSTER_HP_TEXT_STROKE = 0x000000;

export const MONSTER_HP_TEXT_STROKE_WIDTH = 4;

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
      const innerW = w - inset * 2;
      const innerH = h - inset * 2;
      g.roundRect(inset, inset, innerW, innerH, innerR);
      g.fill({ color: spec.innerColor, alpha: 0.95 });
      if (spec.visualStyle === 'shield') {
        const bandH = Math.min(11, innerH * 0.28);
        g.rect(inset, inset, innerW, bandH);
        g.fill({ color: 0x0a0a0a, alpha: 1 });
      }
    }
    return;
  }

  if (typeId === 'normal') {
    const inset = NORMAL_BLOCK_INNER_INSET;
    g.roundRect(inset, inset, w - inset * 2, h - inset * 2, innerR);
    g.stroke({
      width: NORMAL_BLOCK_INNER_RING_WIDTH,
      color: NORMAL_BLOCK_INNER_RING_COLOR,
      alpha: 0.95,
    });
    return;
  }

  if (typeId === 'elite' || typeId === 'boss') {
    const inset =
      typeId === 'elite' ? ELITE_BLOCK_INNER_INSET : BOSS_BLOCK_INNER_INSET;
    const innerFill =
      typeId === 'elite' ? ELITE_BLOCK_INNER_FILL : BOSS_BLOCK_INNER_FILL;
    g.roundRect(inset, inset, w - inset * 2, h - inset * 2, innerR);
    g.fill({ color: innerFill, alpha: 0.96 });
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



export function getSlimeArtSize(typeId: MonsterTypeId): number {
  if (typeId === 'elite') return ELITE_SLIME_ART_SIZE;
  if (typeId === 'boss') return BOSS_SLIME_ART_SIZE;
  return NORMAL_SLIME_ART_SIZE;
}

export function getSlimeDisplayScale(
  typeId: MonsterTypeId,
): number {
  if (typeId === 'elite') {
    return ELITE_BLOCK_CENTER_SIZE / ELITE_SLIME_ART_SIZE;
  }
  if (typeId === 'boss') {
    return BOSS_BLOCK_CENTER_SIZE / BOSS_SLIME_ART_SIZE;
  }
  return NORMAL_BLOCK_CENTER_SIZE / NORMAL_SLIME_ART_SIZE;
}

export function getSlimeAnchorY(typeId: MonsterTypeId, blockH: number): number {
  if (typeId === 'elite') return blockH - ELITE_BLOCK_INNER_INSET;
  if (typeId === 'boss') return blockH - BOSS_BLOCK_INNER_INSET;
  return blockH - NORMAL_BLOCK_INNER_INSET;
}

/** 精英/首领史莱姆 UV 区外缘柔光 */
export function createSlimeUvGlow(
  typeId: 'elite' | 'boss',
  displayW: number,
  displayH: number,
): Container {
  const root = new Container();
  const g = new Graphics();
  const color =
    typeId === 'elite' ? ELITE_SLIME_GLOW_COLOR : BOSS_SLIME_GLOW_COLOR;
  const cx = 0;
  const cy = -displayH * 0.44;
  for (let i = 5; i >= 1; i--) {
    const t = i / 5;
    g.ellipse(cx, cy, displayW * 0.5 * t, displayH * 0.46 * t);
    g.fill({ color, alpha: 0.055 * t });
  }
  root.addChild(g);
  root.alpha = 0.85;
  return root;
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


