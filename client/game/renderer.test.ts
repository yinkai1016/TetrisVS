import { describe, it, expect } from 'vitest';
import { renderGame, COLORS, DEFAULT_LAYOUT } from './renderer';
import { createGame } from './engine';
import { TETROMINO_TYPES } from '../../shared/types';

interface MockCtx {
  fillStyle: string;
  strokeStyle: string;
  globalAlpha: number;
  font: string;
  textAlign: string;
  canvas: { width: number; height: number };
  fillRect: () => void;
  strokeRect: () => void;
  fillText: () => void;
  calls: string[];
}

function mockCtx(): MockCtx {
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
  };
}

describe('renderer COLORS', () => {
  it('覆盖全部 7 种方块', () => {
    for (const t of TETROMINO_TYPES) {
      expect(COLORS[t]).toBeTruthy();
    }
  });
});

describe('renderGame', () => {
  it('在 mock ctx 上不抛错且产生绘制调用', () => {
    const ctx = mockCtx();
    const state = createGame(1);
    expect(() => renderGame(ctx as unknown as CanvasRenderingContext2D, state, DEFAULT_LAYOUT)).not.toThrow();
    expect(ctx.calls.length).toBeGreaterThan(0);
    expect(ctx.calls).toContain('fillRect');
    expect(ctx.calls).toContain('strokeRect');
  });

  it('Game Over 状态额外绘制遮罩文字', () => {
    const ctx = mockCtx();
    let state = createGame(1);
    state = { ...state, phase: 'GameOver' };
    renderGame(ctx as unknown as CanvasRenderingContext2D, state, DEFAULT_LAYOUT);
    expect(ctx.calls).toContain('fillText');
  });

  it('布局对称：左留白 == 右留白（内容居中）', () => {
    const { boardX, cell, panelW, holdX, nextX } = DEFAULT_LAYOUT;
    const boardRight = boardX + 10 * cell;
    const leftPad = holdX; // 左栏左边
    const rightPad = 720 - (nextX + panelW); // canvas 720
    expect(leftPad).toBe(rightPad);
    expect(boardX).toBeGreaterThan(holdX + panelW); // 棋盘在左栏右侧
    expect(nextX).toBeGreaterThan(boardRight); // Next 在棋盘右侧
  });
});
