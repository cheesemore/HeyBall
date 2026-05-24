import type { Application, Container } from 'pixi.js';

/** 平台相关启动能力（Web / 微信小游戏） */
export interface GameHost {
  readonly isWx: boolean;
  createApplication(): Promise<Application>;
  mountApplication(app: Application): void;
  /** 设计稿坐标系下的内容根节点（微信端会做等比缩放） */
  createContentRoot(app: Application): Container;
  bindAudioUnlock(): void;
  showFatalError(message: string): void;
}
