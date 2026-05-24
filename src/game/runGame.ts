import { Container, Graphics } from 'pixi.js';
import { TARGET_FPS } from '../config/gameBalance';
import type { GameHost } from '../platform/gameHost';
import { loadWxSubpackage } from '../platform/wxSubpackage';
import { initBallTextures } from './ballTextures';
import { initMonsterTextures } from './monsterTextures';
import { AssetLoadingScreen } from './screens/AssetLoadingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { GameManager } from './gameManager';
import { GAME_WIDTH, layout, BATTLE_WIDTH } from '../layout';

const LINE_WALL = 0xe8c547;
const LINE_SPAWN = 0xff6b6b;
const BATTLE_STROKE = 0x3d6bff;
const MERGE_FILL = 0x122a52;
const RESERVED_FILL = 0x0f2244;
const CENTER_DOT = 0xff2222;

export async function runGame(host: GameHost): Promise<void> {
  host.bindAudioUnlock();

  const app = await host.createApplication();
  host.mountApplication(app);

  const root = host.createContentRoot(app);
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.ticker.maxFPS = TARGET_FPS;
  if (!app.ticker.started) {
    app.ticker.start();
  }

  const login = new LoginScreen();
  root.addChild(login);
  if (!host.isWx) {
    login.mountNicknameInput(app.canvas as HTMLCanvasElement);
  }
  const loginResult = await login.waitForStart();
  login.teardownDom();
  login.destroy({ children: true });
  if (loginResult.nickname) {
    console.info('[login]', loginResult.nickname);
  }

  if (host.isWx) {
    try {
      await loadWxSubpackage('monsters');
    } catch (e) {
      console.warn('[wx] monsters subpackage', e);
    }
  }

  const loading = new AssetLoadingScreen();
  root.addChild(loading);

  const loadOutcome = await loading.run();
  loading.destroy({ children: true });

  if (!loadOutcome.ok) {
    console.error(loadOutcome.error);
    host.showFatalError('资源加载失败，请重新打开小游戏。');
    return;
  }
  if (loadOutcome.result.failed > 0) {
    console.warn(
      '[preload] failed assets',
      loadOutcome.result.failedPaths.slice(0, 20),
    );
  }

  await Promise.all([initBallTextures(), initMonsterTextures()]);

  drawZones(root);
  drawLines(root);
  drawCenterDot(root);

  const game = new GameManager(root);

  const maxDt = 1 / TARGET_FPS;
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, maxDt * 2);
    game.tick(dt);
  });
}

function drawZones(parent: Container) {
  const controlZone = new Graphics();
  controlZone.rect(
    layout.control.x,
    layout.control.y,
    layout.control.width,
    layout.control.height,
  );
  controlZone.fill({ color: MERGE_FILL, alpha: 0.25 });
  parent.addChild(controlZone);

  const battle = new Graphics();
  battle.rect(layout.battle.x, layout.battle.y, layout.battle.width, layout.battle.height);
  battle.fill({ color: 0x142d5c, alpha: 0.35 });
  battle.stroke({ width: 2, color: BATTLE_STROKE, alpha: 0.9 });
  parent.addChild(battle);

  const reserved = new Graphics();
  reserved.rect(
    layout.reserved.x,
    layout.reserved.y,
    layout.reserved.width,
    layout.reserved.height,
  );
  reserved.fill({ color: RESERVED_FILL, alpha: 0.7 });
  reserved.stroke({ width: 1, color: 0x2a4a7a, alpha: 0.6 });
  parent.addChild(reserved);
}

function drawLines(parent: Container) {
  const wall = new Graphics();
  wall.moveTo(0, layout.wallY);
  wall.lineTo(BATTLE_WIDTH, layout.wallY);
  wall.stroke({ width: 3, color: LINE_WALL });
  parent.addChild(wall);

  const spawn = new Graphics();
  spawn.moveTo(0, layout.spawnY);
  spawn.lineTo(GAME_WIDTH, layout.spawnY);
  spawn.stroke({ width: 3, color: LINE_SPAWN });
  parent.addChild(spawn);
}

function drawCenterDot(parent: Container) {
  const dot = new Graphics();
  const { x, y } = layout.battleTopCenter;
  dot.circle(x, y, 8);
  dot.fill(CENTER_DOT);
  dot.circle(x, y, 14);
  dot.stroke({ width: 2, color: CENTER_DOT, alpha: 0.45 });
  parent.addChild(dot);
}
