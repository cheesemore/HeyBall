import { runGame } from './game/runGame';
import { createWebGameHost } from './platform/webGameHost';

runGame(createWebGameHost()).catch((err) => {
  console.error(err);
  const mount = document.getElementById('app');
  if (mount) mount.textContent = '游戏启动失败，请查看控制台。';
});
