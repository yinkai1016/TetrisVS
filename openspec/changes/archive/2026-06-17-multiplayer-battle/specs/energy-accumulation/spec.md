## MODIFIED Requirements

### Requirement: 能量可消耗释放攻击
系统 SHALL 提供消耗能量的入口：能量 ≥5 时可消耗 5 点用于释放 1 次攻击（具体攻击行为见 garbage-attack 能力）。消耗规则 MUST 为纯函数（给定当前能量返回消耗后能量与是否成功），不依赖 DOM/网络。能量 <5 时消耗失败、能量不变。

#### Scenario: 能量充足消耗成功
- **WHEN** 当前能量为 8，执行消耗
- **THEN** 消耗成功，能量变为 3

#### Scenario: 能量不足消耗失败
- **WHEN** 当前能量为 4，执行消耗
- **THEN** 消耗失败，能量保持 4

#### Scenario: 恰好 5 点消耗
- **WHEN** 当前能量为 5，执行消耗
- **THEN** 消耗成功，能量变为 0
