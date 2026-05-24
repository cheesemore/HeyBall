/**
 * 微信真机 JS 环境可能缺少 window / navigator / setTimeout 等 Web 全局量。
 * 必须在 import pixi.js 之前执行（game.wx.ts 首行引入）。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WxGlobal = any;

function wxGlobalRoots(): WxGlobal[] {
  const roots: WxGlobal[] = [];
  if (typeof globalThis !== 'undefined') roots.push(globalThis as WxGlobal);
  if (typeof GameGlobal !== 'undefined') {
    const gg = GameGlobal as WxGlobal;
    if (!roots.includes(gg)) roots.push(gg);
  }
  return roots;
}

function copyTimerApi(
  from: WxGlobal,
  to: WxGlobal,
  key: 'setTimeout' | 'clearTimeout' | 'setInterval' | 'clearInterval',
): void {
  const fn = from[key];
  if (typeof fn !== 'function' || typeof to[key] === 'function') return;
  (to as Record<string, unknown>)[key] = fn.bind(from);
}

/** 在多个 global 根对象之间同步定时器 API */
function syncTimersAcrossRoots(roots: WxGlobal[]): void {
  const donor = roots.find(
    (r) =>
      typeof r.setTimeout === 'function' &&
      typeof r.clearTimeout === 'function',
  );
  if (donor) {
    for (const root of roots) {
      copyTimerApi(donor, root, 'setTimeout');
      copyTimerApi(donor, root, 'clearTimeout');
      copyTimerApi(donor, root, 'setInterval');
      copyTimerApi(donor, root, 'clearInterval');
    }
    return;
  }

  const host = roots[0];
  if (!host || typeof host.setTimeout === 'function') return;
  installTimerPolyfill(host);
  for (let i = 1; i < roots.length; i++) {
    copyTimerApi(host, roots[i], 'setTimeout');
    copyTimerApi(host, roots[i], 'clearTimeout');
    copyTimerApi(host, roots[i], 'setInterval');
    copyTimerApi(host, roots[i], 'clearInterval');
  }
}

/** 用 wx.requestAnimationFrame 实现 setTimeout（真机无原生定时器时） */
function installTimerPolyfill(g: WxGlobal): void {
  type Job = { fn: () => void; end: number };
  const pending = new Map<number, Job>();
  let nextId = 1;
  let loopScheduled = false;

  const pump = () => {
    loopScheduled = false;
    const now = Date.now();
    for (const [id, job] of [...pending.entries()]) {
      if (now >= job.end) {
        pending.delete(id);
        try {
          job.fn();
        } catch (e) {
          console.error('[HeyBall wx] timer callback', e);
        }
      }
    }
    if (pending.size > 0) schedulePump();
  };

  const schedulePump = () => {
    if (loopScheduled) return;
    loopScheduled = true;
    if (typeof wx !== 'undefined' && typeof wx.requestAnimationFrame === 'function') {
      wx.requestAnimationFrame(pump);
      return;
    }
    const canvas = g.canvas as WechatMinigame.Canvas & {
      requestAnimationFrame?: (cb: () => void) => number;
    };
    if (canvas?.requestAnimationFrame) {
      canvas.requestAnimationFrame(pump);
      return;
    }
    pump();
  };

  g.setTimeout = ((fn: () => void, delay = 0) => {
    const id = nextId++;
    pending.set(id, { fn, end: Date.now() + Math.max(0, delay) });
    schedulePump();
    return id;
  }) as typeof setTimeout;

  g.clearTimeout = ((id: number) => {
    pending.delete(id);
  }) as typeof clearTimeout;

  const intervals = new Map<
    number,
    { fn: () => void; ms: number; next: number }
  >();
  let intervalId = 1;

  g.setInterval = ((fn: () => void, ms = 0) => {
    const id = intervalId++;
    const period = Math.max(0, ms);
    intervals.set(id, { fn, ms: period, next: Date.now() + period });
    const tick = () => {
      const job = intervals.get(id);
      if (!job) return;
      const now = Date.now();
      if (now >= job.next) {
        try {
          job.fn();
        } catch (e) {
          console.error('[HeyBall wx] interval callback', e);
        }
        job.next = now + job.ms;
      }
      g.setTimeout!(tick, 16);
    };
    g.setTimeout!(tick, period);
    return id;
  }) as typeof setInterval;

  g.clearInterval = ((id: number) => {
    intervals.delete(id);
  }) as typeof clearInterval;
}

function installNavigator(g: WxGlobal): void {
  if (g.navigator) return;
  const sys =
    typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function'
      ? wx.getSystemInfoSync()
      : null;
  const platform =
    (sys as { platform?: string } | null)?.platform ?? 'wechat';
  g.navigator = {
    userAgent: `WeChatMiniGame/${platform}`,
    platform: platform === 'ios' ? 'iPhone' : platform,
    maxTouchPoints: 5,
    language: 'zh-CN',
    gpu: undefined,
  } as unknown as Navigator;
}

function installWindowAlias(g: WxGlobal): void {
  if (!g.window) g.window = g as WxGlobal;
}

export function installWxGlobals(): void {
  const roots = wxGlobalRoots();
  if (roots.length === 0) return;

  syncTimersAcrossRoots(roots);

  for (const root of roots) {
    installNavigator(root);
    installWindowAlias(root);
    if (!root.window) root.window = root as WxGlobal;
    if (!root.navigator && roots[0].navigator) {
      root.navigator = roots[0].navigator;
    }
  }

  const host = roots[0];
  const hasTimer = typeof host.setTimeout === 'function';
  console.info(
    '[HeyBall wx] globals',
    'setTimeout',
    hasTimer ? 'ok' : 'missing',
    'navigator',
    host.navigator ? 'ok' : 'missing',
  );
}

installWxGlobals();
