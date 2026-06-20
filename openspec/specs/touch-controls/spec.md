# touch-controls

手机端虚拟按键输入：将触摸操作映射为与键盘等价的 `ClientAction`，支持长按连发、多点触控与点选对手切目标。

### Requirement: 虚拟按键映射
系统 SHALL 在手机端显示底部虚拟按键区，每个按键对应一个游戏动作：◀ 左移、▶ 右移、▼ 软降、↻ 顺时针旋转、↺ 逆时针旋转、⤓ 硬降、H Hold；联机时额外显示 U 攻击键。按键产生与键盘完全相同的 `ClientAction`，游戏逻辑不区分输入来源。

#### Scenario: 按键触发对应动作
- **WHEN** 玩家在手机端按下 ↻ 键
- **THEN** 系统产生 `rotateCW` 动作（与键盘 J 等价）

#### Scenario: 联机显示攻击键
- **WHEN** 处于联机对局且为手机端
- **THEN** 按键区显示 U 攻击键

### Requirement: 触屏 DAS/ARR 连续移动
◀ / ▶ / ▼ 键 SHALL 支持长按连续触发：`touchstart` 立即触发一次，等待 DAS（默认 100ms）后以 ARR（默认 25ms）间隔连续重复，`touchend` 停止。参数独立于桌面键盘的 DAS/ARR。

#### Scenario: 长按左键连续左移
- **WHEN** 玩家按住 ◀ 键
- **THEN** 立即左移一次，100ms 后开始以 25ms 间隔连续左移，直到松开

#### Scenario: 松开停止
- **WHEN** 玩家松开按住的键
- **THEN** 立即停止连续触发

### Requirement: 单次动作边沿触发
旋转 / 硬降 / Hold / 攻击键 SHALL 仅在 `touchstart` 边沿触发一次，长按不重复。

#### Scenario: 单次旋转不连发
- **WHEN** 玩家按住 ↻ 键
- **THEN** 仅触发一次 `rotateCW`，不连续重复

### Requirement: 多点触控
系统 SHALL 支持同时按住多个按键（如同时 ◀ 左移 + ▼ 软降），各按键触摸独立跟踪、互不干扰。

#### Scenario: 同时左移与软降
- **WHEN** 玩家同时按住 ◀ 和 ▼
- **THEN** 方块同时左移（DAS/ARR）与软降

### Requirement: 点对手预览切目标
联机时，玩家点击顶部某个对手迷你预览 SHALL 将该对手设为当前攻击目标，被选目标预览高亮。底部不提供目标切换键。

#### Scenario: 点选目标
- **WHEN** 玩家在联机中点击对手 B 的迷你预览
- **THEN** 当前攻击目标变为对手 B，其预览高亮

#### Scenario: 目标淘汰后回退
- **WHEN** 当前目标对手被淘汰
- **THEN** 目标自动回退到默认（复仇或首个存活对手）
