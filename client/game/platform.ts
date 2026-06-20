// 移动端检测 + canvas retina 适配。
// 用 pointer: coarse（主指针不精确 = 触屏）。带老浏览器降级。

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * 按 devicePixelRatio 设置 canvas 物理像素并缩放上下文，避免高分屏模糊。
 * 之后用逻辑坐标（cssW × cssH）绘制即可。
 */
export function setupCanvasDpi(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  // 显示尺寸交给 CSS（手机用 max-height 限制一屏），不设 inline style 以便 CSS 等比缩放
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

