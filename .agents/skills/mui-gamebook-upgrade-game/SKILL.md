---
name: mui-gamebook-upgrade-game
description: 用新一代 AI 模型管理与升级已有游戏剧本：诊断旧剧本短板、保留已有素材、新模型扩写重构、语法与死局校验、安全平滑落库。当用户想要管理已有剧本、优化旧游戏、翻新老故事、增加分支或重写故事时使用。
---

# Mui Gamebook 剧本升级与重构指南

> 远程 MCP 端点：`https://muistory.com/api/mcp`
> 核心原则：**先诊断再动笔、先 dryRun 再落库、已有图片不丢失、发布状态不掉线**。

## 适用场景

当你已经有了一款旧的游戏剧本（无论是早期简陋的 demo、还是从旧模型生成的单线小故事），希望**利用能力更强的新一代大模型**对已有剧本进行：
- **文笔与剧情深度升级**：扩写场景描写、增强环境氛围感、丰富角色心理活动与高光对白。
- **分支与机制升级**：从线性/少分支升级为真正多结局互动小说，引入好感度、线索收集、属性养成等变量判定。
- **架构与人设翻新**：补充规范的角色设定卡（`ai.characters`）与稳定的生图提示词（`image_prompt`），清理死胡同。
- **资产保全**：在大幅重构剧情的同时，安全保留原游戏中已生成的图片与音频资源，保护线上发布状态。

---

## 升级核心流程

### 1. 定位游戏与诊断体检
1. 调用 `listGames` 查看当前名下的所有游戏（获取 `id` / `slug` / `title` / `published`）。
2. 调用 `getGameInfo({ gameId })` 与 `getDsl({ gameId })` 拉取当前完整 DSL。
3. **全面体检清单**：
   - **剧情饱满度**：统计总场景数与平均每场字数，评估是否过于仓促单薄。
   - **角色设定**：检查 `ai.characters` 是否缺失或粗糙，排查场景对白中的 `@角色ID:` 是否存在未注册的孤儿角色。
   - **分支死局检查**：检查所有 `* [选项] -> 场景ID (if: 条件)`，确保目标场景存在，且**每个场景必须有至少一个无条件选项**兜底，防止玩家卡死。
   - **变量系统**：检查是否有利用 `initialState` 变量；若全是无条件跳转，建议引入数值判断提升游戏性。
   - **素材留存**：记录原剧本中的 `image:` URL 与封面图，重构时必须完整保留。

### 2. 对齐升级策略
在动手前与用户明确升级目标：
- 目标 A：**剧情扩写**（保持分支框架，由新模型重点扩充场景感官细节与人物对话）。
- 目标 B：**多分支深造**（新增 2-3 倍的分支选项、隐藏结局以及失败惩罚）。
- 目标 C：**数值系统注入**（增加好感度判定、生命值/勇气值 trigger 重定向）。

### 3. 新模型重构实操（两种路径）
- **路径 1（Agent 客户端直接生成/重写，最推荐）**：
  当前 Agent 搭载的前沿模型（如 Gemini / Claude / GPT 等）具备出色的长文本逻辑。Agent 直接阅读旧 DSL，构思扩写方案，生成整篇更宏大、精美的新版 DSL。
- **路径 2（服务端 generateScript 修订）**：
  调用 `generateScript({ gameId, story: "修改要求与升级大纲", useExisting: true, provider: "mimo|google|openai|anthropic" })`。当 `useExisting: true` 时，系统会将旧剧本作为上下文注入提示词进行增量重构。
- **路径 3（局部细粒度打磨）**：
  针对特定单一场景调用 `updateSceneText`、`addScene`、`addChoice`、`addVariable` 进行精确微创升级。

### 4. 安全校验与 Diff 确认（铁律防坑）
- **DryRun 绝不跳过**：整篇替换前，必须执行 `setGameDsl({ gameId, content: nextDsl, dryRun: true })` 校验语法。
- **发布状态防踩坑**：`setGameDsl` 会用 frontmatter 的 `published` 覆盖数据库状态。如果旧游戏已发布（`published: true`），新 DSL 的 frontmatter **必须显式写 `published: true`**，或在写库后立刻调用 `updateGameMeta({ gameId, published: true })`，防止线上链接 404！
- **向用户汇报 Diff**：列出「新增场景数、扩充字数、新增分支数、修复的死局、保留的图片数」，经用户审阅同意后再去除 `dryRun` 正式写入。

### 5. 试玩收尾与视觉补强
1. 引导用户或通过播放页 `/play/<slug>` 验证通路是否全部跑通。
2. 针对升级新增的核心高潮场景，调用 `generateImage({ gameId, prompt })` 生成新插画并用 `setSceneImage` 挂接。
3. 调用 `updateGameMeta` 更新游戏简介（反映新模型的升级特色）及标签。

---

## 核心工具链

| 工具名 | 阶段 | 核心用途 |
| :--- | :--- | :--- |
| `listGames` | 发现 | 列出用户名下的剧本列表（获取 gameId） |
| `getGameInfo` | 诊断 | 读取场景列表、角色列表与发布状态 |
| `getDsl` | 诊断 | 获取完整剧本 DSL 正文 |
| `generateScript` | 升级 | 服务端结合已有剧本（useExisting: true）做 AI 扩写 |
| `setGameDsl` | 落地 | 整篇替换升级后的 DSL（务必先 dryRun: true） |
| `updateSceneText` | 局部微调 | 修改特定场景文案 |
| `addScene` / `addChoice` | 局部微调 | 新增分支场景与选择项 |
| `generateImage` | 视觉 | 为新剧情生成配套插画素材 |
| `updateGameMeta` | 收尾 | 保护/更新发布状态、封面、简介与标签 |
