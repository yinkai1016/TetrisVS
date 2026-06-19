## Why

项目的最终目标是**网页版俄罗斯方块对战（类 Tetris 99，4 人同屏、密码房间、能量技能、随时间加速）**。但联机对战的所有权威逻辑（方块、旋转、消行、随机、速度、能量）都必须先在一个**可玩的单机核心**里打磨稳定——俄罗斯方块对输入延迟、旋转手感、锁定时机极度敏感，这些地基不稳，对战就是空中楼阁。

因此这个 change 作为**里程碑 1：单机可玩地基**。它交付一个完整可玩的单人俄罗斯方块，并把所有游戏规则抽到前后端可共享的 `shared/` 层，为后续联机 change（房间同步、攻击仲裁、共享种子）铺好接口边界。

## What Changes

**新增：单机俄罗斯方块完整可玩体验**

- 纯游戏逻辑核心（`shared/` 层，无 I/O，可被 client 与未来 server 共用、可单测）：
  - 10×20 棋盘 + 顶部缓冲区
  - 7 种方块 + **SRS 旋转系统** + **wall kick**（标准 Tetris Guideline）
  - **7-bag** 随机算法（可种子化，为联机共享种子预留）
  - 碰撞检测、消行、行下落、顶出（Game Over）判定
- 单局运行层（client）：
  - 固定时间步主循环（逻辑/渲染解耦，为确定性重放预留）
  - 游戏状态机：Spawn → Falling → Locking → LineClear → GameOver
  - **锁定延迟**（触底后给微调窗口，移动/旋转重置，设次数上限）
  - **DAS/ARR** 输入手感（按住方向键先延迟后快速重复）
- 控制映射：`A/D` 左右、`S` 软降、`W` 硬降、`J` 顺时针旋转、`K` 逆时针旋转、`L` Hold
- 辅助显示：Next 队列预览（5 个）、Hold 槽、**Ghost piece**（落点提示）
- **速度曲线**（需求 #6）：参数化的 `f(对局时间) → 下落速度`，默认 3 分钟后 1.1×，之后每分钟 +0.1×
- **能量积累**（需求 #5 前半）：消 2 行 +1 / 3 行 +2 / 4 行 +3，上限 10，单机可见显示；**释放技能/攻击留待阶段二**

**非目标（本 change 不做，留给后续 change）：**
- 多人联机、房间、密码、同屏对战
- 攻击释放、垃圾行入队、目标选择（Q/E/U 攻击交互）
- 服务器端权威验证、共享种子同步
- 计分系统、排行榜、账号

## Capabilities

### New Capabilities
- `tetris-core`: 方块定义、SRS 旋转 + wall kick、棋盘碰撞、消行、7-bag 随机、锁定延迟判定、顶出判定——纯游戏规则，无 I/O
- `speed-progression`: 对局速度随时间增长的参数化曲线（时间 → 下落速度）
- `energy-accumulation`: 消行积累能量（2/3/4 行对应 +1/+2/+3，上限 10），本阶段只积累不消耗
- `single-player-session`: 把核心整合成可玩的单局——固定时间步循环、状态机、键盘输入映射(DAS/ARR)、Canvas 渲染（棋盘/next/hold/ghost/HUD）、Game Over 与重新开始

### Modified Capabilities
<!-- 全新项目，无既有 spec -->
（无）

## Impact

- **新建代码结构**：`shared/`（核心逻辑）、`client/game/`（引擎/输入/渲染）、`client/ui/`（菜单/HUD）；`server/` 本 change 暂不落地，仅预留目录边界
- **技术栈**：TypeScript + Vite + Canvas 2D（前端）；为阶段二的 Node + Socket.io 后端预留共享层
- **关键约束**：所有游戏规则必须在 `shared/` 中且**无 DOM / 无网络依赖**，以便将来 server 端直接 import 做权威验证与确定性重放
- **依赖**：无外部游戏引擎；仅 Vite + TypeScript 工具链
- **后续 change 衔接**：本 change 产出的 `tetris-core` / `speed-progression` / `energy-accumulation` 将被联机 change 直接复用并扩展（`energy-accumulation` 会新增"释放技能"需求，作为 Modified Capability）
