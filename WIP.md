# WIP

## DSL v2 Phase 1：统一表达式引擎 + 防丢失 + 透传

设计依据：`docs/DSL_V2_DESIGN.md` §4.1（表达式）、§4.3（透传）、§4.5-4.7（`---` 降级/选项健壮化/版本）。
Phase 0 已完成（除 D1 清洗，见 TODO.md）。

**本阶段不做**（Phase 2/3 边界）：对话行 `@角色ID`、手写序列化器、编辑器保序改造、块级 `->` 重定向、chatbot 操作集。

### 批次 1：表达式引擎本体（纯新增，无存量风险）

- [ ] `packages/parser/src/expression/lexer.ts`：tokenizer——数字、字符串（单/双引号）、标识符（`\p{L}\p{N}_`，首字符非数字，支持中文）、运算符 `|| && ! == != >= <= > < + - * / % ( ) ,` 与关键字 `or and not true false`
- [ ] `packages/parser/src/expression/parse.ts`：递归下降 → 表达式 AST，深度上限（防恶意输入炸栈）；两个入口：
  - `parseExpression`：if/trigger/条件文本用，顶层 `,` = 最低优先级 AND
  - `parseStatementList`：set 用，`,` 分隔赋值语句
  - 优先级（低→高）：`,` < `or`/`||` < `and`/`&&` < `not`/`!` < 比较 < `+ -` < `* / %` < 一元负号/括号
- [ ] `packages/parser/src/expression/evaluate.ts`：求值——`==` 同类型严格 + 数字形字符串数值提升；未定义变量 falsy + `console.warn`（不 throw）；禁用 eval/new Function
- [ ] `packages/parser/src/expression/index.ts`：门面 `evaluateCondition` / `executeSet` / `validateExpression`（供 lint 用：返回标识符表 + 诊断）
- [ ] `packages/parser/tests/expression.test.ts`：文法全覆盖 + 存量形态兼容用例（单 token 真值、逗号 AND、`&&`、宽松 `==` 的数字/字符串场景、trigger 前缀式补全）
- 每个文件 ≤400 行

### 批次 2：新旧引擎对拍（合入批次 1 的验收门槛）

- [ ] 一次性脚本（scratchpad，不入库）：扫 13 个 demo 提取全部 `(if:)`/`(set:)`/trigger/`{{if}}` 子句（989 选项/92 if/261 set），旧 `evaluator.ts` 与新引擎在多组随机 state 下双跑 diff
- [ ] 预期 diff = 0；已知例外（旧引擎自身 bug，如字符串变量 trigger）单列白名单并记录进 `DSL_V2_DESIGN.md`

### 批次 3：运行时切换

- [ ] `packages/site-common/src/utils/evaluator.ts` 降级为薄适配层：保留 `evaluateCondition`/`executeSet`/`interpolateVariables` 导出签名（9 个文件在引用），内部委托新引擎
- [ ] `{{var}}` 插值升级：支持 Unicode 变量名与空格（`{{ gold }}`）——**Unicode 一次改齐五处**：表达式 lexer、`{{var}}` 插值、`{{if}}` 条件提取、validator、`replace-character-mentions.ts` 的 `@id`（场景 ID 维持 ASCII，见 Non-goals）
- [ ] trigger 归一：parser 解析期把前缀式 `"<= 0"` 补全 LHS；`use-game-player.ts` 的 `checkTriggers` 直接 `evaluate(condition, state)`——顺带修字符串变量 trigger 永不触发的 bug，补测试
- [ ] 存档底座合并：`use-game-player.ts` 与 `save-manager.ts` 加载时 `{...extractRuntimeState(initialState), ...saved}`——修游戏更新后老存档缺新变量的 bug，补测试

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
- [ ] 一致性收尾：`audio.type` 缺省值改 `background_music`（`bgm` 作解析别名）；`dsl_version: 2` 字段落地（仅调 lint 严格度）
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
