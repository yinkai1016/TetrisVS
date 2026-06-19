# Tetris VS 🎮

网页版俄罗斯方块对战（类 Tetris 99）——单机 + 2~4 人联机同屏对战。

## ✨ 特性

- **单机**：SRS 旋转 + wall kick、7-bag 随机、锁定延迟、Hold、ghost piece、随时间加速
- **联机**：6 位房间 ID 创建/加入、共享种子公平开局、对手实时投影、能量攻击 + 垃圾行
- **混合权威架构**：自己棋盘本地跑（输入零延迟），仅攻击走服务器仲裁

## 🛠 技术栈

TypeScript · Vite · Canvas 2D · Node · Socket.io

## 🚀 快速开始

```bash
npm install
npm run dev:server   # 服务器 :3000
npm run dev          # 前端 :5173
```

浏览器打开 http://localhost:5173

## 🎮 操作

| 键 | 作用 |
|---|---|
| A / D | 左右移动 |
| S | 软降 |
| W | 硬降 |
| J / K | 顺时针 / 逆时针旋转 |
| L | Hold |
| P | 暂停（仅单机） |
| R | 重新开始 |
| Q / E | 切换攻击目标 |
| U | 发动攻击 |
| Esc | 返回菜单 |

## ⚔ 联机玩法

1. 创建房间（选 2/3/4 人）→ 得到 6 位数字房间 ID
2. 其他人输入 ID 加入
3. 房主点「开始对局」→ 3-2-1 倒计时同步开局
4. **消行攒能量**：同时消 2 行 +1 / 3 行 +2 / 4 行 +3（上限 10）
5. **5 能量 = 1 次攻击** → 按 U 给目标底部顶入 1 行垃圾行（留 1 格缺口）
6. 谁先 top out 淘汰，**最后存活者获胜**

## 🌐 局域网联机

vite 已开启 `host: true`，同网段设备访问 `http://<本机IP>:5173` 即可加入（如 `http://10.20.10.89:5173`）。首次可能需在防火墙放行 5173 端口。

## 📂 项目结构

```
shared/    纯游戏逻辑（前后端共享，零 DOM/网络，有纯净性测试保证）
client/    浏览器端（engine / input / renderer / ui / multiplayer）
server/    Node + Socket.io（房间 / 快照转发 / 攻击仲裁）
openspec/  规格驱动开发文档（9 个能力 spec）
```

## 🏗 架构：混合权威

```
你的浏览器                  服务器                    对手浏览器
┌────────────┐          ┌──────────────┐          ┌────────────┐
│ 自己的棋盘  │  广播快照  │  房间 / 转发   │ 广播快照  │ 自己的棋盘  │
│ ★本地权威★ │─────────▶│  攻击仲裁     │─────────▶│ ★本地权威★ │
│ 消行→能量  │  发攻击    │  随机缺口列   │  收垃圾行 │ 对手预览    │
└────────────┘─────────▶└──────────────┘─────────▶└────────────┘
```

每个客户端本地跑自己的棋盘（俄罗斯方块对输入延迟零容忍），开局服务器下发同一个方块种子保证公平，只有跨玩家的「攻击」交互经服务器仲裁。所有共用规则放在无 I/O 的 `shared/` 层，client 与 server 各自 import。

## 🧪 开发

```bash
npm test                # 单测（131+）
npm run build           # 生产构建
npm run typecheck:server
```

`shared/` 层有专门的纯净性测试，确保零 DOM/网络依赖，从而可被 server 安全复用。

## 📋 规格驱动开发

本项目用 [OpenSpec](https://github.com/FleetView/openspec) 管理需求与设计：

- `openspec/specs/` 下 9 个能力定义系统行为（tetris-core、speed-progression、energy-accumulation、single-player-session、main-menu、room-management、realtime-sync、garbage-attack、multiplayer-session）
- `openspec/changes/archive/` 记录每次变更的提案、设计、任务

## 📝 License

MIT
