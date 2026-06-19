// Hold（暂存）纯逻辑。本活动方块生命周期内仅可使用一次。
import { BagQueue } from './rng';
import { Piece, TetrominoType } from './types';
import { spawnPiece } from './board';

export interface HoldState {
  holdSlot: TetrominoType | null;
  /** 当前活动方块是否已用过 Hold（锁定后重置）。 */
  holdUsed: boolean;
}

export const EMPTY_HOLD: HoldState = { holdSlot: null, holdUsed: false };

/**
 * 尝试 Hold。
 * - 已用过 → 返回 null（拒绝）
 * - 空槽 → 当前方块入槽，活动方块变为队列下一块
 * - 非空 → 与槽中方块交换
 * 交换/取出进来的方块均从顶部初始状态出生。
 */
export function tryHold(
  active: Piece,
  state: HoldState,
  queue: BagQueue,
): { active: Piece; state: HoldState } | null {
  if (state.holdUsed) return null;

  if (state.holdSlot === null) {
    return {
      active: spawnPiece(queue.next()),
      state: { holdSlot: active.type, holdUsed: true },
    };
  }

  return {
    active: spawnPiece(state.holdSlot),
    state: { holdSlot: active.type, holdUsed: true },
  };
}
