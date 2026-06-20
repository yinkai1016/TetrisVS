# Implementation Tasks — mobile-support

按依赖顺序执行：viewport/手势基础 → 触屏输入 → 响应式布局 → 联机适配 → 真机验证。`shared/` 与 engine 零改动；每步确保现有 131 测试持续通过（桌面回归）。

## 1. 基础：viewport / 手势 / 检测

- [x] 1.1 `index.html` 加 viewport meta（`width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`）+ apple-mobile-web-app 相关基础 meta
- [x] 1.2 `style.css` 全局禁手势：`html,body { touch-action:none; overscroll-behavior:none; user-select:none; -webkit-touch-callout:none; }`；canvas/按键区 `touch-action:none`
- [x] 1.3 新增移动端检测工具 `client/game/platform.ts`：`isTouchDevice()` 用 `matchMedia('(pointer: coarse)')`（带 SSR/老浏览器降级）
- [x] 1.4 横屏遮罩：`@media (orientation: landscape) and (max-height: 480px)` 显示"请旋转为竖屏"全屏遮罩
- [x] 1.5 验证：手机端打开无下拉刷新/缩放/选词；横屏见遮罩

## 2. 触屏虚拟按键（touch-controls）

- [x] 2.1 新建 `client/game/touch-controls.ts`：`TouchControls` 类，接收容器 + `ActionSink`（同 `InputController` 的 sink 类型 `ClientAction`）
- [x] 2.2 渲染按键 DOM：左手区 ◀ ▼ ▶ / 右手区 ↻ ↺ ⤓ H / 可选 U（联机）；样式大触控(~50px)、`:active` 反馈
- [x] 2.3 连续键（◀▶▼）：`touchstart` 立即触发 + 进入 held；`poll(dt)` 按触屏 DAS(100ms)/ARR(25ms) 重复；`touchend` 退出 held
- [x] 2.4 单次键（↻↺⤓H U）：`touchstart` 边沿触发一次，不重复
- [x] 2.5 多点触控：每按键独立 touch 跟踪（用 `touchstart`/`touchend` 的 identifier 或 Pointer Events），互不干扰
- [x] 2.6 iPhone 安全区：按键区 `padding-bottom: env(safe-area-inset-bottom)`
- [x] 2.7 单测：DAS/ARR 时序（held→等待→重复→松开停）、单次边沿不连发（用可注入的 `EventTargetLike` + 假时钟，参照 input.test）

## 3. 响应式布局（responsive-layout）

- [x] 3.1 `renderer.ts`：`Layout` 参数化，新增 `MOBILE_LAYOUT`（棋盘上方完整 + 顶部信息条紧凑 + 不画右侧对手，对手改顶部）
- [x] 3.2 `renderer.ts`：canvas retina 适配工具 `setupCanvasDpi(canvas, cssW, cssH)`（按 devicePixelRatio 设物理像素 + ctx.scale），渲染前调用
- [x] 3.3 对手顶部迷你条：`renderer.ts` 新增 `drawOpponentStrip(ctx, opponents, targetId, x, y, w)`（横向迷你预览 + 目标高亮）
- [x] 3.4 `main.ts`：`isTouchDevice()` 为真时创建 `TouchControls`（替代 `InputController`）+ 传 `MOBILE_LAYOUT` + 按键区 DOM
- [x] 3.5 `multiplayer.ts`：渲染用 `MOBILE_LAYOUT`（对手走顶部条）；点对手迷你预览切目标（tap）
- [x] 3.6 CSS：`@media (pointer: coarse)` 下 canvas 尺寸/按键区/顶部条样式；竖屏 flex 布局（顶部信息 + 棋盘 + 按键区纵向）
- [x] 3.7 菜单/大厅/结果响应式：`@media` 下卡片满宽、字号、按钮高度
- [x] 3.8 验证：手机端棋盘完整、按键不遮、retina 清晰、卡片不溢出

## 4. 联机手机适配

- [x] 4.1 联机手机用 `MOBILE_LAYOUT` + 顶部对手迷你条
- [x] 4.2 点对手迷你预览 → 切 `targetId`（接入 multiplayer 的目标状态）
- [x] 4.3 联机显示 U 攻击键（醒目金色）
- [x] 4.4 目标淘汰回退默认（已有逻辑，验证手机路径生效）
- [x] 4.5 验证：手机联机点对手切目标、U 攻击、对手淘汰回退

## 5. 桌面回归与真机验证

- [x] 5.1 桌面端（`pointer: coarse` 为假）：不渲染虚拟按键、维持 960px 布局、键盘照旧
- [x] 5.2 全量测试通过（131+，新增 touch-controls 单测）
- [ ] 5.3 真机（手机浏览器）实测单机：横移/软降/旋转/Hold/硬降手感
- [ ] 5.4 真机实测联机：点对手切目标、U 攻击、对手预览更新、淘汰/胜负
- [ ] 5.5 真机实测无下拉刷新/缩放/长按菜单；iPhone 安全区不挡按键
- [ ] 5.6 微调触屏 DAS/ARR 与按键尺寸/间距（真机手感）
