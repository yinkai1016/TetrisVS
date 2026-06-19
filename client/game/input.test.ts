import { describe, it, expect } from 'vitest';
import { InputController, EventTargetLike, ActionSink, ClientAction } from './input';
import { ARR_MS, DAS_MS, SOFT_DROP_INTERVAL_MS, KEY_MAP } from '../../shared/constants';

class FakeTarget {
  private downLs: ((e: KeyboardEvent) => void)[] = [];
  private upLs: ((e: KeyboardEvent) => void)[] = [];

  addEventListener(type: string, l: (e: KeyboardEvent) => void) {
    (type === 'keydown' ? this.downLs : this.upLs).push(l);
  }
  removeEventListener(type: string, l: (e: KeyboardEvent) => void) {
    const arr = type === 'keydown' ? this.downLs : this.upLs;
    const i = arr.indexOf(l);
    if (i >= 0) arr.splice(i, 1);
  }
  down(code: string, repeat = false) {
    const ev = { code, repeat, preventDefault() {} } as unknown as KeyboardEvent;
    this.downLs.forEach(l => l(ev));
  }
  up(code: string) {
    const ev = { code } as unknown as KeyboardEvent;
    this.upLs.forEach(l => l(ev));
  }
}

function setup() {
  const target = new FakeTarget();
  const actions: ClientAction[] = [];
  const sink: ActionSink = a => actions.push(a);
  const ctrl = new InputController(target as unknown as EventTargetLike, sink);
  ctrl.attach();
  return { target, actions, ctrl };
}

describe('键映射（首次按下立即触发）', () => {
  it('A → left, D → right, S → softDrop', () => {
    const { target, actions } = setup();
    target.down(KEY_MAP.left);
    target.down(KEY_MAP.right);
    target.down(KEY_MAP.softDrop);
    expect(actions).toEqual(['left', 'right', 'softDrop']);
  });
});

describe('DAS/ARR 连续横移', () => {
  it('按下首次移动；未达 DAS 不重复；达 DAS 后按 ARR 连续', () => {
    const { target, actions, ctrl } = setup();
    target.down(KEY_MAP.left);
    expect(actions).toEqual(['left']);
    ctrl.poll(DAS_MS - 1); // 未达 DAS
    expect(actions).toEqual(['left']);
    ctrl.poll(1); // 刚达 DAS，armed，arrTimer=0
    expect(actions).toEqual(['left']);
    ctrl.poll(ARR_MS); // ARR 触发一次
    expect(actions).toEqual(['left', 'left']);
    ctrl.poll(ARR_MS * 3); // 连续 3 次
    expect(actions).toEqual(['left', 'left', 'left', 'left', 'left']);
  });

  it('松开停止重复', () => {
    const { target, actions, ctrl } = setup();
    target.down(KEY_MAP.left);
    ctrl.poll(DAS_MS + ARR_MS);
    const n = actions.length;
    target.up(KEY_MAP.left);
    ctrl.poll(ARR_MS * 10);
    expect(actions.length).toBe(n);
  });
});

describe('软降按住连续触发', () => {
  it('按住 S 以 SOFT_DROP_INTERVAL_MS 重复', () => {
    const { target, actions, ctrl } = setup();
    target.down(KEY_MAP.softDrop);
    expect(actions).toEqual(['softDrop']);
    ctrl.poll(SOFT_DROP_INTERVAL_MS);
    expect(actions).toEqual(['softDrop', 'softDrop']);
    ctrl.poll(SOFT_DROP_INTERVAL_MS * 2);
    expect(actions.length).toBe(4);
  });
});

describe('单次动作边沿去抖', () => {
  it('旋转/硬降/Hold 在 keydown 触发一次，OS 重复键不再触发', () => {
    const { target, actions } = setup();
    target.down(KEY_MAP.rotateCW, false);
    target.down(KEY_MAP.rotateCW, true); // OS 自动重复
    target.down(KEY_MAP.hardDrop, false);
    target.down(KEY_MAP.hold, false);
    expect(actions).toEqual(['rotateCW', 'hardDrop', 'hold']);
  });
});
