import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { formatAppVersion } from '../../config/version';
import { isWxGame } from '../../platform/env';
import { gameStorage } from '../../platform/storage';
import { GAME_HEIGHT, GAME_WIDTH } from '../../layout';

const BG = 0x0b1a3d;
const ACCENT = 0xe8c547;
const PANEL = 0x122a52;
const MUTED = 0x94a3b8;

const NICKNAME_KEY = 'heyball_nickname';

export interface LoginResult {
  nickname: string;
}

/**
 * 进入游戏前的登录 / 开始界面；左上角显示版本号。
 */
export class LoginScreen extends Container {
  private readonly startBtn: Container;
  private inputEl: HTMLInputElement | null = null;
  private resolveStart: ((result: LoginResult) => void) | null = null;

  constructor() {
    super();
    this.eventMode = 'static';
    this.hitArea = new Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(BG);
    this.addChild(bg);

    const version = new Text({
      text: formatAppVersion(),
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 18,
        fill: MUTED,
        fontWeight: '600',
      },
    });
    version.position.set(20, 16);
    this.addChild(version);

    const title = new Text({
      text: '弹球塔防',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 56,
        fill: 0xf1f5f9,
        fontWeight: '800',
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(GAME_WIDTH / 2, Math.round(GAME_HEIGHT * 0.28));
    this.addChild(title);

    const sub = new Text({
      text: 'HeyBall',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 22,
        fill: ACCENT,
        fontWeight: '700',
        letterSpacing: 2,
      },
    });
    sub.anchor.set(0.5, 0);
    sub.position.set(GAME_WIDTH / 2, title.y + 68);
    this.addChild(sub);

    const hint = new Text({
      text: isWxGame()
        ? '点击开始游戏'
        : '点击下方按钮开始冒险',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 20,
        fill: MUTED,
        fontWeight: '500',
      },
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(GAME_WIDTH / 2, sub.y + 120);
    this.addChild(hint);

    this.startBtn = this.createStartButton();
    this.startBtn.position.set(GAME_WIDTH / 2, Math.round(GAME_HEIGHT * 0.62));
    this.addChild(this.startBtn);

    const footer = new Text({
      text: '© HeyBall',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 14,
        fill: 0x475569,
        fontWeight: '500',
      },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(GAME_WIDTH / 2, GAME_HEIGHT - 48);
    this.addChild(footer);
  }

  /** 挂载昵称输入框（DOM，叠在 canvas 上） */
  mountNicknameInput(canvas: HTMLCanvasElement): void {
    if (this.inputEl) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 16;
    input.placeholder = '昵称（可选）';
    input.autocomplete = 'username';
    input.spellcheck = false;
    const saved = gameStorage.getItem(NICKNAME_KEY);
    if (saved) input.value = saved;

    Object.assign(input.style, {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -72px)',
      width: '280px',
      maxWidth: '80vw',
      padding: '12px 16px',
      fontSize: '16px',
      fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
      borderRadius: '10px',
      border: '2px solid #2a4a7a',
      background: '#0f2244',
      color: '#f1f5f9',
      outline: 'none',
      zIndex: '10',
      boxSizing: 'border-box',
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.tryStart();
    });

    const reposition = () => this.positionInput(canvas, input);
    reposition();
    window.addEventListener('resize', reposition);

    this.inputEl = input;
    (this as LoginScreen & { _repositionInput?: () => void })._repositionInput =
      reposition;
    document.body.appendChild(input);
    input.focus();
  }

  private positionInput(canvas: HTMLCanvasElement, input: HTMLInputElement): void {
    const rect = canvas.getBoundingClientRect();
    const scaleY = rect.height / GAME_HEIGHT;
    const centerY = rect.top + (GAME_HEIGHT * 0.52) * scaleY;
    input.style.left = `${rect.left + rect.width / 2}px`;
    input.style.top = `${centerY}px`;
    input.style.transform = 'translate(-50%, -50%)';
    input.style.width = `${Math.min(320, rect.width * 0.72)}px`;
  }

  private createStartButton(): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const w = 280;
    const h = 56;
    const g = new Graphics();
    const draw = (hover: boolean) => {
      g.clear();
      g.roundRect(-w / 2, -h / 2, w, h, 14);
      g.fill({ color: hover ? ACCENT : PANEL, alpha: hover ? 1 : 0.95 });
      g.stroke({ width: 2, color: hover ? 0xffffff : ACCENT, alpha: hover ? 0.35 : 0.85 });
    };
    draw(false);
    btn.addChild(g);

    const label = new Text({
      text: '开始游戏',
      style: {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: 26,
        fill: ACCENT,
        fontWeight: '800',
      },
    });
    label.anchor.set(0.5);
    btn.addChild(label);

    btn.on('pointerover', () => {
      draw(true);
      label.style.fill = 0x0b1a3d;
    });
    btn.on('pointerout', () => {
      draw(false);
      label.style.fill = ACCENT;
    });
    btn.on('pointertap', () => this.tryStart());

    return btn;
  }

  private tryStart(): void {
    if (!this.resolveStart) return;
    const nickname = isWxGame()
      ? (gameStorage.getItem(NICKNAME_KEY) ?? '玩家')
      : (this.inputEl?.value.trim() ?? '');
    if (nickname) gameStorage.setItem(NICKNAME_KEY, nickname);
    else gameStorage.removeItem(NICKNAME_KEY);
    const resolve = this.resolveStart;
    this.resolveStart = null;
    resolve({ nickname });
  }

  /** 用户点击开始或按 Enter 后 resolve */
  waitForStart(): Promise<LoginResult> {
    return new Promise((resolve) => {
      this.resolveStart = resolve;
    });
  }

  teardownDom(): void {
    const self = this as LoginScreen & { _repositionInput?: () => void };
    if (self._repositionInput) {
      window.removeEventListener('resize', self._repositionInput);
      self._repositionInput = undefined;
    }
    this.inputEl?.remove();
    this.inputEl = null;
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    this.teardownDom();
    super.destroy(options);
  }
}
