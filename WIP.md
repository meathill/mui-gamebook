# WIP

## DSL v2 实施进度

**Phase 0（止血）与 Phase 1（统一表达式引擎 + 防丢失 + 透传）已全部完成**，
详细设计、各批次内容与偏差记录见 `docs/DSL_V2_DESIGN.md` §6 及 git log
（`7c99840`…Phase 1 各批次提交）。

Phase 1 达成的关键能力：
- 统一表达式引擎：`or`/括号/四则运算/中文变量名在 if/set/trigger/条件文本四处可用，
  校验器与运行时同源；对拍 13 demo 全量子句 diff=0
- 防丢失：结构化诊断 `diagnostics[]`（legacy-fence 为 error），被丢弃内容一律可见
- 透传：`game.extra` / `scene.extra` / `choice.clauses`，新功能不需要动 parser
- conformance：roundtrip 幂等 + golden 快照 + transparency 用例

**下一步：Phase 2（对话行 + 手写序列化器 + 编辑器保序，风险最高）**，
范围见 `docs/DSL_V2_DESIGN.md` §6 Phase 2。开工前先把该阶段任务分解写回本文件。

遗留（非阻塞）：
- D1 生产数据清洗（需 `MUI_ADMIN_PASSWORD`，见 TODO.md）
- 编辑器场景元数据表单（`lib/editor/extensions/matchers.ts`）尚不认识未知键透传，
  文本模式编辑含 extra 键的场景时注意观察（parser 层已保真，属 UI 展示问题）
