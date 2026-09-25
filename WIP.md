# WIP

## Skills 页面（已完成，待部署）

- 新增 `/skills`（列表）+ `/skills/setup`（MCP 配置）+ `/skills/create-game`（5 子 skill：世界观→角色→主线→分支→试玩后补媒体）
- 内容单源：`packages/app/src/lib/skills/`（setup.ts / create-game.ts / index 注册表），页面展示与 `/api/skills/[slug]/skill-md` 下载共用同一字符串
- setup 覆盖 OpenCode（`mcp` + `url`，备注 v2 的 `mcp.servers` 嵌套）与 Antigravity（`mcpServers` + `serverUrl`，`url` 会被忽略）；配置里只有 `<YOUR_API_KEY>` 占位符
- sitemap 加三条静态页；页脚加「AI 技能」链接（`prefetch={false}`）；中英 i18n `skills` 命名空间；静态预渲染 + `revalidate 3600`
- 测试 `tests/lib/skills-content.test.ts`（13 用例：frontmatter、客户端 schema、DSL 铁律落点、注册表、i18n key）；全量 170 文件 1358 用例绿，`next build` 通过

## 控制面板改名 + 用户自选 AI 模型（已完成，待部署）

- 「数据统计」「工作台」统一改名「控制面板」；新增左侧导航「设定」（`/my/settings`）
- 付费用户（有效订阅/管理员/root）可在设定页自选文本供应商 + 具体模型：openai/google/mimo/anthropic 走原厂通道，opencode 走聚合网关（预设 + 自定义输入）；免费用户锁定系统默认
- chat / generate-script / clarify-story 三个文本路由经 `resolveEffectiveTextSelection` 解析实际 provider+model，用量记录改存真实模型 ID（TODO 相应项已勾掉）
- 上线前跑一次迁移：`pnpm --filter @mui-gamebook/app run db:migrate:local`（或 `:remote`）执行 `0008_user_ai_model_preference.sql`（`user.preferred_text_provider/model`）

## 全模态自选模型：图片/语音/视频（已完成，待部署）

- root 可在设定页看到全部四个模态（文本/图片/语音/视频）并自选；图片与视频限 google/openai，TTS 为 mimo/google/openai
- 图片/语音/视频三节按 `ai_permissions` 服务位 gating：无对应权限时显示锁定态；免费用户全部锁定
- 生图（通用 + 角色）、TTS（通用 + 音色预览）、异步视频、小游戏（文本）六条路由全部接入用户偏好；`createAiProvider` 新增 image/tts/video 模型覆盖；MCP（mcp-agent）维持系统默认
- 上线前跑迁移 `0009_user_ai_media_preference.sql`（`user.preferred_image/tts/video_provider/model` 六列），local 与 remote 都要跑

## MCP 鉴权升级为 API Key

- 已实现 better-auth `@better-auth/api-key` + `/my/api-keys` + MCP Bearer 校验
- 待用户：部署生产 + `pnpm --filter @mui-gamebook/app run db:migrate:remote` + 在网页创建 key 写入 `.mimocode/mimocode.jsonc`

## 系统配置与权限体系重构（已完成，待部署）

代码、测试、构建均已完成（`pnpm test` 237 个文件全绿）。上线按顺序做：

1. **构建环境变量**：在部署/CI 的构建环境里设置 `NEXT_PUBLIC_ROOT_USER_EMAIL=<你的管理员邮箱>`（本地放 `.env`，见 `.env.example`）。这是**构建期**变量，会被内联进产物，改它要重新构建部署；`wrangler.jsonc` 里的 `ROOT_USER_EMAIL` 已删除，别再往 wrangler vars 里配。**必填**——漏配会让所有人（包括你自己）都进不了 `/admin`。
2. **迁移先于部署**：`pnpm --filter @mui-gamebook/app run db:migrate:local`（或 `:remote`）执行 `0006_user_admin.sql`（`user.is_admin`）与 `0007_game_shadow_ban.sql`（`Games.shadow_banned`）。现有查询 select 全列，列不存在会直接报错。
3. **部署后**：进 `/admin/config` 保存一次，让新的 STT 模型字段落进 KV 覆盖层。
4. **补数据**：原 `videoWhitelist`（KV）里的用户需要管理员在「用户管理」里逐个勾选视频权限——该字段已废弃删除。

### 本次改动清单

- STT：新增 MiMo ASR 选项与三个 provider 各自的模型字段（仅配置面，无运行时消费方）
- 管理员：root（`NEXT_PUBLIC_ROOT_USER_EMAIL` 单值） + 内容管理员（`user.is_admin`，可在用户管理里授予）；后台统计/游戏管理对内容管理员开放，用户管理与系统配置仍限 root
- 权限：`ai_permissions` 扩展为五个服务位，未显式配置时跟随订阅套餐（免费=文本，Pro=+生图/声音/音乐，Pro+=+视频）；TTS 补上门禁
- 清理：删除 KV 的 `videoWhitelist` 与 `adminUserIds`、系统配置页「访问控制」区块、死代码 `checkVideoGenerationPermission`
- 列表页：后台三个列表页支持排序与筛选，抽出 `useListQuery`/`PaginationBar`/`SortableHeader`
- Shadowban：游戏可被封禁，公开入口全部隐藏，作者经新增的 `/preview/[slug]` 预览
