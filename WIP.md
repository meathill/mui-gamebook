# WIP

## 兰香如故·性转逆后宫（小红书 vibecoding）

- 工作区：`.worktrees/lanxiang-otome`（`feat/lanxiang-otome`）
- Spec：`docs/compose/spec/lanxiang-otome.md`
- 产物：
  - `sites/lanxiang-xhs-tool/script.md`（42 场景 DSL，parser 0 diagnostics）
  - `sites/lanxiang-xhs-tool/index.html`（小红书单页小工具）
  - `sites/lanxiang-xhs-tool/publish.mjs`（MCP 发布脚本）
  - `sites/lanxiang-xhs-tool/assets/*`（封面+四男主立绘）
- **阻塞**：`.mimocode` 里的 `mgb_` API Key 对 `tools/call` 返回 40101，无法线上发布。请重新创建 API Key 或本地跑 `publish.mjs`
