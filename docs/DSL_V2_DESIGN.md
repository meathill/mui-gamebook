# Gamebook DSL v2：评审报告与设计方案

> 状态：**设计定稿，分阶段实施中**（进度见 §6 与 TODO.md）
>
> 重要约束：`docs/DSL_SPEC.md` 会被嵌入 AI 生成剧本的提示词（`packages/app/src/lib/editor/generate-script.ts`）。因此**未实现的 v2 语法只能写在本文档，不得写入 DSL_SPEC.md**，否则 AI 会立即开始产出 parser 无法解析的剧本。各阶段实现落地后，再把对应语法合入正式规范。

## 1. 背景与目标

对 DSL 现状（规范 + parser + 运行时 + 编辑器 + 13 个 demo）做了全面评审，目标：

1. **减少歧义**：语法只有一种写法、行为可预测、错误可见
2. **提升扩展性**：新增内容类型/子句不需要动 parser 核心
3. **适配更多游戏类型**：视觉小说（对话/立绘/配音）、更复杂的数值玩法

既定决策：**渐进增强、全向后兼容**（存量 13 个 demo 与 D1 生产数据零迁移可跑；旧的坏语法从静默丢弃改为 lint 报错）。

## 2. 现状评审结论

按严重度排序，均经代码核实。

### 2.1 静默丢数据体质（最严重的一类）

parser 对无法识别的内容一律静默丢弃，已造成实际损失：

- 旧版 `minigame-gen`/`image-gen`/`audio-gen` 代码围栏在 5 个 demo 中使用（quidditch、HP1-3、bible-journey），现 parser 只认 ```` ```yaml ````（`packages/parser/src/index.ts:141`），旧围栏被静默丢弃——**这些游戏的小游戏逻辑已实际失效**（如 quidditch 的 `snitch_caught` 永不赋值，`(if: snitch_caught >= 10)` 恒判初始值）
- 场景正文中的非法 YAML 被吞（`index.ts:171` 留有未决注释 `// Ignore invalid yaml in body, or maybe warn?`）
- 孤儿 `<!-- audio -->` 注释被丢；重复场景 ID 静默覆盖（仅 warnings 数组，无 UI 呈现）
- `stringify` 每类 AI 节点只 `.find()` 第一个（`stringify.ts:80-83`），同类第二个节点序列化即丢
- front matter 与首个 `# 场景` 之间的正文被丢（`index.ts:301` 仅在 `currentSceneId` 存在时收集）
- blockquote、`##`~`######` 标题、表格、段落内硬换行 `break` 整类节点被忽略（`parseSceneNodes` 无对应分支；`break` 被丢导致英文两行 `join('')` 粘成一个词）

### 2.2 AI 模板教坏语法（活 bug，P0，已修复）

`packages/app/src/lib/editor/generate-script.ts:44` 的 `EXAMPLE_SCRIPT` few-shot 示例写的是 `(set: courage + 10)`——**缺 `=`**。运行时 `executeSet` 按 `=` 切分（`evaluator.ts:67-68`），切不出两段直接 warn 跳过。即：每次 AI 大纲导入生成的同类 set 子句**运行时静默失效**。同文件 :83 的规则文本还在指导 AI 使用已废弃的 `minigame-gen`/`image-gen` 围栏。

### 2.3 `---` 三重歧义

同一个记号承担三种身份，其中两种是假的：

1. 全局 front matter 分隔——真实生效（仅文档首块，`index.ts:190-199`）
2. 场景分隔（规范 §3.2 声称）——**实现忽略**，场景切分只认 `# 标题`（`index.ts:296`），`---` 解析成 thematicBreak 后被丢弃
3. 场景级元数据 front matter（规范 §4.1.4 minigame 示例写法）——**死代码**：remark-frontmatter 只在文档第 0 块产出 `yaml` 节点，场景内容永远在标题之后，Strategy 1（`index.ts:221-229`）永远不会命中

另有 CommonMark 陷阱：`文本\n---`（中间无空行）解析为 setext H2 标题，文本静默丢失。

### 2.4 表达式是三处正则方言

同一个"条件/赋值"概念存在三套互不一致的解析和求值：

| 场景 | 语法 | 实现 | 缺陷 |
|---|---|---|---|
| 选项 `(if:)` | `a > 1, b` | `evaluator.ts:8-54`，`,`/`&&` 拆分做 AND | 无 OR、无括号、字符串含逗号被切坏 |
| 选项 `(set:)` | `k = k + 1` | `evaluator.ts:60-96` | 只支持单个 `+`/`-`，无 `* /`、无链式 |
| 变量 trigger | `"<= 0"`（隐式 LHS） | `use-game-player.ts:116` 把当前值拼进字符串再用**空 state** 求值 | 字符串变量的 trigger 永不触发；含空格字符串破坏切分 |
| `{{if}}` 条件文本 | `{{ if a > 1 }}` | `evaluator.ts:128` 单趟非贪婪正则 | 不可嵌套；HP4 实际写了嵌套（`harry_potter_4.md:2059`）→ 向玩家吐出裸 `{{ /if }}` 标签 |

配套问题：

- 校验器（`scripts/validate-game-script.ts:26`）接受 `* / ( )` 并有测试断言，但运行时算不了 → **校验通过、运行时坏**
- `{{var}}`（`\w+`）、`@角色ID`（`@(\w+)`）、场景 ID（`[\w-]+`）全部 ASCII-only，中文项目不能用中文变量名
- `==` 是 JS 宽松相等（`10 == "10"` 为真），语义从未成文

### 2.5 转义污染持续写入存量内容（已修复产出端）

remark-stringify 会转义文本节点中的词内下划线：`{{ if ron_friendship >= 40 }}` 每次保存都变成 `{{ if ron\_friendship >= 40 }}`（HP4 存量 11 处，`harry_potter_4.md:1796` 等）。

**实测修正**（初版评审误判为运行时活 bug）：CommonMark 把 `\_` 视为转义序列，parse 时自动还原为 `_`，**运行时条件求值不受影响**，往返也稳定。真正的危害在于：

1. **AI 污染回路**：Chatbot 以原始 Markdown 为上下文，可能把看到的 `ron\_friendship` 抄进选项 `(if:)` 子句——选项行以 html 节点原样存储、**不经反转义**，届时才会真正破坏求值
2. 文本编辑模式直接显示污染内容；grep/diff 噪音（`validate-game-script.ts` 曾为兼容 `\_` 写过化石代码）

修复（Phase 0 已做）：`stringify` 输出后处理 `unescapeTemplateSpans`，`{{...}}` 模板段内不再产出转义；`migrate-game-script.ts` 同步清洗存量；根治（模板段外的转义）靠 Phase 2 手写序列化器。现有 stringify 靠把场景标题、选项行塞进 `html` 节点规避转义（`stringify.ts:76,182`），属于补丁摞补丁。

另：HP4:2059 的嵌套 `{{if}}` 是**实锤的玩家可见 bug**——实测无论 `ball_partner` 取何值，都会把裸模板标签（`{{ if ball_partner == "luna" }}...` 之类）直接渲染给玩家。已拍平为三个并列条件块修复，并在校验器加了嵌套检测防复发。

### 2.6 对话无结构（视觉小说方向的最大障碍）

正文对白靠引号散文（`"别跑！"赵工头骂道`），没有任何说话人字段。后果：

- 分角色有声书只能靠 LLM 阅读理解猜说话人（`packages/core/lib/audiobook/segmentation.ts`），为处理"角色假扮身份"还维护 800 字滚动上下文（`asset-generator/.../manifest-generator.ts`）——成本高、有错误率
- 视觉小说的立绘、表情、姓名框、逐角色语音同步都无从标注
- 项目已明确朝视觉小说演进（`site_template: 'visual-novel'`、sites/55 壳已就位），该短板会被持续放大

### 2.7 表达力缺口逼出别扭模式

- 无 OR → 复制多个指向同一场景的同条件选项
- 无自动路由/switch → MBTI 分流用 6 个文字相同的 `[查看结果]` 选项 + 兜底链伪装（`dream_of_modern_city.md:155-160`），16 种类型只处理 4 种
- 无场景内推进语义 → 19 处 `[继续] ->` 单选项场景膨胀
- 无章节概念 → 有声书章节无解（DEV_NOTE.md「数据模型没有章节」）
- 无版本字段 → 语法演进无迁移抓手
- 选项行正则脆弱：`[text]` 非贪婪到第一个 `]`，子句非贪婪到第一个 `)`（URL 或表达式带括号即截断，`index.ts:17-19,35`）

### 2.8 规范与实现系统性漂移

实现有、规范无：`display_mode`/`text_box_position`/`typewriter_speed`/`site_template`/`subdomain`/变量 `icon`/场景级 `aspectRatio`/单数 `character:`（demo 用了 202 次）/静态媒体 `![alt](url)`、`[audio](url)`、`[video](url)`/条件 `&&` 与单变量真值/`background_story` 别名。规范自相矛盾：§4.1 示例 `type: bgm` vs §4.1.2 正式语法 `background_music`（实现缺省还真填 `'bgm'`，与自身类型联合矛盾，`index.ts:274`）；`pending:id`（规范）vs `pending://id`（实现）。

→ 本次已随 v2 设计对 `DSL_SPEC.md` 做勘误（对齐 v1 现状）。

### 2.9 透传缺失：扩展新键必被抹掉

- `stringify` 用白名单重建 front matter（`stringify.ts:15-59`），**未知全局键一次保存即被抹掉**——今天手写 `dsl_version: 2` 进文件，编辑器保存一次就没了
- 场景 yaml 块必须含 `image`/`audio`/`video`/`minigame` 之一才被识别为元数据（`index.ts:239-243`），将来加 `chapter:` 这类新键会被静默吞

### 2.10 存档与 DSL 演进不兼容（现存 bug）

两套 localStorage 存档（`use-game-player.ts` 单档、`save-manager.ts` 多档）加载时都直接 `setRuntimeState(saved)`，**不与 `initialState` 底座合并**。游戏更新新增变量后，老玩家存档中该变量为 undefined：条件恒假、插值裸露 `{{var}}`。

### 2.11 架构观察：单文件混装四种性质的数据

Markdown 文件同时承载：(a) 叙事内容，(b) 游戏逻辑（state/if/set/trigger），(c) AI 生成配置（prompt/style/characters），(d) **生成产物缓存**（url 回填、`<!-- audio -->`、`pending://` 占位）。歧义与往返问题大多来自 (d) 塞进 (a) 的文本流。有声书已被迫走 sidecar manifest 旁路（因为可视化编辑器 `flowToGame` 会合并 text 节点、冲掉塞进去的数据，`transformers.ts:99-129`），证明该模型已经半破产。

## 3. 设计原则

- **P1 宁可报错，不可静默丢弃**。配套：结构化诊断 `{severity, code, message, sceneId?, line?}[]`（利用 mdast position，现在被丢弃），编辑器可内联标注。
- **P2 一个概念只有一种语法**。
- **P3 LLM 作者友好**。DSL 的第一作者是 AI（大纲导入、Chatbot）。语法必须落在训练分布内：标准 Markdown、标准 YAML、常规中缀表达式；规则少而正交；错误可校验、可自动纠正。
- **P4 规范可执行**。conformance suite：黄金样例 + 期望 AST JSON + round-trip 深比对，规范条目与测试一一对应。
- **P5 渐进增强**。`dsl_version` 只调节 lint 严格度（v1 报 warning、v2 报 error），**不分叉解析行为**——双解析器是维护灾难。

## 4. v2 设计

### 4.1 统一表达式语言

一个小型表达式文法，**一处实现、四处共用**（选项 if / 选项 set / 变量 trigger / `{{if}}` 条件文本），落位 `packages/parser/src/expression/`（lexer.ts / parse.ts / evaluate.ts / index.ts，各 ≤400 行），手写递归下降 + 深度上限（内容来自用户与 AI，防炸栈；禁用 eval/new Function）。

优先级（低 → 高）：

```
,（仅 if 类顶层，= 最低优先级 AND）
or  ||
and  &&
not  !
==  !=  >  <  >=  <=
+  -
*  /  %
一元负号、( )
```

即 `a, b or c` ≡ `a && (b || c)`。

**两个入口**（逗号语义按上下文分流，不能一个入口通吃）：

- `parseExpression`：if / trigger / 条件文本用，顶层 `,` 为最低优先级 AND（兼容存量 13 处 `(if: a, b)` 写法）
- `parseStatementList`：set 用，`,` 是赋值语句分隔符（`gold = gold + 5, has_key = true`）

语义决策：

- **`==`**：同类型严格比较；数字与"数字形字符串"比较时做数值提升（锁定存量宽松行为中真正被依赖的部分），写成 conformance 用例
- **未定义变量**：运行时按 falsy 处理 + `console.warn`，**不 throw**（线上剧本不能崩）；报错是 lint 的职责（validate 已有未声明变量检查）
- **标识符**：`/[\p{L}\p{N}_]+/u` 且首字符非数字——**变量名与角色 ID 放开 Unicode（支持中文）**；场景 ID 维持 ASCII（进 R2 文件名与 URL 的链路未排查，见 Non-goals）
- **trigger 归一**：旧前缀式 `condition: "<= 0"` 在解析期补全 LHS 为变量名，运行时统一走 `evaluate(expr, state)`——顺带修复字符串变量 trigger 永不触发的 bug（不再拼字符串求值）
- **Unicode 一次改齐五处**：表达式词法器、`{{var}}` 插值、`{{if}}` 条件提取、validator、`@角色ID`，避免制造第四方言

兼容面（已实测）：demo 全量 989 选项 / 92 if / 261 set 中无 `* /`、无连字符变量名、trigger 全为前缀式——**预期新旧引擎对拍 diff = 0**（唯一例外是 HP4 的 `\_` 脏数据，Phase 0 先修）。`site-common/src/utils/evaluator.ts` 降级为薄适配层，导出签名不变（9 个文件在引用）。

### 4.2 对话行语法（视觉小说基石）

```markdown
@zhang: 你终于来了。
@lrrh (害怕): 奶奶……你的耳朵怎么这么大？
@lrrh（低声）：全角标点同样合法。

旁白文本照常直接写，零迁移成本。
```

- 新节点：`{ type: 'dialogue', speaker: string, emotion?: string, content: string, audio_url?: string }`
- 解析规则：在段落文本内**按行**扫描 `@id[(表情)][:：]`（CommonMark 会把无空行的连续对话行合并成一个段落、软换行存在同一 text 节点里，所以必须做行级扫描，且要先把被丢弃的 `break` 节点补成 `\n`——顺带修英文粘词 bug）
- **必须支持全角标点**：冒号收 `:` 与 `：`，括号收 `()` 与 `（）`——中文作者与 LLM 必然写全角
- 表情是**自由文本舞台指示**（parenthetical），非枚举：`(angry)`、`(低声)`、`(对张三)` 都合法，由站点模板自行解释
- 消歧门槛：`@id` 必须已在 `ai.characters` 注册，未注册按普通文本处理 + lint 警告
- 有声书：dialogue 节点直接产出分段（短路 LLM），旁白继续走 LLM 分段——`segmentation.ts` 在 core 与 asset-generator 有**两份副本**，需同步或先收敛
- 视觉小说渲染：speaker → 立绘/姓名框，emotion → 表情差分（站点模板决定）

**两个硬依赖**（必须与本特性同期，见 Phase 2）：

1. 序列化必须防转义：`@zhang_daxia` 经 remark-stringify 会变 `@zhang\_daxia`（同 2.5 的 bug 类）→ 引入手写序列化器（§4.4）
2. 编辑器保序：`gameToFlow` 的 assets 过滤条件是 `type !== 'text' && type !== 'choice'`（`transformers.ts:48`），dialogue 节点会掉进素材数组、保存即毁 → transformers 先改保序 nodes 模型

### 4.3 场景元数据归一 + 未知键透传（扩展性核心）

- 场景元数据**只保留一种写法**：紧跟场景标题的 ```` ```yaml ```` 代码块（§4.1.4 的 `---` 死代码写法从规范删除，已做）
- 识别规则改为：**场景首个 yaml 块一律是元数据**——已知键（image/audio/video/minigame/未来的 meta）出节点，未知顶层键进 `scene.extra: Record<string, unknown>` 原样保留、stringify 原样写回
- 全局 front matter 同理：未知键进 `game.extra`，stringify 写回（消灭白名单抹除，`dsl_version` 等新键才存得住）
- 每场景每类 AI 节点**至多一个**，违者结构化报错而非静默丢
- 场景 `meta:` 键支持 `chapter`/`tags` → 解决章节缺失（有声书章节、路线图分组都有了抓手）
- 无法识别的旧语法（`minigame-gen` 等围栏）→ lint error 提示迁移，不再静默失效

扩展判据（写进规范）：**影响叙事分支的状态**用 state/if/set/trigger 表达；**自成玩法循环的机制**（战斗/商店/背包）走 minigame 或 extra 透传给站点模板解释，核心语言不膨胀。

### 4.4 手写序列化器（替换 remark-stringify）

输出文法极小：front matter、`# 标题`、yaml 块、段落（含对话行）、`<!-- audio -->` 注释、选项列表、`---`。手写 ~200 行确定性序列化器：

- 消灭整个"转义污染"bug 类（2.5），以及现有三处 html-node hack
- round-trip conformance（13 demo：parse → stringify → parse 深比对）兜底

### 4.5 `---` 语义降级

- 场景切分的**唯一**依据是 `# scene_id`；`---` 是纯视觉分隔，无语义（stringify 可继续输出，前后带空行不会触发 setext 陷阱）
- lint 对被忽略的块类（`##`+ 标题、blockquote、表格）发 unknown-block 警告（P1 落地项）

### 4.6 选项行健壮化 + 块级重定向

选项行：

- 解析从非贪婪正则改为**平衡扫描**：文本可含 `]`，子句可含 `)`（URL、带括号的表达式）——**必须与 4.1 同期**，否则 `(if: (a or b) and c)` 被旧正则截断
- 未知 `(key: value)` 子句进 `choice.clauses` 透传（选项倒计时等新子句不再需要动 parser）

新增**块级重定向行**（顶层语句，非列表项）：

```markdown
# check_result

-> role_baoyu (if: score_i > score_e and score_f > score_t)
-> role_xifeng (if: score_e > score_i and score_t > score_f)
-> role_baochai
```

- 语义：按序求值，首个条件命中即跳转；无正文场景立即跳（纯路由场景，替代 MBTI 式同名选项伪 switch），有正文场景在玩家"继续"时求值路由（替代 19 处 `[继续] ->` 单选项）
- 依据：validator 中已存在此约定的化石（`validate-game-script.ts:78-85` 识别 `-> scene_id` 文本并纳入引用图），说明这曾是预期设计；`-` 后跟 `>` 不构成 CommonMark 列表项，行首无冲突

### 4.7 版本与一致性

- 全局 front matter 增加 `dsl_version: 2`（缺省视为 v1）；仅调节 lint 严格度，不分叉解析（P5）；依赖 4.3 透传先落地，否则字段存不住
- 统一 `background_music`（`bgm` 作解析别名收敛，不再作为缺省值产出）、统一 `pending://` 约定

### 4.8 存档兼容

加载存档时以初始状态为底座合并：`{...extractRuntimeState(initialState), ...saved.state}`，`use-game-player.ts` 与 `save-manager.ts` 两处统一。变量重命名/删除不做自动迁移，lint 提示"重命名变量将使玩家存档中该值丢失"。

### 4.9 AI 作者链路同步

- `EXAMPLE_SCRIPT` 的 `(set: courage + 10)` 缺 `=` 热修 + 旧围栏措辞清理（**已随本次完成**）
- Chatbot function calling 操作集（chat-declarations.ts）在 Phase 3 增补 dialogue/redirect 操作（现有缺口：无操作 `(set:)`、minigame、条件文本的函数）
- 每阶段落地后同步 `EXAMPLE_SCRIPT` 与 `DSL_SPEC.md`，守护测试防漂移

## 5. Non-goals（明确不做）

- **随机数/骰子不进表达式语言**：破坏存档确定性与 conformance 可测性；未来若做，以独立子句形式（如 `(roll: ...)`）引入并将结果落入 state
- **战斗/商店/背包不进核心语法**：按 4.3 的扩展判据走 minigame 或 extra 透传
- **场景 ID Unicode 化暂缓**：场景 ID 进 asset-generator 素材文件名与 R2 URL（如 `hp4_ball_dance`），放开前需排查该链路
- **DSL 级 i18n 不做**：推荐 per-locale 文件（`game.zh.md`/`game.en.md`）+ lint 场景图同构比对，列 backlog
- **不做双解析器分叉**（P5）
- **素材产物 sidecar 化**（url 与内容分离、稳定节点寻址）：方向正确但语法成本大，Phase 3 出独立设计文档再决策

## 6. 实施阶段

### Phase 0：止血（0.5-1 天，可独立发布）

- [x] `generate-script.ts`：EXAMPLE_SCRIPT 补 `=`、删除旧围栏指引（随本次评审完成）
- [x] `DSL_SPEC.md` 勘误：对齐 v1 现状（随本次评审完成）
- [x] `stringify` 输出后处理：`{{...}}` 模板段内不再产出 `\_`（`parser/src/utils.ts` 的 `unescapeTemplateSpans`）
- [x] `scripts/validate-game-script.ts`：运算符集与运行时对齐（`* / %` 报 error）+ 嵌套 `{{if}}` 检测
- [x] `scripts/migrate-game-script.ts`：内容清洗接入 `unescapeTemplateSpans`；HP4 的 `\_` 污染（11 处）已清洗、嵌套 `{{if}}` 已拍平（三个并列条件块，三种取值实测渲染正确）
- [ ] D1 生产数据摸底与清洗：逐游戏跑 `npx tsx scripts/migrate-game-script.ts --slug <slug> --dry-run`（需 `MUI_ADMIN_PASSWORD`），确认后去掉 `--dry-run` 落库

验证：`pnpm vitest run` 全绿（含 `template-escape.test.ts` 与校验器新检查的回归测试）；validate 脚本跑 13 demo 无 Nested/Unsupported 报错。

### Phase 1：表达式统一 + 防丢失 + 透传（核心）—— ✅ 已完成

> 五个批次全部落地（对拍 diff=0，无白名单）。与原计划的偏差记录：
> trigger 归一在运行时而非 parse 期（保持 `trigger.condition` 原文往返）；
> 多存档合并通过新增 `useGamePlayer.restoreSave` 落地（顺带修复 55 站读档丢状态）；
> 同类多素材节点序列化为 console.warn 保留第一个而非 throw（编辑器保存不能崩）；
> golden 快照取 3 个小而全样本 + 13 demo 结构摘要（控制仓库体积）。
> 附带成果：roundtrip 断言抓出 7 个 demo 残留 image-gen 旧围栏并全部迁移。

- 新增 `packages/parser/src/expression/{lexer,parse,evaluate,index}.ts`
- `types.ts`：`Game.extra`/`Scene.extra`/`dsl_version`/结构化诊断类型/trigger 归一字段
- `index.ts`：全局与场景未知键透传；元数据门槛改为"首个 yaml 块即元数据"；trigger 前缀式补 LHS；选项行平衡扫描 + 未知子句透传；结构化 warnings（unknown-block/孤儿 audio/重复场景 ID/front matter 后游离正文/旧围栏检测）；按 ≤400 行拆 `parse-scene.ts`/`parse-choice.ts`
- `stringify.ts`：extra 写回；多 AI 节点报错不静默丢
- `site-common/utils/evaluator.ts`：薄适配委托新引擎（导出签名不变）
- `use-game-player.ts`：trigger 走归一表达式（修字符串变量 bug）；存档底座合并；`save-manager.ts` 同步
- `validate-game-script.ts`：换用同一引擎
- 测试：`tests/expression.test.ts`、`tests/roundtrip.test.ts`、`tests/golden/`（13 demo + AST JSON）；**新旧引擎对拍脚本**跑全量 989 选项/92 if/261 set，预期 diff=0

风险：中。靠对拍量化兼容性；`==` 语义用 conformance 锁定。

### Phase 2：对话行 + 手写序列化器 + 编辑器保序（风险最高）

- `types.ts`：`SceneDialogueNode`
- `parse-dialogue.ts`：行级扫描（全角标点、`break` 补 `\n`、注册角色门槛）
- 新增 `serialize.ts` 替换 remark-stringify（`stringify.ts` 保留导出转发）
- `transformers.ts`：保序 nodes 模型，dialogue 不落 assets，flowToGame 不再合并/重排
- 渲染：`SceneNodes.tsx`、`GamePlayerImmersive.tsx`、sites/55 与 jianjian 播放组件
- `segmentation.ts`（core 与 asset-generator 两份副本）：dialogue 节点短路 LLM 分段

验收：对话黄金样例；13 demo round-trip；**打开 HP4 → 保存 → diff 仅含已知规范化差异**；两站点手测。

### Phase 3：流控 + AI 链路 + 规范定稿

- 块级 `->` 重定向节点与路由语义（`use-game-player.ts`）
- Chatbot 增 dialogue/redirect 操作（`chat-declarations.ts` + handlers）
- `EXAMPLE_SCRIPT` 升级示范 v2 特性（对话行、or 表达式、重定向）
- 本文档设计合入 `DSL_SPEC.md` 定稿（v2 正式规范）；demo 全量迁移 PR
- sidecar manifest 与 i18n 出方向设计文档

## 7. 验证策略

- **conformance suite**：`packages/parser/tests/golden/` 黄金样例 + 期望 AST JSON；规范每条语法对应至少一个用例
- **round-trip**：13 demo 全量 parse → stringify → parse 深比对
- **对拍**：新旧表达式引擎对全量存量子句双跑 diff（一次性脚本，只读）
- **守护测试**：`generate-script.test.ts` 已锁定 EXAMPLE_SCRIPT 与 parser 不漂移，延续该模式覆盖 DSL_SPEC 中的示例
