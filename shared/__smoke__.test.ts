import { describe, it, expect } from 'vitest';
import { BOARD_WIDTH } from '@shared/constants';

describe('shared smoke test', () => {
  it('imports constants through alias', () => {
    expect(BOARD_WIDTH).toBe(10);
  });
});
