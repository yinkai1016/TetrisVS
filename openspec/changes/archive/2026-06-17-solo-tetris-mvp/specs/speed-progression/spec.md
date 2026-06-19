## ADDED Requirements

### Requirement: 速度曲线为纯函数
系统 SHALL 将对局下落速度表示为对局已用时长的纯函数 `speed(elapsedMs, config) → rowsPerSecond`，无副作用、不读取系统时钟（已用时长由调用方传入）。相同输入 MUST 产生相同输出。

#### Scenario: 相同时长返回相同速度
- **WHEN** 以相同 elapsedMs 与相同 config 两次调用 speed 函数
- **THEN** 两次返回完全相同的 rowsPerSecond

### Requirement: 基础速度定义
系统 SHALL 定义 `baseSpeed`（1.0× 的含义，单位 rowsPerSecond）作为曲线的起点速度。该值 MUST 可配置。

#### Scenario: 对局起始速度等于基础速度
- **WHEN** 对局已用时长为 0
- **THEN** 下落速度等于配置的 baseSpeed

### Requirement: 默认曲线参数
默认配置下，速度 SHALL 随对局时间增长：对局开始后前 3 分钟保持 1.0×（即 baseSpeed）；满 3 分钟起为 1.1×，此后每过 1 分钟递增 0.1×（4 分钟时 1.2×，5 分钟时 1.3×，依此类推）。倍率作用于 baseSpeed。

#### Scenario: 三分钟内为基础速度
- **WHEN** 对局进行到第 2 分钟（120000ms）
- **THEN** 速度为 1.0 × baseSpeed

#### Scenario: 满三分钟提速至 1.1×
- **WHEN** 对局进行到第 3 分钟（180000ms）
- **THEN** 速度为 1.1 × baseSpeed

#### Scenario: 之后每分钟递增 0.1×
- **WHEN** 对局进行到第 5 分钟（300000ms）
- **THEN** 速度为 1.3 × baseSpeed

### Requirement: 曲线参数可配置
系统 SHALL 允许通过 config 调整以下参数：baseSpeed、首次提速前的保持时长（默认 3 分钟）、首次提速的倍率（默认 1.1×）、后续递增的步长周期（默认每 1 分钟）、每步增量（默认 +0.1×）。本能力 MUST 不依赖 DOM/网络。

#### Scenario: 自定义保持时长
- **WHEN** config 设首次提速前保持时长为 1 分钟
- **THEN** 对局满 1 分钟时速度即进入递增阶段，而非默认的 3 分钟
