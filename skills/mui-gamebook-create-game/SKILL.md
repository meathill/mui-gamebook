---
name: mui-gamebook-create-game
description: 从零创作互动小说（Gamebook）：通过 @roudanio/cli (mgb) 本地工具链与远程 MCP 双模驱动，涵盖世界观展开、角色设定、主线编写、变量分支与死局防范、本地 Web 即时热预览、媒体生成与一键云端发布。当用户说想从零做一款游戏、创作互动小说剧本时使用。
---

# Mui Gamebook 互动小说创作全流程指南

> CLI 工具：`@roudanio/cli`（短别名 `mgb`，已发布至 npm）
> 远程 MCP 端点：`https://muistory.com/api/mcp`
> 核心铁律：**文字先行、本地即时热预览、CLI 严查死局、媒体永远留在试玩定稿后**。

---

## 创作心法与五步工作流

```
[1. 世界观设定与起步]  →  mgb init 或 MCP createGame 创建本地 story.md
         ↓
[2. 角色卡与对白试读]  →  登记 ai.characters，mgb validate 防幽灵角色
         ↓
[3. 主线场景通宵跑通]  →  mgb preview 本地边写边看，确保一条主线走得通
         ↓
[4. 变量分支与死局排查] →  mgb validate --strict 严查死局，mgb graph 审视分支
         ↓
[5. 试玩定稿与补媒体发布] →  补插画音频，mgb push --publish 一键上线
```

---

## 第 1 步：世界观设定与项目初始化

### 目标
把用户的一句话创意展开为**世界观设定文档**，并生成可直接运行的剧本骨架。

### 流程与实操
1. **追问三要素**（一次性沟通）：
   - 题材与时代背景（科幻废土 / 古风修仙 / 现代悬疑 / 西幻冒险等）。
   - 主角身份与核心动机。
   - 基调（轻松欢脱 / 阴郁悬疑 / 燃系热血）与预设篇幅（短篇 5-8 场景 / 中篇 15-20 场景 / 长篇 30+ 场景）。
2. **初始化本地剧本**：
   ```bash
   # 快速生成标准互动起步模板（推荐）
   npx @roudanio/cli init story.md
   ```
   或如果已连接云端 MCP，可调用 `createGame({ title, slug })` 获取游戏 ID，再将生成的骨架存为本地 `story.md`。
3. **完成标准**：
   - 包含规范的 YAML frontmatter（含 `title`、`initialState`、`ai.characters`）。
   - 首场景严格命名为 `# start`。
   - 严禁在此步骤生成任何图片或音频。

---

## 第 2 步：角色设定与对白试读

### 目标
设计角色卡并写入 `ai.characters`，确保人设稳定、对白语气传神。

### 规范
- 角色 ID 使用英文 `snake_case`（如 `detective_lin`、`ai_eva`）。
- 每个角色必须包含：
  - `description`：角色性格、身世、说话口吻。
  - `image_prompt`：**极其稳定的外貌特征描述**（发色、瞳色、标志性服饰），供后续场景生图保持一致，不包含即时情绪或动作。
- 正文对白采用 `@角色ID: 对白内容` 格式。

### 自动化体检
```bash
npx @roudanio/cli validate story.md
```
CLI 自动排查场景正文中出现的 `@speaker:` 是否已在 `ai.characters` 中注册，防止出现无立绘、无设定的幽灵角色（`UNREGISTERED_CHARACTER`）。

---

## 第 3 步：主线剧情与本地热预览

### 目标
写出场景链与每场核心事件，确保从 `# start` 到至少一个结局的一条通路 100% 走得通。

### 本地即时预览（边写边看）
```bash
npx @roudanio/cli preview story.md
```
- 本地启动轻量 Web 播放服务器（`http://localhost:3456`）。
- **SSE 毫秒级热重载**：保存 Markdown 文件，浏览器自动无缝更新画面。
- 逐个走通主线场景，确认情节推进节奏与文字感染力。

---

## 第 4 步：变量系统、剧情分支与死局防范

### 目标
将线性剧情升级为**真正的多结局互动网状分支**：好感度、数值判定、背包道具、重定向。

### 分支语法标准
- 选项跳转：`* [选项文案] -> 目标场景 (if: 条件) (set: 变量 = 表达式)`
- 比较必须用双等号：`(if: key_found == true)`（严禁误写 `key_found = true`）。
- 赋值必须写完整等式：`(set: gold = gold + 50)`（严禁误写 `gold + 50`）。
- 块级自动重定向：`-> target_scene (if: hp <= 0)`

### 确定性死局防范（铁律）
- **无条件兜底铁律**：分支场景中，**必须保留至少一个不带 `(if: ...)` 条件的选项**！若所有选项均带条件，当玩家数值全不满足时，画面无路可走，直接死锁卡死。
- **运行 CLI 严格体检与分支图导出**：
  ```bash
  # 严格排查未声明变量与死局隐患
  npx @roudanio/cli validate story.md --strict

  # 导出 Mermaid 拓扑图，宏观审视所有支线与结局
  npx @roudanio/cli graph story.md -o branch.mmd
  ```
- **State 面板实时观测**：在 `mgb preview` 播放器中打开内置 State 面板，直观查看每一次选择对变量的变更与条件选项的动态解锁。

---

## 第 5 步：试玩定稿、素材补全与一键发布

### 目标
在剧情文字、分支与逻辑 100% 跑通后，再集中补全多媒体素材并上线。

### 流程
1. **生成插画**：
   - 优先级：封面图 > `# start` 首场景 > 关键高潮与结局场景。
   - 引用角色卡：在生图 prompt 中使用 `@角色ID`，系统自动合成稳定的外貌特征。
2. **挂接素材**：在场景标题下方首个 ````yaml 块中写入 `image: "url"`。
3. **一键同步部署**：
   ```bash
   # 推送至云端并保持 published 状态
   npx @roudanio/cli push story.md --game <gameId> --publish
   ```
   CLI 会自动执行前置体检，并在指定 `--publish` 时确保线上游戏公开可见，防止状态丢失出现 404。

---

## 常用开发命令速查

| 操作 | 命令 |
| :--- | :--- |
| **脚手架初始化** | `npx @roudanio/cli init [story.md]` |
| **本地即时预览** | `npx @roudanio/cli preview story.md` |
| **语法与死局体检** | `npx @roudanio/cli validate story.md --strict` |
| **导出剧情拓扑图** | `npx @roudanio/cli graph story.md` |
| **账号登录/查看** | `npx @roudanio/cli login` / `npx @roudanio/cli whoami` |
| **一键安全同步云端** | `npx @roudanio/cli push story.md --game <id> --publish` |
