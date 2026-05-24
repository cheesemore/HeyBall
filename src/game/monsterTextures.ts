import { Sprite, Texture } from 'pixi.js';
import type { MonsterTypeId } from '../config/monsterTable';
import { getSpecialMonsterDef } from '../config/specialMonsters';
import {
  getSlimeAnchorY,
  getSlimeArtSize,
  getSlimeDisplayScale,
} from '../battle/blockHitFeedback';
import { loadPublicTexture, publicAssetUrl } from './loadPublicTexture';

export const SLIME_IDLE_FRAME_COUNT = 8;
/** 普通呼吸一圈 1 秒 */
export const SLIME_IDLE_CYCLE_SLOW = 1;
/** 挨打强压缩一圈 0.25 秒（精英/首领无第二套 UV） */
export const SLIME_IDLE_CYCLE_HIT = 0.25;

const idleFramesByKey = new Map<string, Texture[]>();
const hitFramesByKey = new Map<string, Texture[]>();
const BIG_SLIME_KEYS = new Set(['elite', 'boss']);

export type SlimeIdleState = {
  phase: number;
  cycleSec: number;
  hitThisCycle: boolean;
  /** true = 第二套挨打 UV */
  hitMode: boolean;
  slimeKey: string;
};

export function createSlimeIdleState(slimeKey: string): SlimeIdleState {
  return {
    phase: Math.random(),
    cycleSec: SLIME_IDLE_CYCLE_SLOW,
    hitThisCycle: false,
    hitMode: false,
    slimeKey,
  };
}

export function monsterHasSlime(typeId: MonsterTypeId): boolean {
  const key = slimeIdleKeyForType(typeId);
  return key != null && hasSlimeIdleFrames(key);
}

export function slimeIdleKeyForType(typeId: MonsterTypeId): string | null {
  if (typeId === 'elite' || typeId === 'boss') return typeId;
  if (typeId === 'normal') return 'normal';
  if (typeId === 'airdrop_blue' || typeId === 'airdrop_red') return typeId;
  const def = getSpecialMonsterDef(typeId);
  if (def) return `special_${def.kind}`;
  return null;
}

export function slimeSupportsHitAnim(key: string): boolean {
  if (BIG_SLIME_KEYS.has(key)) return false;
  const hit = hitFramesByKey.get(key);
  return hit != null && hit.length === SLIME_IDLE_FRAME_COUNT;
}

function framesFor(key: string, hit: boolean): Texture[] | undefined {
  return hit ? hitFramesByKey.get(key) : idleFramesByKey.get(key);
}

export function hasSlimeIdleFrames(key: string): boolean {
  const idle = idleFramesByKey.get(key);
  if (!idle || idle.length !== SLIME_IDLE_FRAME_COUNT) return false;
  if (BIG_SLIME_KEYS.has(key)) return true;
  const hit = hitFramesByKey.get(key);
  return hit != null && hit.length === SLIME_IDLE_FRAME_COUNT;
}

export function slimeIdleTextureAtPhase(
  key: string,
  phase: number,
  hitMode: boolean,
): Texture {
  const useHit = hitMode && slimeSupportsHitAnim(key);
  const frames = framesFor(key, useHit);
  if (!frames?.length) throw new Error(`missing slime idle: ${key} hit=${useHit}`);
  const t = ((phase % 1) + 1) % 1;
  const idx = Math.floor(t * SLIME_IDLE_FRAME_COUNT) % SLIME_IDLE_FRAME_COUNT;
  return frames[idx]!;
}

export function tickSlimeIdle(state: SlimeIdleState, dt: number): void {
  const prev = state.phase;
  state.phase = (state.phase + dt / state.cycleSec) % 1;
  if (state.phase < prev) {
    if (slimeSupportsHitAnim(state.slimeKey) && !state.hitThisCycle) {
      state.hitMode = false;
      state.cycleSec = SLIME_IDLE_CYCLE_SLOW;
    }
    state.hitThisCycle = false;
  }
}

export function notifySlimeHit(state: SlimeIdleState): void {
  if (!slimeSupportsHitAnim(state.slimeKey)) return;
  state.hitMode = true;
  state.cycleSec = SLIME_IDLE_CYCLE_HIT;
  state.hitThisCycle = true;
}

async function loadFrameSet(
  key: string,
  hit: boolean,
  target: Map<string, Texture[]>,
): Promise<void> {
  const tag = hit ? 'hit' : '';
  const frames: Texture[] = [];
  for (let i = 0; i < SLIME_IDLE_FRAME_COUNT; i++) {
    const mid = tag ? `_${tag}` : '';
    const rel = `assets/monsters/slime_idle_${key}${mid}_${i.toString().padStart(2, '0')}.png`;
    frames.push(await loadPublicTexture(publicAssetUrl(rel)));
  }
  target.set(key, frames);
}

export async function initMonsterTextures(): Promise<void> {
  idleFramesByKey.clear();
  hitFramesByKey.clear();

  const keys = new Set<string>(['normal', 'elite', 'boss']);
  for (const name of [
    'airdrop_blue',
    'airdrop_red',
    'special_copy',
    'special_invincible',
    'special_heal',
    'special_annihilate',
    'special_jump',
    'special_summon',
    'special_shield',
    'special_rebirth',
    'special_regen',
  ]) {
    keys.add(name);
  }

  await Promise.all(
    [...keys].flatMap((key) => {
      const loads: Promise<void>[] = [
        loadFrameSet(key, false, idleFramesByKey).catch((e) => {
          console.warn('[monsterTextures] idle load failed', key, e);
        }),
      ];
      if (!BIG_SLIME_KEYS.has(key)) {
        loads.push(
          loadFrameSet(key, true, hitFramesByKey).catch((e) => {
            console.warn('[monsterTextures] hit idle load failed', key, e);
          }),
        );
      }
      return loads;
    }),
  );
}

function applySlimeLayout(sprite: Sprite, typeId: MonsterTypeId): void {
  sprite.anchor.set(0.5, 1);
  sprite.scale.set(getSlimeDisplayScale(typeId));
}

export function createMonsterSlimeSprite(typeId: MonsterTypeId): Sprite | null {
  const key = slimeIdleKeyForType(typeId);
  if (!key || !hasSlimeIdleFrames(key)) return null;
  const spr = new Sprite(slimeIdleTextureAtPhase(key, 0, false));
  applySlimeLayout(spr, typeId);
  return spr;
}

export function placeMonsterSlimeSprite(
  sprite: Sprite,
  typeId: MonsterTypeId,
  blockW: number,
  blockH: number,
): { displayW: number; displayH: number } {
  const art = getSlimeArtSize(typeId);
  const scale = getSlimeDisplayScale(typeId);
  sprite.position.set(blockW / 2, getSlimeAnchorY(typeId, blockH));
  const displayW = art * scale;
  const displayH = art * scale;
  return { displayW, displayH };
}
