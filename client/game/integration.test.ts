// 端到端集成：input → engine → renderer 联动 + 完整一局模拟。
import { describe, it, expect } from 'vitest';
import { Action, createGame, dispatch, step } from './engine';
import { InputController, EventTargetLike, type ClientAction } from './input';
import { renderGame } from './renderer';
import { BOARD_HEIGHT } from '../../shared/constants';
import { Piece } from '../../shared/types';

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

function mockCtx() {
  const calls: string[] = [];
  return {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: '',
    canvas: { width: 720, height: 640 },
    fillRect: () => calls.push('fillRect'),
    strokeRect: () => calls.push('strokeRect'),
    fillText: () => calls.push('fillText'),
    calls,
  } as unknown as CanvasRenderingContext2D & { calls: string[] };
}

describe('端到端：完整一局', () => {
  it('连续硬降直到 GameOver，全程无异常', () => {
    let g = createGame(2024);
    let guard = 0;
    while (g.phase !== 'GameOver' && guard < 5000) {
      g = dispatch(g, 'hardDrop');
      guard++;
    }
    expect(g.phase).toBe('GameOver');
    expect(guard).toBeLessThan(5000);
  });
});

describe('端到端：input + engine + renderer 联动', () => {
  it('按键 + 自然下落 + 渲染一帧不抛错', () => {
    let g = createGame(7);
    const sink = (a: ClientAction) => {
      g = dispatch(g, a as Action);
    };
    const target = new FakeTarget();
    const ctrl = new InputController(target as unknown as EventTargetLike, sink);
    ctrl.attach();

    target.down('KeyA');
    target.down('KeyJ');
    target.down('KeyS');
    for (let i = 0; i < 120; i++) {
      ctrl.poll(16);
      g = step(g, 16);
    }
    const ctx = mockCtx();
    expect(() => renderGame(ctx, g)).not.toThrow();
    expect(ctx.calls.length).toBeGreaterThan(0);
  });

  it('消行驱动能量增长（engine 集成）', () => {
    let g = createGame(99);
    const h = BOARD_HEIGHT;
    for (let x = 0; x < 8; x++) {
      g.board[h - 1][x] = 'I';
      g.board[h - 2][x] = 'I';
    }
    g = { ...g, active: { type: 'O', rotation: 0, pos: { x: 7, y: 0 } } as Piece };
    g = dispatch(g, 'hardDrop');
    expect(g.energy).toBeGreaterThan(0);
  });
});
