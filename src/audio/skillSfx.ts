/**
 * 技能 / 终极技 / 特殊怪 音效（Web Audio 合成）
 *
 * | 键名 | 效果 | 触发位置 |
 * |------|------|----------|
 * | warrior_split | 战士分裂 | tryWarriorSplit / tryWarriorBigSplit |
 * | assassin | 刺客伏击 | applyBallHit 刺杀 |
 * | mage_arcane | 法师魔爆 | procMageArcane |
 * | hunter_stack | 猎人叠箭雨层 | afterBounce 叠层成功 |
 * | knight_cross | 骑士十字斩 | procKnightCross |
 * | shaman_chain | 萨满闪电链 | procShamanChain |
 * | warlock_poison_apply | 术士上毒 | applyBallHit 紫球 |
 * | warlock_poison_tick | 术士毒伤跳 | dealWarlockPoisonDamage |
 * | druid_claw | 德鲁伊爪击 | procDruidClaw |
 * | arrow_rain | 猎人箭雨命中 | applyArrowRainStrike |
 * | judgment_start | 末日审判开始 | startJudgmentImmediate |
 * | judgment_wave | 末日审判每一波 | updateJudgmentWaves |
 * | ultimate_phase | 相位空间发动 | startPreparePhaseBuff |
 * | ultimate_frost | 冻狱冥啸发动 | applyFrostUltimateStrike |
 * | annihilate | 湮灭毁球 | applyBallHit 湮灭 |
 * | boss_crush | 首领登场清场 | beginTurnSpawnStep bossCrushed |
 * | special_heal | 特殊怪治疗 | 回合末 heal |
 * | special_spawn | 复制/召唤 | 回合末 spawn |
 * | special_jump | 特殊怪跳跃 | 回合末 jump |
 * | special_detonate | 特殊怪撞墙自爆 | 回合末 jump detonate |
 */
import { audioEngine } from './audioEngine';

export function sfxWarriorSplit(): void {
  audioEngine.playLayered({
    key: 'warrior_split',
    minGapMs: 80,
    duration: 0.1,
    layers: [
      { type: 'triangle', hz: 380, endHz: 220, gain: 0.07 },
      { type: 'square', hz: 190, endHz: 120, gain: 0.04 },
    ],
  });
}

export function sfxAssassinAmbush(elite: boolean): void {
  audioEngine.playOsc({
    key: elite ? 'assassin_elite' : 'assassin',
    minGapMs: elite ? 120 : 70,
    type: 'sawtooth',
    startHz: elite ? 920 : 780,
    endHz: elite ? 180 : 140,
    duration: elite ? 0.12 : 0.09,
    gain: elite ? 0.13 : 0.1,
  });
  audioEngine.playNoiseBurst({
    key: 'assassin_noise',
    minGapMs: 50,
    duration: 0.04,
    gain: elite ? 0.06 : 0.045,
    highpassHz: 1200,
  });
}

export function sfxMageArcane(isBig = false): void {
  audioEngine.playLayered({
    key: 'mage_arcane',
    minGapMs: 90,
    duration: isBig ? 0.32 : 0.24,
    layers: [
      { type: 'sine', hz: isBig ? 520 : 880, endHz: isBig ? 140 : 320, gain: isBig ? 0.12 : 0.09 },
      { type: 'triangle', hz: isBig ? 280 : 440, endHz: isBig ? 90 : 180, gain: isBig ? 0.085 : 0.06 },
    ],
  });
  audioEngine.playNoiseBurst({
    key: 'mage_arcane_n',
    minGapMs: 90,
    duration: isBig ? 0.18 : 0.14,
    gain: isBig ? 0.08 : 0.055,
    highpassHz: 350,
  });
}

export function sfxHunterStack(): void {
  audioEngine.playOsc({
    key: 'hunter_stack',
    minGapMs: 60,
    type: 'triangle',
    startHz: 640,
    endHz: 480,
    duration: 0.05,
    gain: 0.055,
  });
}

export function sfxKnightCross(isBig: boolean): void {
  audioEngine.playOsc({
    key: isBig ? 'knight_big' : 'knight',
    minGapMs: 90,
    type: 'sawtooth',
    startHz: isBig ? 320 : 280,
    endHz: 90,
    duration: isBig ? 0.14 : 0.11,
    gain: isBig ? 0.1 : 0.08,
  });
  audioEngine.playNoiseBurst({
    key: 'knight_slash',
    minGapMs: 90,
    duration: 0.06,
    gain: 0.04,
    highpassHz: 800,
  });
}

export function sfxShamanChain(): void {
  const ctx = audioEngine.getCtx();
  if (!ctx || !audioEngine.canPlay('shaman_chain', 110)) return;
  const t0 = ctx.currentTime;
  const freqs = [1200, 680, 420];
  for (let i = 0; i < freqs.length; i++) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    const start = t0 + i * 0.045;
    osc.frequency.setValueAtTime(freqs[i]!, start);
    osc.frequency.exponentialRampToValueAtTime(120, start + 0.07);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(0.07 - i * 0.015, start + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.09);
  }
}

export function sfxWarlockPoisonApply(): void {
  audioEngine.playOsc({
    key: 'poison_apply',
    minGapMs: 50,
    type: 'sine',
    startHz: 520,
    endHz: 280,
    duration: 0.08,
    gain: 0.06,
  });
}

export function sfxWarlockPoisonTick(): void {
  audioEngine.playLayered({
    key: 'poison_tick',
    minGapMs: 35,
    duration: 0.09,
    layers: [
      { type: 'triangle', hz: 300, endHz: 160, gain: 0.05 },
      { type: 'sine', hz: 180, endHz: 90, gain: 0.035 },
    ],
  });
}

export function sfxDruidClaw(isBig = false): void {
  audioEngine.playNoiseBurst({
    key: 'druid_claw',
    minGapMs: 85,
    duration: isBig ? 0.14 : 0.11,
    gain: isBig ? 0.11 : 0.09,
    highpassHz: 420,
  });
  audioEngine.playOsc({
    key: 'druid_claw_t',
    minGapMs: 85,
    type: 'sawtooth',
    startHz: isBig ? 180 : 240,
    endHz: isBig ? 55 : 80,
    duration: isBig ? 0.14 : 0.11,
    gain: isBig ? 0.085 : 0.065,
  });
  audioEngine.playOsc({
    key: 'druid_claw_hi',
    minGapMs: 85,
    type: 'triangle',
    startHz: isBig ? 520 : 640,
    endHz: 280,
    duration: 0.07,
    gain: 0.04,
  });
}

export function sfxArrowRainHit(): void {
  audioEngine.playOsc({
    key: 'arrow_hit',
    minGapMs: 28,
    type: 'triangle',
    startHz: 480,
    endHz: 200,
    duration: 0.06,
    gain: 0.065,
  });
  audioEngine.playNoiseBurst({
    key: 'arrow_hit_n',
    minGapMs: 28,
    duration: 0.04,
    gain: 0.035,
    highpassHz: 700,
  });
}

export function sfxJudgmentStart(): void {
  audioEngine.playLayered({
    key: 'judgment_start',
    minGapMs: 400,
    duration: 0.35,
    layers: [
      { type: 'sine', hz: 110, endHz: 55, gain: 0.12 },
      { type: 'triangle', hz: 220, endHz: 90, gain: 0.08 },
    ],
  });
}

export function sfxJudgmentWave(): void {
  audioEngine.playOsc({
    key: 'judgment_wave',
    minGapMs: 200,
    type: 'sawtooth',
    startHz: 160,
    endHz: 45,
    duration: 0.2,
    gain: 0.11,
  });
  audioEngine.playNoiseBurst({
    key: 'judgment_wave_n',
    minGapMs: 200,
    duration: 0.15,
    gain: 0.06,
    highpassHz: 200,
  });
}

export function sfxUltimatePhase(): void {
  audioEngine.playLayered({
    key: 'ultimate_phase',
    minGapMs: 500,
    duration: 0.4,
    layers: [
      { type: 'sine', hz: 660, endHz: 990, gain: 0.07 },
      { type: 'triangle', hz: 330, endHz: 520, gain: 0.05 },
    ],
  });
}

export function sfxUltimateFrost(): void {
  audioEngine.playLayered({
    key: 'ultimate_frost',
    minGapMs: 500,
    duration: 0.45,
    layers: [
      { type: 'sine', hz: 1400, endHz: 600, gain: 0.08 },
      { type: 'triangle', hz: 700, endHz: 280, gain: 0.06 },
    ],
  });
  audioEngine.playNoiseBurst({
    key: 'ultimate_frost_n',
    minGapMs: 500,
    duration: 0.2,
    gain: 0.04,
    highpassHz: 2000,
  });
}

export function sfxAnnihilate(): void {
  audioEngine.playLayered({
    key: 'annihilate',
    minGapMs: 150,
    duration: 0.18,
    layers: [
      { type: 'sawtooth', hz: 200, endHz: 40, gain: 0.1 },
      { type: 'sine', hz: 80, endHz: 30, gain: 0.08 },
    ],
  });
}

export function sfxBossCrush(): void {
  audioEngine.playOsc({
    key: 'boss_crush',
    minGapMs: 40,
    type: 'square',
    startHz: 120,
    endHz: 50,
    duration: 0.12,
    gain: 0.09,
  });
}

export function sfxSpecialHeal(): void {
  audioEngine.playOsc({
    key: 'special_heal',
    minGapMs: 120,
    type: 'sine',
    startHz: 520,
    endHz: 780,
    duration: 0.15,
    gain: 0.07,
  });
}

export function sfxSpecialSpawn(): void {
  audioEngine.playOsc({
    key: 'special_spawn',
    minGapMs: 120,
    type: 'triangle',
    startHz: 400,
    endHz: 620,
    duration: 0.12,
    gain: 0.07,
  });
}

export function sfxSpecialJump(): void {
  audioEngine.playOsc({
    key: 'special_jump',
    minGapMs: 80,
    type: 'triangle',
    startHz: 300,
    endHz: 450,
    duration: 0.08,
    gain: 0.055,
  });
}

export function sfxSpecialDetonate(): void {
  audioEngine.playNoiseBurst({
    key: 'special_detonate',
    minGapMs: 100,
    duration: 0.14,
    gain: 0.08,
    highpassHz: 300,
  });
}
