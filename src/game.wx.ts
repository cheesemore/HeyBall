/**
 * 微信小游戏入口（由 vite.config.wx 打包为根目录 game.js）
 */
import './platform/wxBootstrap';
import 'pixi.js/unsafe-eval';
import { installWxAdapter } from './platform/wxAdapter';
import { installWxPixiAdapter } from './platform/wxPixiAdapter';
import { createWxGameHost } from './platform/wxGameHost';
import { runGame } from './game/runGame';

installWxAdapter();
installWxPixiAdapter();

runGame(createWxGameHost()).catch((err) => {
  console.error(err);
});
