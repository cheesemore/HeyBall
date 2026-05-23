/**
 * 战场流程音效：回合末推进、空降落地
 */
import { audioEngine } from './audioEngine';

/** 怪物行推进一格（每调用一次播一声） */
export function sfxSpawnRowPush(): void {
  audioEngine.playLayered({
    key: 'spawn_push',
    minGapMs: 60,
    duration: 0.1,
    layers: [
      { type: 'triangle', hz: 180, endHz: 95, gain: 0.075 },
      { type: 'sine', hz: 90, endHz: 55, gain: 0.045 },
    ],
  });
  audioEngine.playNoiseBurst({
    key: 'spawn_push_n',
    minGapMs: 60,
    duration: 0.05,
    gain: 0.03,
    highpassHz: 400,
  });
}

/** 空降砖块落地（每个方块一次） */
export function sfxAirdropLand(variant: 'airdrop_blue' | 'airdrop_red' = 'airdrop_blue'): void {
  const red = variant === 'airdrop_red';
  audioEngine.playOsc({
    key: red ? 'airdrop_red' : 'airdrop_blue',
    minGapMs: 18,
    type: 'triangle',
    startHz: red ? 340 : 420,
    endHz: red ? 120 : 160,
    duration: red ? 0.09 : 0.07,
    gain: red ? 0.08 : 0.065,
  });
  audioEngine.playNoiseBurst({
    key: 'airdrop_land_n',
    minGapMs: 18,
    duration: 0.035,
    gain: 0.035,
    highpassHz: 700,
  });
}
