import { DOMParser } from '@xmldom/xmldom';
import { DOMAdapter } from 'pixi.js';
import { isWxGame } from './env';

type Ctx2dCtor = typeof CanvasRenderingContext2D;
type GlCtor = typeof WebGLRenderingContext;

let ctx2dCtor: Ctx2dCtor | null = null;
let glCtor: GlCtor | null = null;

const emptyFontFaceSet = {
  ready: Promise.resolve(),
  add: () => undefined,
  delete: () => undefined,
};

function patchGlobalConstructors(): void {
  const g = globalThis as Record<string, unknown>;
  if (!ctx2dCtor) {
    // 勿占用首个屏幕 canvas；用共享离屏画布探测
    const probeCanvas = (g.__wxOffscreenCanvas as WechatMinigame.Canvas | undefined)
      ?? wx.createCanvas();
    g.__wxOffscreenCanvas = probeCanvas;
    const probe = probeCanvas.getContext('2d');
    if (probe?.constructor) {
      ctx2dCtor = probe.constructor as Ctx2dCtor;
    } else {
      ctx2dCtor = { prototype: {} } as Ctx2dCtor;
    }
    g.CanvasRenderingContext2D = ctx2dCtor;
  }
  if (!glCtor) {
    const g2 = globalThis as { __wxOffscreenCanvas?: WechatMinigame.Canvas };
    const probeCanvas = g2.__wxOffscreenCanvas ?? wx.createCanvas();
    g2.__wxOffscreenCanvas = probeCanvas;
    const gl = probeCanvas.getContext('webgl');
    if (gl?.constructor) {
      glCtor = gl.constructor as GlCtor;
    } else {
      glCtor = { prototype: {} } as GlCtor;
    }
    g.WebGLRenderingContext = glCtor;
  }
}

function wxFetch(url: string, options?: RequestInit): Promise<Response> {
  if (typeof fetch === 'function' && /^https?:\/\//i.test(url)) {
    return fetch(url, options);
  }

  return new Promise((resolve, reject) => {
    const isRemote = /^https?:\/\//i.test(url);
    if (isRemote) {
      wx.request({
        url,
        method: (options?.method as string) ?? 'GET',
        responseType: 'arraybuffer',
        success(res) {
          const buf = res.data as ArrayBuffer;
          resolve(
            new Response(buf, {
              status: res.statusCode ?? 200,
            }),
          );
        },
        fail: reject,
      });
      return;
    }

    try {
      const fs = wx.getFileSystemManager();
      const data = fs.readFileSync(url) as ArrayBuffer;
      resolve(new Response(data, { status: 200 }));
    } catch (e) {
      reject(e);
    }
  });
}

const WxPixiAdapter = {
  createCanvas(width?: number, height?: number) {
    const g = globalThis as { __wxOffscreenCanvas?: WechatMinigame.Canvas };
    const canvas = g.__wxOffscreenCanvas ?? wx.createCanvas();
    if (!g.__wxOffscreenCanvas) g.__wxOffscreenCanvas = canvas;
    if (width != null) canvas.width = width;
    if (height != null) canvas.height = height;
    return canvas as unknown as HTMLCanvasElement;
  },

  createImage() {
    return wx.createImage() as unknown as HTMLImageElement;
  },

  getCanvasRenderingContext2D(): Ctx2dCtor {
    patchGlobalConstructors();
    return ctx2dCtor!;
  },

  getWebGLRenderingContext(): GlCtor {
    patchGlobalConstructors();
    return glCtor!;
  },

  getNavigator(): Navigator {
    return {
      userAgent: 'WeChatMiniGame',
      gpu: undefined,
    } as unknown as Navigator;
  },

  getBaseUrl(): string {
    return '';
  },

  getFontFaceSet(): FontFaceSet {
    return emptyFontFaceSet as unknown as FontFaceSet;
  },

  fetch(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const href = typeof url === 'string' ? url : url.toString();
    return wxFetch(href, options);
  },

  parseXML(xml: string): Document {
    return new DOMParser().parseFromString(xml, 'text/xml') as unknown as Document;
  },
};

/** 将 Pixi DOMAdapter 切到微信实现（须在创建 Application 之前） */
export function installWxPixiAdapter(): void {
  if (!isWxGame()) return;
  patchGlobalConstructors();
  DOMAdapter.set(WxPixiAdapter);
}
