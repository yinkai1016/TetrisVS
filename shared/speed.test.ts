import { describe, it, expect } from 'vitest';
import { speed } from './speed';
import { SPEED_CONFIG_DEFAULT, SpeedConfig } from './constants';

const MIN = 60 * 1000;

describe('speed curve (default config)', () => {
  it('起始速度 = baseSpeed', () => {
    expect(speed(0, SPEED_CONFIG_DEFAULT)).toBeCloseTo(1);
  });
  it('3 分钟内保持基础速度', () => {
    expect(speed(2 * MIN, SPEED_CONFIG_DEFAULT)).toBeCloseTo(1);
  });
  it('满 3 分钟 → 1.1×', () => {
    expect(speed(3 * MIN, SPEED_CONFIG_DEFAULT)).toBeCloseTo(1.1);
  });
  it('4 分钟 → 1.2×', () => {
    expect(speed(4 * MIN, SPEED_CONFIG_DEFAULT)).toBeCloseTo(1.2);
  });
  it('5 分钟 → 1.3×', () => {
    expect(speed(5 * MIN, SPEED_CONFIG_DEFAULT)).toBeCloseTo(1.3);
  });
});

describe('speed config 可自定义', () => {
  const custom: SpeedConfig = {
    baseSpeed: 2,
    holdMs: 1 * MIN,
    firstMultiplier: 1.5,
    stepMs: 30 * 1000,
    stepIncrement: 0.5,
  };
  it('起始 = baseSpeed', () => {
    expect(speed(0, custom)).toBeCloseTo(2);
  });
  it('满自定义 holdMs 进入首倍率', () => {
    expect(speed(1 * MIN, custom)).toBeCloseTo(3); // 2 * 1.5
  });
});

describe('speed 纯函数性', () => {
  it('相同输入相同输出', () => {
    expect(speed(123456, SPEED_CONFIG_DEFAULT)).toBe(speed(123456, SPEED_CONFIG_DEFAULT));
  });
});
