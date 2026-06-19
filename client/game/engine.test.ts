import { describe, it, expect } from 'vitest';
import { createGame, dispatch, receiveGarbage, restart, step } from './engine';
import { BOARD_HEIGHT } from '../../shared/constants';
import { Piece } from '../../shared/types';

describe('createGame', () => {
  it('初始化为 Falling、能量 0、有活动方块', () => {
    const g = createGame(1);
    expect(g.phase).toBe('Falling');
    expect(g.energy).toBe(0);
    expect(g.active.type).toBeDefined();
    expect(g.paused).toBe(false);
  });
});

describe('下落 → 锁定 → 新块 闭环', () => {
  it('自然下落到底后锁定并入板，生成新方块', () => {
    let g = createGame(1);
    // 每步 1 秒推进；40 秒足够第一块落底 + 锁定，但不会堆满顶出
    for (let i = 0; i < 40; i++) g = step(g, 1000);
    expect(g.phase).not.toBe('GameOver');
    expect(g.board.some(row => row.some(c => c !== null))).toBe(true);
  });

  it('硬降立即锁定并入板', () => {
    let g = createGame(2);
    g = dispatch(g, 'hardDrop');
    expect(g.board.some(row => row.some(c => c !== null))).toBe(true);
    expect(g.phase).toBe('Falling');
  });
});

describe('消行与能量积累', () => {
  it('hardDrop 补满两行后消除并 +1 能量（单消不得能量）', () => {
    let g = createGame(42);
    const h = BOARD_HEIGHT;
    // 底两行 x=0..7 已填，x=8,9 留空；用 O(box.x=7) 同时补满两行
    for (let x = 0; x < 8; x++) {
      g.board[h - 1][x] = 'I';
      g.board[h - 2][x] = 'I';
    }
    g = { ...g, active: { type: 'O', rotation: 0, pos: { x: 7, y: 0 } } as Piece };
    g = dispatch(g, 'hardDrop');
    expect(g.lastCleared).toBe(2);
    expect(g.energy).toBe(1); // energyGain(2) = 1
    expect(g.board[h - 1].every(c => c === null)).toBe(true);
  });
});

describe('Hold', () => {
  it('Hold 后换入槽中方块或下一块，且本块内不可再 Hold', () => {
    let g = createGame(7);
    const before = g.active.type;
    g = dispatch(g, 'hold');
    expect(g.hold.holdSlot).toBe(before);
    expect(g.hold.holdUsed).toBe(true);
    // 再次 hold 被拒
    const same = g.active.type;
    g = dispatch(g, 'hold');
    expect(g.active.type).toBe(same);
  });
});

describe('暂停', () => {
  it('暂停后 step 不推进计时，恢复后继续', () => {
    let g = createGame(3);
    g = dispatch(g, 'pause');
    expect(g.paused).toBe(true);
    g = step(g, 5000);
    expect(g.elapsedMs).toBe(0);
    g = dispatch(g, 'pause');
    g = step(g, 1000);
    expect(g.elapsedMs).toBe(1000);
  });
});

describe('restart', () => {
  it('重开清空棋盘与能量', () => {
    let g = createGame(5);
    g = dispatch(g, 'hardDrop');
    expect(g.board.some(r => r.some(c => c !== null))).toBe(true);
    g = restart(5);
    expect(g.board.every(r => r.every(c => c === null))).toBe(true);
    expect(g.energy).toBe(0);
    expect(g.phase).toBe('Falling');
  });
});

describe('垃圾行 buffer 接入', () => {
  it('createGame 默认无待顶入垃圾', () => {
    expect(createGame(1).garbageQueue).toEqual([]);
  });

  it('receiveGarbage 累加缺口列到队列', () => {
    const g = createGame(1);
    const g2 = receiveGarbage(g, 2, 3);
    expect(g2.garbageQueue).toEqual([3, 3]);
  });

  it('锁定时 queue 被顶入并清空', () => {
    let g = createGame(1);
    g = receiveGarbage(g, 1, 5);
    expect(g.garbageQueue).toEqual([5]);
    g = dispatch(g, 'hardDrop');
    expect(g.garbageQueue).toEqual([]);
  });
});
