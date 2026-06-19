// 键盘输入：键映射 + DAS/ARR + 边沿去抖。
// DOM 依赖抽象为 EventTargetLike，便于注入 window（生产）或 fake（测试）。
// ClientAction = 引擎动作 + 联机元动作（切目标/攻击）；单机 sink 对元动作忽略即可。
import { Action } from './engine';
import { ARR_MS, DAS_MS, KEY_MAP, SOFT_DROP_INTERVAL_MS } from '../../shared/constants';

export interface EventTargetLike {
  addEventListener(type: string, listener: (e: KeyboardEvent) => void): void;
  removeEventListener(type: string, listener: (e: KeyboardEvent) => void): void;
}

export type ClientAction = Action | 'targetPrev' | 'targetNext' | 'attack';

export type ActionSink = (action: ClientAction) => void;

export class InputController {
  private heldLeft = false;
  private heldRight = false;
  private heldSoft = false;
  private dasArmed = false;
  private dasTimer = 0;
  private arrTimer = 0;
  private softTimer = 0;

  private readonly onDown = (e: KeyboardEvent) => this.handleDown(e);
  private readonly onUp = (e: KeyboardEvent) => this.handleUp(e);

  constructor(private readonly target: EventTargetLike, private readonly sink: ActionSink) {}

  attach(): void {
    this.target.addEventListener('keydown', this.onDown);
    this.target.addEventListener('keyup', this.onUp);
  }

  detach(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
  }

  private isGameKey(code: string): boolean {
    return (Object.values(KEY_MAP) as readonly string[]).includes(code);
  }

  private handleDown(e: KeyboardEvent): void {
    if (!this.isGameKey(e.code)) return;
    e.preventDefault();
    switch (e.code) {
      case KEY_MAP.left:
        if (this.heldLeft) return; // 忽略 OS 自动重复，连续移动由 DAS/ARR 驱动
        this.heldLeft = true;
        this.heldRight = false; // 左右互斥
        this.dasArmed = false;
        this.dasTimer = 0;
        this.arrTimer = 0;
        this.sink('left');
        return;
      case KEY_MAP.right:
        if (this.heldRight) return;
        this.heldRight = true;
        this.heldLeft = false;
        this.dasArmed = false;
        this.dasTimer = 0;
        this.arrTimer = 0;
        this.sink('right');
        return;
      case KEY_MAP.softDrop:
        if (this.heldSoft) return;
        this.heldSoft = true;
        this.softTimer = 0;
        this.sink('softDrop');
        return;
      case KEY_MAP.rotateCW:
        if (!e.repeat) this.sink('rotateCW');
        return;
      case KEY_MAP.rotateCCW:
        if (!e.repeat) this.sink('rotateCCW');
        return;
      case KEY_MAP.hardDrop:
        if (!e.repeat) this.sink('hardDrop');
        return;
      case KEY_MAP.hold:
        if (!e.repeat) this.sink('hold');
        return;
      case KEY_MAP.pause:
        if (!e.repeat) this.sink('pause');
        return;
      case KEY_MAP.targetPrev:
        if (!e.repeat) this.sink('targetPrev');
        return;
      case KEY_MAP.targetNext:
        if (!e.repeat) this.sink('targetNext');
        return;
      case KEY_MAP.attack:
        if (!e.repeat) this.sink('attack');
        return;
    }
  }

  private handleUp(e: KeyboardEvent): void {
    switch (e.code) {
      case KEY_MAP.left:
        this.heldLeft = false;
        break;
      case KEY_MAP.right:
        this.heldRight = false;
        break;
      case KEY_MAP.softDrop:
        this.heldSoft = false;
        break;
    }
  }

  /** 由主循环按固定步长调用，产生 DAS/ARR/软降的连续动作。 */
  poll(dtMs: number): void {
    if (this.heldLeft || this.heldRight) {
      if (!this.dasArmed) {
        this.dasTimer += dtMs;
        if (this.dasTimer >= DAS_MS) {
          this.dasArmed = true;
          this.arrTimer = 0;
        }
      } else {
        this.arrTimer += dtMs;
        const dir: Action = this.heldLeft ? 'left' : 'right';
        while (this.arrTimer >= ARR_MS) {
          this.arrTimer -= ARR_MS;
          this.sink(dir);
        }
      }
    }
    if (this.heldSoft) {
      this.softTimer += dtMs;
      while (this.softTimer >= SOFT_DROP_INTERVAL_MS) {
        this.softTimer -= SOFT_DROP_INTERVAL_MS;
        this.sink('softDrop');
      }
    }
  }
}
