// 验证 shared 层纯净性：零 DOM / 网络 / 定时器依赖，可被 server 复用。
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('shared 层纯净性', () => {
  it('源码不引用 DOM / 网络 / 定时器全局', () => {
    const dir = join(process.cwd(), 'shared');
    const files = readdirSync(dir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThan(0);
    const forbidden = [
      'window',
      'document',
      'localStorage',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'setTimeout',
      'setInterval',
      'requestAnimationFrame',
      'navigator',
    ];
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8');
      for (const token of forbidden) {
        if (src.includes(token)) {
          throw new Error(`${f} 引用了禁用全局：${token}`);
        }
      }
    }
  });
});
