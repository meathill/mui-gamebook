/**
 * 剧本管理与旧剧本升级 Skill 单源内容。
 * 页面（/skills/upgrade-game）与下载 API（/api/skills/upgrade-game/skill-md）共用。
 *
 * 核心目标：
 * 1. 发现并检视已有游戏（listGames / getGameInfo / getDsl）。
 * 2. 诊断旧剧本短板（死局检查、孤立场景、人设卡是否完整、分支与变量复杂度、文风与叙事深度）。
 * 3. 规划升级策略（剧情扩写、分支拓宽、数值机制注入、新模型长文本润色）。
 * 4. 新模型生成与重构（利用当前 Agent 强大的新模型推理，或服务端 generateScript(useExisting: true)）。
 * 5. 安全校验（setGameDsl dryRun、Diff 汇报、保留旧媒体与发布状态、落库）。
 */

export interface UpgradeGameStep {
  slug: string;
  name: string;
  title: string;
  goal: string;
  prompt: string;
  tools: string[];
  doneCriteria: string;
}

function wrapSkillMd(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`;
}

export const UPGRADE_GAME_PROMPT = `你是我的互动小说重构与升级助手。我希望利用最新大模型的能力，对我已有的游戏剧本进行全面升级与翻新。

请按以下规范工作：
1. 先调 \`listGames\` 帮我列出名下所有游戏剧本，让我挑选要升级的目标游戏（获取 gameId 与 slug）。
2. 调用 \`getGameInfo\` 与 \`getDsl\` 读取目标剧本的完整元数据与 DSL 正文。
3. 对旧剧本进行全身体检，列出诊断报告：
   - 叙事与文风：剧情是否过于单薄、场景描写与心境刻画是否有大幅提升空间？
   - 角色与对白：是否在 ai.characters 中注册了完整设定卡与 image_prompt？对白中是否有未注册角色？语气口癖是否鲜明？
   - 分支与变量：是否只是单线/伪分支？是否可以引入好感度、理智值、线索点数等变量？
   - 死局检查：是否存在孤立场景、死胡同链接？每个场景是否都有无条件选项兜底？
   - 媒体保护：原剧本中已有哪些配图与立绘？
4. 与我商定升级方案，然后利用新模型的高阶创作能力，输出重构后的完整 DSL。
5. 铁律保护：
   - 严格保留已有图片素材的 URL（不要因重写丢掉场景 image 块或角色 imageUrl）。
   - 必须先调用 \`setGameDsl(gameId, content, dryRun: true)\` 进行校验，向我汇报 Diff 摘要并征求确认。
   - 确认后再执行正式写库。若原游戏已发布，确保 frontmatter 的 published 保持 true（或后续调用 updateGameMeta 保持发布）。
6. 必要时可按需为新增的关键场景调用 \`generateImage\` 配图，并调用 \`updateGameMeta\` 优化标题与简介。`;

export const UPGRADE_GAME_STEPS: UpgradeGameStep[] = [
  {
    slug: 'inspect',
    name: 'mui-gamebook-upgrade-inspect',
    title: '第 1 步：定位游戏与全面体检',
    goal: '列出用户已有游戏，获取指定剧本的完整 DSL，并从叙事、角色、分支逻辑、变量、媒体等维度输出诊断清单。',
    tools: ['listGames', 'getGameInfo', 'getDsl', 'listScenes'],
    prompt:
      '请调用 listGames 列出我的游戏，待我选定后调用 getGameInfo 和 getDsl 提取完整内容，然后针对剧情丰满度、角色设定卡完整度、分支死路、变量机制与已有素材进行全面体检并向我汇报。',
    doneCriteria: '成功获取剧本 DSL，输出包含文笔、人设、分支逻辑、死局隐患和素材现状的体检报告。',
  },
  {
    slug: 'plan',
    name: 'mui-gamebook-upgrade-plan',
    title: '第 2 步：规划新模型升级策略',
    goal: '结合新模型强大的推理与文学素养，针对旧剧本的薄弱环节，商定具体的扩写方向与数值系统。',
    tools: ['getDsl'],
    prompt:
      '基于体检结果，请为我制定升级方案：1. 核心剧情扩写重点；2. 角色高光对白与设定卡补全；3. 增设的新分支与结局走向；4. 引入的状态变量（如好感度/线索/San值）。等我确认后再动手。',
    doneCriteria: '升级方案与用户达成共识，确定要扩写的情节段落、分支结构与变量规则。',
  },
  {
    slug: 'rewrite',
    name: 'mui-gamebook-upgrade-rewrite',
    title: '第 3 步：新模型重构与剧本扩写',
    goal: '利用新模型长文本理解与生成能力完成剧本升级，注入生动描写与多结局分支，严守 DSL 语法铁律。',
    tools: [
      'setGameDsl',
      'generateScript',
      'updateSceneText',
      'addScene',
      'addChoice',
      'addVariable',
      'updateCharacter',
    ],
    prompt:
      '请利用最新模型的深度创作能力重构剧本。要求：保留已有图片 URL；首场景必须为 # start；变量比较用 ==、赋值用 =；每个场景至少保留一个无条件选项兜底；扩充场景细节与多结局走向。',
    doneCriteria: '完成新版 DSL 构建，剧情更具张力、人物更有温度、逻辑完备无死局。',
  },
  {
    slug: 'verify',
    name: 'mui-gamebook-upgrade-verify',
    title: '第 4 步：DryRun 校验与安全写库',
    goal: '先通过 dryRun 校验 DSL 合法性，比对新旧剧本 Diff 汇报给用户，确认后再写库并保持发布状态。',
    tools: ['setGameDsl', 'updateGameMeta'],
    prompt:
      '请先调用 setGameDsl(dryRun: true) 校验新 DSL 是否合法。向我汇报变更摘要（场景增量、字数变化、新分支/结局数、保留的素材），并在我确认后去掉 dryRun 正式落库。注意保持原剧本的发布状态（published）。',
    doneCriteria: 'dryRun 校验 100% 通过，用户确认 Diff 摘要后正式写入数据库，线上地址不失效。',
  },
  {
    slug: 'polish',
    name: 'mui-gamebook-upgrade-polish',
    title: '第 5 步：素材补全与元数据发布',
    goal: '针对升级新增的高潮场景或新角色按需补齐插画，更新游戏简介与标签，完成升级验收。',
    tools: ['generateImage', 'uploadAsset', 'setSceneImage', 'updateCharacter', 'updateGameMeta'],
    prompt:
      '剧本升级后，请检查是否有新增的核心高潮场景需要配图。可按封面 > 关键结局 > 新场景的优先级调用 generateImage 生成并挂接，最后调用 updateGameMeta 刷新游戏描述和标签。',
    doneCriteria: '关键视觉素材补齐，元数据更新完毕，通过播放链接 /play/<slug> 完整试玩顺畅无阻。',
  },
];

const UPGRADE_BODY = `## 适用场景

当你已经有了一款旧的游戏剧本（无论是早期简陋的 demo、还是从旧模型生成的单线小故事），希望**利用能力更强的新一代大模型**对已有剧本进行：
- **文笔与剧情深度升级**：扩写场景描写、增强环境氛围感、丰富角色心理活动与高光对白。
- **分支与机制升级**：从线性/少分支升级为真正多结局互动小说，引入好感度、线索收集、属性养成等变量判定。
- **架构与人设翻新**：补充规范的角色设定卡（\`ai.characters\`）与稳定的生图提示词（\`image_prompt\`），清理死胡同。
- **资产保全**：在大幅重构剧情的同时，安全保留原游戏中已生成的图片与音频资源，保护线上发布状态。

---

## 升级核心流程

### 1. 定位游戏与诊断体检
1. 调用 \`listGames\` 查看当前名下的所有游戏（获取 \`id\` / \`slug\` / \`title\` / \`published\`）。
2. 调用 \`getGameInfo({ gameId })\` 与 \`getDsl({ gameId })\` 拉取当前完整 DSL。
3. **全面体检清单**：
   - **剧情饱满度**：统计总场景数与平均每场字数，评估是否过于仓促单薄。
   - **角色设定**：检查 \`ai.characters\` 是否缺失或粗糙，排查场景对白中的 \`@角色ID:\` 是否存在未注册的孤儿角色。
   - **分支死局检查**：检查所有 \`* [选项] -> 场景ID (if: 条件)\`，确保目标场景存在，且**每个场景必须有至少一个无条件选项**兜底，防止玩家卡死。
   - **变量系统**：检查是否有利用 \`initialState\` 变量；若全是无条件跳转，建议引入数值判断提升游戏性。
   - **素材留存**：记录原剧本中的 \`image:\` URL 与封面图，重构时必须完整保留。

### 2. 对齐升级策略
在动手前与用户明确升级目标：
- 目标 A：**剧情扩写**（保持分支框架，由新模型重点扩充场景感官细节与人物对话）。
- 目标 B：**多分支深造**（新增 2-3 倍的分支选项、隐藏结局以及失败惩罚）。
- 目标 C：**数值系统注入**（增加好感度判定、生命值/勇气值 trigger 重定向）。

### 3. 新模型重构实操（两种路径）
- **路径 1（Agent 客户端直接生成/重写，最推荐）**：
  当前 Agent 搭载的前沿模型（如 Gemini / Claude / GPT 等）具备出色的长文本逻辑。Agent 直接阅读旧 DSL，构思扩写方案，生成整篇更宏大、精美的新版 DSL。
- **路径 2（服务端 generateScript 修订）**：
  调用 \`generateScript({ gameId, story: "修改要求与升级大纲", useExisting: true, provider: "mimo|google|openai|anthropic" })\`。当 \`useExisting: true\` 时，系统会将旧剧本作为上下文注入提示词进行增量重构。
- **路径 3（局部细粒度打磨）**：
  针对特定单一场景调用 \`updateSceneText\`、\`addScene\`、\`addChoice\`、\`addVariable\` 进行精确微创升级。

### 4. 安全校验与 Diff 确认（铁律防坑）
- **DryRun 绝不跳过**：整篇替换前，必须执行 \`setGameDsl({ gameId, content: nextDsl, dryRun: true })\` 校验语法。
- **发布状态防踩坑**：\`setGameDsl\` 会用 frontmatter 的 \`published\` 覆盖数据库状态。如果旧游戏已发布（\`published: true\`），新 DSL 的 frontmatter **必须显式写 \`published: true\`**，或在写库后立刻调用 \`updateGameMeta({ gameId, published: true })\`，防止线上链接 404！
- **向用户汇报 Diff**：列出「新增场景数、扩充字数、新增分支数、修复的死局、保留的图片数」，经用户审阅同意后再去除 \`dryRun\` 正式写入。

### 5. 试玩收尾与视觉补强
1. 引导用户或通过播放页 \`/play/<slug>\` 验证通路是否全部跑通。
2. 针对升级新增的核心高潮场景，调用 \`generateImage({ gameId, prompt })\` 生成新插画并用 \`setSceneImage\` 挂接。
3. 调用 \`updateGameMeta\` 更新游戏简介（反映新模型的升级特色）及标签。

---

## 核心工具链

| 工具名 | 阶段 | 核心用途 |
| :--- | :--- | :--- |
| \`listGames\` | 发现 | 列出用户名下的剧本列表（获取 gameId） |
| \`getGameInfo\` | 诊断 | 读取场景列表、角色列表与发布状态 |
| \`getDsl\` | 诊断 | 获取完整剧本 DSL 正文 |
| \`generateScript\` | 升级 | 服务端结合已有剧本（useExisting: true）做 AI 扩写 |
| \`setGameDsl\` | 落地 | 整篇替换升级后的 DSL（务必先 dryRun: true） |
| \`updateSceneText\` | 局部微调 | 修改特定场景文案 |
| \`addScene\` / \`addChoice\` | 局部微调 | 新增分支场景与选择项 |
| \`generateImage\` | 视觉 | 为新剧情生成配套插画素材 |
| \`updateGameMeta\` | 收尾 | 保护/更新发布状态、封面、简介与标签 |
`;

export const UPGRADE_GAME_SKILL_MD = wrapSkillMd(
  'mui-gamebook-upgrade-game',
  '用新一代 AI 模型管理与升级已有游戏剧本：诊断旧剧本短板、保留已有素材、新模型扩写重构、语法与死局校验、安全平滑落库。当用户想要优化已有游戏、翻新旧剧本、增加分支或重写故事时使用。',
  `# Mui Gamebook 剧本升级与重构指南\n\n> 远程 MCP 端点：\`https://muistory.com/api/mcp\`\n> 核心原则：**先诊断再动笔、先 dryRun 再落库、已有图片不丢失、发布状态不掉线**。\n\n${UPGRADE_BODY}`,
);
