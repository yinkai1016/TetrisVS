import { describe, it, expect } from 'vitest';
import { makeGarbageRow, pushGarbage, applyGarbage, GARBAGE } from './garbage';
import { createEmptyBoard } from './board';
import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';

describe('makeGarbageRow', () => {
  it('指定列留空、其余填垃圾(G)', () => {
    const row = makeGarbageRow(3);
    expect(row).toHaveLength(BOARD_WIDTH);
    expect(row[3]).toBeNull();
    row.forEach((c, i) => {
      if (i !== 3) expect(c).toBe(GARBAGE);
    });
  });
});

describe('pushGarbage', () => {
  it('累加到 buffer', () => {
    expect(pushGarbage(0, 1)).toBe(1);
    expect(pushGarbage(2, 3)).toBe(5);
  });
});

describe('applyGarbage', () => {
  it('buffer 为 0 不改变棋盘、清零 buffer', () => {
    const board = createEmptyBoard();
    const res = applyGarbage(board, 0, []);
    expect(res.buffer).toBe(0);
    expect(res.board).toEqual(board);
  });

  it('顶入 1 行：棋盘上移、底部出现 1 行垃圾（留缺口）', () => {
    const board = createEmptyBoard();
    board[BOARD_HEIGHT - 1][0] = 'I';
    const res = applyGarbage(board, 1, [5]);
    expect(res.buffer).toBe(0);
    expect(res.board[BOARD_HEIGHT - 2][0]).toBe('I');
    expect(res.board[BOARD_HEIGHT - 1][5]).toBeNull();
    expect(res.board[BOARD_HEIGHT - 1][0]).toBe(GARBAGE);
  });

  it('顶入多行：按 holeCols 顺序逐行顶入', () => {
    const board = createEmptyBoard();
    const res = applyGarbage(board, 2, [1, 8]);
    expect(res.buffer).toBe(0);
    expect(res.board[BOARD_HEIGHT - 1][8]).toBeNull();
    expect(res.board[BOARD_HEIGHT - 2][1]).toBeNull();
  });
});
