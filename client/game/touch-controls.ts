// 触屏虚拟按键：底部独立按键区，产生与键盘同一套 ClientAction。
// 左手 = 方向十字（↑硬降/←左/→右/↓软降，圆形），右手 = 动作键（U H 一排 + 转 一排，方角）。
// 全灰色，靠形状区分方向/动作。连续键走触屏 DAS/ARR；单次键边沿触发。
import { ClientAction } from './input';

/** 触屏 DAS/ARR（比桌面更跟手）。 */
export const TOUCH_DAS_MS = 100;
export const TOUCH_ARR_MS = 25;

export interface RepeatState {
  armed: boolean;
  dasTimer: number;
  arrTimer: number;
}

export function advanceRepeat(
  state: RepeatState,
  dtMs: number,
  dasMs: number,
  arrMs: number,
): { state: RepeatState; fired: number } {
  let { armed, dasTimer, arrTimer } = state;
  let fired = 0;
  if (!armed) {
    dasTimer += dtMs;
    if (dasTimer >= dasMs) {
      armed = true;
      arrTimer = 0;
    }
  } else {
    arrTimer += dtMs;
    while (arrTimer >= arrMs) {
      arrTimer -= arrMs;
      fired++;
    }
  }
  return { state: { armed, dasTimer, arrTimer }, fired };
}

type Group = 'dir' | 'act';

interface PadButton {
  action: ClientAction;
  label: string;
  repeat: boolean;
  group: Group;
  pos?: string;
  cls?: string;
}

/** 左手方向十字（圆形，统一方向样式）。 */
const PAD_DIRECTIONS: PadButton[] = [
  { action: 'hardDrop', label: '↑', repeat: false, group: 'dir', pos: 'up' },
  { action: 'left', label: '←', repeat: true, group: 'dir', pos: 'left' },
  { action: 'right', label: '→', repeat: true, group: 'dir', pos: 'right' },
  { action: 'softDrop', label: '↓', repeat: true, group: 'dir', pos: 'down' },
];

const BTN_HOLD: PadButton = { action: 'hold', label: 'H', repeat: false, group: 'act' };
const BTN_ATTACK: PadButton = { action: 'attack', label: 'U', repeat: false, group: 'act', cls: 'attack' };
const BTN_ROTATE: PadButton = { action: 'rotateCW', label: '↻', repeat: false, group: 'act' };

type Sink = (action: ClientAction) => void;

export class TouchControls {
  private root: HTMLDivElement | null = null;
  private held = new Map<ClientAction, RepeatState>();

  constructor(
    private container: HTMLElement,
    private sink: Sink,
    private opts: { withAttack?: boolean } = {},
  ) {}

  attach(): void {
    const root = document.createElement('div');
    root.className = 'touch-pad';
    this.root = root;

    // 左手方向十字
    const dir = document.createElement('div');
    dir.className = 'pad-dir';
    PAD_DIRECTIONS.forEach((b) => {
      const btn = this.makeButton(b);
      if (b.pos) btn.classList.add(`pad-pos-${b.pos}`);
      dir.appendChild(btn);
    });

    // 右手动作键：上排 U H，下排 转
    const act = document.createElement('div');
    act.className = 'pad-actions';
    const row1 = document.createElement('div');
    row1.className = 'pad-row';
    if (this.opts.withAttack) row1.appendChild(this.makeButton(BTN_ATTACK));
    row1.appendChild(this.makeButton(BTN_HOLD));
    const row2 = document.createElement('div');
    row2.className = 'pad-row';
    row2.appendChild(this.makeButton(BTN_ROTATE));
    act.appendChild(row1);
    act.appendChild(row2);

    root.appendChild(dir);
    root.appendChild(act);
    this.container.appendChild(root);
  }

  detach(): void {
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.root = null;
    this.held.clear();
  }

  private makeButton(b: PadButton): HTMLButtonElement {
    const btn = document.createElement('button');
    let cls = 'pad-btn';
    cls += b.group === 'dir' ? ' pad-key' : ' pad-act';
    if (b.cls) cls += ` pad-btn-${b.cls}`;
    btn.className = cls;
    btn.textContent = b.label;
    btn.type = 'button';

    const press = (e: Event) => {
      e.preventDefault();
      this.sink(b.action);
      if (b.repeat) {
        this.held.set(b.action, { armed: false, dasTimer: 0, arrTimer: 0 });
      }
    };
    const release = () => {
      if (b.repeat) this.held.delete(b.action);
    };

    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release);
    btn.addEventListener('touchcancel', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
    return btn;
  }

  poll(dtMs: number): void {
    for (const [action, st] of this.held) {
      const r = advanceRepeat(st, dtMs, TOUCH_DAS_MS, TOUCH_ARR_MS);
      this.held.set(action, r.state);
      for (let i = 0; i < r.fired; i++) this.sink(action);
    }
  }
}
