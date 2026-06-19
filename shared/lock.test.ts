import { describe, it, expect } from 'vitest';
import { isResting, shouldLock } from './lock';
import { createEmptyBoard, spawnPiece } from './board';
import { LOCK_DELAY_MS, LOCK_RESET_LIMIT } from './constants';
import { Piece } from './types';
import { BOARD_HEIGHT } from './constants';

describe('isResting', () => {
  it('空棋盘顶部方块可下落（非静止）', () => {
    expect(isResting(spawnPiece('T'), createEmptyBoard())).toBe(false);
  });
  it('触底方块静止', () => {
    const board = createEmptyBoard();
    const piece: Piece = { type: 'T', rotation: 0, pos: { x: 3, y: BOARD_HEIGHT - 2 } };
    expect(isResting(piece, board)).toBe(true);
  });
});

describe('shouldLock', () => {
  it('延迟超时应锁定', () => {
    expect(shouldLock(LOCK_DELAY_MS, 0)).toBe(true);
  });
  it('重置次数达上限应锁定', () => {
    expect(shouldLock(0, LOCK_RESET_LIMIT)).toBe(true);
  });
  it('未超时且未达上限不应锁定', () => {
    expect(shouldLock(0, 0)).toBe(false);
    expect(shouldLock(LOCK_DELAY_MS - 1, 0)).toBe(false);
    expect(shouldLock(0, LOCK_RESET_LIMIT - 1)).toBe(false);
  });
});
