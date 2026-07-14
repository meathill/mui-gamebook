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

## Phase 2：对话行 + 手写序列化器 + 编辑器保序（进行中）

设计依据：`docs/DSL_V2_DESIGN.md` §4.2（对话行）、§C'（手写序列化器）。

### 批次 1：手写序列化器（对话语法的前置依赖）

- [ ] 新增 `packages/parser/src/serialize.ts`：手写确定性序列化器替换 remark-stringify
  - 输出文法：front matter / `# 标题` / ```yaml 块 / 段落 / `<!-- audio -->` / 选项列表 / `---`
  - 正文转义器：仅转义 CommonMark 会误解析的字符（行内 `\ [ ] * _ ` ~ <` 与实体引用、
    行首块级触发符 `# > + - =`、有序列表的 `.`/`)`），**`{{...}}` 模板段内零转义**（占位符保护）
  - 消灭三处 html-node hack（场景标题/选项行/audio 注释原本就是我们自己的结构化行，直接写原文）
  - `stringify.ts` 降级为 re-export，导入路径不变
- [ ] 验收：13 demo roundtrip 幂等 + 结构等价（现成测试）；stringify/assets/template-escape 等既有测试全绿

### 批次 2：对话行语法（parser 层）

- [ ] `types.ts`：`SceneDialogueNode {speaker, emotion?, content, audio_url?}` + PlayableSceneNode 对应项
- [ ] `parse-scene.ts`：段落 `break` 节点补 `\n`（修英文粘词）；flushText 后按行扫描
  `@id[(表情)][:：]`（全角/半角冒号与括号），speaker 必须在 `ai.characters` 注册，
  未注册整行按普通文本 + `unregistered-speaker` 警告；连续对话行逐行出节点
- [ ] `serialize.ts`：dialogue → `@id: 内容` / `@id (表情): 内容`（内容走正文转义器）
- [ ] `utils.ts` toPlayableGame：dialogue 透传（content 过 @mention 替换？——不，speaker 由前端查角色名，content 照常替换）
- [ ] 测试：对话解析/序列化/roundtrip/全角标点/未注册降级/表情自由文本

### 批次 3：编辑器保序（transformers.ts）

- [ ] `gameToFlow`：assets 过滤条件排除 dialogue（现条件 `type !== 'text' && type !== 'choice'` 会把对话当素材卡）
- [ ] 保序 nodes 模型：flowToGame 不再合并多 text 节点、不再强制 Assets→Text→Choices 重排、不再丢首个之外的 audio_url
- [ ] 验收：打开 HP4 → 保存 → diff 仅含已知规范化差异

### 批次 4：渲染 + 有声书

- [ ] `SceneNodes.tsx` / `GamePlayerImmersive.tsx` / sites/55 / sites/jianjian：dialogue 渲染（姓名框/头像，emotion 由站点模板自行解释）
- [ ] `segmentation.ts`（core 与 asset-generator 两份副本）：dialogue 节点直接产出 segment 短路 LLM，旁白继续走 LLM
- [ ] `DSL_SPEC.md` 增补对话行章节（实现落地后才写规范，保持规范=现实）
- [ ] 两站点手测视觉小说流程

遗留（非阻塞）：
- D1 生产数据清洗（需 `MUI_ADMIN_PASSWORD`，见 TODO.md）
- 编辑器场景元数据表单（`lib/editor/extensions/matchers.ts`）尚不认识未知键透传，
  文本模式编辑含 extra 键的场景时注意观察（parser 层已保真，属 UI 展示问题）
