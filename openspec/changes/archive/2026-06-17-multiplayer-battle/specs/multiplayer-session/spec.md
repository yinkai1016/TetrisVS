## ADDED Requirements

### Requirement: Socket 连接生命周期
客户端 SHALL 在进入联机流程时建立与服务器的 Socket.io 连接，在返回主菜单或对局彻底结束时断开。重连时 SHALL 能恢复到房间中（若房间仍在）。

#### Scenario: 进入联机建立连接
- **WHEN** 玩家从主菜单进入联机
- **THEN** 客户端建立与服务器的 Socket 连接

#### Scenario: 返回菜单断开
- **WHEN** 玩家从联机返回主菜单
- **THEN** 客户端断开 Socket 连接

### Requirement: 共享种子开局
对局开始时服务器 SHALL 生成一个方块种子并广播给房间内所有玩家；所有玩家 SHALL 用同一 `seed` 调用 `createGame`，从而获得相同的方块序列。

#### Scenario: 所有人相同种子
- **WHEN** 对局开始
- **THEN** 房间内每个玩家的本地对局使用服务器下发的同一个 seed

### Requirement: 开局倒计时同步
服务器 SHALL 在 `gameStart` 中携带开始时间戳；客户端据此显示 3-2-1 倒计时，并在倒计时结束时同时开始下落。

#### Scenario: 倒计时后同步开始
- **WHEN** 客户端收到 gameStart 并完成倒计时
- **THEN** 客户端进入对局，方块开始下落

### Requirement: 淘汰与掉线判定
玩家 top out（本地 GameOver）或 Socket 断开时 SHALL 被判定为淘汰；淘汰后其棋盘停止下落，但仍向他人广播最终快照。

#### Scenario: top out 淘汰
- **WHEN** 玩家本地棋盘 top out
- **THEN** 该玩家被标记淘汰，广播淘汰状态与最终棋盘

#### Scenario: 掉线淘汰
- **WHEN** 玩家的 Socket 连接断开
- **THEN** 该玩家被判定淘汰，其余玩家收到其淘汰通知

### Requirement: 胜负结算
当房间内仅剩 1 名未淘汰玩家时，该玩家获胜、对局结束。所有玩家收到最终排名/胜负结果。

#### Scenario: 最后存活者获胜
- **WHEN** 房间内淘汰至仅剩 1 名玩家
- **THEN** 该玩家判定获胜，对局结束，所有人收到结果

### Requirement: 本地棋盘权威
每个玩家的活动方块操作（移动/旋转/下落/锁定/消行）SHALL 在本地 `engine` 处理，不发送给服务器仲裁；服务器不持有任何玩家的活动方块状态。

#### Scenario: 操作本地处理
- **WHEN** 玩家执行移动/旋转/硬降等操作
- **THEN** 操作在本地 engine 立即生效，不等待服务器
