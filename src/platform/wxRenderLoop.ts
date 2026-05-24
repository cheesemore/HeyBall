import type { Application } from 'pixi.js';
import { TARGET_FPS } from '../config/gameBalance';
import { wxAnimationFrameSource, wxRequestAnimationFrame } from './wxAnimationFrame';

type TickFn = (dt: number) => void;

const listeners: TickFn[] = [];
let running = false;
let lastMs = 0;

/** 驱动渲染（wx / canvas / setTimeout 帧循环） */
export function startWxRenderLoop(app: Application): void {
  if (running) return;
  running = true;
  lastMs = Date.now();

  const maxDt = (1 / TARGET_FPS) * 2;

  const frame = () => {
    wxRequestAnimationFrame(frame);

    const now = Date.now();
    let dt = (now - lastMs) / 1000;
    lastMs = now;
    if (dt > maxDt) dt = maxDt;

    app.renderer.render({ container: app.stage });

    for (const fn of listeners) fn(dt);
  };

  wxRequestAnimationFrame(frame);
  console.info('[HeyBall wx] render loop started via', wxAnimationFrameSource);
}

export function onWxFrame(fn: TickFn): void {
  listeners.push(fn);
}
