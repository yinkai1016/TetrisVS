// 主菜单 DOM（单机 / 联机对战入口）。
export function showMenu(
  container: HTMLElement,
  opts: { onSingle: () => void; onMulti: () => void },
): void {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'menu';
  const h1 = document.createElement('h1');
  h1.textContent = 'Tetris VS';
  wrap.appendChild(h1);
  const b1 = document.createElement('button');
  b1.textContent = '单机';
  b1.onclick = opts.onSingle;
  wrap.appendChild(b1);
  const b2 = document.createElement('button');
  b2.textContent = '联机对战';
  b2.onclick = opts.onMulti;
  wrap.appendChild(b2);
  container.appendChild(wrap);
}
