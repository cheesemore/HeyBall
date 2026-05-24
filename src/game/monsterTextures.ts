import { Sprite, Texture } from 'pixi.js';
import type { MonsterTypeId } from '../config/monsterTable';
import { getSpecialMonsterDef } from '../config/specialMonsters';
import { loadPublicTexture, publicAssetUrl } from './loadPublicTexture';
import { NORMAL_BLOCK_CENTER_SIZE } from '../battle/blockHitFeedback';

export const SLIME_IDLE_FRAME_COUNT = 8;
/** 普通呼吸一圈 1 秒 */
export const SLIME_IDLE_CYCLE_SLOW = 1;
/** 挨打强压缩一圈 0.25 秒 */
export const SLIME_IDLE_CYCLE_HIT = 0.25;

const NO_SLIME: ReadonlySet<MonsterTypeId> = new Set(['elite', 'boss']);

const idleFramesByKey = new Map<string, Texture[]>();
const hitFramesByKey = new Map<string, Texture[]>();

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
  return !NO_SLIME.has(typeId);
}

export function slimeIdleKeyForType(typeId: MonsterTypeId): string | null {
  if (!monsterHasSlime(typeId)) return null;
  if (typeId === 'normal') return 'normal';
  if (typeId === 'airdrop_blue' || typeId === 'airdrop_red') return typeId;
  const def = getSpecialMonsterDef(typeId);
  if (def) return `special_${def.kind}`;
  return null;
}

function framesFor(key: string, hit: boolean): Texture[] | undefined {
  return hit ? hitFramesByKey.get(key) : idleFramesByKey.get(key);
}

export function hasSlimeIdleFrames(key: string): boolean {
  const idle = idleFramesByKey.get(key);
  const hit = hitFramesByKey.get(key);
  return (
    idle != null &&
    hit != null &&
    idle.length === SLIME_IDLE_FRAME_COUNT &&
    hit.length === SLIME_IDLE_FRAME_COUNT
  );
}

export function slimeIdleTextureAtPhase(
  key: string,
  phase: number,
  hitMode: boolean,
): Texture {
  const frames = framesFor(key, hitMode);
  if (!frames?.length) throw new Error(`missing slime idle: ${key} hit=${hitMode}`);
  const t = ((phase % 1) + 1) % 1;
  const idx = Math.floor(t * SLIME_IDLE_FRAME_COUNT) % SLIME_IDLE_FRAME_COUNT;
  return frames[idx]!;
}

export function tickSlimeIdle(state: SlimeIdleState, dt: number): void {
  const prev = state.phase;
  state.phase = (state.phase + dt / state.cycleSec) % 1;
  if (state.phase < prev) {
    if (!state.hitThisCycle) {
      state.hitMode = false;
      state.cycleSec = SLIME_IDLE_CYCLE_SLOW;
    }
    state.hitThisCycle = false;
  }
}

export function notifySlimeHit(state: SlimeIdleState): void {
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

  const keys = new Set<string>(['normal']);
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
    [...keys].flatMap((key) => [
      loadFrameSet(key, false, idleFramesByKey).catch((e) => {
        console.warn('[monsterTextures] idle load failed', key, e);
      }),
      loadFrameSet(key, true, hitFramesByKey).catch((e) => {
        console.warn('[monsterTextures] hit idle load failed', key, e);
      }),
    ]),
  );
}

function applySlimeLayout(sprite: Sprite): void {
  sprite.anchor.set(0.5, 1);
  sprite.scale.set(NORMAL_BLOCK_CENTER_SIZE / 64);
}

export function createMonsterSlimeSprite(typeId: MonsterTypeId): Sprite | null {
  const key = slimeIdleKeyForType(typeId);
  if (!key || !hasSlimeIdleFrames(key)) return null;
  const spr = new Sprite(slimeIdleTextureAtPhase(key, 0, false));
  applySlimeLayout(spr);
  return spr;
}
