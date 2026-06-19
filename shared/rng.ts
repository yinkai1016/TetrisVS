// 种子化 RNG（mulberry32）+ 7-bag 方块队列。
import { TetrominoType, TETROMINO_TYPES } from './types';

/** mulberry32：给定 32 位种子，返回确定性的 [0,1) 随机函数。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BagQueue {
  /** 取下一个方块（消费）。 */
  next(): TetrominoType;
  /** 预览接下来 n 个方块（不消费）。 */
  peek(n: number): TetrominoType[];
}

/** 创建可种子化的 7-bag 队列。相同种子产生相同序列。 */
export function createBagQueue(seed: number): BagQueue {
  const rng = mulberry32(seed);
  const queue: TetrominoType[] = [];

  const refill = () => {
    const bag = [...TETROMINO_TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    queue.push(...bag);
  };

  refill();

  return {
    next() {
      if (queue.length === 0) refill();
      return queue.shift() as TetrominoType;
    },
    peek(n) {
      while (queue.length < n) refill();
      return queue.slice(0, n);
    },
  };
}
