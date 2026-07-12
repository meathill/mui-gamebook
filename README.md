# MUI Gamebook：AI 驱动的互动小说平台

## 项目概览

MUI Gamebook 是一个创新的平台，旨在创建、游玩和分发由 AI 辅助的互动小说游戏（也常被称为视觉小说或文字冒险游戏）。它利用一种类似 Markdown 的自定义领域特定语言（DSL），为故事创作者和玩家提供一个强大而直观的生态系统。

**在线体验**: [muistory.com](https://muistory.com)

## 核心功能

### 🎨 AI 辅助创作
- **零代码门槛**：用自然语言描述创意，AI 自动生成完整剧本
- **AI Chatbot 全天候辅助**：24 小时智能助手，随时优化剧情、修改细节
- **多模型支持**：GPT-4、Gemini 等主流模型

### 🎮 丰富的互动体验
- **变量系统**：好感度、物品、属性等多种变量类型，创造真正的分支剧情
- **小游戏嵌入**：AI 自动生成互动小游戏（解谜、战斗等）
- **多媒体支持**：AI 生成图片、语音，打造沉浸式阅读体验

### 🌐 跨平台发布
- **一键发布到 Web**：响应式设计适配各种设备
- **PWA 支持**：像原生 App 一样使用
- **云端存储**：游戏进度跨设备同步

## 页面结构

| 路径 | 描述 |
|------|------|
| `/` | 首页：展示最新游戏、小游戏、产品特色和 FAQ |
| `/games` | 全部剧本列表，支持分页 |
| `/minigames` | 小游戏列表，支持分页 |
| `/minigames/[id]` | 小游戏详情和试玩 |
| `/play/[slug]` | 游戏详情和播放页面 |
| `/about` | 关于我们：核心功能、技术栈介绍 |
| `/admin` | 管理后台入口 |
| `/sign-in` | 登录页面 |

## 技术栈

### 前端
- **Next.js 16** + React 19
- **Tailwind CSS** + Radix UI
- **next-intl** 国际化

### 后端
- **Cloudflare Workers** + **D1 数据库**
- **Better-Auth** 认证
- **Drizzle ORM**

### AI 集成
- 图像生成：DALL-E、Stable Diffusion、Gemini
- 文本生成：OpenAI GPT-4、Google Gemini
- 语音合成：Azure TTS

### 工具链
- **@mui-gamebook/parser**：DSL 解析器
- **@mui-gamebook/asset-generator**：素材批量生成

## 产品设计：四大核心模块

### 1. 游戏语言基础
平台的核心是建立在一种自定义的领域特定语言（DSL）之上。这种语言利用扩展的 Markdown 语法，允许作者定义游戏流程、叙事文本、图片、音频、视频、选项以及管理全局游戏状态。

### 2. 直观的游戏编辑器（GUI）
用户友好的图形用户界面（GUI）编辑器。可视化工具管理场景、选项、状态和 AI 生成参数，让非程序员也能轻松参与游戏开发。

### 3. AI 辅助内容生成与人工策划
利用人工智能将现有的文学作品或原始故事构思转化为可玩的游戏。AI 生成之后，人类编辑将策划、优化和完善 AI 制作的内容。

### 4. 可部署的独立游戏包
将已完成游戏导出为简单、独立且易于部署的单机游戏包。

## 开发环境设置

本项目完全基于 Cloudflare D1 数据库运行。

### 1. 安装依赖

```bash
pnpm install
```

### 2. 数据库初始化

```bash
# 创建数据库（如果尚未创建）
# wrangler d1 create mui-gamebook

# 执行 Schema 迁移
pnpm --filter=@mui-gamebook/app exec drizzle-kit generate
wrangler d1 execute mui-gamebook --file=packages/app/migrations/0000_loose_doorman.sql
wrangler d1 execute mui-gamebook --file=packages/app/migrations/0001_init.sql
```

### 3. 本地开发

```bash
pnpm dev
```

### 4. 用户系统初始化

本项目采用邀请制用户系统。首次运行时需要手动初始化管理员账户：

```bash
curl -X POST http://localhost:3000/api/admin/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secure-admin-secret" \
  -d '{"email": "admin@example.com", "password": "yourpassword", "name": "Admin"}'
```

## 小游戏系统

平台支持在游戏场景中嵌入互动小游戏。

**特点：**
- 由 AI 自动生成简单的 JavaScript 小游戏
- 支持点击、记忆、反应等多种游戏类型
- 小游戏可读取和修改游戏变量
- 根据小游戏结果跳转到不同场景

**DSL 语法示例：**

```markdown
# quidditch_match

魁地奇比赛开始了！

\`\`\`yaml
minigame:
  prompt: 创建一个点击金色飞贼的游戏，10秒内点击10次即可获胜
  variables:
    snitch_caught: 捕获的飞贼数量
\`\`\`

* [查看结果] -> win (if: snitch_caught >= 10)
* [查看结果] -> lose (if: snitch_caught < 10)
```

详细的 DSL 规范请参阅 [DSL_SPEC.md](./docs/DSL_SPEC.md)。

## IP 版权保护 (Story Protocol)

平台集成了 Story Protocol，允许创作者将作品注册为区块链上的 IP Asset。

**特点：**
- 在区块链上永久记录作品版权
- 自动铸造代表作品的 NFT
- 元数据存储在 IPFS 上

**环境变量配置：**

```bash
STORY_PRIVATE_KEY=0x...
PINATA_JWT=eyJ...
```

## 运行测试

```bash
pnpm test
```

## 构建

```bash
pnpm build
```

## 许可证

MIT
