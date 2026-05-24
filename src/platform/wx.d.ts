/** 微信小游戏 API（精简声明，供 TypeScript 使用） */
declare const wx: WechatMinigame.Wx;

/** 微信小游戏全局对象（与 globalThis 通常相同，真机上需显式同步 API） */
declare const GameGlobal: typeof globalThis;

declare namespace WechatMinigame {
  interface Wx {
    createCanvas(): Canvas;
    createImage(): Image;
    getSystemInfoSync(): SystemInfo;
    getStorageSync(key: string): unknown;
    setStorageSync(key: string, data: unknown): void;
    removeStorageSync(key: string): void;
    getFileSystemManager(): FileSystemManager;
    loadSubpackage(options: LoadSubpackageOption): LoadSubpackageTask;
    request(options: WxRequestOption): void;
    onTouchStart(callback: (res: WxTouchEvent) => void): void;
    onTouchMove(callback: (res: WxTouchEvent) => void): void;
    onTouchEnd(callback: (res: WxTouchEvent) => void): void;
    requestAnimationFrame(callback: FrameRequestCallback): number;
    cancelAnimationFrame(id: number): void;
    env: { USER_DATA_PATH: string };
  }

  interface WxTouch {
    clientX: number;
    clientY: number;
  }

  interface WxTouchEvent {
    touches: WxTouch[];
    changedTouches: WxTouch[];
  }

  interface WxRequestOption {
    url: string;
    method?: string;
    responseType?: string;
    success?: (res: { data: unknown; statusCode?: number }) => void;
    fail?: (err: unknown) => void;
  }

  interface LoadSubpackageOption {
    name: string;
    success?: () => void;
    fail?: (err: unknown) => void;
  }

  interface LoadSubpackageTask {
    onProgressUpdate?: (cb: (res: { progress: number }) => void) => void;
  }

  interface SystemInfo {
    pixelRatio: number;
    windowWidth: number;
    windowHeight: number;
    screenWidth: number;
    screenHeight: number;
  }

  interface FileSystemManager {
    readFileSync(filePath: string): ArrayBuffer;
  }

  interface Canvas {
    width: number;
    height: number;
    getContext(contextType: '2d' | 'webgl' | 'webgl2'): RenderingContext | null;
    style?: { width?: string; height?: string };
  }

  interface Image {
    width: number;
    height: number;
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  }
}
