import { describe, it, expect } from 'vitest';
import { energyGain, addEnergy, spendEnergy } from './energy';
import { ENERGY_COST_PER_ATTACK, ENERGY_MAX } from './constants';

describe('energyGain', () => {
  it('消 2/3/4 行分别得 1/2/3', () => {
    expect(energyGain(2)).toBe(1);
    expect(energyGain(3)).toBe(2);
    expect(energyGain(4)).toBe(3);
  });
  it('消 0/1 行不得能量', () => {
    expect(energyGain(0)).toBe(0);
    expect(energyGain(1)).toBe(0);
  });
});

describe('addEnergy', () => {
  it('正常累加', () => {
    expect(addEnergy(5, 2)).toBe(7);
  });
  it('超出上限截断为 ENERGY_MAX', () => {
    expect(addEnergy(9, 3)).toBe(ENERGY_MAX);
  });
  it('已达上限不再增长', () => {
    expect(addEnergy(ENERGY_MAX, 3)).toBe(ENERGY_MAX);
  });
});

describe('spendEnergy', () => {
  it('能量充足消耗成功', () => {
    const r = spendEnergy(8);
    expect(r.ok).toBe(true);
    expect(r.energy).toBe(8 - ENERGY_COST_PER_ATTACK);
  });
  it('恰好 5 点消耗为 0', () => {
    const r = spendEnergy(ENERGY_COST_PER_ATTACK);
    expect(r.ok).toBe(true);
    expect(r.energy).toBe(0);
  });
  it('能量不足消耗失败且不变', () => {
    const r = spendEnergy(4);
    expect(r.ok).toBe(false);
    expect(r.energy).toBe(4);
  });
  it('满能量消耗后剩余 5（可再放一次）', () => {
    const r = spendEnergy(ENERGY_MAX);
    expect(r.ok).toBe(true);
    expect(r.energy).toBe(ENERGY_MAX - ENERGY_COST_PER_ATTACK);
  });
});
