// 联机对局编排：net 事件 → engine → 渲染 + 攻击/目标。
// 桌面 = 键盘 + renderGame + 右侧对手；手机 = 虚拟按键 + renderMobile + 顶部对手条 + 点对手切目标。
import { Action, GameState, createGame, dispatch, receiveGarbage, step } from './engine';
import { ClientAction, InputController } from './input';
import { Net, GameStartPayload } from './net';
import { OpponentView, drawOpponents, renderGame, renderMobile, MOBILE_LAYOUT } from './renderer';
import { decodeBoard, encodeBoard } from '../../shared/snapshot';
import { spendEnergy } from '../../shared/energy';
import { BOARD_VISIBLE_HEIGHT, BOARD_WIDTH, TICK_MS } from '../../shared/constants';
import { Board } from '../../shared/types';
import { TouchControls } from './touch-controls';
import { setupCanvasDpi } from './platform';

function emptyVisibleBoard(): Board {
  return Array.from({ length: BOARD_VISIBLE_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null),
  );
}

/** 在存活对手间循环切换目标，dir = -1(prev)/1(next)。 */
export function cycleTarget(aliveOpps: string[], current: string | null, dir: number): string | null {
  if (aliveOpps.length === 0) return null;
  if (!current || !aliveOpps.includes(current)) return aliveOpps[0];
  const idx = aliveOpps.indexOf(current);
  return aliveOpps[(idx + dir + aliveOpps.length) % aliveOpps.length];
}

/** 默认目标：上次攻击者（复仇），否则首个存活对手。 */
export function defaultTarget(aliveOpps: string[], lastAttacker: string | null): string | null {
  if (lastAttacker && aliveOpps.includes(lastAttacker)) return lastAttacker;
  return aliveOpps[0] ?? null;
}

export interface MultiplayerSessionOpts {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  net: Net;
  touch: boolean;
  parentContainer?: HTMLElement;
  onGameEnd?: (winner: string | null, isSelf: boolean) => void;
}

export class MultiplayerSession {
  private state: GameState | null = null;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;
  private ended = false;

  private selfId: string | null = null;
  private opponents = new Map<string, OpponentView>();
  private alive = new Set<string>();
  private targetId: string | null = null;
  private lastAttacker: string | null = null;
  private countdownEnd = 0;
  private gameOverSent = false;

  private pollInput: (dt: number) => void;
  private inputCleanup: () => void;
  private touchContainer: HTMLDivElement | null = null;

  constructor(private opts: MultiplayerSessionOpts) {
    if (opts.touch) {
      // 手机：虚拟按键挂到流式容器（#app 内，canvas 下方，不遮挡）
      this.touchContainer = document.createElement('div');
      (opts.parentContainer ?? document.body).appendChild(this.touchContainer);
      const tc = new TouchControls(
        this.touchContainer,
        (a) => this.handleAction(a),
        { withAttack: true },
      );
      tc.attach();
      this.pollInput = (dt) => tc.poll(dt);
      this.inputCleanup = () => tc.detach();
      this.opts.canvas.addEventListener('click', this.onTapOpponent);
    } else {
      const ic = new InputController(window, (a) => this.handleAction(a));
      ic.attach();
      this.pollInput = (dt) => ic.poll(dt);
      this.inputCleanup = () => ic.detach();
    }
  }

  start(payload: GameStartPayload): void {
    this.selfId = this.opts.net.selfId;
    this.opponents.clear();
    this.alive = new Set(payload.players.map((p) => p.id));
    for (const p of payload.players) {
      if (p.id !== this.selfId) {
        this.opponents.set(p.id, { id: p.id, name: p.name, board: emptyVisibleBoard(), alive: true });
      }
    }
    this.targetId = defaultTarget(this.aliveOpps(), this.lastAttacker);
    this.state = createGame(payload.seed);
    this.countdownEnd = payload.startTimestamp;
    this.gameOverSent = false;
    this.ended = false;
    this.running = true;
    if (this.opts.touch) {
      setupCanvasDpi(this.opts.canvas, MOBILE_LAYOUT.canvasW, MOBILE_LAYOUT.canvasH);
    }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private aliveOpps(): string[] {
    return Array.from(this.alive).filter((id) => id !== this.selfId);
  }

  /** 手机：点对手迷你预览切目标。 */
  private onTapOpponent = (e: MouseEvent): void => {
    if (!this.opts.touch) return;
    const rect = this.opts.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * MOBILE_LAYOUT.canvasW;
    const y = ((e.clientY - rect.top) / rect.height) * MOBILE_LAYOUT.canvasH;
    const opps = Array.from(this.opponents.values()).filter((o) => o.alive);
    const sw = BOARD_WIDTH * MOBILE_LAYOUT.oppCell;
    const sh = BOARD_VISIBLE_HEIGHT * MOBILE_LAYOUT.oppCell;
    for (let i = 0; i < opps.length; i++) {
      const ox = 8 + i * MOBILE_LAYOUT.oppSlotW;
      if (x >= ox && x < ox + sw && y >= MOBILE_LAYOUT.oppY && y < MOBILE_LAYOUT.oppY + sh) {
        this.targetId = opps[i].id;
        return;
      }
    }
  };

  private loop = (): void => {
    if (!this.running || !this.state) return;
    const wallNow = Date.now();
    if (wallNow < this.countdownEnd) {
      this.render(wallNow);
      this.raf = requestAnimationFrame(this.loop);
      return;
    }
    const now = performance.now();
    let dt = now - this.last;
    this.last = now;
    if (dt > 250) dt = 250;
    this.acc += dt;
    while (this.acc >= TICK_MS) {
      this.pollInput(TICK_MS);
      const before = this.state;
      this.state = step(this.state, TICK_MS);
      this.acc -= TICK_MS;
      if (this.state.active !== before.active) {
        this.opts.net.sendSnapshot(encodeBoard(this.state.board));
      }
    }
    if (this.state.phase === 'GameOver' && !this.gameOverSent) {
      this.gameOverSent = true;
      this.opts.net.sendGameOver(encodeBoard(this.state.board));
    }
    this.render(wallNow);
    if (!this.ended) this.raf = requestAnimationFrame(this.loop);
  };

  handleAction(a: ClientAction): void {
    if (!this.state || !this.running) return;
    if (Date.now() < this.countdownEnd) return; // 倒计时禁操作
    if (a === 'pause') return; // 联机禁暂停
    switch (a) {
      case 'targetPrev':
        this.targetId = cycleTarget(this.aliveOpps(), this.targetId, -1);
        return;
      case 'targetNext':
        this.targetId = cycleTarget(this.aliveOpps(), this.targetId, 1);
        return;
      case 'attack':
        this.tryAttack();
        return;
      default:
        this.state = dispatch(this.state, a as Action);
    }
  }

  private tryAttack(): void {
    if (!this.state || !this.targetId || !this.alive.has(this.targetId)) return;
    const res = spendEnergy(this.state.energy);
    if (!res.ok) return;
    this.state = { ...this.state, energy: res.energy };
    this.opts.net.attack(this.targetId);
  }

  onOpponentSnapshot(id: string, snapshot: string): void {
    const opp = this.opponents.get(id);
    if (opp) opp.board = decodeBoard(snapshot);
  }

  onGarbageIn(fromId: string, count: number, holeCol: number): void {
    if (this.state) {
      this.state = receiveGarbage(this.state, count, holeCol);
      this.lastAttacker = fromId;
      if (!this.targetId || !this.alive.has(this.targetId)) {
        this.targetId = defaultTarget(this.aliveOpps(), this.lastAttacker);
      }
    }
  }

  onPlayerOut(id: string): void {
    this.alive.delete(id);
    const opp = this.opponents.get(id);
    if (opp) opp.alive = false;
    if (this.targetId === id) this.targetId = defaultTarget(this.aliveOpps(), this.lastAttacker);
  }

  onGameEnd(winner: string | null): void {
    this.ended = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.opts.onGameEnd?.(winner, winner === this.selfId);
    this.render(Date.now());
  }

  private render(wallNow: number): void {
    if (!this.state) return;
    const oppList = Array.from(this.opponents.values());
    if (this.opts.touch) {
      renderMobile(this.opts.ctx, this.state, oppList, this.targetId);
    } else {
      renderGame(this.opts.ctx, this.state);
      drawOpponents(this.opts.ctx, oppList, this.targetId, 740, 30, 7);
    }
    // 倒计时遮罩
    if (wallNow < this.countdownEnd) {
      const sec = Math.max(1, Math.ceil((this.countdownEnd - wallNow) / 1000));
      const cx = this.opts.touch ? MOBILE_LAYOUT.canvasW / 2 : 360;
      const cy = this.opts.touch ? MOBILE_LAYOUT.canvasH / 2 : 305;
      this.opts.ctx.fillStyle = 'rgba(0,0,0,0.55)';
      this.opts.ctx.fillRect(cx - 80, cy - 45, 160, 90);
      this.opts.ctx.fillStyle = '#fff';
      this.opts.ctx.font = '48px system-ui';
      this.opts.ctx.textAlign = 'center';
      this.opts.ctx.fillText(String(sec), cx, cy + 16);
    }
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.inputCleanup();
    this.opts.canvas.removeEventListener('click', this.onTapOpponent);
    if (this.touchContainer?.parentNode) this.touchContainer.parentNode.removeChild(this.touchContainer);
    this.touchContainer = null;
  }
}
