// 棋盘逻辑：碰撞、移动、旋转（含 wall kick）、合并、消行、出生、硬降、顶出。
import { Board, Cell, Piece, RotateDir, TetrominoType, Vec2 } from './types';
import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';
import { getKicks, getMinos, rotateTarget } from './tetromino';

/** 方块在棋盘上的绝对占用格子。 */
export function pieceCells(piece: Piece): Vec2[] {
  return getMinos(piece.type, piece.rotation).map(m => ({
    x: m.x + piece.pos.x,
    y: m.y + piece.pos.y,
  }));
}

/** 创建空棋盘。 */
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from<Cell>({ length: BOARD_WIDTH }).fill(null),
  );
}

/** 合法性检测：不越左右底、不与已锁定格子重叠。允许 row<0（防御）。 */
export function isValidPosition(board: Board, piece: Piece): boolean {
  for (const c of pieceCells(piece)) {
    if (c.x < 0 || c.x >= BOARD_WIDTH || c.y >= BOARD_HEIGHT) return false;
    if (c.y < 0) continue;
    if (board[c.y][c.x] !== null) return false;
  }
  return true;
}

/** 尝试平移；成功返回新 piece，失败返回 null。 */
export function tryMove(piece: Piece, dx: number, dy: number, board: Board): Piece | null {
  const moved: Piece = { ...piece, pos: { x: piece.pos.x + dx, y: piece.pos.y + dy } };
  return isValidPosition(board, moved) ? moved : null;
}

export function canMoveDown(piece: Piece, board: Board): boolean {
  return tryMove(piece, 0, 1, board) !== null;
}

/** 旋转（含 wall kick）；成功返回旋转后 piece，全部偏移碰撞则返回原 piece。 */
export function tryRotate(piece: Piece, dir: RotateDir, board: Board): Piece {
  const target = rotateTarget(piece.rotation, dir);
  const kicks = getKicks(piece.type, piece.rotation, dir);
  for (const k of kicks) {
    const test: Piece = {
      ...piece,
      rotation: target,
      pos: { x: piece.pos.x + k.x, y: piece.pos.y + k.y },
    };
    if (isValidPosition(board, test)) return test;
  }
  return piece;
}

/** 将活动方块合并为已锁定格子（返回新棋盘，不可变）。 */
export function mergePiece(board: Board, piece: Piece): Board {
  const next = board.map(row => row.slice());
  for (const c of pieceCells(piece)) {
    if (c.y >= 0 && c.y < BOARD_HEIGHT && c.x >= 0 && c.x < BOARD_WIDTH) {
      next[c.y][c.x] = piece.type;
    }
  }
  return next;
}

/** 识别并清除满行，上方下移，返回新棋盘与清除行数。 */
export function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter(row => row.some(c => c === null));
  const cleared = board.length - kept.length;
  const empty: Board = Array.from({ length: cleared }, () =>
    Array.from<Cell>({ length: BOARD_WIDTH }).fill(null),
  );
  return { board: [...empty, ...kept], cleared };
}

/** 在顶部缓冲区出生位置生成初始旋转状态的方块。 */
export function spawnPiece(type: TetrominoType): Piece {
  return { type, rotation: 0, pos: { x: 3, y: 0 } };
}

/** 顶出判定：出生位置非法即顶出。 */
export function isTopOut(board: Board, piece: Piece): boolean {
  return !isValidPosition(board, piece);
}

/** 计算硬降到最低合法位置后的 piece。 */
export function hardDropPiece(piece: Piece, board: Board): Piece {
  let p = piece;
  for (;;) {
    const next = tryMove(p, 0, 1, board);
    if (!next) break;
    p = next;
  }
  return p;
}
