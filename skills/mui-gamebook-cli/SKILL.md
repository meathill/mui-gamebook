---
name: mui-gamebook-cli
description: Mui Gamebook 官方开发者 CLI 工具链（@roudanio/cli / mgb）使用指南：包含快速脚手架 init、编译器级静态语法与死局体检 validate、本地 Web 即时热预览 preview、云端同步 push、剧情分支拓扑图导出 graph 及 API Key 认证管理（login / whoami / logout）。当用户要在终端操作、调试互动小说剧本、运行自动化 CI 或管理云端同步时使用。
---

# Mui Gamebook CLI (`@roudanio/cli`) 开发者使用指南

> npm 官方包：`@roudanio/cli`（全局/本地命令短别名：`mgb` 或 `mui-gamebook`）
> 定位：为创作者和 AI Agent 提供**极速、确定性、0 幻觉**的本地互动小说开发与调试体验。

---

## 安装与快速调用

```bash
# 方式 1：免安装直接调用最新版（最推荐，CI 或临时环境首选）
npx @roudanio/cli <command>

# 方式 2：全局安装以使用极简短命令 mgb
npm install -g @roudanio/cli
mgb <command>

# 方式 3：作为项目 devDependency 安装
pnpm add -D @roudanio/cli
pnpm exec mgb <command>
```

---

## 核心命令手册

### 1. `mgb validate <file>` (别名: `lint`)
基于编译器 AST 执行静态语法与死局排查。无需依赖大模型，毫秒级得出确定性诊断结果。

```bash
# 常规校验（输出美化终端诊断信息）
mgb validate story.md

# 严格门禁模式（发现 warning 亦返回退出码 1，适合 Git Hooks 或 CI/CD）
mgb validate story.md --strict

# 输出结构化 JSON（供 Agent 或外部脚本自动化消费）
mgb validate story.md --json
```

**自动排查项：**
- `MISSING_START`：缺少必需的入口场景 `# start`。
- `DANGLING_TARGET`：选项或重定向指向了不存在的场景（避免 404）。
- `DEAD_END`：多条件选项场景缺少无条件选项兜底（防止玩家死锁卡关）。
- `UNDECLARED_VARIABLE`：在条件判断、数值操作或小游戏中使用了未在 `initialState` 初始化的变量。
- `INVALID_CONDITION_SYNTAX`：条件判断误写单等号（如 `level = 5`）。
- `INVALID_SET_SYNTAX`：数值修改缺少完整等式（如 `score + 10`）。
- `UNREGISTERED_CHARACTER`：场景对话出现了未在 `ai.characters` 注册的角色 `@speaker:`。
- `TEMPLATE_SYNTAX_ERROR`：`{{ variable }}` 插值或条件块未闭合。
- `ORPHAN_SCENE`：除 `start` 外没有任何入口指向的孤岛场景。

---

## 2. `mgb preview <file>` (别名: `dev`)
启动本地轻量 Web 播放服务器，实时边写边看。

```bash
# 启动本地预览（默认端口 3456）
mgb preview story.md

# 指定端口
mgb preview story.md --port 8080
```

**特性：**
- **SSE 极速热重载**：保存 Markdown 文件后，浏览器毫秒级无缝刷新。
- **内置 State 调试面板**：实时查看剧情变量数值流转与分支条件计算结果。
- **本地轻量级**：完全基于 Node 原生 `http` 模块构建，秒级启动。

---

## 3. `mgb push <file>` (别名: `sync`)
将本地编辑打磨好的剧本同步部署至云端（`https://muistory.com`）。

```bash
# 演练模式（仅做云端校验，不实际写库）
mgb push story.md --game <gameId> --dry-run

# 正式同步并保持发布状态
mgb push story.md --game <gameId> --publish

# 使用临时 API Key 覆盖本地凭证
mgb push story.md --game <gameId> --key "mgb_xxx"
```

**安全特性：**
- **前置静态拦截**：在向云端发送请求前，自动在本地执行 `validate` 校验；如果剧本存在严重阻断错误，直接就地拦截，避免破坏线上已运行游戏。
- **发布状态防护**：指定 `--publish` 时确保线上游戏公开可见，防止状态丢失。

---

## 4. 账号登录与认证 (`auth`)

```bash
# 登录：终端自动唤起浏览器打开 API Key 申请页，输入后验证并保存到 ~/.mgbrc
mgb login

# 查看当前认证状态与名下游戏
mgb whoami

# 退出登录：安全清理 ~/.mgbrc 中的凭证
mgb logout
```

**凭证读取优先级：**
1. 命令行参数 `--key`
2. 环境变量 `MGB_API_KEY`
3. 本地 `.env` 中的 `MGB_API_KEY`
4. 全局用户配置 `~/.mgbrc`

---

## 5. `mgb init [name]`
快速初始化一个规范的标准互动小说起步剧本。

```bash
# 生成默认 story.md
mgb init

# 生成指定文件名的剧本
mgb init my-adventure.md
```
模板内置了标准 frontmatter（含变量声明、角色卡、AI 生图配置）以及多分支场景范例。

---

## 6. `mgb graph <file>`
将剧本编译解析并导出为 Mermaid 流程拓扑图。

```bash
# 在终端打印 Mermaid 代码
mgb graph story.md

# 导出到指定文件
mgb graph story.md -o flow.mmd
```
导出的流程图自动高亮起点 `# start`（绿色）与全部结局节点（红色），便于宏观审视剧情结构。
