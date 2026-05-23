# 架构：逻辑与表现分离

- **`src/logic/`** — 纯 TypeScript，无 Pixi/DOM。状态、规则、自动战斗 AI、瞄准计算。可单独跑单元测试或 headless 模拟。
- **`src/battle/`、`src/controlArea.ts`、`src/game/`** — 表现层：渲染、动画、输入，只通过 `GameLogic` 修改状态并读取快照。

新功能默认先写在逻辑层，表现层只负责「显示当前状态」和「把操作转成 `GameLogic` 调用」。
