// shared 集中常量。纯数据，无 DOM/网络依赖。

// --- 棋盘 ---
export const BOARD_WIDTH = 10;
export const BOARD_VISIBLE_HEIGHT = 20;
export const BUFFER_ROWS = 4; // 顶部缓冲（出生 + 顶出判定空间）
export const BOARD_HEIGHT = BOARD_VISIBLE_HEIGHT + BUFFER_ROWS; // 24

// --- 预览 ---
export const NEXT_PREVIEW_COUNT = 5;

// --- 能量 ---
export const ENERGY_MAX = 10;
export const ENERGY_COST_PER_ATTACK = 5; // 释放一次攻击（1 行垃圾行）消耗的能量

// --- 手感（毫秒）---
export const DAS_MS = 150; // 按住方向键首次延迟
export const ARR_MS = 30; // 连续横移间隔
export const SOFT_DROP_INTERVAL_MS = 30; // 软降按住重复间隔
export const LOCK_DELAY_MS = 500; // 锁定延迟
export const LOCK_RESET_LIMIT = 15; // 锁定延迟重置次数上限

// --- 固定逻辑步长 ---
export const TICK_MS = 1000 / 60;

// --- 速度曲线配置 ---
export interface SpeedConfig {
  /** 1.0× 时每秒下落行数。 */
  baseSpeed: number;
  /** 首次提速前保持基础速度的时长（ms）。 */
  holdMs: number;
  /** 满 holdMs 后的首个倍率。 */
  firstMultiplier: number;
  /** 后续每步递增的周期（ms）。 */
  stepMs: number;
  /** 每步倍率增量。 */
  stepIncrement: number;
}

export const SPEED_CONFIG_DEFAULT: SpeedConfig = {
  baseSpeed: 1, // 1.0× = 1 行/秒
  holdMs: 3 * 60 * 1000, // 前 3 分钟保持
  firstMultiplier: 1.1, // 满 3 分钟 → 1.1×
  stepMs: 60 * 1000, // 之后每 1 分钟一步
  stepIncrement: 0.1, // 每步 +0.1×
};

// --- 键位（event.code）---
export const KEY_MAP = {
  left: 'KeyA',
  right: 'KeyD',
  softDrop: 'KeyS',
  hardDrop: 'KeyW',
  rotateCW: 'KeyJ',
  rotateCCW: 'KeyK',
  hold: 'KeyL',
  pause: 'KeyP',
  targetPrev: 'KeyQ',
  targetNext: 'KeyE',
  attack: 'KeyU',
} as const;

export type GameAction = keyof typeof KEY_MAP;
