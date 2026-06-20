// Canvas 2D 渲染：棋盘、活动方块、ghost、Hold、Next、能量条。
// 三栏对称布局：左栏(Hold+能量条) · 中栏(棋盘) · 右栏(Next)。
import { GameState } from './engine';
import { Board, TetrominoType } from '../../shared/types';
import {
  BOARD_HEIGHT,
  BOARD_VISIBLE_HEIGHT,
  BOARD_WIDTH,
  BUFFER_ROWS,
  ENERGY_MAX,
  NEXT_PREVIEW_COUNT,
} from '../../shared/constants';
import { pieceCells, hardDropPiece } from '../../shared/board';
import { getMinos } from '../../shared/tetromino';

/** 方块颜色（标准 Tetris 配色）。 */
export const COLORS: Record<TetrominoType, string> = {
  I: '#31c7ef',
  O: '#f7d308',
  T: '#ad4d9c',
  S: '#42b642',
  Z: '#ef2029',
  J: '#5a65ad',
  L: '#ef7d0c',
};

/** 垃圾行格子颜色（灰，区别于 7 种方块）。 */
export const GARBAGE_COLOR = '#9aa0a6';

export interface Layout {
  cell: number; // 主棋盘格子像素
  boardX: number;
  boardY: number;
  sideCell: number; // 预览方块格子像素
  panelW: number; // 左右栏宽
  holdX: number;
  holdY: number;
  holdH: number;
  nextX: number;
  nextY: number;
  nextSlotH: number; // 每个 Next 槽高度（含间隔）
  energyX: number;
  energyY: number;
  energyH: number;
}

/** 内容在 720×640 canvas 内左右对称（左留白 85 = 右留白 85）。 */
export const DEFAULT_LAYOUT: Layout = {
  cell: 28,
  boardX: 220,
  boardY: 30,
  sideCell: 20,
  panelW: 110,
  holdX: 85,
  holdY: 40,
  holdH: 80,
  nextX: 525,
  nextY: 40,
  nextSlotH: 72,
  energyX: 85, // 与 holdX 对齐（同一左栏）
  energyY: 170,
  energyH: 300,
};

type Ctx = CanvasRenderingContext2D;

function fillCell(ctx: Ctx, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

/** 在给定方框内居中绘制一个方块的 spawn 形态。 */
function drawPiecePreview(
  ctx: Ctx,
  type: TetrominoType,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  size: number,
): void {
  const minos = getMinos(type, 0);
  const xs = minos.map(m => m.x);
  const ys = minos.map(m => m.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pieceW = (maxX - minX + 1) * size;
  const pieceH = (maxY - minY + 1) * size;
  const ox = boxX + (boxW - pieceW) / 2 - minX * size;
  const oy = boxY + (boxH - pieceH) / 2 - minY * size;
  for (const m of minos) {
    fillCell(ctx, ox + m.x * size, oy + m.y * size, size, COLORS[type]);
  }
}

/** 竖向能量条：从下往上 10 格，已充满的为金色。 */
function drawEnergy(ctx: Ctx, energy: number, layout: Layout): void {
  const barW = 26;
  const cellH = layout.energyH / ENERGY_MAX;
  const x = layout.energyX + (layout.panelW - barW) / 2;

  // 标签
  ctx.fillStyle = '#888';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('ENERGY', layout.energyX, layout.energyY - 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd54a';
  ctx.fillText(`${energy}/${ENERGY_MAX}`, layout.energyX + layout.panelW, layout.energyY - 12);

  for (let i = 0; i < ENERGY_MAX; i++) {
    const filled = i < energy;
    const y = layout.energyY + layout.energyH - (i + 1) * cellH;
    ctx.fillStyle = filled ? '#ffd54a' : '#2a2d33';
    ctx.fillRect(x, y + 1, barW, cellH - 2);
  }
}

function panel(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = '#16181d';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2a2d33';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** 棋盘区绘制：背景 + 已锁定格子 + ghost + 活动方块（桌面/手机共用）。 */
function drawBoardArea(ctx: Ctx, state: GameState, boardX: number, boardY: number, cell: number): void {
  const visibleRows = BOARD_HEIGHT - BUFFER_ROWS;
  ctx.fillStyle = '#0f1218';
  ctx.fillRect(boardX - 3, boardY - 3, BOARD_WIDTH * cell + 6, visibleRows * cell + 6);
  for (let r = BUFFER_ROWS; r < BOARD_HEIGHT; r++) {
    for (let c = 0; c < BOARD_WIDTH; c++) {
      const t = state.board[r][c];
      if (t) {
        const color = t === 'G' ? GARBAGE_COLOR : COLORS[t];
        fillCell(ctx, boardX + c * cell, boardY + (r - BUFFER_ROWS) * cell, cell, color);
      }
    }
  }
  const ghost = hardDropPiece(state.active, state.board);
  ctx.globalAlpha = 0.22;
  for (const g of pieceCells(ghost)) {
    if (g.y >= BUFFER_ROWS) {
      fillCell(ctx, boardX + g.x * cell, boardY + (g.y - BUFFER_ROWS) * cell, cell, COLORS[state.active.type]);
    }
  }
  ctx.globalAlpha = 1;
  for (const pc of pieceCells(state.active)) {
    if (pc.y >= BUFFER_ROWS) {
      fillCell(ctx, boardX + pc.x * cell, boardY + (pc.y - BUFFER_ROWS) * cell, cell, COLORS[state.active.type]);
    }
  }
}

export function renderGame(ctx: Ctx, state: GameState, layout: Layout = DEFAULT_LAYOUT): void {
  const { cell, boardX, boardY } = layout;
  const visibleRows = BOARD_HEIGHT - BUFFER_ROWS;

  // 整屏背景
  ctx.fillStyle = '#0a0c10';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 棋盘背景 + 已锁定 + ghost + 活动方块
  drawBoardArea(ctx, state, boardX, boardY, cell);

  // Hold 面板
  panel(ctx, layout.holdX, layout.holdY, layout.panelW, layout.holdH);
  ctx.fillStyle = '#666';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('HOLD', layout.holdX + 8, layout.holdY + 16);
  if (state.hold.holdSlot) {
    drawPiecePreview(
      ctx,
      state.hold.holdSlot,
      layout.holdX,
      layout.holdY + 20,
      layout.panelW,
      layout.holdH - 20,
      layout.sideCell,
    );
  }

  // Next 队列（每槽独立面板，槽间有间隔）
  const upcoming = state.queue.peek(NEXT_PREVIEW_COUNT);
  ctx.fillStyle = '#666';
  ctx.fillText('NEXT', layout.nextX + 8, layout.nextY + 16);
  upcoming.forEach((t, i) => {
    const slotY = layout.nextY + 24 + i * layout.nextSlotH;
    panel(ctx, layout.nextX, slotY, layout.panelW, layout.nextSlotH - 8);
    drawPiecePreview(ctx, t, layout.nextX, slotY, layout.panelW, layout.nextSlotH - 8, layout.sideCell);
  });

  // 能量条（竖向）
  drawEnergy(ctx, state.energy, layout);

  // 暂停 / 结束遮罩
  if (state.paused || state.phase === 'GameOver') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(boardX, boardY, BOARD_WIDTH * cell, visibleRows * cell);
    ctx.fillStyle = '#fff';
    ctx.font = '26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(
      state.phase === 'GameOver' ? 'GAME OVER' : 'PAUSED',
      boardX + (BOARD_WIDTH * cell) / 2,
      boardY + (visibleRows * cell) / 2,
    );
  }
}

/** 对手预览数据（board 为解码后的可见区）。 */
export interface OpponentView {
  id: string;
  name: string;
  board: Board;
  alive: boolean;
}

/** 纵向绘制对手预览列表（自适应 N 个），当前目标高亮。 */
export function drawOpponents(
  ctx: Ctx,
  opponents: OpponentView[],
  targetId: string | null,
  x: number,
  startY: number,
  cell: number,
): void {
  const slotH = BOARD_VISIBLE_HEIGHT * cell + 28;
  opponents.forEach((opp, i) => {
    const y = startY + i * slotH;
    const isTarget = opp.id === targetId && opp.alive;
    ctx.lineWidth = isTarget ? 3 : 1;
    ctx.strokeStyle = isTarget ? '#ffd54a' : '#2a2d33';
    ctx.strokeRect(x - 2, y - 2, BOARD_WIDTH * cell + 4, BOARD_VISIBLE_HEIGHT * cell + 4);
    for (let r = 0; r < opp.board.length; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const t = opp.board[r][c];
        if (t) {
          ctx.fillStyle = opp.alive ? (t === 'G' ? GARBAGE_COLOR : COLORS[t]) : '#3a3a3a';
          ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
        }
      }
    }
    ctx.fillStyle = isTarget ? '#ffd54a' : opp.alive ? '#bbb' : '#666';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${opp.name}${isTarget ? ' ◀' : ''}${opp.alive ? '' : ' (OUT)'}`, x, y - 8);
  });
}

// ===== 手机竖屏布局 =====

export interface MobileLayout {
  canvasW: number;
  canvasH: number;
  cell: number; // 棋盘格
  boardX: number;
  boardY: number;
  sideCell: number; // Hold/Next mini 格
  holdX: number;
  holdY: number;
  holdW: number;
  holdH: number;
  nextX: number;
  nextY: number;
  nextW: number;
  energyX: number;
  energyY: number;
  oppY: number;
  oppCell: number; // 对手迷你格
  oppSlotW: number;
}

/** 手机竖屏布局（缩小以与按键区同屏，具体手玩微调）。 */
export const MOBILE_LAYOUT: MobileLayout = {
  canvasW: 320,
  canvasH: 380,
  cell: 12, // 棋盘 120×240
  boardX: 100, // (320-120)/2 居中
  boardY: 110,
  sideCell: 8,
  holdX: 8,
  holdY: 4,
  holdW: 48,
  holdH: 38,
  nextX: 64,
  nextY: 4,
  nextW: 48,
  energyX: 230,
  energyY: 4,
  oppY: 48,
  oppCell: 3, // 对手迷你 30×60
  oppSlotW: 56,
};

/** 顶部横向对手迷你条（联机用），当前目标高亮。 */
export function drawOpponentStrip(
  ctx: Ctx,
  opponents: OpponentView[],
  targetId: string | null,
  x: number,
  y: number,
  cell: number,
  slotW: number,
): void {
  opponents.forEach((opp, i) => {
    const ox = x + i * slotW;
    const isTarget = opp.id === targetId && opp.alive;
    ctx.lineWidth = isTarget ? 2 : 1;
    ctx.strokeStyle = isTarget ? '#ffd54a' : '#2a2d33';
    ctx.strokeRect(ox, y, BOARD_WIDTH * cell, BOARD_VISIBLE_HEIGHT * cell);
    for (let r = 0; r < opp.board.length; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const t = opp.board[r][c];
        if (t) {
          ctx.fillStyle = opp.alive ? (t === 'G' ? GARBAGE_COLOR : COLORS[t]) : '#3a3a3a';
          ctx.fillRect(ox + c * cell, y + r * cell, cell, cell);
        }
      }
    }
    ctx.fillStyle = isTarget ? '#ffd54a' : '#888';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(opp.name.slice(0, 5), ox, y - 2);
  });
}

/** 手机竖屏渲染：顶部对手条 + 信息条(Hold/Next/能量) + 棋盘 + 遮罩。 */
export function renderMobile(
  ctx: Ctx,
  state: GameState,
  opponents: OpponentView[],
  targetId: string | null,
  layout: MobileLayout = MOBILE_LAYOUT,
): void {
  const { cell, boardX, boardY } = layout;
  const visibleRows = BOARD_HEIGHT - BUFFER_ROWS;

  ctx.fillStyle = '#0a0c10';
  ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

  // 对手顶部迷你条
  if (opponents.length) {
    drawOpponentStrip(ctx, opponents, targetId, 8, layout.oppY, layout.oppCell, layout.oppSlotW);
  }

  // 信息条：Hold / Next / 能量
  ctx.fillStyle = '#666';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('HOLD', layout.holdX, layout.holdY + 8);
  if (state.hold.holdSlot) {
    drawPiecePreview(ctx, state.hold.holdSlot, layout.holdX, layout.holdY + 12, layout.holdW, layout.holdH - 12, layout.sideCell);
  }
  ctx.fillText('NEXT', layout.nextX, layout.nextY + 8);
  const next0 = state.queue.peek(1)[0];
  if (next0) {
    drawPiecePreview(ctx, next0, layout.nextX, layout.nextY + 12, layout.nextW, layout.holdH - 12, layout.sideCell);
  }
  ctx.fillStyle = '#ffd54a';
  ctx.font = '14px system-ui';
  ctx.fillText(`⚡${state.energy}/${ENERGY_MAX}`, layout.energyX, layout.energyY + 16);

  // 棋盘
  drawBoardArea(ctx, state, boardX, boardY, cell);

  // 暂停 / 结束遮罩
  if (state.paused || state.phase === 'GameOver') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(boardX, boardY, BOARD_WIDTH * cell, visibleRows * cell);
    ctx.fillStyle = '#fff';
    ctx.font = '22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(
      state.phase === 'GameOver' ? 'GAME OVER' : 'PAUSED',
      boardX + (BOARD_WIDTH * cell) / 2,
      boardY + (visibleRows * cell) / 2,
    );
  }
}
