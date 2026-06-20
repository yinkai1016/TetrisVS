## ADDED Requirements

### Requirement: 触屏检测切换布局
系统 SHALL 用 `matchMedia('(pointer: coarse)')` 检测触屏设备：为真时显示虚拟按键区 + 应用手机竖屏布局；为假时维持现有桌面键盘 + 宽屏布局，不渲染虚拟按键。

#### Scenario: 触屏设备用手机布局
- **WHEN** 设备 `pointer: coarse` 为真
- **THEN** 显示虚拟按键区，应用手机竖屏布局

#### Scenario: 桌面设备维持原样
- **WHEN** 设备 `pointer: coarse` 为假
- **THEN** 不显示虚拟按键，维持现有 960px 桌面布局

### Requirement: 独立按键区布局
手机竖屏布局 SHALL 将棋盘完整（可见 20 行）显示在上方，虚拟按键区独立在棋盘下方，二者不重叠、不遮挡。

#### Scenario: 棋盘完整不被遮
- **WHEN** 手机端对局中
- **THEN** 棋盘可见 20 行全部显示，按键区在棋盘下方独立区域

### Requirement: 对手顶部迷你条
手机联机布局 SHALL 将对手预览放在棋盘上方的横向迷你条（每个对手小预览），当前攻击目标高亮，点击可切目标。

#### Scenario: 对手迷你预览在顶部
- **WHEN** 手机端联机对局
- **THEN** 对手预览以迷你形式横向排列在棋盘上方

### Requirement: 强制竖屏提示
当手机（小屏）处于横屏时，系统 SHALL 显示"请旋转为竖屏"遮罩，引导用户转回竖屏，不使用 screen orientation lock API。

#### Scenario: 横屏显示遮罩
- **WHEN** 小屏设备处于横屏方向
- **THEN** 显示旋转提示遮罩，游戏不可操作

### Requirement: canvas retina 适配
手机端 canvas SHALL 按 `devicePixelRatio` 设置物理像素尺寸并缩放绘制上下文，避免高分屏模糊。

#### Scenario: 高分屏不模糊
- **WHEN** 设备 devicePixelRatio > 1
- **THEN** canvas 以物理像素高分辨率绘制，画面清晰

### Requirement: iPhone 安全区避让
按键区 SHALL 用 `env(safe-area-inset-bottom)` 避让 iPhone 底部 home 指示条，不被遮挡。

#### Scenario: 底部按键不被 home 条挡
- **WHEN** 在带 home 指示条的 iPhone 上
- **THEN** 按键区底部留出安全区间距

### Requirement: 禁用浏览器手势
手机端 SHALL 禁用浏览器默认手势：下拉刷新、页面滚动、双指缩放、长按选词/弹出菜单（`touch-action: none`、`overscroll-behavior: none`、`user-select: none`、`-webkit-touch-callout: none`、viewport 禁缩放）。

#### Scenario: 不触发下拉刷新
- **WHEN** 玩家在游戏区域向下滑动
- **THEN** 不触发浏览器下拉刷新

#### Scenario: 长按不弹菜单
- **WHEN** 玩家长按按键或棋盘
- **THEN** 不弹出系统选词/长按菜单

### Requirement: 菜单与房间界面响应式
主菜单 / 房间大厅 / 结果卡片 SHALL 在手机宽度下自适应（满宽、合适字号、按钮易点），不横向溢出。

#### Scenario: 手机端大厅不溢出
- **WHEN** 手机端打开房间大厅
- **THEN** 表单与卡片满宽显示，不横向滚动
