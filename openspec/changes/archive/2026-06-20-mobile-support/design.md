## Context

桌面端已完整（键盘 + 960px canvas + 右侧对手预览）。手机端目前能打开但不可玩：无键盘、宽布局溢出、对手预览塞不下。关键有利条件：
- input 层早已抽象为 `ClientAction`（`InputController` 产生动作 → engine 消费），虚拟按键可走同一套动作
- 棋盘 10×20 竖向，天然契合手机竖屏
- renderer 已接受 `Layout` 参数，可参数化手机布局

本 change 加触屏输入 + 竖屏布局，**不改任何游戏逻辑**。

## Goals / Non-Goals

**Goals:**
- 手机能玩单机 + 联机（虚拟按键 + 竖屏布局）
- 触屏手感接近键盘（DAS/ARR 连续移动、多点触控）
- 桌面端零回归（触屏检测为假时维持原样）

**Non-Goals:**
- PWA / 可安装、震动反馈、按键自定义、横屏专属布局、手势控制

## Decisions

### D1. 虚拟按键复用 `ClientAction`（engine 零改动）
虚拟按键组件产生与键盘**完全相同**的 `ClientAction`（left/right/softDrop/.../attack），走同一个 sink → engine。`shared/` 与 engine 一行不改。
- **为什么**：当初把 input 抽象成 `ClientAction` 就是为这一天。新增输入设备只是新增一个动作源。
- **替代**：给 engine 加触屏专用 action → 逻辑分叉、回归风险。否决。

### D2. 独立按键区（棋盘完整 20 行）
棋盘在上方完整显示，虚拟按键在下方独立区，**不互相遮挡**。
- **为什么**：竞技性要求看全堆叠底部；浮层方案会遮底部 3 行影响判断。方块略小（~22px/格）可接受。
- **替代**：按键浮层（方块大但遮棋盘）——否决，看全棋盘优先。

### D3. 触屏 DAS/ARR（参数调短）
每个按键 DOM 绑 `touchstart`/`touchend`；左右/软降键维护 held 状态，主循环 `poll(dt)` 按 DAS/ARR 产生连续动作（架构对标 `InputController`）。手机参数 **DAS 100ms / ARR 25ms**（比桌面 150/30 短，触屏反馈更快）。
- **为什么**：手指长按不如键盘稳定，短 DAS/ARR 更跟手；独立常量便于后续微调。
- 单次动作（旋转/硬降/Hold/攻击）在 `touchstart` 边沿触发一次（防连发）。

### D4. 多点触控
每个按键独立跟踪触摸，支持同时按多键（如左移 + 软降）。用 `touchstart` 的 `touches` 或每按钮独立 pointer 跟踪。
- **为什么**：俄罗斯方块常需同时操作（边移边降），单点触控不可用。

### D5. 切目标 = 点对手迷你预览（无 ◀▶键）
联机时点顶部某个对手预览即选为攻击目标，底部不再设目标切换键。
- **为什么**：点谁打谁最直观，省 2 个键位。
- **替代**：◀▶键循环 / 两者都要 —— 用户明确选"只点预览"。

### D6. 对手预览 = 顶部迷你条
联机对手预览改到棋盘上方横向迷你条（每个 ~30×60），点选目标；当前目标高亮。
- **为什么**：竖屏左右宽度珍贵（棋盘 + 边距），顶部横向条不挤棋盘宽。
- **替代**：棋盘侧窄列 —— 挤占棋盘宽度，否决。

### D7. 强制竖屏（CSS 遮罩，不用 screen API）
小屏 + 横屏时用 CSS 媒体查询显示"请旋转手机"遮罩，引导用户转回竖屏。不用 `screen.orientation.lock()`（需 fullscreen 且兼容性差）。
- **为什么**：一套布局专注竖屏最简；CSS 遮罩零 API 风险。

### D8. 移动端检测 = 触屏（`pointer: coarse`）
用 `window.matchMedia('(pointer: coarse)')` 判断是否触屏设备 → 显示虚拟按键 + 手机布局。
- **为什么**：触屏设备才需虚拟键；按屏宽判断会让小屏笔记本误显虚拟键。
- **替代**：屏宽 <480px —— 误判笔记本，否决。

### D9. canvas retina 适配
按 `window.devicePixelRatio` 设置 canvas 物理像素尺寸 + ctx.scale，避免高分屏模糊。
- **为什么**：手机 retina 屏不适配会糊。

### D10. iPhone 安全区 + 禁浏览器手势 + viewport
- `env(safe-area-inset-bottom)` 让按键区避让底部 home 指示条
- `touch-action: none` + `overscroll-behavior: none` 禁下拉刷新 / 滚动 / 缩放
- `user-select: none` + `-webkit-touch-callout: none` 禁长按选词/菜单
- `<meta viewport width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no>`
- **为什么**：游戏化体验必须屏蔽浏览器默认手势；iPhone 安全区不避让会被 home 条挡。

### D11. 桌面向下兼容
触屏检测为假 → 完全不创建 `TouchControls`、不应用手机 layout、虚拟按键 DOM 不渲染。现有键盘 + 960px 布局原样保留，所有现有测试不回归。

## Risks / Trade-offs

- **[手机性能]** 主棋盘 + 多对手预览 rAF 渲染 → 棋盘 Canvas 2D 极轻量，手机 60fps 可接受；若卡顿，对手预览可降帧（后续）。
- **[触屏延迟]** 浏览器 touchstart 几乎即时（~0ms，优于 mousedown），手感可接受。
- **[误触]** 手掌握两侧可能误触 → 按键区集中在底部中央，`touch-action: none` 防滑动误触。
- **[触屏笔记本误判]** `pointer: coarse` 在纯触屏笔记本可能为真 → 这类设备本就有触屏，显示虚拟键可接受；桌面键鼠设备为 false，不受影响。
- **[联机手机网络延迟]** 移动网络延迟高于 wifi → 事件驱动快照同步容忍延迟（realtime-sync 已设计如此）。
- **[iOS Safari 怪癖]** viewport/双指缩放/100vh 问题 → 已在 D10 处理；以真机测试为准。

## Migration Plan

- 纯增量：新增 `touch-controls.ts` + renderer 手机 layout 分支 + CSS 响应式。
- 桌面路径不触碰（D11）。
- 现有 131 测试须持续通过（游戏逻辑未改，回归风险极低）。
- 无数据迁移、无线上影响。

## Open Questions

- 触屏 DAS/ARR 的精确值（100/25ms 是起点）→ 手玩微调。
- 按键精确尺寸/间距 → 真机测试后定（目标 ≥44px 触控）。
