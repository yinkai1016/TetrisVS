# Implementation Tasks — solo-tetris-mvp

按依赖顺序执行。每个任务均可独立验证。`shared/` 下所有模块 MUST 保持纯逻辑、无 DOM/网络/系统时钟依赖。

## 1. 项目脚手架与工具链

- [x] 1.1 用 Vite 初始化 TypeScript 项目（`npm create vite`），确认 `npm run dev` 可启动空白页
- [x] 1.2 建立目录边界：`shared/`（游戏规则）、`client/game/`（引擎/输入/渲染）、`client/ui/`（菜单/HUD）、`server/`（本 change 仅建空目录占位，不实现）
- [x] 1.3 配置 TS 使 `shared/` 可被 `client/`（及将来 `server/`）直接 import；开启 strict 模式
- [x] 1.4 搭建单测工具链（Vitest），确认能对 `shared/` 跑通一个示例测试

## 2. shared：核心类型与常量

- [x] 2.1 定义类型：`Cell`、`Board`（二维数组）、`TetrominoType`（I/O/T/S/Z/J/L）、`RotationState`(0–3)、`Piece`（类型+状态+位置）、`Vec2`
- [x] 2.2 集中常量 `constants.ts`：棋盘宽 10 / 可见高 20 / 顶部缓冲行数；Next 预览数 5；键位映射；DAS/ARR/软降速率/锁定延迟/锁定重置上限默认值；速度曲线默认 config；能量上限 10
- [x] 2.3 验证：常量与类型可被 `shared/` 内部及 `client/` 导入，无副作用

## 3. shared：方块定义与 SRS 旋转 + Wall Kick

- [x] 3.1 定义 7 种方块在旋转状态 0 下的占用格子（标准 SRS 形态与出生位置）
- [x] 3.2 定义 4 个旋转状态间的转换（顺时针 / 逆时针循环）并提供任意状态的占用格子
- [x] 3.3 引入标准 SRS wall kick 偏移表（JLSTZ 一套、I 一套、O 无 kick），按旋转方向区分（顺时针/逆时针）
- [x] 3.4 实现 `tryRotate(piece, dir, board)`：计算目标状态 → 逐偏移尝试 → 首个合法位置返回新 piece；全部碰撞则返回原 piece
- [x] 3.5 单测：覆盖每种方块、每个方向的旋转与典型 wall kick（贴墙、贴底）场景

## 4. shared：棋盘逻辑（碰撞 / 合并 / 消行）

- [x] 4.1 实现 `isValidPosition(board, piece)`：边界、底部、已锁定格子重叠三项检测
- [x] 4.2 实现 `mergePiece(board, piece)`：将活动方块的格子写入棋盘为已锁定
- [x] 4.3 实现 `clearLines(board)`：识别满行、清除、上方下移、返回 `{ board, cleared }`
- [x] 4.4 实现 `spawnPiece(type)`：在顶部缓冲区出生位置生成初始旋转状态的 piece
- [x] 4.5 单测：越界/重叠判定、合并正确性、单行/多行/无行消除、上方下移

## 5. shared：7-bag 随机

- [x] 5.1 实现种子化 RNG（如 mulberry32），给定种子确定输出序列
- [x] 5.2 实现 7-bag：维护当前袋，按 RNG 打乱、依次派发，袋空补新袋
- [x] 5.3 实现 `createBagQueue(seed)` 产出可拉取的方块流
- [x] 5.4 单测：一袋恰含 7 种各一；相同种子产生相同序列；连续多袋分布合理

## 6. shared：锁定延迟与顶出判定

- [x] 6.1 定义锁定状态判定：活动方块下移一格后非法即视为"无法继续下落"（进入 Locking）
- [x] 6.2 实现锁定延迟计时逻辑（纯函数式：传入已等待时长与重置次数，返回是否应锁定）
- [x] 6.3 实现锁定重置上限：移动/旋转成功重置计时与计数，达上限强制锁定
- [x] 6.4 实现顶出判定：`spawnPiece` 后 `isValidPosition` 为假即顶出
- [x] 6.5 单测：锁定超时锁定、重置计数达上限强制锁定、顶出触发条件

## 7. shared：Hold

- [x] 7.1 实现 Hold 纯逻辑：空槽存入并取下一块；非空则与当前活动方块交换；换入方块从顶部初始状态出生
- [x] 7.2 实现每活动方块生命周期内仅可 Hold 一次的约束（锁定前不可再次 Hold）
- [x] 7.3 单测：首次 Hold、交换、同块内二次 Hold 被拒

## 8. shared：速度曲线

- [x] 8.1 实现 `speed(elapsedMs, config) → rowsPerSecond` 纯函数，按 design D7 默认曲线（前 3 分钟 baseSpeed，满 3 分钟 1.1×，此后每分钟 +0.1×）
- [x] 8.2 参数化 config：baseSpeed、保持时长、首次倍率、递增周期、每步增量
- [x] 8.3 单测：0/2min/3min/4min/5min 各点速度正确；自定义 config 生效；纯函数性（相同输入相同输出）

## 9. shared：能量积累

- [x] 9.1 实现 `energyGain(linesCleared) → delta`：2→1、3→2、4→3、其余→0
- [x] 9.2 实现 `addEnergy(current, delta) → newEnergy`，上限 10 截断
- [x] 9.3 确认无任何消耗/释放能量的公共入口（仅积累与读取）
- [x] 9.4 单测：各消除行数得分正确；超出上限截断；已达上限不再增长

## 10. client：游戏引擎（状态机 + 固定时间步）

- [x] 10.1 实现状态机：Spawn → Falling → Locking → LineClear → Spawn / GameOver
- [x] 10.2 实现固定时间步循环：`requestAnimationFrame` 驱动，accumulator 按固定 tick 步长推进逻辑，渲染只读状态
- [x] 10.3 将 speed-progression 接入：按已用时长更新下落节奏，方块按 rowsPerSecond 累积下落
- [x] 10.4 将锁定延迟/重置上限/顶出判定接入状态机
- [x] 10.5 将能量积累接入：每次消行后 `addEnergy`，更新 session 能量状态
- [x] 10.6 验证：手动驱动引擎（注入 elapsed 与输入）能跑通"生成→下落→锁定→消行→生成"闭环

## 11. client：输入（键映射 + DAS/ARR）

- [x] 11.1 实现键盘监听，按 constants 键位映射为动作事件（左/右/软降/硬降/顺时针/逆时针/Hold）
- [x] 11.2 实现 DAS/ARR：按住左右先等 DAS 再以 ARR 连续触发；按住软降以连续速率触发
- [x] 11.3 实现单次动作去抖（旋转/硬降/Hold 仅在 keydown 边沿触发一次，不随重复键连续触发）
- [x] 11.4 验证：按住方向键能流畅连续横移；单按旋转只触发一次

## 12. client：Canvas 渲染

- [x] 12.1 实现棋盘绘制：网格、已锁定格子按方块类型着色
- [x] 12.2 实现活动方块与 ghost piece（最低可落位置半透明投影）绘制，随移动/旋转实时更新
- [x] 12.3 实现 Hold 槽与 Next 队列（5 个）预览绘制
- [x] 12.4 实现能量条 HUD（0–10 实时显示）
- [x] 12.5 验证：对局中画面完整呈现所有元素且无撕裂

## 13. 单局整合：Game Over / 重新开始 / 暂停

- [x] 13.1 顶出后进入 Game Over 状态，显示结束画面，停止接受游戏输入
- [x] 13.2 实现"重新开始"入口：清空棋盘、能量与计时归零、重新生成方块序列
- [x] 13.3 实现手动暂停与失焦自动暂停：暂停期间逻辑 tick 停止、画面冻结
- [x] 13.4 验证：顶出→Game Over→重新开始可循环；暂停/恢复正常

## 14. 端到端可玩性验证与打磨

- [x] 14.1 完整手玩一局：横移、软降、硬降、旋转（含贴墙 kick）、Hold、消行、能量增长全部手感正常
- [x] 14.2 验证速度曲线：3 分钟后明显提速，之后每分钟继续加快
- [x] 14.3 修复手玩中发现的手感/渲染/输入问题
- [x] 14.4 确认 `shared/` 零 DOM/网络依赖（可用于将来 server 复用），单测全部通过
