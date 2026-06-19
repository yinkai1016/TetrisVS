// 单机游戏引擎：状态机 + 固定时间步逻辑（reducer 风格，可手动驱动 / 可测）。
// 渲染只读取 GameState，不在此处发生。
import { Board, Piece } from '../../shared/types';
import {
  createEmptyBoard,
  spawnPiece,
  tryMove,
  tryRotate,
  hardDropPiece,
  mergePiece,
  clearLines,
  isTopOut,
  canMoveDown,
} from '../../shared/board';
import { isResting, shouldLock } from '../../shared/lock';
import { tryHold, EMPTY_HOLD, HoldState } from '../../shared/hold';
import { createBagQueue, BagQueue } from '../../shared/rng';
import { speed } from '../../shared/speed';
import { energyGain, addEnergy } from '../../shared/energy';
import { applyGarbage } from '../../shared/garbage';
import { LOCK_RESET_LIMIT, SPEED_CONFIG_DEFAULT } from '../../shared/constants';

export type Phase = 'Spawn' | 'Falling' | 'Locking' | 'LineClear' | 'GameOver';

export type Action =
  | 'left'
  | 'right'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'
  | 'pause';

export interface GameState {
  board: Board;
  active: Piece;
  queue: BagQueue;
  hold: HoldState;
  energy: number;
  elapsedMs: number;
  phase: Phase;
  paused: boolean;
  lockWaitedMs: number;
  lockResets: number;
  dropAccumulator: number;
  lastCleared: number;
  /** 待顶入垃圾行的缺口列队列（联机时由 net 层 receiveGarbage 填充）。 */
  garbageQueue: number[];
  seed: number;
}

/** 取队列下一块生成活动方块；顶出则 GameOver。 */
function spawnNext(state: GameState, board: Board): GameState {
  const active = spawnPiece(state.queue.next());
  const base = { ...state, board };
  if (isTopOut(board, active)) {
    return { ...base, active, phase: 'GameOver' as Phase };
  }
  return {
    ...base,
    active,
    phase: 'Falling' as Phase,
    lockWaitedMs: 0,
    lockResets: 0,
    dropAccumulator: 0,
    hold: { ...state.hold, holdUsed: false },
  };
}

/** 锁定当前方块 → 合并 → 消行 → 结算能量 → 生成下一块。LineClear 为瞬时步骤。 */
function lockNow(state: GameState, lockedPiece: Piece): GameState {
  const merged = mergePiece(state.board, lockedPiece);
  const { board: clearedBoard, cleared } = clearLines(merged);
  const energy = addEnergy(state.energy, energyGain(cleared));
  // 应用待顶入垃圾行（联机攻击）；单机时 queue 恒空，无副作用
  let board = clearedBoard;
  let garbageQueue = state.garbageQueue;
  if (garbageQueue.length > 0) {
    const res = applyGarbage(clearedBoard, garbageQueue.length, garbageQueue);
    board = res.board;
    garbageQueue = [];
  }
  return spawnNext({ ...state, energy, lastCleared: cleared, garbageQueue }, board);
}

export function createGame(seed: number): GameState {
  const queue = createBagQueue(seed);
  const board = createEmptyBoard();
  const active = spawnPiece(queue.next());
  return {
    board,
    active,
    queue,
    hold: { ...EMPTY_HOLD },
    energy: 0,
    elapsedMs: 0,
    phase: 'Falling',
    paused: false,
    lockWaitedMs: 0,
    lockResets: 0,
    dropAccumulator: 0,
    lastCleared: 0,
    garbageQueue: [],
    seed,
  };
}

export function restart(seed: number): GameState {
  return createGame(seed);
}

/** 收到对手攻击：将 count 行垃圾（缺口列 holeCol）加入待顶入队列。供 net 层调用。 */
export function receiveGarbage(state: GameState, count: number, holeCol: number): GameState {
  if (count <= 0) return state;
  const garbageQueue = state.garbageQueue.slice();
  for (let i = 0; i < count; i++) garbageQueue.push(holeCol);
  return { ...state, garbageQueue };
}

/** 推进逻辑 dtMs 毫秒（固定时间步调用）。暂停 / 结束时为恒等。 */
export function step(state: GameState, dtMs: number): GameState {
  if (state.paused || state.phase === 'GameOver') return state;

  let s: GameState = { ...state, elapsedMs: state.elapsedMs + dtMs };

  if (s.phase === 'Spawn' || s.phase === 'LineClear') {
    return spawnNext(s, s.board);
  }

  // Falling / Locking：按速度自然下落
  s = { ...s, dropAccumulator: s.dropAccumulator + dtMs };
  const interval = 1000 / speed(s.elapsedMs, SPEED_CONFIG_DEFAULT);

  while (s.dropAccumulator >= interval) {
    s = { ...s, dropAccumulator: s.dropAccumulator - interval };
    if (canMoveDown(s.active, s.board)) {
      s = { ...s, active: tryMove(s.active, 0, 1, s.board) as Piece };
      if (s.phase === 'Locking') s = { ...s, phase: 'Falling' as Phase };
    } else {
      break;
    }
  }

  // 锁定判定 / 延迟
  if (isResting(s.active, s.board)) {
    if (s.phase === 'Falling') {
      s = { ...s, phase: 'Locking' as Phase, lockWaitedMs: 0 };
    } else if (s.phase === 'Locking') {
      const waited = s.lockWaitedMs + dtMs;
      if (shouldLock(waited, s.lockResets)) return lockNow(s, s.active);
      s = { ...s, lockWaitedMs: waited };
    }
  } else if (s.phase === 'Locking') {
    s = { ...s, phase: 'Falling' as Phase };
  }

  return s;
}

/** 移动 / 旋转成功后在 Locking 期的处理：重置延迟、达上限则强制锁定。 */
function onMoveSuccess(state: GameState): GameState {
  if (state.phase !== 'Locking') return state;
  const lockResets = state.lockResets + 1;
  if (lockResets >= LOCK_RESET_LIMIT) {
    return lockNow({ ...state, lockResets }, state.active);
  }
  return { ...state, lockResets, lockWaitedMs: 0 };
}

/** 处理一次输入动作，返回新状态。 */
export function dispatch(state: GameState, action: Action): GameState {
  if (action === 'pause') return { ...state, paused: !state.paused };
  if (state.paused || state.phase === 'GameOver') return state;
  if (state.phase !== 'Falling' && state.phase !== 'Locking') return state;

  switch (action) {
    case 'left': {
      const moved = tryMove(state.active, -1, 0, state.board);
      return moved ? onMoveSuccess({ ...state, active: moved }) : state;
    }
    case 'right': {
      const moved = tryMove(state.active, 1, 0, state.board);
      return moved ? onMoveSuccess({ ...state, active: moved }) : state;
    }
    case 'rotateCW': {
      const rotated = tryRotate(state.active, 'CW', state.board);
      return rotated !== state.active ? onMoveSuccess({ ...state, active: rotated }) : state;
    }
    case 'rotateCCW': {
      const rotated = tryRotate(state.active, 'CCW', state.board);
      return rotated !== state.active ? onMoveSuccess({ ...state, active: rotated }) : state;
    }
    case 'softDrop': {
      const moved = tryMove(state.active, 0, 1, state.board);
      if (!moved) return state;
      let s: GameState = { ...state, active: moved };
      if (isResting(s.active, s.board)) {
        s = { ...s, phase: 'Locking' as Phase, lockWaitedMs: 0 };
      } else if (s.phase === 'Locking') {
        s = { ...s, phase: 'Falling' as Phase };
      }
      return s;
    }
    case 'hardDrop': {
      return lockNow(state, hardDropPiece(state.active, state.board));
    }
    case 'hold': {
      const res = tryHold(state.active, state.hold, state.queue);
      if (!res) return state;
      const s: GameState = {
        ...state,
        active: res.active,
        hold: res.state,
        dropAccumulator: 0,
        lockWaitedMs: 0,
        lockResets: 0,
        phase: 'Falling' as Phase,
      };
      if (isTopOut(s.board, s.active)) return { ...s, phase: 'GameOver' as Phase };
      return s;
    }
    default:
      return state;
  }
}
