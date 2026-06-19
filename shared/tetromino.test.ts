import { describe, it, expect } from 'vitest';
import { getMinos, getKicks, rotateTarget } from './tetromino';
import { TetrominoType, RotateDir, RotationState } from './types';
import { TETROMINO_TYPES } from './types';

describe('tetromino shapes', () => {
  it('每种方块在每个旋转状态都恰好占 4 格', () => {
    for (const type of TETROMINO_TYPES) {
      for (let r = 0; r < 4; r++) {
        const minos = getMinos(type, r as RotationState);
        expect(minos).toHaveLength(4);
      }
    }
  });

  it('O 方块四个旋转状态形态相同（不随旋转改变）', () => {
    const r0 = getMinos('O', 0).map(m => `${m.x},${m.y}`).sort();
    for (let r = 1; r < 4; r++) {
      const rr = getMinos('O', r as RotationState).map(m => `${m.x},${m.y}`).sort();
      expect(rr).toEqual(r0);
    }
  });
});

describe('rotation target', () => {
  it('顺时针 0→1→2→3→0', () => {
    expect(rotateTarget(0, 'CW')).toBe(1);
    expect(rotateTarget(3, 'CW')).toBe(0);
  });
  it('逆时针 0→3→2→1→0', () => {
    expect(rotateTarget(0, 'CCW')).toBe(3);
    expect(rotateTarget(1, 'CCW')).toBe(0);
  });
});

describe('wall kick tables', () => {
  it('O 方块无 kick（仅原点）', () => {
    expect(getKicks('O', 0, 'CW')).toEqual([{ x: 0, y: 0 }]);
  });

  it('JLSTZ 顺时针首个偏移为原点', () => {
    for (const t of ['J', 'L', 'S', 'T', 'Z'] as TetrominoType[]) {
      for (let r = 0; r < 4; r++) {
        const kicks = getKicks(t, r as RotationState, 'CW' as RotateDir);
        expect(kicks[0]).toEqual({ x: 0, y: 0 });
        expect(kicks.length).toBe(5);
      }
    }
  });
});
