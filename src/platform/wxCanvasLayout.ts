import type { Application } from 'pixi.js';
import { Container, Graphics, Rectangle } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../layout';
import { getWxScreenCanvas } from './wxAdapter';

const DEEP_BLUE = 0x0b1a3d;

type WxCanvas = WechatMinigame.Canvas & {
  addEventListener?: (
    type: string,
    listener: (ev: unknown) => void,
    options?: unknown,
  ) => void;
  removeEventListener?: (type: string, listener: (ev: unknown) => void) => void;
};

export function getWxViewSize(): { viewW: number; viewH: number; dpr: number } {
  const sys = wx.getSystemInfoSync();
  return {
    viewW: sys.windowWidth || sys.screenWidth,
    viewH: sys.windowHeight || sys.screenHeight,
    dpr: sys.pixelRatio || 1,
  };
}

/**
 * 渲染器按屏幕像素（390×844 等），游戏内容按 1024×1280 设计稿缩放居中。
 */
export function layoutWxGameStage(app: Application): Container {
  const { viewW, viewH } = getWxViewSize();
  const scale = Math.min(viewW / GAME_WIDTH, viewH / GAME_HEIGHT);
  const offsetX = (viewW - GAME_WIDTH * scale) / 2;
  const offsetY = (viewH - GAME_HEIGHT * scale) / 2;

  app.renderer.background.color = DEEP_BLUE;
  app.renderer.background.alpha = 1;

  const backdrop = new Graphics();
  backdrop.rect(0, 0, viewW, viewH).fill(DEEP_BLUE);
  app.stage.addChild(backdrop);

  const root = new Container();
  root.label = 'gameRoot';
  root.scale.set(scale);
  root.position.set(offsetX, offsetY);
  root.eventMode = 'static';
  root.hitArea = new Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT);
  app.stage.addChild(root);

  patchWxCanvasTouch(getWxScreenCanvas() as WxCanvas);

  console.info('[HeyBall wx] layout', {
    viewW,
    viewH,
    scale: scale.toFixed(3),
    offsetX: offsetX.toFixed(1),
    offsetY: offsetY.toFixed(1),
    canvasW: getWxScreenCanvas().width,
    canvasH: getWxScreenCanvas().height,
  });

  return root;
}

function patchWxCanvasTouch(canvas: WxCanvas): void {
  if (canvas.addEventListener) return;

  type Listener = (ev: unknown) => void;
  const buckets = new Map<string, Set<Listener>>();

  const add = (type: string, fn: Listener) => {
    let set = buckets.get(type);
    if (!set) {
      set = new Set();
      buckets.set(type, set);
    }
    set.add(fn);
  };

  canvas.addEventListener = (type, listener) => {
    add(type, listener as Listener);
  };

  canvas.removeEventListener = (type, listener) => {
    buckets.get(type)?.delete(listener as Listener);
  };

  const emit = (type: string, clientX: number, clientY: number) => {
    const ev = {
      type,
      clientX,
      clientY,
      offsetX: clientX,
      offsetY: clientY,
      pointerId: 1,
      button: 0,
      isPrimary: true,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    };
    for (const fn of buckets.get(type) ?? []) fn(ev);
  };

  const dispatch = (phase: string, x: number, y: number) => {
    const types =
      phase === 'start'
        ? ['touchstart', 'pointerdown', 'mousedown']
        : phase === 'move'
          ? ['touchmove', 'pointermove', 'mousemove']
          : ['touchend', 'pointerup', 'mouseup', 'pointerupoutside'];
    for (const t of types) emit(t, x, y);
  };

  wx.onTouchStart((res) => {
    const t = res.touches[0];
    if (t) dispatch('start', t.clientX, t.clientY);
  });
  wx.onTouchMove((res) => {
    const t = res.touches[0];
    if (t) dispatch('move', t.clientX, t.clientY);
  });
  wx.onTouchEnd((res) => {
    const t = res.changedTouches[0];
    if (t) dispatch('end', t.clientX, t.clientY);
  });
}
