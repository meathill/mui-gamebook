---
name: mui-gamebook-mcp
description: 通过 MCP 操作 Mui Gamebook（姆伊游戏书）的剧本：列出/创建游戏、读写 DSL、AI 生成剧本与图片。当用户要求编辑游戏剧本、写互动小说、生成游戏书内容、发布/管理 muistory 游戏时使用。
---

# Mui Gamebook MCP

本地 Agent 通过远程 MCP `mui-gamebook` 连接生产端点 `https://muistory.com/api/mcp`。

## 前置

1. 登录 muistory.com → 工作台 → **API 密钥** → 创建（如 `mui-gamebook-mcp`），**立刻复制完整 key**（只显示一次）。
2. 把项目根 `.mimocode/mimocode.jsonc` 里 `Authorization` 写成 `Bearer <刚才的 key>`（不要用 ADMIN_PASSWORD）。
3. **代码必须已部署**（dual-era MCP + Agent 工具 + better-auth apiKey）。未部署前连接会失败。
4. 新开对话或 `/mcps` 确认 `mui-gamebook`。请求超时 120s。

鉴权说明：API Key 绑定你的账号，只能管理**你的**游戏，AI 用量也记在你头上；可在「API 密钥」页随时吊销。`ADMIN_PASSWORD` 仅遗留脚本可用。

## 推荐工作流

1. `listGames` — 看有哪些可管理游戏（Bearer 管理员可列全部）。
2. 没有目标游戏时 `createGame`（`title` 必填；可选 `content`/`description`/`ownerId`）。
3. `getGameInfo` — 拿 slug、场景列表、角色、变量。
4. 写大纲 → `generateScript`（`gameId`+`story`，先 `dryRun: true` 预览，满意再去掉 dryRun 落库）。
5. 局部修改用细粒度工具：
   - `updateSceneText` / `updateScene` / `addScene` / `deleteScene`
   - `addChoice` / `updateChoiceText` / `deleteChoice`
   - `addVariable` / `updateVariable` / `addCharacter` / `addDialogueLine`
   - `getDsl` 读全文；`listScenes` 看场景 id
6. 元数据/发布：`updateGameMeta`（`published: true` 发布）。
7. 整篇替换：`setGameDsl`（先 `dryRun: true` 校验）。
8. 素材：`generateImage`，或 Agent 自生成后 `uploadAsset`（base64/data URL）→ `setSceneImage` / `updateCharacter imageUrl`。
9. 整篇重写才用 `setGameDsl`。删测试游戏用 `deleteGame`（`confirm: true`）。

### 从零做一款新游戏

1. `createGame`（title）
2. `generateScript`（story，先 `dryRun: true`）→ 满意后落库
3. 细粒度改文案/选项/变量/角色
4. `generateImage` + `setSceneImage` / `updateCharacter imageUrl` 补图
5. `updateGameMeta`（`published: true`）发布，播放页 `/play/<slug>`

## 鉴权与注意

- 每次 `tools/call` 都需要鉴权；配置里的 Bearer 应是 **API Key**（`mgb_` 前缀），不是 ADMIN_PASSWORD。
- API Key / session 用户只能改自己的游戏；AI 记账挂在真实用户。
- 写操作与 `gameId` 绑定；建议 AI 生成先 `dryRun: true`。
- DSL 规则：第一场景必须 `# start`；选项 `* [文案] -> 场景ID (if: ...) (set: var = expr)`；角色对话 `@角色id: 台词`；frontmatter 需 `state` 与 `ai.characters`（`generateScript` 会自动校验并尝试纠错）。
- 协议：端点 dual-era——本机 MiMoCode 走 legacy `initialize` 即可；不强制 2026-07-28 header。

## 工具速查

| 工具 | 用途 |
|------|------|
| listGames | 列游戏 |
| createGame | 建游戏 |
| getGameInfo | 元信息+场景概览 |
| getDsl / listScenes | 读剧本 |
| updateSceneText 等 | 细粒度改剧本 |
| setGameDsl | 整篇替换 |
| updateGameMeta | 标题/发布等 |
| generateScript | AI 生成/修订剧本 |
| generateImage | AI 生图 |
| uploadAsset | 上传图/音/视频 |
| setSceneImage | 场景图挂 URL/prompt |
| deleteGame | 删除游戏 |

细节以 `tools/list` 返回的 inputSchema 为准。
