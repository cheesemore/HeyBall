import type { BallColor, BallItem } from '../ballTypes';

import type { LaunchBallUnit } from '../ballComposition';

import type { MonsterTypeId } from '../config/monsterTable';

import type { RogueUpgradeId } from '../config/rogueUpgrades';
import type { SuperRogueCardId } from '../config/superRogueCards';
import type { UltimateChargeState } from './ultimateCharge';
import type { MonsterGroupDraftOption } from './monsterGroupDraft';
import type { RunMonsterGroupConfig } from './monsterGroupDraft';



export type GamePhase =
  | 'draft'
  | 'monster_group_draft'
  | 'prepare'
  | 'combat'
  | 'spawn'
  | 'settled'
  | 'rogue_skill_pick'
  | 'rogue_upgrade_pick'
  | 'super_rogue_pick';



export interface MonsterSnapshot {

  instanceId: string;

  typeId: MonsterTypeId;

  hp: number;

  anchorRow: number;

  anchorCol: number;

  footprintW: number;

  footprintH: number;

}



export interface GameState {

  phase: GamePhase;

  turn: number;

  wallHp: number;

  wallMaxHp: number;

  gold: number;

  /** 本局已完成的招募次数（决定下次招募价格） */
  recruitCount: number;

  /** 合成累计的全局攻击加成（%，按基础攻击叠乘） */
  mergeAttackBonusPercent: number;

  controlSlots: (BallItem | null)[];

  battleMonsters: MonsterSnapshot[];

  /** 三选一候选（各 4 色） */

  draftOptions: BallColor[][];

  /** 本局已选球色；draft 阶段为 null */

  runBallColors: BallColor[] | null;

  monsterGroupDraftOptions: MonsterGroupDraftOption[];

  runMonsterGroup: RunMonsterGroupConfig | null;

  roguePurchaseCount: number;

  /** 已选肉鸽法术升级（第 2–4 次购买） */
  rogueUpgradeIds: RogueUpgradeId[];

  ultimate: UltimateChargeState;

  /** 备战已激活、待下回合战斗生效的相位空间 */

  phaseBuffPending: boolean;

  /** 备战已激活冻狱，下回合受伤加成 */

  frostDebuffPending: boolean;

  /** 备战已激活末日审判，下回合战斗触发 */

  judgmentPending: boolean;

  /** 本局累计击杀数（结算展示） */
  monstersKilled: number;

  /** 城墙归零后的本局结算；进行中为 null */
  settlement: RunSettlement | null;

  /** 已选超级肉鸽（按选取顺序，右侧 HUD 逐条展示） */
  superRoguePicks: SuperRogueCardId[];

  /** 三选一候选（仅 super_rogue_pick 阶段有效） */
  superRoguePickOptions: SuperRogueCardId[];
}

export interface RunSettlement {
  /** 累计刷行波次（spawnRowOrdinal） */
  waveOrdinal: number;
  monstersKilled: number;
  bossesDefeated: number;
  turn: number;
}



export type PrepareAction =

  | { type: 'recruit' }

  | { type: 'rogue' }

  | { type: 'merge'; from: number; to: number }

  | { type: 'launch'; aimAngleRad: number }

  | { type: 'wait' };



export interface LaunchPayload {

  units: LaunchBallUnit[];

  aimAngleRad: number;

}


