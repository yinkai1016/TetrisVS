// 垃圾行机制（纯函数，无 Math.random / DOM / 网络）。
// 缺口列由外部传入（服务器随机），本模块不自行决定，保持可测与确定性。
import { Board, Cell } from './types';
import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';

/** 'G' 标记垃圾行格子（与 7 种方块区分，渲染为灰色）。 */
export const GARBAGE = 'G' as const;

/**
 * 生成一行"留指定缺口"的满垃圾行。
 * holeCol 为缺口列（0..BOARD_WIDTH-1）；该列为 null，其余填 GARBAGE('G')。
 */
export function makeGarbageRow(holeCol: number): Cell[] {
  const row: Cell[] = [];
  for (let x = 0; x < BOARD_WIDTH; x++) {
    row.push(x === holeCol ? null : GARBAGE);
  }
  return row;
}

/** 把 count 行垃圾加入 buffer（buffer 即待顶入行数的计数）。 */
export function pushGarbage(buffer: number, count: number): number {
  return buffer + count;
}

/**
 * 将 buffer 中的垃圾行顶入棋盘底部：棋盘整体上移 N 行、底部新增 N 行垃圾，
 * 每行缺口列由 holeCols（长度 = N）指定。返回新棋盘与清零后的 buffer。
 */
export function applyGarbage(
  board: Board,
  buffer: number,
  holeCols: number[],
): { board: Board; buffer: number } {
  const n = Math.min(buffer, holeCols.length, BOARD_HEIGHT);
  if (n <= 0) return { board, buffer: 0 };

  const kept = board.slice(n); // 上移：丢弃最顶部 n 行
  const garbageRows: Cell[][] = [];
  for (let i = 0; i < n; i++) {
    garbageRows.push(makeGarbageRow(holeCols[i]));
  }
  return { board: [...kept, ...garbageRows], buffer: 0 };
}
