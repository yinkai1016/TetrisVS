// shared 类型定义。纯类型，无运行时副作用。

/** 网格坐标：x = 列（0 左→右），y = 行（0 上→下）。 */
export interface Vec2 {
  x: number;
  y: number;
}

/** 七种 tetromino。 */
export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** 全部方块类型（7-bag 与初始化用）。 */
export const TETROMINO_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** 旋转状态 0–3。 */
export type RotationState = 0 | 1 | 2 | 3;

/** 棋盘一格：null 为空，'G' 为垃圾行格子，其余为已锁定方块类型（兼作颜色来源）。 */
export type Cell = TetrominoType | 'G' | null;

/** 棋盘：board[row][col]，行数 = 可见高 + 顶部缓冲。 */
export type Board = Cell[][];

/** 活动方块：类型 + 旋转状态 + bounding box 左上锚点。 */
export interface Piece {
  type: TetrominoType;
  rotation: RotationState;
  pos: Vec2;
}

/** 旋转方向。 */
export type RotateDir = 'CW' | 'CCW';
