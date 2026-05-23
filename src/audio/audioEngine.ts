/** 共享 Web Audio 引擎：解锁、节流、基础振荡器/噪声 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private readonly lastByKey = new Map<string, number>();
  enabled = true;

  unlock(): void {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
    } catch {
      /* ignore */
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on && this.ctx?.state === 'running') {
      void this.ctx.suspend();
    } else if (on) {
      this.unlock();
    }
  }

  getCtx(): AudioContext | null {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  canPlay(key: string, minGapMs: number): boolean {
    const now = performance.now();
    const last = this.lastByKey.get(key) ?? 0;
    if (now - last < minGapMs) return false;
    this.lastByKey.set(key, now);
    return true;
  }

  playOsc(opts: {
    key: string;
    minGapMs: number;
    type: OscillatorType;
    startHz: number;
    endHz?: number;
    duration: number;
    gain: number;
    attack?: number;
  }): void {
    const ctx = this.getCtx();
    if (!ctx || !this.canPlay(opts.key, opts.minGapMs)) return;

    const t0 = ctx.currentTime;
    const attack = opts.attack ?? 0.004;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.startHz, t0);
    if (opts.endHz != null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, opts.endHz),
        t0 + opts.duration,
      );
    }

    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(opts.gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.03);
  }

  playNoiseBurst(opts: {
    key: string;
    minGapMs: number;
    duration: number;
    gain: number;
    highpassHz?: number;
  }): void {
    const ctx = this.getCtx();
    if (!ctx || !this.canPlay(opts.key, opts.minGapMs)) return;

    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * opts.duration));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const env = ctx.createGain();
    env.gain.setValueAtTime(opts.gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = opts.highpassHz ?? 600;
    src.connect(filter);
    filter.connect(env);
    env.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + opts.duration);
  }

  /** 双振荡器短音（技能用） */
  playLayered(opts: {
    key: string;
    minGapMs: number;
    layers: { type: OscillatorType; hz: number; endHz?: number; gain: number }[];
    duration: number;
  }): void {
    const ctx = this.getCtx();
    if (!ctx || !this.canPlay(opts.key, opts.minGapMs)) return;
    const t0 = ctx.currentTime;
    for (const layer of opts.layers) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = layer.type;
      osc.frequency.setValueAtTime(layer.hz, t0);
      if (layer.endHz != null) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(40, layer.endHz),
          t0 + opts.duration,
        );
      }
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(layer.gain, t0 + 0.003);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + opts.duration + 0.02);
    }
  }
}

export const audioEngine = new AudioEngine();

export function bindAudioUnlock(): void {
  const unlock = (): void => {
    audioEngine.unlock();
  };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
}
