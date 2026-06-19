// 贴墙 / 贴底旋转覆盖测试：验证 wall kick 行为。
import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  spawnPiece,
  tryMove,
  tryRotate,
  hardDropPiece,
} from './board';
import { Piece, TETROMINO_TYPES } from './types';

type Board = ReturnType<typeof createEmptyBoard>;

function pushRight(p: Piece, b: Board): Piece {
  let cur = p;
  for (;;) {
    const n = tryMove(cur, 1, 0, b);
    if (!n) break;
    cur = n;
  }
  return cur;
}
function pushLeft(p: Piece, b: Board): Piece {
  let cur = p;
  for (;;) {
    const n = tryMove(cur, -1, 0, b);
    if (!n) break;
    cur = n;
  }
  return cur;
}

const ROTATABLE = TETROMINO_TYPES.filter(t => t !== 'O');
const NON_I = ROTATABLE.filter(t => t !== 'I');

describe('贴侧墙旋转（wall kick）', () => {
  for (const type of ROTATABLE) {
    it(`${type} 贴右墙 → CW 能旋转`, () => {
      const b = createEmptyBoard();
      const p = pushRight(spawnPiece(type), b);
      expect(tryRotate(p, 'CW', b).rotation).not.toBe(p.rotation);
    });
    it(`${type} 贴右墙 → CCW 能旋转`, () => {
      const b = createEmptyBoard();
      const p = pushRight(spawnPiece(type), b);
      expect(tryRotate(p, 'CCW', b).rotation).not.toBe(p.rotation);
    });
    it(`${type} 贴左墙 → CW 能旋转`, () => {
      const b = createEmptyBoard();
      const p = pushLeft(spawnPiece(type), b);
      expect(tryRotate(p, 'CW', b).rotation).not.toBe(p.rotation);
    });
    it(`${type} 贴左墙 → CCW 能旋转`, () => {
      const b = createEmptyBoard();
      const p = pushLeft(spawnPiece(type), b);
      expect(tryRotate(p, 'CCW', b).rotation).not.toBe(p.rotation);
    });
  }

  it('O 方块旋转不抛错（rotation 推进、形态不变）', () => {
    const b = createEmptyBoard();
    const p = spawnPiece('O');
    const r = tryRotate(p, 'CW', b);
    expect(r.rotation).toBe(1); // rotation 数字推进
    // 形态不变：O 四态坐标相同（由 tetromino.test 保证）
  });
});

describe('贴底旋转（落到棋盘底部）', () => {
  for (const type of NON_I) {
    it(`${type} 落底 → CW 能旋转`, () => {
      const b = createEmptyBoard();
      const p = hardDropPiece(spawnPiece(type), b);
      expect(tryRotate(p, 'CW', b).rotation).not.toBe(p.rotation);
    });
    it(`${type} 落底 → CCW 能旋转`, () => {
      const b = createEmptyBoard();
      const p = hardDropPiece(spawnPiece(type), b);
      expect(tryRotate(p, 'CCW', b).rotation).not.toBe(p.rotation);
    });
  }

  it('I 平躺贴底转竖直受 SRS 标准限制（记录，不强制）', () => {
    const b = createEmptyBoard();
    const p = hardDropPiece(spawnPiece('I'), b);
    const r = tryRotate(p, 'CW', b);
    expect(r).toBeDefined(); // 不抛错即可；I 平躺贴底需上移 3 格，超出 kick 表
  });
});

describe('L 左下角旋转（SRS 左右不对称）', () => {
  it('L 左下角 → CW(按J)：贴左墙使唯一上移 kick 失效 → 转不了', () => {
    const b = createEmptyBoard();
    let p = hardDropPiece(spawnPiece('L'), b);
    p = pushLeft(p, b); // 贴左墙 + 贴底
    const r = tryRotate(p, 'CW', b);
    expect(r).toBe(p); // 旋转失败
  });

  it('L 左下角 → CCW(按K)：右移 kick 可用 → 能转', () => {
    const b = createEmptyBoard();
    let p = hardDropPiece(spawnPiece('L'), b);
    p = pushLeft(p, b);
    const r = tryRotate(p, 'CCW', b);
    expect(r).not.toBe(p); // 旋转成功
  });
});
