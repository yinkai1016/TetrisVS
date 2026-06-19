import { describe, it, expect } from 'vitest';
import { encodeBoard, decodeBoard } from './snapshot';
import { createEmptyBoard, mergePiece, spawnPiece } from './board';
import { BOARD_VISIBLE_HEIGHT, BUFFER_ROWS } from './constants';

describe('snapshot 编解码', () => {
  it('空棋盘编码为全 0、长度 200', () => {
    const s = encodeBoard(createEmptyBoard());
    expect(s).toHaveLength(200);
    expect(s).toMatch(/^0+$/);
  });

  it('任意棋盘编解码往返一致', () => {
    // 构造一个有内容的棋盘：合并几个方块到底部
    let board = createEmptyBoard();
    board = mergePiece(board, spawnPiece('T'));
    board = mergePiece(board, spawnPiece('I'));
    const encoded = encodeBoard(board);
    const decoded = decodeBoard(encoded);
    // 解码后是可见区（BOARD_VISIBLE_HEIGHT 行），与原棋盘的可见区逐格一致
    for (let y = 0; y < BOARD_VISIBLE_HEIGHT; y++) {
      for (let x = 0; x < 10; x++) {
        expect(decoded[y][x]).toBe(board[BUFFER_ROWS + y][x]);
      }
    }
  });

  it('快照大小 ≤200 字节', () => {
    const s = encodeBoard(createEmptyBoard());
    expect(Buffer.byteLength(s, 'utf8')).toBeLessThanOrEqual(200);
  });
});
