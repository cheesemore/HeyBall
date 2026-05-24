/** 微信端 requestAnimationFrame（wx / canvas / setTimeout 回退） */

export type WxFrameCallback = (timestamp: number) => void;

let rafImpl: ((cb: WxFrameCallback) => number) | null = null;
let cafImpl: ((id: number) => void) | null = null;
export let wxAnimationFrameSource = 'none';

export function installWxAnimationFrame(
  screenCanvas?: WechatMinigame.Canvas,
): void {
  if (typeof wx.requestAnimationFrame === 'function') {
    rafImpl = (cb) => wx.requestAnimationFrame(cb);
    cafImpl = (id) => {
      if (typeof wx.cancelAnimationFrame === 'function') {
        wx.cancelAnimationFrame(id);
      }
    };
    wxAnimationFrameSource = 'wx';
    return;
  }

  const canvas = screenCanvas as WechatMinigame.Canvas & {
    requestAnimationFrame?: (cb: WxFrameCallback) => number;
    cancelAnimationFrame?: (id: number) => void;
  };
  if (canvas?.requestAnimationFrame) {
    rafImpl = (cb) => canvas.requestAnimationFrame!(cb);
    cafImpl = (id) => canvas.cancelAnimationFrame?.(id);
    wxAnimationFrameSource = 'canvas';
    return;
  }

  const ms = Math.round(1000 / 60);
  const g = globalThis as typeof globalThis & {
    setTimeout: typeof setTimeout;
    clearTimeout: typeof clearTimeout;
  };
  rafImpl = (cb) =>
    g.setTimeout(() => cb(Date.now()), ms) as unknown as number;
  cafImpl = (id) => g.clearTimeout(id);
  wxAnimationFrameSource = 'setTimeout';
}

export function wxRequestAnimationFrame(cb: WxFrameCallback): number {
  if (!rafImpl) installWxAnimationFrame();
  return rafImpl!(cb);
}

export function wxCancelAnimationFrame(id: number): void {
  cafImpl?.(id);
}

export function patchGlobalAnimationFrame(
  screenCanvas?: WechatMinigame.Canvas,
): void {
  installWxAnimationFrame(screenCanvas);
  if (!rafImpl) return;

  const g = globalThis as typeof globalThis & {
    requestAnimationFrame?: typeof requestAnimationFrame;
    cancelAnimationFrame?: typeof cancelAnimationFrame;
    GameGlobal?: typeof globalThis;
  };

  g.requestAnimationFrame = (cb: FrameRequestCallback) =>
    rafImpl!((t) => cb(t));
  g.cancelAnimationFrame = (id) => cafImpl!(id);

  const gg = g.GameGlobal as typeof g & {
    requestAnimationFrame?: typeof requestAnimationFrame;
    cancelAnimationFrame?: typeof cancelAnimationFrame;
  };
  if (gg) {
    gg.requestAnimationFrame = g.requestAnimationFrame;
    gg.cancelAnimationFrame = g.cancelAnimationFrame;
  }
}
