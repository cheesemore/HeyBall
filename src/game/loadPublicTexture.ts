import { Assets, Texture } from 'pixi.js';

/**
 * 将 `public/` 下资源的相对路径解析为绝对 URL（兼容 GitHub Pages 子路径 base）。
 * @param rel 无首斜杠，如 `assets/foo.png`
 */
export function publicAssetUrl(rel: string): string {
  const normalized = rel.replace(/^\/+/, '');
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

function loadTextureViaHtmlImage(url: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
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

/** 加载 `public/` 纹理（url 须为 publicAssetUrl 得到的绝对地址） */
export async function loadPublicTexture(url: string): Promise<Texture> {
  try {
    return await loadTextureViaHtmlImage(url);
  } catch {
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
