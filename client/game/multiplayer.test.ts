import { describe, it, expect } from 'vitest';
import { cycleTarget, defaultTarget } from './multiplayer';

describe('cycleTarget', () => {
  it('无存活对手返回 null', () => {
    expect(cycleTarget([], null, 1)).toBeNull();
  });
  it('无当前目标时选第一个', () => {
    expect(cycleTarget(['A', 'B'], null, 1)).toBe('A');
  });
  it('向后循环 B→A', () => {
    expect(cycleTarget(['A', 'B'], 'B', -1)).toBe('A');
  });
  it('向前循环并回绕 A→B', () => {
    expect(cycleTarget(['A', 'B'], 'A', 1)).toBe('B');
  });
  it('回绕到末尾 B→(next)→A', () => {
    expect(cycleTarget(['A', 'B'], 'B', 1)).toBe('A');
  });
});

describe('defaultTarget', () => {
  it('优先复仇（上次攻击者）', () => {
    expect(defaultTarget(['A', 'B'], 'B')).toBe('B');
  });
  it('无攻击者时选首个', () => {
    expect(defaultTarget(['A', 'B'], null)).toBe('A');
  });
  it('攻击者已淘汰则回退首个', () => {
    expect(defaultTarget(['A'], 'B')).toBe('A');
  });
  it('无存活返回 null', () => {
    expect(defaultTarget([], 'A')).toBeNull();
  });
});
