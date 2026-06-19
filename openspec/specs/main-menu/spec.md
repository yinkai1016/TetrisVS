# main-menu

应用启动时显示主菜单，提供"单机"与"联机对战"两个入口，并支持界面流转与回退。

### Requirement: 主菜单入口
系统 SHALL 在应用启动时显示主菜单，提供"单机"与"联机对战"两个入口。

#### Scenario: 启动显示主菜单
- **WHEN** 应用启动
- **THEN** 显示主菜单，含"单机"和"联机对战"两个可点入口

#### Scenario: 选择单机
- **WHEN** 玩家点击"单机"
- **THEN** 进入单机对局（沿用 single-player-session 逻辑）

#### Scenario: 选择联机对战
- **WHEN** 玩家点击"联机对战"
- **THEN** 进入联机房间界面（room-management）

### Requirement: 界面流转可回退
系统 SHALL 允许从联机房间界面返回主菜单，且返回时不残留未清理的连接。

#### Scenario: 从房间返回菜单
- **WHEN** 玩家在房间界面选择返回
- **THEN** 回到主菜单，且已断开与服务器的连接（若已建立）
