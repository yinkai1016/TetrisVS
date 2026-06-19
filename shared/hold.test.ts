import { describe, it, expect } from 'vitest';
import { EMPTY_HOLD, tryHold } from './hold';
import { createBagQueue } from './rng';
import { spawnPiece } from './board';

describe('tryHold', () => {
  it('空槽首次 Hold：当前方块入槽，取队列下一块', () => {
    const queue = createBagQueue(1);
    const firstNext = queue.peek(1)[0];
    const res = tryHold(spawnPiece('T'), EMPTY_HOLD, queue);
    expect(res).not.toBeNull();
    expect(res!.state.holdSlot).toBe('T');
    expect(res!.state.holdUsed).toBe(true);
    expect(res!.active.type).toBe(firstNext);
  });

  it('非空槽 Hold：与槽中方块交换', () => {
    const queue = createBagQueue(1);
    const res = tryHold(spawnPiece('T'), { holdSlot: 'I', holdUsed: false }, queue);
    expect(res).not.toBeNull();
    expect(res!.active.type).toBe('I');
    expect(res!.state.holdSlot).toBe('T');
    expect(res!.state.holdUsed).toBe(true);
  });

  it('同一活动方块二次 Hold 被拒绝', () => {
    const queue = createBagQueue(1);
    const first = tryHold(spawnPiece('T'), EMPTY_HOLD, queue)!;
    const second = tryHold(first.active, first.state, queue);
    expect(second).toBeNull();
  });
});
