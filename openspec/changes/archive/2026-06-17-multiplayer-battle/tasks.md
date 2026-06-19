# Implementation Tasks — multiplayer-battle

按依赖顺序执行：shared（纯逻辑，可单测）→ server（独立进程）→ client（菜单/网络/UI）→ 集成联调。每个任务可独立验证。`shared/` 下所有模块 MUST 保持纯逻辑、无 DOM/网络依赖。每步完成后确保现有 107 测试持续通过（单机回归）。

## 1. 依赖与脚手架

- [x] 1.1 安装依赖：`socket.io`（server）、`socket.io-client`（client）
- [x] 1.2 server 脚手架：`server/index.ts`（HTTP+Socket.io 监听端口）、`tsconfig` 支持 server 编译、`dev:server` 脚本
- [x] 1.3 client 增加 Vite 代理或环境变量指向 server 地址（默认 localhost）
- [x] 1.4 验证：server 能启动监听、client 能建立 Socket 连接（日志可见 connect）

## 2. shared：能量消耗

- [x] 2.1 在 `shared/energy.ts` 新增 `spendEnergy(current): { energy, ok }`：当前 ≥5 则 −5 返回 ok:true，否则 ok:false 不变
- [x] 2.2 单测：8→3 成功、4→4 失败、5→0 成功、上限边界
- [x] 2.3 确认 `energy-accumulation` 既有测试不回归（energyGain/addEnergy 不变）

## 3. shared：垃圾行机制

- [x] 3.1 新建 `shared/garbage.ts`：纯函数 `makeGarbageRow(holeCol)`（生成留指定缺口的满行）、`pushGarbage(buffer, count)`、`applyGarbage(board, buffer, rngForHole)`（把 buffer 顶入棋盘底部，返回新 board 与清空的 buffer）
- [x] 3.2 缺口列由外部传入（服务器随机），`shared/garbage` 不自行决定（保持纯函数、可测、无 Math.random）
- [x] 3.3 单测：makeGarbageRow 缺口正确、applyGarbage 上移与顶入、buffer 清空、多行顶入顺序

## 4. shared：快照编解码

- [x] 4.1 新建 `shared/snapshot.ts`：`encodeBoard(board): string`、`decodeBoard(s): Board`，紧凑编码 10×20 可见区每格（7 方块+空），单快照 ≤200 字节
- [x] 4.2 单测：任意棋盘编解码往返一致、快照大小 ≤200 字节

## 5. engine：垃圾行 buffer 接入

- [x] 5.1 `GameState` 增加 `garbageBuffer: number`（待顶入垃圾行数）字段；`createGame` 初始化为 0
- [x] 5.2 锁定流程（`lockNow`/`spawnNext` 附近）：方块锁定后若有 `garbageBuffer > 0`，调用 `applyGarbage` 顶入相应行数并清空 buffer（缺口列由 session 注入的 RNG 给出）
- [x] 5.3 单测：锁定时 buffer>0 触发顶入、buffer 清空、顶入导致 top out 的处理
- [x] 5.4 确认单机路径 garbageBuffer 恒为 0，单机行为不变（回归）

## 6. server：房间管理

- [x] 6.1 房间数据结构：`Map<roomId, { host, players: Socket[], maxPlayers, inGame }>`
- [x] 6.2 `createRoom{maxPlayers}`：生成查重的 6 位数字 ID，创建者入房，返回 ID
- [x] 6.3 `joinRoom{roomId}`：校验存在/未满，加入并向房间广播人员更新；错误返回原因
- [x] 6.4 `leaveRoom`：移除玩家；房主离开则转移房主；空房销毁
- [x] 6.5 单测/手测：创建/加入/离开/房主转移/错误 ID 拒绝

## 7. server：开局与同步

- [x] 7.1 `startGame`（仅房主、人数≥2）：生成 `seed`，广播 `gameStart{seed, players, startTimestamp}`
- [x] 7.2 倒计时由 startTimestamp 驱动（服务器不阻塞，客户端算本地开始时刻）
- [x] 7.3 玩家淘汰：收到客户端 `gameOver` 或 socket 断开 → 标记淘汰，广播 `playerOut{playerId, finalSnapshot}`
- [x] 7.4 胜负：仅剩 1 人未淘汰时广播 `gameEnd{winner, ranking}`

## 8. server：快照转发与攻击仲裁

- [x] 8.1 `boardSnapshot{snapshot}`：收到后向房间内其他玩家广播 `opponentSnapshot{playerId, snapshot}`
- [x] 8.2 `attack{targetId}`：校验限频（≤2 次/秒/玩家），随机生成缺口列，向 target 广播 `garbageIn{count, holeCol}`（默认 1 行）
- [x] 8.3 限频实现：每玩家记录最近攻击时间戳，超频丢弃
- [x] 8.4 手测：A 锁定 → B 收到快照；A 攻击 B → B 收到 garbageIn

## 9. client：主菜单

- [x] 9.1 `client/ui/menu.ts`：DOM 主菜单（单机 / 联机对战 两个按钮）
- [x] 9.2 入口改造：`main.ts` 启动先显示菜单；选单机 → 进 single-player-session；选联机 → 进房间界面
- [x] 9.3 返回菜单时清理（断开 socket、停循环）
- [x] 9.4 手测：菜单两入口流转、回退不残留连接

## 10. client：房间界面

- [x] 10.1 `client/ui/lobby.ts`：创建房间（选 2/3/4 人）+ 加入房间（输入 6 位数字 ID）
- [x] 10.2 显示房间状态：成员列表、房主标识、人数上限、开始按钮（仅房主可点、人数≥2）
- [x] 10.3 错误提示（ID 不存在/已满）
- [x] 10.4 手测：创建/加入/人员同步/房主开始

## 11. client：联机网络层

- [x] 11.1 `client/game/net.ts`：封装 socket.io-client，事件收发（connect/disconnect/gameStart/opponentSnapshot/garbageIn/playerOut/gameEnd/attack/boardSnapshot）
- [x] 11.2 锁定时调用 `encodeBoard` 发 `boardSnapshot`（接入 engine 锁定回调）
- [x] 11.3 收 `garbageIn` → 累加 `garbageBuffer`
- [x] 11.4 收 `opponentSnapshot` → 更新对手预览数据

## 12. client：能量攻击输入与释放

- [x] 12.1 键位扩展：Q/E 切目标、U 攻击（接入 InputController，单次边沿触发）
- [x] 12.2 U 按下：`spendEnergy` 成功 → 发 `attack{targetId}`；失败则无操作
- [x] 12.3 目标状态：维护 `targetId`、存活对手列表、智能默认（上次攻击者，否则首个）
- [x] 12.4 收到自己被攻击 → 记录攻击者用于"复仇默认目标"
- [x] 12.5 手测：攒能量→U→对手收到垃圾行；QE 切目标

## 13. client：对手预览渲染

- [x] 13.1 `renderer` 扩展：绘制 N 个对手预览棋盘（自适应布局，3 人左右对称）
- [x] 13.2 对手预览只画已堆叠格子（来自快照），不画活动方块
- [x] 13.3 目标指示：在当前目标对手预览上高亮标记
- [x] 13.4 淘汰对手预览置灰/标记
- [x] 13.5 手测：对手锁定后预览更新、目标高亮、淘汰置灰

## 14. client：联机对局编排

- [x] 14.1 收 `gameStart` → 显示 3-2-1 倒计时（由 startTimestamp 驱动）→ `createGame(seed)` 开始
- [x] 14.2 本地 top out → 发 `gameOver` + 最终快照，本地进入观战/等待
- [x] 14.3 收 `playerOut`/`gameEnd` → 更新存活列表、显示结果
- [x] 14.4 掉线（socket disconnect）→ 本地提示，对局视为结束

## 15. 端到端联调与打磨

- [ ] 15.1 双开浏览器（2–3 客户端）实测：同一房间、同 seed、倒计时同步
- [ ] 15.2 实测攻击链路：消行→能量→U→对手 buffer→对手锁定顶入
- [ ] 15.3 实测淘汰/掉线/最后存活获胜
- [ ] 15.4 实测对手预览延迟与目标切换手感，调限频/默认目标逻辑
- [x] 15.5 确认 shared 零 DOM/网络（purity 测试通过）、单机 107 测试无回归、全量测试通过
