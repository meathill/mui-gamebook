# WIP

## DSL v2 Phase 1：统一表达式引擎 + 防丢失 + 透传

设计依据：`docs/DSL_V2_DESIGN.md` §4.1（表达式）、§4.3（透传）、§4.5-4.7（`---` 降级/选项健壮化/版本）。
Phase 0 已完成（除 D1 清洗，见 TODO.md）。

**本阶段不做**（Phase 2/3 边界）：对话行 `@角色ID`、手写序列化器、编辑器保序改造、块级 `->` 重定向、chatbot 操作集。

### 批次 1：表达式引擎本体（纯新增，无存量风险）

- [x] `packages/parser/src/expression/lexer.ts`：tokenizer——数字、字符串（单/双引号）、标识符（`\p{L}\p{N}_`，首字符非数字，支持中文）、运算符 `|| && ! == != >= <= > < + - * / % ( ) ,` 与关键字 `or and not true false`
- [x] `packages/parser/src/expression/parse.ts`：递归下降 → 表达式 AST，深度上限（防恶意输入炸栈）；两个入口：
  - `parseExpression`：if/trigger/条件文本用，顶层 `,` = 最低优先级 AND
  - `parseStatementList`：set 用，`,` 分隔赋值语句
  - 优先级（低→高）：`,` < `or`/`||` < `and`/`&&` < `not`/`!` < 比较 < `+ -` < `* / %` < 一元负号/括号
- [x] `packages/parser/src/expression/evaluate.ts`：求值——`==` 同类型严格 + 数字形字符串数值提升；未定义变量 falsy + `console.warn`（不 throw）；禁用 eval/new Function
- [x] `packages/parser/src/expression/index.ts`：门面 `evaluateCondition` / `executeSet` / `validateExpression`（供 lint 用：返回标识符表 + 诊断）
- [x] `packages/parser/tests/expression.test.ts`：文法全覆盖 + 存量形态兼容用例（单 token 真值、逗号 AND、`&&`、宽松 `==` 的数字/字符串场景、trigger 前缀式补全）
- 每个文件 ≤400 行

### 批次 2：新旧引擎对拍（合入批次 1 的验收门槛）

- [x] 一次性脚本（scratchpad，不入库）：扫 13 个 demo 提取全部 `(if:)`/`(set:)`/trigger/`{{if}}` 子句，旧 `evaluator.ts` 与新引擎在 4 组确定性状态变体下双跑 diff
- [x] **结果：112 条条件 + 261 条 set + 2 个 trigger，diff = 0**——demo 的 trigger 均为数字型，未触发旧引擎字符串 bug，无需白名单

### 批次 3：运行时切换

- [x] `packages/site-common/src/utils/evaluator.ts` 降级为薄适配层：`evaluateCondition`/`executeSet` 直接 re-export 新引擎，`interpolateVariables` 留守负责模板扫描，导出签名不变
- [x] `{{var}}` 插值升级：支持 Unicode 变量名与空格（`{{ gold }}`）——Unicode 已改齐五处：表达式 lexer、`{{var}}` 插值、`{{if}}` 条件提取、validator 两处正则、`replace-character-mentions.ts` 的 `@id`（场景 ID 维持 ASCII）
- [x] trigger 归一（偏差说明：改为**运行时**归一而非 parse 期——`checkTriggers` 调 `normalizeTriggerCondition` 后带完整 state 求值，`trigger.condition` 原文保持往返不变）；字符串变量 trigger bug 已修，测试锁定
- [x] 存档底座合并：单存档路径在 `use-game-player` load 时合并；多存档路径（偏差说明）没有改 `save-manager.load`（它不持有 initialState），而是给 `useGamePlayer` 新增 `restoreSave(sceneId, savedState)` action 内做底座合并——**顺带修复 55 站读档丢弃变量状态的存量 bug**（`VisualNovelShell.handleLoadSave` 原来 restart+跳场景的 hack 根本没恢复 `runtimeState`）

### 批次 4：parser 防丢失 + 透传 + 选项健壮化

- [ ] `types.ts`：`Game.extra` / `Scene.extra` / `dsl_version` / 结构化诊断 `{severity, code, message, sceneId?, line?}[]`（利用 mdast position；`warnings: string[]` 保持兼容并存）
- [ ] `index.ts`：
  - 全局 front matter 未知键 → `game.extra`；stringify 原样写回（消灭白名单抹除）
  - 场景元数据门槛改为「首个 yaml 块一律元数据」：已知键出节点、未知键 → `scene.extra`
  - 旧围栏（`minigame-gen`/`image-gen`/`audio-gen`）检测 → error 级诊断（不再静默丢）
  - 结构化 warning：重复场景 ID、孤儿 audio 注释、front matter 与首个 `#` 之间的游离正文、被忽略的块类（`##`+ / blockquote / 表格）
  - 选项行平衡扫描：文本可含 `]`、子句可含 `)`；未知 `(key: value)` 子句 → `choice.clauses` 透传
  - 按 ≤400 行拆出 `parse-scene.ts` / `parse-choice.ts`
- [ ] `stringify.ts`：extra 写回；同类多 AI 节点报错而非静默丢第二个
- [ ] 一致性收尾：`audio.type` 缺省值改 `background_music`（`bgm` 作解析别名）
- [x] `dsl_version` 字段已前置落地（一等公民字段，parse/stringify/测试齐备；语义=兼容性标注与 lint 严格度，不分叉解析）
- [ ] 测试：`tests/golden/`（13 demo → AST JSON 快照）+ `tests/roundtrip.test.ts`（parse→stringify→parse 深比对）+ 新语法用例

### 批次 5：validator 收敛 + 文档同步

- [ ] `scripts/validate-game-script.ts` 改用 `validateExpression`：删除手写 `extractVariablesFromExpression`
- [ ] **注意语义反转**：Phase 0 加的 `* / %` 报错检查在引擎落地后退役（这些运算符变为合法），`checkUnsupportedOperators` 删除、相关测试翻转为「合法」断言；嵌套 `{{if}}` 检查保留（运行时仍不支持嵌套）
- [ ] `docs/DSL_SPEC.md` 同步：§5.2/§5.3 的能力边界段落（「不支持 or/括号/乘除」「仅 ASCII 变量名」）随实现更新；`{{ gold }}` 空格限制解除
- [ ] `docs/DSL_V2_DESIGN.md`：Phase 1 勾选、记录对拍白名单

### 验收标准

- 对拍 diff = 0（白名单除外）
- 13 个 demo round-trip 深比对等价；golden 快照全绿
- `pnpm test` / `pnpm run typecheck` / app 构建全绿
- 手工验收：一个含 `or` + 括号 + 中文变量名的临时场景在播放器中行为正确
