// 锁定延迟与顶出辅助判定（纯函数）。
import { Board, Piece } from './types';
import { LOCK_DELAY_MS, LOCK_RESET_LIMIT } from './constants';
import { canMoveDown } from './board';

/** 方块是否处于"无法继续下落"的静止态（触底或下方被挡）。 */
export function isResting(piece: Piece, board: Board): boolean {
  return !canMoveDown(piece, board);
}

/** 是否应锁定：延迟超时，或移动/旋转重置次数已达上限。 */
export function shouldLock(waitedMs: number, resetCount: number): boolean {
  return waitedMs >= LOCK_DELAY_MS || resetCount >= LOCK_RESET_LIMIT;
}
