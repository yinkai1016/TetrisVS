// 棋盘快照编解码（纯函数，无 DOM/网络）。
// 紧凑编码 10×20 可见区每格：空=0，I/O/T/S/Z/J/L = 1..7，用 base8 字符（'0'..'7'）。
// 单快照 = 200 字符（200 字节），满足 ≤200 字节要求。
import { Board, Cell, TetrominoType } from './types';
import { BOARD_VISIBLE_HEIGHT, BOARD_WIDTH, BUFFER_ROWS } from './constants';

const TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const TO_DIGIT: Record<TetrominoType, string> = {
  I: '1',
  O: '2',
  T: '3',
  S: '4',
  Z: '5',
  J: '6',
  L: '7',
};
const FROM_DIGIT: Record<string, Cell> = {
  '0': null,
  '1': 'I',
  '2': 'O',
  '3': 'T',
  '4': 'S',
  '5': 'Z',
  '6': 'J',
  '7': 'L',
  '8': 'G',
};

/** 编码可见区（去掉顶部缓冲行）棋盘为 200 字符字符串。 */
export function encodeBoard(board: Board): string {
  let s = '';
  for (let r = BUFFER_ROWS; r < BUFFER_ROWS + BOARD_VISIBLE_HEIGHT; r++) {
    const row = board[r] ?? [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cell = row[x];
      s += cell ? (cell === 'G' ? '8' : TO_DIGIT[cell]) : '0';
    }
  }
  return s;
}

/** 解码 200 字符字符串为可见区棋盘（BOARD_VISIBLE_HEIGHT × BOARD_WIDTH，无缓冲行）。 */
export function decodeBoard(encoded: string): Board {
  const rows: Cell[][] = [];
  for (let y = 0; y < BOARD_VISIBLE_HEIGHT; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const ch = encoded[y * BOARD_WIDTH + x] ?? '0';
      row.push(FROM_DIGIT[ch] ?? null);
    }
    rows.push(row);
  }
  return rows;
}

// 保留 TYPES 导出供潜在复用（如校验），避免 unused 警告时使用。
void TYPES;
