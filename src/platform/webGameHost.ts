import { Application, Container } from 'pixi.js';
import { bindAudioUnlock } from '../audio/audioEngine';
import { GAME_HEIGHT, GAME_WIDTH } from '../layout';
import type { GameHost } from './gameHost';

const DEEP_BLUE = 0x0b1a3d;

export function createWebGameHost(): GameHost {
  return {
    isWx: false,

    async createApplication(): Promise<Application> {
      const app = new Application();
      await app.init({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        background: DEEP_BLUE,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        preference: 'webgl',
      });
      return app;
    },

    createContentRoot(app: Application): Container {
      const root = new Container();
      app.stage.addChild(root);
      return root;
    },

    mountApplication(app: Application): void {
      const mount = document.getElementById('app');
      if (!mount) throw new Error('#app not found');
      mount.replaceChildren(app.canvas);

      const fit = () => {
        const scale = Math.min(
          window.innerWidth / GAME_WIDTH,
          window.innerHeight / GAME_HEIGHT,
        );
        app.canvas.style.width = `${GAME_WIDTH * scale}px`;
        app.canvas.style.height = `${GAME_HEIGHT * scale}px`;
      };
      fit();
      window.addEventListener('resize', fit);
    },

    bindAudioUnlock,

    showFatalError(message: string): void {
      const mount = document.getElementById('app');
      if (mount) mount.textContent = message;
    },
  };
}
