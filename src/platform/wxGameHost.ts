import { Application } from 'pixi.js';
import { audioEngine } from '../audio/audioEngine';
import type { GameHost } from './gameHost';
import { getWxScreenCanvas } from './wxAdapter';
import { getWxViewSize, layoutWxGameStage } from './wxCanvasLayout';

const DEEP_BLUE = 0x0b1a3d;

export function createWxGameHost(): GameHost {
  return {
    isWx: true,

    async createApplication(): Promise<Application> {
      const canvas = getWxScreenCanvas();
      const { viewW, viewH, dpr } = getWxViewSize();
      const app = new Application();
      await app.init({
        canvas: canvas as unknown as HTMLCanvasElement,
        width: viewW,
        height: viewH,
        background: DEEP_BLUE,
        antialias: true,
        resolution: dpr,
        autoDensity: true,
        preference: 'webgl',
      });
      app.renderer.background.color = DEEP_BLUE;
      app.renderer.background.alpha = 1;
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      console.info(
        '[HeyBall wx] canvas',
        canvas.width,
        canvas.height,
        'screen',
        viewW,
        viewH,
        'dpr',
        dpr,
        'renderer',
        app.renderer.type,
      );
      app.render();
      return app;
    },

    mountApplication(_app: Application): void {
      /* 布局在 createContentRoot */
    },

    createContentRoot(app: Application) {
      return layoutWxGameStage(app);
    },

    bindAudioUnlock(): void {
      wx.onTouchStart(() => {
        audioEngine.unlock();
      });
    },

    showFatalError(message: string): void {
      console.error('[HeyBall]', message);
    },
  };
}
