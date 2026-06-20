## Why

当前游戏只在桌面端可用（键盘 + 宽屏 canvas）。手机端虽然能打开页面，但**无键盘无法操作**、**960px 宽的布局在小屏溢出**、对手预览塞不下。要让手机也能玩（单机 + 联机），需要一套触屏输入和竖屏响应式布局。好消息是棋盘 10×20 天然契合竖屏，且 input 层早已抽象为 `ClientAction`，虚拟按键可复用同一套动作，**游戏逻辑零改动**。

## What Changes

**新增：触屏虚拟按键（底部独立按键区）**
- 左手区：◀ 左移 / ▼ 软降 / ▶ 右移（长按走触屏 DAS/ARR）
- 右手区：↻ 顺旋 / ↺ 逆旋 / ⤓ 硬降 / H Hold
- 联机攻击键 U（醒目金色独立键）
- 触屏 DAS/ARR 调短（DAS 100ms / ARR 25ms，比桌面更跟手）
- 多点触控支持（可同时左移 + 软降）

**新增：竖屏响应式布局**
- 强制竖屏（横屏时 CSS 遮罩提示旋转）
- 独立按键区：棋盘完整 20 行显示在上方，按键区独立在下方（不遮挡棋盘）
- 联机对手预览改**顶部迷你条**（每个对手小预览，可点选为攻击目标）
- 顶部信息条（Hold / Next / 能量）紧凑横排
- 菜单 / 房间大厅 / 结果卡片响应式适配手机宽度

**新增：切目标交互**
- 联机时**点对手迷你预览**直接选为攻击目标（去掉底部 ◀▶键）

**新增：移动端适配细节**
- 触屏检测（`pointer: coarse`）→ 显示虚拟按键 + 手机布局；桌面仍用键盘
- canvas retina 适配（`devicePixelRatio`）避免高分屏模糊
- iPhone 安全区避让（`env(safe-area-inset-*)`）
- 禁浏览器手势（下拉刷新 / 双指缩放 / 长按选词）
- iOS Safari viewport meta
- 按键视觉反馈（`:active` 高亮）

**非目标（本 change 不做）：**
- PWA / 可安装到主屏（纯响应式网页起步，后续可加 manifest）
- 震动反馈（haptic）
- 按键位置可自定义 / 拖拽
- 横屏专属布局（仅竖屏，横屏提示转回）
- 手势控制（纯虚拟按键）

## Capabilities

### New Capabilities
- `touch-controls`: 触屏虚拟按键——底部独立按键区、触屏 DAS/ARR、多点触控、点对手预览切目标；产生与键盘同一套 `ClientAction`（engine 不变）
- `responsive-layout`: 手机竖屏响应式布局——独立按键区布局、对手顶部迷你条、强制竖屏遮罩、触屏检测、canvas retina、iPhone 安全区、禁浏览器手势、菜单/大厅/结果响应式

### Modified Capabilities
（无 —— 不改变任何已有能力的 spec 行为；本 change 是新增输入方式与布局，`tetris-core`/`energy-accumulation`/`realtime-sync` 等能力的行为不变）

## Impact

- **新增 `client/game/touch-controls.ts`**：虚拟按键组件（DOM）+ 触屏 DAS/ARR + 点对手切目标 + 产生 `ClientAction`，架构对标 `InputController`
- **改 `client/main.ts`**：移动端检测 → 创建 `TouchControls`（替代/并存 `InputController`）+ 传入手机 layout
- **改 `client/game/renderer.ts`**：layout 参数化，新增手机 layout（棋盘上方完整 + 对手顶部迷你条 + 顶部信息条紧凑）；canvas retina 缩放
- **改 `client/game/multiplayer.ts`**：对手迷你预览支持点选目标（触屏 tap）
- **改 `client/ui/lobby.ts` / `menu.ts`**：响应式宽度
- **改 `client/style.css` + `index.html`**：`@media` 响应式、虚拟按键样式、`touch-action`、viewport meta、安全区、横屏遮罩
- **`shared/` 零改动**：游戏逻辑、`ClientAction`、engine 全部不动（input 抽象的回报）
- **桌面端向下兼容**：触屏检测为假时，完全维持现有键盘 + 宽屏布局
