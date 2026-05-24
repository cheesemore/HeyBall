import { Assets, Texture } from 'pixi.js';
import { isWxGame } from '../platform/env';

/**
 * 将 `public/`（Web）或包内 `assets/`（微信）资源路径解析为可加载地址。
 * @param rel 无首斜杠，如 `assets/foo.png`
 */
export function publicAssetUrl(rel: string): string {
  const normalized = rel.replace(/^\/+/, '');
  if (isWxGame()) {
    return normalized;
  }
  const base = import.meta.env.BASE_URL ?? '/';
  const joined =
    !base || base === '/' ? `/${normalized}` : `${base}${normalized}`.replace(/\/{2,}/g, '/');
  if (typeof document !== 'undefined') {
    try {
      const docBase = document.baseURI || window.location?.href;
      if (docBase) return new URL(joined, docBase).href;
    } catch {
      /* ignore */
    }
  }
  return joined;
}

function loadImageTexture(url: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    if (isWxGame()) {
      const img = wx.createImage();
      img.onload = (): void => {
        try {
          resolve(Texture.from(img as unknown as HTMLImageElement));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (): void => reject(new Error(`wx image: ${url}`));
      img.src = url;
      return;
    }

    const img = new Image();
    img.onload = (): void => {
      try {
        resolve(Texture.from(img));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (): void => reject(new Error('Image.onerror'));
    img.src = url;
  });
}

/** 加载纹理（url 须为 publicAssetUrl 得到的地址） */
export async function loadPublicTexture(url: string): Promise<Texture> {
  try {
    return await loadImageTexture(url);
  } catch {
    if (isWxGame()) {
      throw new Error(`loadPublicTexture failed: ${url}`);
    }
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return Texture.from(await createImageBitmap(blob));
    } catch {
      return await Assets.load<Texture>(url);
    }
  }
}
