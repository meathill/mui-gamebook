/**
 * 游戏创作 Skill 单源内容：5 个子 skill。
 * 页面（/skills/create-game）与下载 API 共用。顺序即推荐创作顺序：
 * 世界观 → 角色 → 主线 → 分支 → 试玩后再做媒体（省钱的顺序）。
 */

export interface CreateGameStep {
  slug: string;
  name: string;
  title: string;
  goal: string;
  prompt: string;
  skillMd: string;
  tools: string[];
  doneCriteria: string;
}

function wrapSkillMd(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`;
}

const WORLDVIEW_BODY = `## 目标

帮用户把一句话创意展开成**世界观设定文档**，并落成可玩游戏的骨架（createGame + generateScript dryRun 预览）。

## 流程

1. 追问用户三件事（一次问完）：题材与时代、主角身份与目标、基调（轻松/悬疑/恐怖/治愈）与目标篇幅（场景数 5 / 15 / 30 档）。
2. 输出世界观文档：时代地点、社会规则、核心冲突、关键势力/地点名词表（要求：名词全局唯一写法，后续场景只许用表里的词）。
3. \`createGame\` 建游戏（title 必填；**建议传 \`slug\`**：小写英文/数字/连字符，如 \`lanxiang-otome\`。中文标题 slugify 会得到 \`-7180\` 这类空前缀 slug），再 \`generateScript(gameId + story=世界观文档, dryRun: true)\` 生成骨架并展示给用户确认，满意再去掉 dryRun 落库。
4. frontmatter 必须有 \`title\` / \`state\` / \`ai\`；首场景必须是 \`# start\`。
5. \`createGame\` 回包是「说明文字 + JSON」混合文本，解析时抽数组花括号里的 \`id\` / \`slug\`。

## 完成标准

用户认可世界观文档，且游戏里有一版 dryRun 通过的骨架剧本。**不要在这一步生成任何图片/音频**。`;

const CHARACTERS_BODY = `## 目标

基于已确认的世界观，设计**角色设定卡**并写入 \`ai.characters\`（addCharacter / updateCharacter）。

## 流程

1. 先读 \`getGameInfo\` / \`getDsl\` 确认世界观与现有角色，避免重名与设定打架。
2. 角色数量建议：主角 1 + 重要配角 2-4 + 功能性 NPC 按需；每个角色给：ID（英文 snake_case，全局唯一）、显示名、外貌、性格、动机、说话口癖。
3. 每个角色必须写 \`description\`（叙事用）+ \`image_prompt\`（外貌短语，供后续生图保持一致）；旁白 narrator 如需固定音色可配 \`voice_name\`。
4. 设定卡落库后，用 \`@角色ID: 台词\` 写 3-5 句试读对白给用户确认人设是否成立。

## 铁律

- 对话行 \`@xx:\` 的 ID 必须已注册，否则按普通文本处理还会报 warning——先加角色再写对白。
- \`image_prompt\` 只写稳定外貌特征，不写情绪/动作（那些是场景 prompt 的事）。

## 完成标准

角色表用户拍板，全部设定卡已落库，试读对白语气过关。**不生成立绘**（立绘是第 5 步的事）。`;

const PLOT_BODY = `## 目标

写出**主线剧情**：场景链 + 每场核心事件，先保证一条从 \`# start\` 到结局的完整通路可玩。

## 流程

1. 先 \`listScenes\` / \`getDsl\` 看骨架现状；在现有剧本上改（generateScript 用 \`useExisting: true\`），从零写才用 \`setGameDsl\` 整篇替换（先 dryRun）。
2. 主线按三幕组织：开场钩子（start 场景 200 字内抛冲突）→ 中段 2-3 个事件场景 → 结局场景（无选项即结局，无需手动回 start）。
3. 局部修改优先细粒度工具：\`updateSceneText\` 改文案、\`addScene\` 加场景、\`addDialogueLine\` 追加 \`@角色ID: 台词\`（speaker 必须已注册）。
4. 场景切分只看一级标题 \`# SceneID\`（\`---\` 只是装饰）；ID 用英文或中文均可，但不要空格标点，否则无法被选项引用。

## 完成标准

从 start 一路点默认选项能走到结局、无死路；用户通读主线认可节奏。分支选项先占位即可，细节是下一步的事。`;

const BRANCHES_BODY = `## 目标

把主线升级为**真正的分支剧情**：变量 + 条件选项 + 块级重定向，保证任何选择都不卡死。

## 流程

1. 先定变量表（\`addVariable\`）：好感/属性用数字（带 visible/label，进度条给 max），关键道具用布尔。变量名英文 snake_case，中文亦可但首字符不能是数字。
2. 选项写法：\`* [文案] -> 场景ID (if: 条件) (set: 变量 = 表达式)\`；多条件逗号分隔是 AND，\`or\` 是 OR；**比较用 \`==\`，赋值才用 \`=\`**（\`(if: has_token = true)\` 非法，应写 \`(if: has_token == true)\`；\`(set: courage + 10)\` 非法，应写 \`(set: courage = courage + 10)\`）。
3. 按状态自动分流用块级重定向（顶层 \`-> 目标 (if: 条件)\`，按序**首个条件命中**生效，无条件行兜底）。多线结局并列时，把更高优先级写在前面，或后序线对优先者用严格 \`>\`（\`favor_b > favor_a\`），避免并列被先写的 BE 抢走。
4. 高风险变量（如生命值）给 \`trigger\`（如 \`条件 <= 0 → game_over\`），并用 \`{{变量}}\` / \`{{ if }}…{{ else }}…{{ /if }}\` 做动态文本（条件块必须在同一段落内）。

## 铁律（死局检查，每次改完自查）

- 每个场景至少保留**一个无条件选项**兜底；条件全假 = 玩家卡死。
- 跳转目标必须存在；删场景用 \`deleteScene\`（自动清悬空指向），改名用 \`renameScene\`。

## 完成标准

列出所有结局及其到达条件，用户逐条试走通过；变量面板显示符合预期。`;

const MEDIA_BODY = `## 目标

**文字版已试玩通过后**，再补图片/音频等多媒体。顺序不能反——媒体烧钱且不可逆，剧情返工会全部作废。

## 流程

1. 先问用户确认：文字版已定稿？配图风格关键词（沿用 \`ai.style.image\`，全书统一只定一次）。
2. 按场景优先级逐个生图：封面 > start 场景 > 结局/关键场景 > 其他。\`generateImage(gameId + prompt)\` 拿到 URL 后用 \`setSceneImage\` 挂进场景（写 url 和/或 imagePrompt）；角色立绘用 \`updateCharacter imageUrl\`。
3. prompt 写法：场景内容 + \`@角色ID\` 引用（自动带入 image_prompt 与参考图）；\`character\` / \`characters\` 字段声明出镜角色。
4. 自画素材用 \`uploadAsset\`（**\`gameId\` + \`data\` base64/data URL**，不是 gameSlug；type=cover|character|scene，角色再带 \`characterId\`）再挂接。若 \`updateCharacter imageUrl\` 偶发 401，可把 \`image_url\` 写进 DSL 的 \`ai.characters\` 后 \`setGameDsl\` 同步。批量图：先全部 \`uploadAsset\`，再把 URL 写回剧本并 \`setGameDsl\`。配音/视频需求大时走编辑器或批量工具。

## 铁律

- 一图一场景：素材块是场景标题后**第一个** \`\`\`yaml 代码块里的 \`image:\` 键；未知键原样保留，别手写场景级 frontmatter。
- 同一角色在不同场景的 image_prompt 保持一致，外貌才不会漂移。
- **\`setGameDsl\` 会用 frontmatter 覆盖 \`published\`**：若脚本里是 \`published: false\`，整篇替换后线上会变未发布（\`/play/<slug>\` 404）。替换后务必再 \`updateGameMeta(published: true)\`，或把 frontmatter 写成 \`published: true\`。

## 完成标准

封面 + start + 结局图就位并在播放页**实际打开可见**（curl/浏览器 200）；其余按用户预算补。补完用 \`updateGameMeta(published: true)\` 发布，播放页 \`/play/<slug>\`（可读 slug 可用 \`updateGameMeta({ slug })\` 修改）。`;

function makeStep(
  slug: string,
  name: string,
  title: string,
  goal: string,
  tools: string[],
  doneCriteria: string,
  body: string,
  description: string,
): CreateGameStep {
  const prompt = `你是我的互动小说创作助手，现在进入「${title}」阶段。\n\n${goal}\n\n请按以下规范工作：\n\n${body}\n\n先读当前剧本（getGameInfo / getDsl / listScenes）再动手；每步做完按「完成标准」向我汇报，通过后再继续。`;
  return {
    slug,
    name,
    title,
    goal,
    prompt,
    skillMd: wrapSkillMd(name, description, `# ${title}\n\n${body}`),
    tools,
    doneCriteria,
  };
}

export const CREATE_GAME_STEPS: CreateGameStep[] = [
  makeStep(
    'worldview',
    'mui-gamebook-worldview',
    '第 1 步：世界观设定',
    '把一句话创意展开成世界观设定文档，并落成游戏骨架。先有世界，后有故事。',
    ['createGame', 'generateScript', 'getDsl'],
    '世界观文档获批，且有一版 dryRun 通过的骨架剧本；零媒体生成。',
    WORLDVIEW_BODY,
    '世界观设定：题材追问、名词表、骨架剧本。当用户说想做新游戏、只有一句话创意时使用。',
  ),
  makeStep(
    'characters',
    'mui-gamebook-characters',
    '第 2 步：角色设计',
    '设计角色设定卡并写入 ai.characters，人设先行，对白验证。',
    ['getGameInfo', 'getDsl', 'addCharacter', 'updateCharacter'],
    '全部设定卡落库，试读对白语气过关；不生成立绘。',
    CHARACTERS_BODY,
    '角色设计：设定卡、人设试读。当用户要加角色、定人设、调人物关系时使用。',
  ),
  makeStep(
    'plot',
    'mui-gamebook-plot',
    '第 3 步：主线剧情',
    '写出从 # start 到结局的完整主线通路，先保证一条路走得通。',
    ['listScenes', 'getDsl', 'generateScript', 'addScene', 'updateSceneText', 'addDialogueLine', 'setGameDsl'],
    '默认选项一路可达结局、无死路；用户认可主线节奏。',
    PLOT_BODY,
    '主线剧情：三幕场景链、细粒度改文案。当用户要写正文、加场景、改剧情时使用。',
  ),
  makeStep(
    'branches',
    'mui-gamebook-branches',
    '第 4 步：剧情分支',
    '用变量 + 条件选项 + 重定向做出真分支，并通过死局检查。',
    ['addVariable', 'updateVariable', 'addChoice', 'updateChoiceText', 'addRedirect', 'deleteScene', 'renameScene'],
    '所有结局可达、变量显示正确；每个场景有无条件选项兜底。',
    BRANCHES_BODY,
    '剧情分支：变量表、条件选项、块级重定向、死局检查。当用户要加选项分支、好感度、数值养成时使用。',
  ),
  makeStep(
    'media',
    'mui-gamebook-media',
    '第 5 步：试玩后补媒体',
    '文字版定稿后，再按封面 > 开场 > 结局的优先级补图并发布。',
    ['generateImage', 'uploadAsset', 'setSceneImage', 'updateCharacter', 'updateGameMeta'],
    '封面/start/结局图在播放页可见；按预算补完后 published 发布。',
    MEDIA_BODY,
    '媒体收尾：生图挂接、发布。当用户试玩满意、要配图配音、要发布上线时使用。',
  ),
];

export const CREATE_GAME_PACK_MD = `---
name: mui-gamebook-create-game
description: 用 Mui Gamebook MCP 从零做一款互动小说：世界观 → 角色 → 主线 → 分支 → 试玩后补媒体发布。按顺序执行 5 个子阶段。当用户说想做游戏、写互动小说、从零创作时使用。
---

# Mui Gamebook 游戏创作（全流程）

> 远程 MCP：\`https://muistory.com/api/mcp\`（先确认已按 setup skill 配好并 \`listGames\` 验证通过）。
> 顺序不可乱：**媒体永远是最后一步**，剧情返工会让已生成的图全部作废。

${CREATE_GAME_STEPS.map((s) => `## ${s.title}\n\n${s.goal}\n\n工具：${s.tools.map((t) => `\`${t}\``).join(' ')}\n\n完成标准：${s.doneCriteria}`).join('\n\n')}

---

各阶段详细规范见同包 5 个子 skill（\`mui-gamebook-worldview\` / \`mui-gamebook-characters\` / \`mui-gamebook-plot\` / \`mui-gamebook-branches\` / \`mui-gamebook-media\`），执行某阶段时以子 skill 全文为准。
`;
