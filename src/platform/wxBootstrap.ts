/**
 * 必须在 import pixi.js 之前执行。
 * wxGlobals → 屏幕 canvas → rAF 垫片 → performance
 */
import './wxGlobals';
import { isWxGame } from './env';
import {
  patchGlobalAnimationFrame,
  wxAnimationFrameSource,
} from './wxAnimationFrame';

if (isWxGame()) {
  const g = globalThis as typeof globalThis & {
    canvas?: WechatMinigame.Canvas;
    performance?: Performance;
  };

  if (!g.canvas) {
    g.canvas = wx.createCanvas();
  }

  patchGlobalAnimationFrame(g.canvas);
  console.info('[HeyBall wx] animation frame source:', wxAnimationFrameSource);

  if (!g.performance?.now) {
    g.performance = { now: () => Date.now() } as Performance;
  }

  const gg = (globalThis as { GameGlobal?: typeof globalThis & { canvas?: WechatMinigame.Canvas } })
    .GameGlobal;
  if (gg && !gg.canvas) {
    gg.canvas = g.canvas;
  }
}
