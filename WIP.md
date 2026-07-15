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

### 批次 2：对话行语法（parser 层）——已完成

- [x] `SceneDialogueNode` + PlayableSceneNode；行级扫描 `@id[(表情)][:：]`（全角/半角），
  未注册 speaker 按普通文本 + `unregistered-speaker` 警告；break 节点补 `\n`（修英文粘词）；
  序列化 `@id (表情): 内容`；toPlayableGame 透传并替换台词 @mention；11 个测试

### 批次 3：编辑器保序（transformers.ts）——已完成

- [x] dialogue 不落 assets；编辑文本 = prose 流 DSL 原文（`proseNodeToLine` / `parseProseBlock`
  与 parser 同源互逆）；flowToGame 按空行拆段还原多 text/dialogue 节点——**多文本节点不再被合并**
  （DEV_NOTE 记录的有声书 sidecar 根因之一就此解除）；audio_url 仍只保留首个（既有限制）

### 批次 4：渲染 + 有声书

- [x] 四个播放器接入 dialogue 渲染：经典 SceneNodes（角色名+头像+表情标注）、沉浸模式与
  55 站打字机流（`名字：台词`）、jianjian（加粗名字前缀）；姓名框式 VN UI 属后续打磨
- [x] `DSL_SPEC.md` §4.2.3 对话行章节（实现落地后写规范，保持规范=现实）
- [x] 有声书对话短路（两条管线的调用方，segmentation 纯函数本身不动）：
  App 路由 `generate-scene/route.ts` 与 CLI `manifest-generator.ts` 的 dialogue 节点
  直接产出 `{speaker, text}` 分段，零 LLM 成本零误判；CLI 滚动上下文带上说话人 ID
  帮助相邻旁白分段；dry-run 统计同步；新增短路测试
- [ ] 两站点手测视觉小说流程（含对话行的临时剧本；需本地 D1 种子数据与 dev server）

遗留（非阻塞）：
- D1 生产数据清洗（需 `MUI_ADMIN_PASSWORD`，见 TODO.md）
- 编辑器场景元数据表单（`lib/editor/extensions/matchers.ts`）尚不认识未知键透传，
  文本模式编辑含 extra 键的场景时注意观察（parser 层已保真，属 UI 展示问题）
