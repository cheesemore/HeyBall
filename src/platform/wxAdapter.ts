import { isWxGame } from './env';
import { gameStorage } from './storage';
/** 安装微信环境垫片（须在 Pixi 初始化前调用一次） */
export function installWxAdapter(): void {
  if (!isWxGame()) return;

  const g = globalThis as typeof globalThis & {
    canvas?: WechatMinigame.Canvas;
    sessionStorage?: Storage;
    devicePixelRatio?: number;
    innerWidth?: number;
    innerHeight?: number;
  };

  if (!g.canvas) {
    g.canvas = wx.createCanvas();
  }

  const sys = wx.getSystemInfoSync();
  g.devicePixelRatio = sys.pixelRatio;
  g.innerWidth = sys.windowWidth;
  g.innerHeight = sys.windowHeight;

  const doc = g as typeof g & { document?: Document };
  if (!doc.document) {
    doc.document = {
      createElement(tagName: string) {
        if (tagName.toLowerCase() === 'canvas') {
          const g = globalThis as { __wxOffscreenCanvas?: WechatMinigame.Canvas };
          const off =
            g.__wxOffscreenCanvas ??
            (() => {
              const c = wx.createCanvas();
              g.__wxOffscreenCanvas = c;
              return c;
            })();
          return off as unknown as HTMLCanvasElement;
        }
        return {} as HTMLElement;
      },
      fonts: {
        ready: Promise.resolve(),
        add: () => undefined,
        delete: () => undefined,
      } as unknown as FontFaceSet,
      baseURI: '',
    } as Document;
  }

  if (!g.sessionStorage) {
    g.sessionStorage = {
      get length() {
        return 0;
      },
      clear() {
        /* wx 无批量 clear，登录页仅用单项 key */
      },
      getItem(key: string) {
        return gameStorage.getItem(key);
      },
      setItem(key: string, value: string) {
        gameStorage.setItem(key, value);
      },
      removeItem(key: string) {
        gameStorage.removeItem(key);
      },
      key() {
        return null;
      },
    } as Storage;
  }
}

export function getWxScreenCanvas(): WechatMinigame.Canvas {
  if (!isWxGame()) {
    throw new Error('getWxScreenCanvas called outside WeChat');
  }
  const g = globalThis as { canvas?: WechatMinigame.Canvas };
  if (!g.canvas) {
    installWxAdapter();
  }
  return g.canvas!;
}
