// 联机对局编排：net 事件 → engine → 渲染（主棋盘 + 对手预览）+ 攻击/目标。
import { Action, GameState, createGame, dispatch, receiveGarbage, step } from './engine';
import { ClientAction, InputController } from './input';
import { Net, GameStartPayload } from './net';
import { OpponentView, drawOpponents, renderGame } from './renderer';
import { decodeBoard, encodeBoard } from '../../shared/snapshot';
import { spendEnergy } from '../../shared/energy';
import { BOARD_VISIBLE_HEIGHT, BOARD_WIDTH, TICK_MS } from '../../shared/constants';
import { Board } from '../../shared/types';

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
  net: Net;
  onGameEnd?: (winner: string | null, isSelf: boolean) => void;
}

export class MultiplayerSession {
  private input: InputController;
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
  private countdownEnd = 0; // 墙钟时间戳（与服务器 Date.now() 同基准）
  private gameOverSent = false;

  constructor(private opts: MultiplayerSessionOpts) {
    this.input = new InputController(window, (a) => this.handleAction(a));
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
    this.countdownEnd = payload.startTimestamp; // 服务器墙钟时间戳
    this.gameOverSent = false;
    this.ended = false;
    this.running = true;
    this.input.attach();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private aliveOpps(): string[] {
    return Array.from(this.alive).filter((id) => id !== this.selfId);
  }

  private loop = (): void => {
    if (!this.running || !this.state) return;
    // 倒计时门槛用墙钟（与服务器 startTimestamp 同基准），dt 用 performance.now()
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
      this.input.poll(TICK_MS);
      const before = this.state;
      this.state = step(this.state, TICK_MS);
      this.acc -= TICK_MS;
      // 锁定检测：active 引用变化说明发生过锁定 → 广播快照
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
    if (a === 'pause') return; // 联机对局禁用暂停（保证双方同步）
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
    renderGame(this.opts.ctx, this.state);
    drawOpponents(this.opts.ctx, Array.from(this.opponents.values()), this.targetId, 740, 30, 7);
    if (wallNow < this.countdownEnd) {
      const sec = Math.max(1, Math.ceil((this.countdownEnd - wallNow) / 1000));
      this.opts.ctx.fillStyle = 'rgba(0,0,0,0.55)';
      this.opts.ctx.fillRect(200, 250, 320, 90);
      this.opts.ctx.fillStyle = '#fff';
      this.opts.ctx.font = '48px system-ui';
      this.opts.ctx.textAlign = 'center';
      this.opts.ctx.fillText(String(sec), 360, 310);
    }
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach();
  }
}
