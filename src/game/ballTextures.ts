import { Sprite, Texture } from 'pixi.js';
import { ALL_BALL_COLORS, type BallColor } from '../ballTypes';
import { loadPublicTexture, publicAssetUrl } from './loadPublicTexture';

const textures = new Map<BallColor, Texture>();

export function ballTextureRel(color: BallColor): string {
  return `assets/balls/ball_${color}.png`;
}

export async function initBallTextures(): Promise<void> {
  textures.clear();
  await Promise.all(
    ALL_BALL_COLORS.map(async (color) => {
      try {
        const tex = await loadPublicTexture(publicAssetUrl(ballTextureRel(color)));
        textures.set(color, tex);
      } catch (e) {
        console.warn('[ballTextures] load failed', color, e);
      }
    }),
  );
}

export function getBallTexture(color: BallColor): Texture | undefined {
  return textures.get(color);
}

export function hasBallTexture(color: BallColor): boolean {
  return textures.has(color);
}

/** 正圆贴图，直径 = 2×半径 */
export function createBallSprite(color: BallColor, diameter: number): Sprite | null {
  const tex = getBallTexture(color);
  if (!tex) return null;
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5);
  sprite.width = diameter;
  sprite.height = diameter;
  return sprite;
}
