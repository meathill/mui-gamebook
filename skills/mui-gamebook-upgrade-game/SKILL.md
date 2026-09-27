---
name: mui-gamebook-upgrade-game
description: 用新一代 AI 模型管理与升级已有游戏剧本：结合 @roudanio/cli (mgb) 本地工具链诊断旧剧本短板、保留已有素材、新模型扩写重构、本地热重载即时预览、一键安全同步云端。当用户想要管理已有剧本、优化旧游戏、翻新老故事、增加分支或重写故事时使用。
---

# Mui Gamebook 剧本升级与重构指南

> CLI 工具：`@roudanio/cli`（短别名 `mgb`，已发布至 npm）
> 远程 MCP 端点：`https://muistory.com/api/mcp`
> 核心原则：**本地脚本严诊断、新模型强扩写、本地热预览即时看、已有图片不丢失、发布状态不掉线**。

## 适用场景

当你已经有了一款旧的游戏剧本（无论是早期简陋的 demo、还是从旧模型生成的单线小故事），希望**利用能力更强的新一代大模型结合本地开发工具链**对已有剧本进行：
- **文笔与剧情深度升级**：扩写场景描写、增强环境氛围感、丰富角色心理活动与高光对白。
- **分支与机制升级**：从单线升级为真正多结局互动小说，引入好感度、线索收集、属性养成等变量判定。
- **架构与人设翻新**：补充规范的角色设定卡（`ai.characters`）与稳定的生图提示词（`image_prompt`），清理死胡同。
- **资产保全**：在大幅重构剧情的同时，安全保留原游戏中已生成的图片与音频资源，保护线上发布状态。

---

## 升级核心流程（CLI + MCP 双模驱动）

```
[旧剧本拉取/定位]
       ↓
[mgb validate & graph 确定性静态诊断]  ←  秒级排查死局/孤岛与结构短板
       ↓
[新一代 AI 模型全篇扩写 / 增量重构]   ←  注入感官细节、新分支与变量系统
       ↓
[mgb preview 本地即时预览与热重载]    ←  免发布、在 localhost:3456 试玩调优
       ↓
[mgb push 一键安全推送云端]          ←  前置静态校验 + 保障 published 状态
       ↓
[高潮场景补图与资产收尾]
```

---

### 1. 定位游戏与诊断体检
1. **获取剧本**：
   - 本地已有文件：直接定位到 `story.md`。
   - 线上已有游戏：先执行 `mgb whoami` 查看名下游戏列表，通过 MCP `getDsl({ gameId })` 拉取正文保存为本地 `story.md`。
2. **确定性静态诊断**：
   ```bash
   # 1. 深度静态体检（排查首场景、未声明变量、死局隐患）
   npx @roudanio/cli validate story.md --json

   # 2. 导出全书剧情拓扑图（直观审视剧情分支密度与结局覆盖）
   npx @roudanio/cli graph story.md -o topology.mmd
   ```
3. **全面体检清单**：
   - **剧情饱满度**：统计总场景数与平均每场字数，评估是否过于仓促单薄。
   - **角色设定**：检查 `ai.characters` 是否缺失或粗糙，排查场景对白中的 `@角色ID:` 是否存在未注册的孤儿角色。
   - **分支死局检查**：检查所有 `* [选项] -> 场景ID (if: 条件)`，确保目标场景存在，且**每个场景必须有至少一个无条件选项**兜底。
   - **变量系统**：检查是否有利用 `initialState` 变量；若全是无条件跳转，建议引入数值判断提升游戏性。
   - **素材留存**：记录原剧本中的 `image:` URL 与封面图，重构时必须完整保留。

### 2. 对齐升级策略
在动手前与用户明确升级目标：
- 目标 A：**剧情扩写**（保持分支框架，由新模型重点扩充场景感官细节与人物对话）。
- 目标 B：**多分支深造**（新增 2-3 倍的分支选项、隐藏结局以及失败惩罚）。
- 目标 C：**数值系统注入**（增加好感度判定、生命值/勇气值 trigger 重定向）。

### 3. 新模型重构实操（推荐路径）
- **路径 1（Agent 客户端直接扩写生成，最推荐）**：
  当前 Agent 搭载的前沿模型（如 Gemini / Claude / GPT 等）具备出色的长文本逻辑。Agent 直接阅读旧 DSL，构思扩写方案，生成整篇更宏大、精美的新版 DSL 写入本地文件。
- **路径 2（服务端 generateScript 修订）**：
  调用 `generateScript({ gameId, story: "修改要求与升级大纲", useExisting: true, provider: "mimo|google|openai|anthropic" })`。
- **路径 3（局部细粒度打磨）**：
  针对特定单一场景调用 `updateSceneText`、`addScene`、`addChoice`、`addVariable` 进行精确微创升级。

### 4. 本地即时预览与验证 (`mgb preview`)
扩写完成后，**无需立即推送到云端**：
```bash
npx @roudanio/cli preview story.md
```
- 本地在 `http://localhost:3456` 自动启动播放器。
- 修改 Markdown 剧本时**自动 SSE 热重载**。
- 自带**实时 State 状态树调试面板**，随时查看变量数值流转与条件选项判定。
- 确保所有分支通路走得通，无死锁、无悬空。

### 5. 一键安全推送云端 (`mgb push`)
本地通过 `mgb validate` 与 `mgb preview` 验证无误后，使用 CLI 直接推送落库：
```bash
# 验证云端通信与解析（不实际写库）
npx @roudanio/cli push story.md --game <gameId> --dry-run

# 正式推送到云端，并保持发布状态
npx @roudanio/cli push story.md --game <gameId> --publish
```

> [!IMPORTANT]
> **发布状态防掉线铁律**：`mgb push` 会自动在本地执行前置语法校验，并在指定 `--publish` 时确保线上游戏保持公开，避免出现 404！

### 6. 视觉补强与收尾
1. 针对升级新增的核心高潮场景，调用 MCP `generateImage({ gameId, prompt })` 生成新插画并用 `setSceneImage` 挂接。
2. 调用 `updateGameMeta` 更新游戏简介（反映新模型的升级特色）及标签。

---

## 核心工具链速查

| 工具 | 类型 | 阶段 | 核心用途 |
| :--- | :--- | :--- | :--- |
| `mgb validate` | CLI | 诊断/门禁 | 编译器级确定性语法、变量与死局排查（0 幻觉） |
| `mgb graph` | CLI | 诊断/分析 | 导出 Mermaid 分支拓扑图，可视化剧情树 |
| `mgb preview` | CLI | 研发/调优 | 启动本地 Web 播放器，实时 SSE 热重载与状态调试 |
| `mgb push` | CLI | 部署/同步 | 前置静态体验 + 直连云端同步剧本，支持 `--publish` |
| `mgb whoami` | CLI | 鉴权/管理 | 查看当前登录的云端账号与游戏列表 |
| `generateScript` | MCP | 创作 | 服务端结合已有剧本（useExisting: true）做 AI 扩写 |
| `generateImage` | MCP | 视觉 | 为新高潮场景生成配套插画素材 |
| `updateGameMeta` | MCP | 收尾 | 保护/更新发布状态、封面、简介与标签 |
