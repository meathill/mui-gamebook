# MUI Gamebook：AI 驱动的互动小说平台

## 项目概览

MUI Gamebook 是一个创新的平台，旨在创建、游玩和分发由 AI 辅助的互动小说游戏（也常被称为视觉小说或文字冒险游戏）。它利用一种类似 Markdown 的自定义领域特定语言（DSL），为故事创作者和玩家提供一个强大而直观的生态系统。

## 产品设计：四大核心模块

我们为 MUI Gamebook 平台规划的产品愿景围绕四个互相关联的模块构建：

### 1. 游戏语言基础

平台的核心是建立在一种自定义的领域特定语言（DSL）之上。这种语言利用扩展的 Markdown 语法，允许作者定义游戏流程、叙事文本、图片、音频、视频、选项以及管理全局游戏状态。它还包含了用于指导 AI 内容生成的专用语法，作为故事及其多媒体资源的“蓝图”。

### 2. 直观的游戏编辑器（GUI）

为了赋能创作者，我们将开发一个用户友好的图形用户界面（GUI）编辑器。该编辑器将使作家和游戏设计师能够使用我们的 DSL 快速撰写、编辑和预览游戏故事。GUI 将提供可视化工具来管理场景、选项、状态和 AI 生成参数，从而极大地简化创作流程，让非程序员也能轻松参与游戏开发。

### 3. AI 辅助内容生成与人工策划

一个关键模块将专注于利用人工智能将现有的文学作品或原始故事构思转化为可玩的游戏。这包括使用 AI 来解读叙事并将其翻译成我们的 DSL，同时生成必要的图片、音频和动画。在 AI 生成之后，人类编辑将在策划、优化和完善 AI 制作的内容方面发挥至关重要的作用，以确保高质量、引人入胜且充满乐趣的游戏体验。

### 4. 可部署的独立游戏包

最后，平台将支持已完成游戏的分发。作者能够将他们的互动故事导出为简单、独立且易于部署的单机游戏包。然后，这些游戏包可以通过网站或其他平台进行分发，让玩家无需复杂的安装或设置即可享受这些由 AI 增强的互动小说。

## 用户系统初始化

本项目采用邀请制用户系统。在部署后（或本地开发首次运行时），你需要手动初始化第一个管理员账户。

### 1. 配置环境变量

确保你的 `.env` 文件（本地）或 Cloudflare Pages 环境变量配置了以下项：

```bash
ADMIN_SECRET="your-secure-admin-secret"
NEXT_PUBLIC_SITE_URL="http://localhost:3000" # 本地开发
# NEXT_PUBLIC_SITE_URL="https://your-production-domain.com" # 生产环境
BETTER_AUTH_SECRET="random-string-for-session-encryption"
```

### 2. 创建首个管理员

使用 `curl` 命令调用 API 创建用户：

```bash
curl -X POST http://localhost:3000/api/admin/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secure-admin-secret" \
  -d '{"email": "admin@example.com", "password": "yourpassword", "name": "Admin"}'
```

创建成功后，你就可以访问 `/sign-in` 使用该账号登录，并通过 `/admin` 页面邀请更多用户。