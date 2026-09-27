# @roudanio/cli (mgb)

> 🎮 互动小说创作者与本地 AI Agent 的确定性开发工具箱。  
> 0 幻觉、毫秒级响应、本地离线支持，为你的互动故事提供语法校验、死局体检、实时预览与云端同步。

---

## 快速上手

无需全局安装，直接通过 `npx` 即可调用：

```bash
# 1. 登录 muistory.com 账号（可选，若需要云端同步）
npx @roudanio/cli login

# 2. 初始化起步互动小说模板
npx @roudanio/cli init my-story.md

# 3. 启动本地热重载 Web 预览服务器
npx @roudanio/cli preview my-story.md

# 4. 深度校验剧本语法、未声明变量与死局隐患
npx @roudanio/cli validate my-story.md

# 5. 导出分支路线与结局的 Mermaid 流程图
npx @roudanio/cli graph my-story.md

# 6. 一键推送到云端 muistory.com
npx @roudanio/cli push my-story.md
```

也可以全局安装获得 `mgb` 极简短命令：

```bash
npm install -g @roudanio/cli
# 或
pnpm add -g @roudanio/cli

# 使用 mgb 命令
mgb --help
```

---

## 核心命令与功能

### 1. 剧本静态逻辑体检 (`mgb validate` / `mgb lint`)
大模型擅长写剧情，但极易数漏场景、写错变量或产生玩家死局。`mgb validate` 基于真实的编译器 AST，10 毫秒内给出 100% 确定性的诊断：

- **首场景检查**：检查是否存在必需的 `# start` 入口。
- **悬空引用排查**：杜绝选项或重定向指向不存在的场景。
- **死局卡关拦截**：带条件的选项分支必须包含无条件选项兜底，防止条件不满足时玩家卡死。
- **孤岛场景分析**：分析除 start 外无入度的孤立场景。
- **变量与文法审计**：使用 AST 检查 `(if:)` / `(set:)` / `{{ variable }}` 中使用的变量是否在 `initialState` 声明，检查 `=` 与 `==` 语法。
- **角色一致性**：检查对白行 `@角色ID:` 是否在 `ai.characters` 字典注册。

```bash
# 标准彩色终端输出
mgb validate story.md

# 严格模式：任何警告均以退出码 1 退出（适合 CI 门禁 / git commit hook）
mgb validate story.md --strict

# 输出结构化 JSON（供脚本、CI 或 AI Agent 消费）
mgb validate story.md --json
```

### 2. 本地即时预览与调试器 (`mgb preview` / `mgb dev`)
启动本地轻量 Web 服务，在浏览器中一边写 Markdown 一边交互式游玩：

- **文件热重载**：保存 Markdown 瞬间，通过 SSE 无刷新推送最新剧情。
- **变量调试面板**：实时查看当前 state 变量，支持随时重置或跳转任意场景。
- **纯离线运行**：零外部 CDN 依赖，断网也能畅快创作。

```bash
mgb preview story.md
# 指定端口
mgb preview story.md --port 8080
```

### 3. 账号登录与凭证管理 (`mgb login` / `mgb whoami` / `mgb logout`)
无需每次手动配置环境变量，一次登录，全命令免密自动鉴权：

```bash
# 交互式登录：自动在浏览器中唤起 API Key 创建页，粘贴即可自动校验并持久化
mgb login

# 查看当前登录状态、有效性及名下在线作品列表
mgb whoami

# 退出登录并清除本地存储的凭证
mgb logout
```

### 4. 云端一键同步 (`mgb push` / `mgb sync`)
配合你的 [muistory.com](https://muistory.com) API 密钥，直接通过远程 MCP 协议与云端双向同步：

```bash
# 本地先体检，通过后自动推送到云端对应游戏（已登录状态无需传入任何 key）
mgb push story.md

# 也可以通过环境变量指定
export MGB_API_KEY="mgb_xxxxxxxxxxxxxxxx"

# 本地先体检，通过后自动推送到云端对应游戏
mgb push story.md

# 安全预检模式：仅在云端进行 dryRun 校验，不实际写库
mgb push story.md --dry-run

# 指定游戏 ID 与自动发布
mgb push story.md --game 123 --publish
```

### 4. 模板脚手架 (`mgb init`)
快速在本地生成规范的起步剧本，包含合规的 frontmatter、标准入口、分支示例与变量变更：

```bash
mgb init novel.md
```

### 5. 剧情流转拓扑图 (`mgb graph`)
将复杂多分支剧情导出为 GitHub / VSCode / Obsidian 原生支持的 Mermaid 流程图代码：

```bash
# 在终端输出 Mermaid 语法
mgb graph story.md

# 导出到文件
mgb graph story.md -o story-flow.mmd
```

---

## 配合本地 AI Agent (最佳实践)

可以让本地 AI Agent（如 Claude Code、OpenCode、Antigravity）协同工作：
1. 让 Agent 为你的 `story.md` 扩写一段剧情分支。
2. 扩写完成后，让 Agent 在终端运行 `mgb validate story.md --json`。
3. Agent 读取 0 幻觉的客观诊断报错，精准修复，实现 100% 质量闭环！

---

## License

MIT © [Meathill](https://github.com/meathill)
