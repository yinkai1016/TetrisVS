import { describe, it, expect } from 'vitest';
import {
  TOUCH_DAS_MS,
  TOUCH_ARR_MS,
  advanceRepeat,
  RepeatState,
} from './touch-controls';

const initial = (): RepeatState => ({ armed: false, dasTimer: 0, arrTimer: 0 });

describe('touch-controls 常量', () => {
  it('触屏 DAS/ARR 比桌面短（更跟手）', () => {
    expect(TOUCH_DAS_MS).toBeLessThan(150);
    expect(TOUCH_ARR_MS).toBeLessThan(30);
  });
});

describe('advanceRepeat DAS/ARR 时序', () => {
  it('未达 DAS 不重复', () => {
    let s = initial();
    const r = advanceRepeat(s, TOUCH_DAS_MS - 1, TOUCH_DAS_MS, TOUCH_ARR_MS);
    expect(r.fired).toBe(0);
    expect(r.state.armed).toBe(false);
    s = r.state;
    void s;
  });

  it('达 DAS 后 armed，ARR 触发连续', () => {
    let s = initial();
    s = advanceRepeat(s, TOUCH_DAS_MS, TOUCH_DAS_MS, TOUCH_ARR_MS).state; // armed
    const r = advanceRepeat(s, TOUCH_ARR_MS, TOUCH_DAS_MS, TOUCH_ARR_MS);
    expect(r.fired).toBe(1);
  });

  it('ARR 累积多次触发多份', () => {
    let s = initial();
    s = advanceRepeat(s, TOUCH_DAS_MS, TOUCH_DAS_MS, TOUCH_ARR_MS).state; // armed
    const r = advanceRepeat(s, TOUCH_ARR_MS * 3, TOUCH_DAS_MS, TOUCH_ARR_MS);
    expect(r.fired).toBe(3);
  });

  it('DAS 前的累积计入 DAS 判定', () => {
    let s = initial();
    s = advanceRepeat(s, TOUCH_DAS_MS - 5, TOUCH_DAS_MS, TOUCH_ARR_MS).state;
    const r = advanceRepeat(s, 5, TOUCH_DAS_MS, TOUCH_ARR_MS);
    expect(r.state.armed).toBe(true); // 累积达 DAS
    expect(r.fired).toBe(0); // 刚 armed，未到 ARR
  });
});
