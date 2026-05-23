import { audioEngine } from './audioEngine';

class CollisionSfx {
  playWallBounce(strength: number): void {
    const s = Math.max(0.15, Math.min(1, strength));
    audioEngine.playOsc({
      key: 'wall',
      minGapMs: 32,
      type: 'triangle',
      startHz: 520 + 280 * s,
      endHz: Math.max(80, 520 * 0.7),
      duration: 0.055,
      gain: 0.09 * (0.35 + s * 0.65),
    });
  }

  playBlockHit(strength: number): void {
    const s = Math.max(0.15, Math.min(1, strength));
    const gain = 0.11 * (0.35 + s * 0.65);
    audioEngine.playOsc({
      key: 'block',
      minGapMs: 26,
      type: 'square',
      startHz: 220 + 160 * s,
      endHz: Math.max(80, 220 * 0.7),
      duration: 0.07,
      gain,
    });
    audioEngine.playNoiseBurst({
      key: 'block_n',
      minGapMs: 26,
      duration: 0.028,
      gain: gain * 0.45,
      highpassHz: 900,
    });
  }
}

export const collisionSfx = new CollisionSfx();

export { bindAudioUnlock as bindCollisionSfxUnlock } from './audioEngine';

function bounceStrength(vx: number, vy: number): number {
  return Math.min(1, Math.hypot(vx, vy) / 850);
}

export function sfxWallBounce(vx: number, vy: number): void {
  collisionSfx.playWallBounce(bounceStrength(vx, vy));
}

export function sfxBlockHit(vx: number, vy: number): void {
  collisionSfx.playBlockHit(bounceStrength(vx, vy));
}
