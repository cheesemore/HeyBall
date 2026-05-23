# 逻辑层（Logic）

**原则：逻辑与表现彻底分离。** 本目录不依赖 PixiJS / DOM，可独立运行与测试。

- **逻辑**：状态、规则、决策、阶段流转（`GameLogic`、配表、自动战斗 AI）
- **表现**：`battle/`、`controlArea.ts`、`game/` 只负责渲染、动画、输入，通过 `GameLogic` 读写状态

新增玩法时优先改 `logic/`，表现层只订阅状态并播放对应特效。
