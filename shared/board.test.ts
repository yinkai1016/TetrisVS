import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  isValidPosition,
  tryMove,
  tryRotate,
  mergePiece,
  clearLines,
  spawnPiece,
  hardDropPiece,
  isTopOut,
} from './board';
import { Piece, TetrominoType } from './types';
import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';

const T = (x: number, y: number, type: TetrominoType = 'T'): Piece => ({
  type,
  rotation: 0,
  pos: { x, y },
});

describe('isValidPosition', () => {
  it('空棋盘出生位置合法', () => {
    expect(isValidPosition(createEmptyBoard(), spawnPiece('T'))).toBe(true);
  });
  it('右移越界非法', () => {
    const board = createEmptyBoard();
    expect(isValidPosition(board, T(BOARD_WIDTH, 0))).toBe(false);
  });
  it('与已锁定格子重叠非法', () => {
    const board = createEmptyBoard();
    board[0][4] = 'I';
    expect(isValidPosition(board, T(3, 0))).toBe(false); // T 占 (4,0)
  });
});

describe('tryMove', () => {
  it('左移成功', () => {
    const board = createEmptyBoard();
    const moved = tryMove(spawnPiece('T'), -1, 0, board);
    expect(moved?.pos.x).toBe(2);
  });
  it('右墙阻止右移', () => {
    const board = createEmptyBoard();
    const piece = T(BOARD_WIDTH - 4, 0, 'I'); // I 水平 box.x=6，minos 6..9 贴右墙
    expect(isValidPosition(board, piece)).toBe(true);
    expect(tryMove(piece, 1, 0, board)).toBeNull();
  });
});

describe('tryRotate + wall kick', () => {
  it('空棋盘旋转改变状态', () => {
    const board = createEmptyBoard();
    const rotated = tryRotate(spawnPiece('T'), 'CW', board);
    expect(rotated.rotation).toBe(1);
  });

  it('贴右墙旋转触发 wall kick 左移（I 竖直贴墙逆时针）', () => {
    const board = createEmptyBoard();
    // I rotation1（竖直，minos x=2）box.x=7 → 绝对 x=9 贴右墙，合法
    const piece: Piece = { type: 'I', rotation: 1, pos: { x: 7, y: 0 } };
    expect(isValidPosition(board, piece)).toBe(true);
    // 逆时针 → rotation0（水平 x=0..3），box.x=7 会越界，kick(-1,0) 使 box.x=6 合法
    const rotated = tryRotate(piece, 'CCW', board);
    expect(rotated.rotation).toBe(0);
    expect(rotated.pos.x).toBe(6);
  });

  it('所有 kick 均碰撞则旋转被拒、返回原 piece', () => {
    const board = createEmptyBoard();
    // 用四面围堵使 T 旋转后所有偏移都碰撞：在 spawn 周围填满
    const piece = spawnPiece('T'); // rotation0, pos(3,0)
    // 填充所有可能的旋转落点周围 —— 简化：底部垫满让旋转后下方全占
    for (let x = 0; x < BOARD_WIDTH; x++) {
      board[1][x] = 'I';
      board[2][x] = 'I';
    }
    const rotated = tryRotate(piece, 'CW', board);
    expect(rotated).toBe(piece); // 旋转失败，保持原状
  });
});

describe('mergePiece', () => {
  it('将方块格子写入棋盘', () => {
    const board = createEmptyBoard();
    const merged = mergePiece(board, spawnPiece('T')); // 绝对 (4,0),(3,1),(4,1),(5,1)
    expect(merged[0][4]).toBe('T');
    expect(merged[1][3]).toBe('T');
    expect(merged[1][4]).toBe('T');
    expect(merged[1][5]).toBe('T');
    expect(board[0][4]).toBeNull(); // 原棋盘不变（不可变）
  });
});

describe('clearLines', () => {
  it('消除单行并上方下移', () => {
    const board = createEmptyBoard();
    for (let x = 0; x < BOARD_WIDTH; x++) board[BOARD_HEIGHT - 1][x] = 'I'; // 底行填满
    const { board: next, cleared } = clearLines(board);
    expect(cleared).toBe(1);
    expect(next).toHaveLength(BOARD_HEIGHT);
    expect(next[BOARD_HEIGHT - 1].every(c => c === null)).toBe(true); // 底部变空
  });

  it('同时消除多行', () => {
    const board = createEmptyBoard();
    for (let x = 0; x < BOARD_WIDTH; x++) {
      board[BOARD_HEIGHT - 1][x] = 'I';
      board[BOARD_HEIGHT - 2][x] = 'I';
      board[BOARD_HEIGHT - 3][x] = 'I';
    }
    expect(clearLines(board).cleared).toBe(3);
  });

  it('无满行时清除 0 行', () => {
    expect(clearLines(createEmptyBoard()).cleared).toBe(0);
  });
});

describe('spawn / hard drop / top out', () => {
  it('出生位置 x=3、rotation=0', () => {
    const p = spawnPiece('I');
    expect(p.pos.x).toBe(3);
    expect(p.rotation).toBe(0);
  });

  it('硬降落到最低合法位置', () => {
    const board = createEmptyBoard();
    const dropped = hardDropPiece(spawnPiece('T'), board);
    // T rotation0 最低 mino y=1，落到底行23 → box.y=22
    expect(isValidPosition(board, dropped)).toBe(true);
    expect(tryMove(dropped, 0, 1, board)).toBeNull(); // 已是最低
  });

  it('出生位置被占时顶出', () => {
    const board = createEmptyBoard();
    board[0][4] = 'I'; // 占据 T 出生格子之一
    expect(isTopOut(board, spawnPiece('T'))).toBe(true);
    expect(isTopOut(createEmptyBoard(), spawnPiece('T'))).toBe(false);
  });
});
