## ADDED Requirements

### Requirement: 固定时间步主循环
系统 SHALL 使用固定步长的逻辑更新（逻辑 tick）与基于 `requestAnimationFrame` 的渲染相互解耦。逻辑更新以固定的 tick 步长推进，由累积的实际时间触发；下落节奏依据 speed-progression 能力返回的 rowsPerSecond 累积推进。渲染 MUST 只读取当前逻辑状态、不改变它。

#### Scenario: 逻辑与渲染解耦
- **WHEN** 渲染帧率波动而逻辑 tick 步长固定
- **THEN** 游戏逻辑的下落/锁定时序保持一致，不受帧率抖动影响

### Requirement: 游戏状态机
系统 SHALL 以状态机驱动单局：Spawn（生成方块）→ Falling（下落中）→ Locking（锁定延迟）→ LineClear（消行处理）→ 回到 Spawn；任一环节检测到顶出则转入 GameOver。

#### Scenario: 正常循环
- **WHEN** 方块锁定且未顶出
- **THEN** 状态经 LineClear 回到 Spawn，生成下一块继续

#### Scenario: 顶出转入结束
- **WHEN** 生成新方块时检测到顶出
- **THEN** 状态机转入 GameOver，停止接受除"重新开始"外的输入

### Requirement: 键盘输入映射
系统 SHALL 将按键映射为游戏动作：`A` 左移、`D` 右移、`S` 软降（加速下落）、`W` 硬降（瞬间落到底并锁定）、`J` 顺时针旋转、`K` 逆时针旋转、`L` Hold。

#### Scenario: 硬降落底锁定
- **WHEN** 按 `W` 键
- **THEN** 活动方块瞬间下落到最低可落位置并立即锁定

### Requirement: DAS/ARR 输入重复
系统 SHALL 对按住的方向键实现 DAS（延迟自动移位）与 ARR（自动重复速率）：按住 `A`/`D` 先等待 DAS 时长，再以 ARR 间隔连续移动；按住 `S` 软降以连续速率加速下落。DAS、ARR、软降速率 MUST 为可调常量。

#### Scenario: 按住方向键连续横移
- **WHEN** 玩家按住 `D` 键超过 DAS 时长
- **THEN** 方块以 ARR 间隔连续右移，直至松开或撞墙

### Requirement: Ghost Piece
系统 SHALL 显示当前活动方块的 ghost piece：其按当前旋转形态下落到最低可落位置的半透明投影。

#### Scenario: Ghost 反映落点
- **WHEN** 活动方块移动或旋转
- **THEN** ghost piece 实时更新为新的最低可落位置投影

### Requirement: Next 队列预览
系统 SHALL 在界面上显示 Next 队列中即将到来的方块，预览数量默认为 5。

#### Scenario: 显示后续方块
- **WHEN** 对局进行中
- **THEN** 界面显示 Next 队列前 5 个待出方块

### Requirement: Canvas 渲染
系统 SHALL 使用 Canvas 2D 渲染游戏画面，包括：游戏棋盘与已锁定格子、当前活动方块、Hold 槽、Next 预览、ghost piece、能量条（见 energy-accumulation）。

#### Scenario: 完整画面元素
- **WHEN** 对局进行中
- **THEN** Canvas 同时呈现棋盘、活动方块、ghost、Hold、Next 与能量条

### Requirement: 暂停
系统 SHALL 支持暂停：玩家可手动暂停，且当游戏窗口失去焦点时自动暂停。暂停期间逻辑 tick 停止推进，画面冻结。

#### Scenario: 手动暂停冻结对局
- **WHEN** 玩家触发暂停
- **THEN** 下落与锁定停止，画面冻结，直至恢复

#### Scenario: 失焦自动暂停
- **WHEN** 游戏窗口失去焦点
- **THEN** 对局自动暂停

### Requirement: Game Over 与重新开始
系统 SHALL 在顶出后进入 Game Over 状态并显示结束画面，提供"重新开始"入口以开启新一局。

#### Scenario: 重新开始新一局
- **WHEN** Game Over 后玩家选择重新开始
- **THEN** 棋盘清空、能量与计时归零、生成新方块，对局重新开始

### Requirement: 能量 HUD 显示
系统 SHALL 在界面上实时显示当前能量值（0–10）及其上限，随消行即时更新。

#### Scenario: 能量条随消行更新
- **WHEN** 一次消除使能量增加
- **THEN** 能量 HUD 立即反映新的能量值
