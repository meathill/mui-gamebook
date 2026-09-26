/**
 * 剧本逻辑校验与死局排查 Skill 单源内容。
 * 页面（/skills/validate-game）与下载 API（/api/skills/validate-game/skill-md）共用。
 *
 * 核心目标：
 * 1. 剧情图拓扑扫描：排查缺失 # start、悬空跳转目标、孤岛场景、死循环。
 * 2. 选项死局检查：确保分支场景拥有无条件选项兜底，避免玩家由于条件不满足而卡死。
 * 3. 变量与表达式审计：排查未声明变量、检查赋值 (=) 与比较 (==) 语法、模板插值合规。
 * 4. 角色与对白对齐：排查场景对白中的未注册角色与幽灵 ID。
 * 5. 安全闭环修复：输出诊断报告，提供针对性修复方案，dryRun 验证通过后落库。
 */

export interface ValidateGameStep {
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

export const VALIDATE_GAME_PROMPT = `你是我的互动小说逻辑质量审查与死局排查专家（Game QA / Linter）。我需要你对我的互动小说剧本进行全面的全链路逻辑体检与排错。

请按以下规范工作：
1. 先调 \`listGames\` 帮我列出名下游戏剧本，待我选定后调用 \`getGameInfo\` 与 \`getDsl\` 拉取完整剧本内容。
2. 运行全维度拓扑与语法审计：
   - 场景与入口：必须存在首场景 \`# start\`；场景 ID 命名规范无特殊字符。
   - 悬空引用（严重阻断）：所有 \`* [文案] -> 目标场景\` 与块级重定向 \`-> 目标场景\`，目标场景必须实际存在，严禁指向不存在的场景 ID。
   - 死局检查（严重卡关）：所有带条件的选项分支，该场景必须保留至少一个**无条件选项**作为兜底，防止条件不满足时玩家动弹不得。
   - 孤岛场景：除 \`start\` 外，检查是否有任何没有入度的场景（孤立无援无法被玩家访问）。
   - 变量与文法：检查所有 \`(if:)\`、\`(set:)\` 与 \`{{ variable }}\`，所有变量必须在 initialState 或 minigame.variables 声明；比较必须用 \`==\`，赋值必须用 \`=\`。
   - 角色一致性：检查对白行 \`@角色ID:\` 是否已在 ai.characters 中注册。
3. 输出结构化《剧本逻辑健康诊断报告》：
   - 🚨 阻断性错误（Errors）：悬空场景、语法崩溃、死局卡关。
   - ⚠️ 体验级警告（Warnings）：孤立场景、缺少兜底选项、未配图关键结局。
   - 📊 统计指标：场景总数、结局数、变量总数、最长分支路径深度。
4. 针对发现的问题给出针对性修复方案。若需由你修复，修改后必须先执行 \`setGameDsl(dryRun: true)\` 校验，向我汇报 Diff，确认后再写库并保持 published 状态。`;

export const VALIDATE_GAME_STEPS: ValidateGameStep[] = [
  {
    slug: 'fetch',
    name: 'mui-gamebook-validate-fetch',
    title: '第 1 步：读取剧本与拓扑初始化',
    goal: '获取目标剧本的完整 DSL，解析所有场景节点、选项跳转、重定向与变量声明。',
    tools: ['listGames', 'getGameInfo', 'getDsl'],
    prompt:
      '请调用 listGames 列出我的游戏，待我选定后提取目标剧本的完整 DSL 正文，并梳理出场景列表、变量列表与跳转关系图谱。',
    doneCriteria: '成功读取 DSL，提取全部场景 ID、选项跳转目标与声明变量集合。',
  },
  {
    slug: 'topology',
    name: 'mui-gamebook-validate-topology',
    title: '第 2 步：图连通性与死局排查',
    goal: '排查缺失 # start、悬空跳转目标、无条件选项缺失导致的死局、以及孤岛未引用场景。',
    tools: ['getDsl'],
    prompt:
      '请审查剧本的连通性：1. 是否存在 # start 场景；2. 所有选项和重定向的目标场景是否都存在（杜绝悬空跳转）；3. 分支场景是否至少有一个无条件选项兜底（防死局）；4. 是否存在没有任何入口的孤岛场景。',
    doneCriteria: '列出所有悬空引用、死局场景及孤立场景的详细列表。',
  },
  {
    slug: 'syntax',
    name: 'mui-gamebook-validate-syntax',
    title: '第 3 步：变量与表达式语法严谨性审计',
    goal: '检查未声明变量、表达式文法合规性（= vs ==）、插值与条件模板语法。',
    tools: ['getDsl'],
    prompt:
      '请检查所有变量与逻辑语法：1. 条件判定 (if:) 与状态更新 (set:) 中的变量是否已在 initialState 声明；2. 是否误用单个 = 进行比较，或赋值语句缺少等号；3. {{ variable }} 与 {{ if }} 模板语法是否合法。',
    doneCriteria: '列出所有未声明变量、表达式语法错误及模板拼写问题。',
  },
  {
    slug: 'characters',
    name: 'mui-gamebook-validate-characters',
    title: '第 4 步：角色设定与对白匹配度核验',
    goal: '排查正文中所有 @角色ID 对白行，确认其已在 ai.characters 注册，并具备稳定外貌描述。',
    tools: ['getDsl', 'getGameInfo'],
    prompt:
      '请核对剧本中的角色对白：提取所有 @角色ID 对话行，比对 ai.characters 注册表，找出未注册的角色 ID，并检查重要角色是否配有用于生图的 image_prompt。',
    doneCriteria: '核对全部说话人 ID，输出未注册角色预警与设定补全建议。',
  },
  {
    slug: 'report-and-fix',
    name: 'mui-gamebook-validate-report-and-fix',
    title: '第 5 步：出具诊断报告与安全一键修复',
    goal: '出具结构化体检报告，对错误提出修复建议；确认修复后先 dryRun 校验，再安全写库。',
    tools: ['setGameDsl', 'updateSceneText', 'addChoice', 'addVariable', 'updateGameMeta'],
    prompt:
      '请汇总前四步结果，输出清晰的《剧本逻辑健康诊断报告》（阻断错误、体验警告、修复建议）。经我确认后，执行修复并调用 setGameDsl(dryRun: true) 验证，通过后正式落库。',
    doneCriteria: '输出规范报告，修复后剧本 100% 通过语法与逻辑验证，线上播放正常。',
  },
];

const VALIDATE_BODY = `## 适用场景

互动小说的非线性分支结构非常容易出现逻辑暗坑。在**剧本创作完成时、上线发布前、或进行大版本升级后**，必须执行一次全面的逻辑质量审查，以确保玩家拥有顺畅、无阻断的完美游玩体验。

---

## 审查流程与工具

1. **拉取剧本**：调用 \`listGames\` 与 \`getGameInfo\` 确认目标，通过 \`getDsl\` 获取剧本完整 DSL 文本。
2. **多维审查**：依次排查拓扑连通性、死局隐患、变量表达式语法与角色对白。
3. **输出报告**：出具结构化诊断报告（阻断错误、体验警告、健康指标）。
4. **安全修复**：修复后先执行 \`setGameDsl(dryRun: true)\` 校验，确认无误后再正式写库。

---

## 核心审查维度与铁律

### 1. 场景连通性与结构（Topology）
- **首场景铁律**：必须存在名为 \`# start\` 的首场景（小写，严格匹配），它是全书唯一入口。
- **杜绝悬空引用（Dangling Targets）**：
  - 选项跳转：\`* [选项] -> target\` 中的 \`target\` 必须存在于剧本中。指向不存在的场景会导致玩家点击时页面直接崩溃或报 404。
  - 块级重定向：\`-> target (if: condition)\` 中的 \`target\` 也必须是有效场景。
- **孤岛场景（Orphan Scenes）**：除了 \`start\` 场景以外，没有任何选项或重定向指向该场景。这代表写好的剧情永远无法被玩家读到，应当连接或清理。

### 2. 死局防范（Dead End Prevention）
- **无条件兜底铁律**：在有选项的场景中，**必须保留至少一个不带 \`(if: ...)\` 条件限制的选项**。
  - 错误示例：场景只有两个选项，分别要求 \`(if: gold >= 10)\` 和 \`(if: has_key == true)\`。若玩家两者都不满足，画面将没有任何可选路径，玩家直接卡死。
  - 正确做法：增加兜底选项，如 \`* [四处张望，另寻出路] -> search_room\`。

### 3. 变量与表达式合规（Variables & Expressions）
- **变量声明**：在 \`(if:)\`、\`(set:)\`、\`{{ variable }}\` 以及小游戏中使用的所有变量，必须在 frontmatter 的 \`initialState\`（或小游戏 \`variables\`）中显式声明初始值。
- **赋值与比较符号**：
  - 比较必须用双等号：\`(if: level == 5)\`（严禁写 \`(if: level = 5)\`）。
  - 赋值必须写出完整表达式：\`(set: score = score + 10)\`（严禁写 \`(set: score + 10)\`）。
- **动态模板**：\`{{ variable }}\` 插值必须闭合，条件块 \`{{ if cond }} ... {{ /if }}\` 必须在同一段落内完整闭合。

### 4. 角色与对白（Characters & Dialogues）
- **注册先行**：对话行 \`@角色ID: 台词\` 中的 \`角色ID\` 必须先在 frontmatter 的 \`ai.characters\` 字典中注册。
- **外貌描述**：注册的角色应包含 \`image_prompt\`（稳定外貌特征），便于后续场景生图保持风格统一。

---

## 诊断报告标准模板

审查完成后，应向用户输出包含三部分的诊断报告：

\`\`\`markdown
# 📋 《剧本名称》逻辑健康诊断报告

## 🚨 阻断性错误（必须修复才能上线）
1. [Scene: library_door] 悬空跳转：选项指向了不存在的场景 "secret_tunnel"。
2. [Scene: battle_01] 死局隐患：所有选项均包含 if 条件，缺少无条件选项兜底。
3. [Scene: market] 语法错误：\`(set: coins + 5)\` 缺少等号，运行时将静默失效。

## ⚠️ 体验性警告（建议优化）
1. [Scene: hidden_attic] 孤岛场景：该场景在剧情树中无任何入度。
2. 未注册角色：场景中出现了 \`@wizard: ...\`，但 ai.characters 中未注册 wizard。

## 📊 剧本健康度指标
- 总场景数：24
- 结局通路数：4（2 个 Good Ending，2 个 Bad Ending）
- 变量健康度：6 / 6 已正确声明
- 综合评级：B+（修复 3 项阻断错误后可达 A+）
\`\`\`

---

## 修复流程

1. 针对发现的问题与用户对齐修复方案（补场景、加兜底选项、修复语法、补注册变量）。
2. 在整篇替换修复时，**必须先执行 \`setGameDsl({ gameId, content: fixedDsl, dryRun: true })\`** 进行语法验证。
3. 确保保留剧本已有的图片素材与 \`published: true\` 发布状态。
4. 验证通过后写入数据库，完成复测。
`;

export const VALIDATE_GAME_SKILL_MD = wrapSkillMd(
  'mui-gamebook-validate-game',
  '互动小说全链路逻辑质量审查与死局排查：检查 # start 首场景、悬空场景引用、无条件兜底死局、孤岛场景、未声明变量、表达式语法与角色对白规范。当用户想要体检剧本、排查死路、发布前验收或修复游戏逻辑时使用。',
  `# Mui Gamebook 剧本逻辑校验与死局排查指南\n\n> 远程 MCP 端点：\`https://muistory.com/api/mcp\`\n> 核心准则：**首场景必备、绝无悬空跳转、必有无条件兜底、变量严格声明**。\n\n${VALIDATE_BODY}`,
);
