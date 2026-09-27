---
name: mui-gamebook-validate-game
description: 互动小说全链路逻辑质量审查与死局排查：检查 # start 首场景、悬空场景引用、无条件兜底死局、孤岛场景、未声明变量、表达式语法与角色对白规范。支持通过 @roudanio/cli (mgb validate) 执行编译器级 0 幻觉静态体检，或远程 MCP 审查。当用户想要体检剧本、排查死路、发布前验收或修复游戏逻辑时使用。
---

# Mui Gamebook 剧本逻辑校验与死局排查指南

> CLI 工具：`@roudanio/cli`（短别名 `mgb`，已发布至 npm）
> 远程 MCP 端点：`https://muistory.com/api/mcp`
> 核心准则：**首场景必备、绝无悬空跳转、必有无条件兜底、变量严格声明、CLI 脚本严查 0 幻觉**。

## 适用场景

互动小说的非线性分支结构极易出现隐藏逻辑暗坑（如条件全不满足导致玩家卡死、拼写错误导致 404 悬空跳转等）。
在**剧本创作完成时、上线发布前、或进行大版本升级后**，必须执行一次全面的逻辑质量审查。

---

## 推荐校验方案：CLI 静态体检（速度极快、0 幻觉）

无需依赖大模型肉眼逐行阅读（大模型在长篇多分支下容易漏检）。**强烈推荐优先使用已发布的官方 CLI 工具：**

```bash
# 本地免安装直接运行（或已全局安装 mgb）
npx @roudanio/cli validate story.md

# 严格门禁模式（警告亦视为失败，适合 CI/CD 与上线前质检）
npx @roudanio/cli validate story.md --strict

# 输出结构化 JSON（供 Agent 或脚本自动化解析消费）
npx @roudanio/cli validate story.md --json
```

### 配合 Mermaid 分支拓扑图审查

借助 CLI 快速导出全篇剧情分支图，一目了然定位死局与孤岛：

```bash
npx @roudanio/cli graph story.md -o flow.mmd
```
导出的 Mermaid 代码会自动标记 `[# start (起点)]` 为绿色、所有结局标记为红色，分支流转一览无余。

---

## 核心审查维度与铁律（CLI 自动化排查项）

CLI 基于编译器 AST 执行严格的确定性规则匹配：

### 1. 场景连通性与结构（Topology）
- **首场景铁律 (`MISSING_START`)**：必须存在名为 `# start` 的首场景（小写，严格匹配），它是全书唯一入口。
- **杜绝悬空引用 (`DANGLING_TARGET`)**：
  - 选项跳转：`* [选项] -> target` 中的 `target` 必须存在于剧本中。指向不存在的场景会导致玩家点击时页面直接崩溃或报 404。
  - 块级重定向：`-> target (if: condition)` 中的 `target` 也必须是有效场景。
- **孤岛场景 (`ORPHAN_SCENE`)**：除了 `start` 场景以外，没有任何选项或重定向指向该场景。这代表写好的剧情永远无法被玩家读到，应当连接或清理。

### 2. 死局防范（Dead End Prevention - `DEAD_END`）
- **无条件兜底铁律**：在有选项的场景中，**必须保留至少一个不带 `(if: ...)` 条件限制的选项**。
  - 错误示例：场景只有两个选项，分别要求 `(if: gold >= 10)` 和 `(if: has_key == true)`。若玩家两者都不满足，画面将没有任何可选路径，玩家直接卡死。
  - 正确做法：增加兜底选项，如 `* [四处张望，另寻出路] -> search_room`。

### 3. 变量与表达式合规（Variables & Expressions）
- **未声明变量 (`UNDECLARED_VARIABLE`)**：在 `(if:)`、`(set:)`、`{{ variable }}` 以及小游戏中使用的所有变量，必须在 frontmatter 的 `initialState`（或小游戏 `variables`）中显式声明初始值。
- **赋值与比较符号 (`INVALID_CONDITION_SYNTAX` / `INVALID_SET_SYNTAX`)**：
  - 比较必须用双等号：`(if: level == 5)`（严禁写 `(if: level = 5)`）。
  - 赋值必须写出完整表达式：`(set: score = score + 10)`（严禁写 `(set: score + 10)`）。
- **动态模板语法 (`TEMPLATE_SYNTAX_ERROR`)**：`{{ variable }}` 插值必须闭合，条件块 `{{ if cond }} ... {{ /if }}` 必须在同一段落内完整闭合。

### 4. 角色与对白（Characters & Dialogues）
- **注册先行 (`UNREGISTERED_CHARACTER`)**：对话行 `@角色ID: 台词` 中的 `角色ID` 必须先在 frontmatter 的 `ai.characters` 字典中注册。
- **外貌描述**：注册的角色应包含 `image_prompt`（稳定外貌特征），便于后续场景生图保持风格统一。

---

## 审查与修复工作流

### 流程 A：本地剧本审查（最推荐）
1. 在终端执行 `npx @roudanio/cli validate <file> --json`。
2. Agent 或开发者阅读检测出的 Issues 清单。
3. 针对性修复 Markdown 文件中的语法与逻辑缺陷。
4. 运行 `npx @roudanio/cli preview <file>` 在本地极速预览（自带热重载和状态面板），验证无误后用 `npx @roudanio/cli push <file>` 推送上线。

### 流程 B：远程 MCP 审查（无本地文件时）
1. 调用 MCP `getDsl({ gameId })` 拉取剧本正文。
2. 存为本地临时文件或在内存中根据上述铁律逐项核查。
3. 修复后**必须先执行 `setGameDsl({ gameId, content: fixedDsl, dryRun: true })`** 进行语法验证。
4. 确保保留剧本已有的图片素材与 `published: true` 发布状态后写入。

---

## 诊断报告标准模板

审查完成后，应向用户输出包含三部分的诊断报告：

```markdown
# 📋 《剧本名称》逻辑健康诊断报告

## 🚨 阻断性错误（必须修复才能上线）
1. [Scene: library_door] 悬空跳转：选项指向了不存在的场景 "secret_tunnel" (DANGLING_TARGET)
2. [Scene: battle_01] 死局隐患：所有选项均包含 if 条件，缺少无条件选项兜底 (DEAD_END)
3. [Scene: market] 语法错误：`(set: coins + 5)` 缺少赋值表达式，运行时静默失效 (INVALID_SET_SYNTAX)

## ⚠️ 体验性警告（建议优化）
1. [Scene: hidden_attic] 孤岛场景：该场景在剧情树中无任何入度 (ORPHAN_SCENE)
2. [Scene: hall] 未注册角色：出现了 "@wizard: ...", 但 ai.characters 中未注册 wizard (UNREGISTERED_CHARACTER)

## 📊 剧本健康度指标
- 校验引擎：@roudanio/cli v0.1.0 (AST Static Analysis)
- 总场景数：24
- 结局通路数：4（2 个 Good Ending，2 个 Bad Ending）
- 变量健康度：6 / 6 已正确声明
- 综合评级：B+（修复 3 项阻断错误后可达 A+）
```
