import { describe, it, expect } from 'vitest';
import { createBagQueue, mulberry32 } from './rng';
import { TETROMINO_TYPES } from './types';

describe('mulberry32', () => {
  it('相同种子产生相同序列', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it('输出在 [0,1)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('7-bag queue', () => {
  it('一袋恰含 7 种方块各一', () => {
    const q = createBagQueue(123);
    const bag = q.peek(7);
    expect(bag.slice().sort()).toEqual([...TETROMINO_TYPES].sort());
  });

  it('相同种子产生相同方块序列', () => {
    const a = createBagQueue(999);
    const b = createBagQueue(999);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
  });

  it('连续两袋各自是 7 种的排列', () => {
    const q = createBagQueue(7);
    const bag1 = Array.from({ length: 7 }, () => q.next());
    const bag2 = Array.from({ length: 7 }, () => q.next());
    expect(bag1.slice().sort()).toEqual([...TETROMINO_TYPES].sort());
    expect(bag2.slice().sort()).toEqual([...TETROMINO_TYPES].sort());
  });

  it('peek 不消费', () => {
    const q = createBagQueue(5);
    const peeked = q.peek(3);
    const first = q.next();
    expect(peeked[0]).toBe(first);
  });
});
