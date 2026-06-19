// 速度曲线纯函数：对局已用时长 → 每秒下落行数。
import { SpeedConfig } from './constants';

/**
 * 默认曲线：elapsedMs < holdMs 时返回 baseSpeed；
 * 之后倍率 = firstMultiplier + floor((elapsedMs - holdMs) / stepMs) * stepIncrement。
 */
export function speed(elapsedMs: number, config: SpeedConfig): number {
  if (elapsedMs < config.holdMs) return config.baseSpeed;
  const stepsAfterFirst = Math.floor((elapsedMs - config.holdMs) / config.stepMs);
  const multiplier = config.firstMultiplier + stepsAfterFirst * config.stepIncrement;
  return config.baseSpeed * multiplier;
}
