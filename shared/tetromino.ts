// 方块形态定义 + SRS 旋转 + Wall Kick 偏移表。
import { RotateDir, RotationState, TetrominoType, Vec2 } from './types';

/** 各方块在 bounding box（JLSTZ 为 3×3，I/O 为 4×4）内、rotation 0 的 mino 坐标。 */
const SPAWN_MINOS: Record<TetrominoType, Vec2[]> = {
  I: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
  O: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  T: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  S: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  Z: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  J: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  L: [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
};

/** 3×3 box 内顺时针旋转 90°：(x, y) → (y, 2 - x)。 */
function rotateCW3(minos: Vec2[]): Vec2[] {
  return minos.map(m => ({ x: m.y, y: 2 - m.x }));
}

/** I 方块 4 个状态硬编码（4×4 box，几何旋转在 SRS 中不适用统一公式）。 */
const I_STATES: Vec2[][] = [
  [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
  [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
  [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
  [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
];

function buildJLSTZ(type: TetrominoType): Vec2[][] {
  const states: Vec2[][] = [SPAWN_MINOS[type]];
  for (let i = 1; i < 4; i++) states.push(rotateCW3(states[i - 1]));
  return states;
}

/** 每方块 × 每旋转状态的 mino 坐标（相对 bounding box 左上）。 */
const SHAPES: Record<TetrominoType, Vec2[][]> = {
  I: I_STATES,
  O: [SPAWN_MINOS.O, SPAWN_MINOS.O, SPAWN_MINOS.O, SPAWN_MINOS.O],
  T: buildJLSTZ('T'),
  S: buildJLSTZ('S'),
  Z: buildJLSTZ('Z'),
  J: buildJLSTZ('J'),
  L: buildJLSTZ('L'),
};

export function getMinos(type: TetrominoType, rotation: RotationState): Vec2[] {
  return SHAPES[type][rotation];
}

// --- Wall Kick 偏移表（网格坐标，y 向下为正）。来源：标准 SRS，已将屏幕坐标 y 取反。 ---
type KickTable = Vec2[][];

/** JLSTZ 顺时针各 from-rotation 的偏移序列。 */
const KICKS_JLSTZ_CW: KickTable = [
  [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
];

/** I 顺时针各 from-rotation 的偏移序列。 */
const KICKS_I_CW: KickTable = [
  [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
  [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
  [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
];

function negate(list: Vec2[]): Vec2[] {
  return list.map(v => ({ x: -v.x, y: -v.y }));
}

/** 给定方块类型、起始旋转、方向，返回应依次尝试的 wall kick 偏移序列。 */
export function getKicks(type: TetrominoType, fromRot: RotationState, dir: RotateDir): Vec2[] {
  if (type === 'O') return [{ x: 0, y: 0 }];
  const cw = type === 'I' ? KICKS_I_CW : KICKS_JLSTZ_CW;
  if (dir === 'CW') return cw[fromRot];
  // 逆时针 fromRot → (fromRot-1)：等价于顺时针 (fromRot-1)→fromRot 的偏移取反
  const reverseFrom = ((fromRot + 3) % 4) as RotationState;
  return negate(cw[reverseFrom]);
}

/** 计算旋转后的目标旋转状态。 */
export function rotateTarget(fromRot: RotationState, dir: RotateDir): RotationState {
  return ((dir === 'CW' ? fromRot + 1 : fromRot + 3) % 4) as RotationState;
}
