// 能量积累与消耗（消耗用于释放攻击，见 garbage-attack）。
import { ENERGY_COST_PER_ATTACK, ENERGY_MAX } from './constants';

/** 消行得分能量：2→1、3→2、4→3，其余→0。 */
export function energyGain(linesCleared: number): number {
  switch (linesCleared) {
    case 2:
      return 1;
    case 3:
      return 2;
    case 4:
      return 3;
    default:
      return 0;
  }
}

/** 累加能量，上限 ENERGY_MAX 截断。 */
export function addEnergy(current: number, delta: number): number {
  return Math.min(ENERGY_MAX, current + delta);
}

/**
 * 消耗能量释放攻击：当前 ≥ ENERGY_COST_PER_ATTACK 则消耗成功、返回 ok:true 与扣减后的能量；
 * 否则消耗失败、能量不变。纯函数，不依赖 DOM/网络。
 */
export function spendEnergy(current: number): { energy: number; ok: boolean } {
  if (current >= ENERGY_COST_PER_ATTACK) {
    return { energy: current - ENERGY_COST_PER_ATTACK, ok: true };
  }
  return { energy: current, ok: false };
}
