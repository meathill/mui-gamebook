# WIP

## OTP 登录 + 用户封禁 + NSFW 发布审查

背景：发现用户创建 NSFW 内容。用邮箱 OTP 替换密码登录（邮箱可达 = 可封禁锚点），补用户封禁能力，发布动作加内容审查。决策：OTP 完全替换密码但 root 保留密码后门；管理员手动上架跳过审查；图片 vision 审查/举报功能/一次性邮箱域名黑名单列为后续 TODO。

### 阶段 1：用户封禁

- [x] 0016_user_ban.sql 迁移（banned / banned_at / ban_reason）
- [x] schema.ts user 表补字段
- [x] admin users PUT 支持 banned（root+admin 可操作，禁封 root，级联清 session，可选 shadowban 其游戏）
- [x] UsersTable/UserFormModal 封禁 UI，移除重置密码入口与 password 路由

### 阶段 2：OTP 登录

- [x] auth-config.ts：emailOTP 插件（发码回调含 banned 拦截）、hooks.before 拦截密码登录（仅 root 放行）、rateLimit（database）、移除 sendResetPassword / sendOnSignUp
- [x] databaseHooks.session.create.before 封禁兜底
- [x] auth-client.ts 注册 emailOTPClient
- [x] sign-in 页面改 OTP 两步表单（管理员密码入口保留），GA4 统一 trackLogin
- [x] i18n zh/en auth 段重写；invite 接口兼容确认

### 阶段 3：NSFW 发布审查

- [x] content-moderation.ts：违禁词快筛 + LLM 审查（JSON verdict，fail-open）
- [x] 接入 PUT /api/cms/games/[id]（发布跃迁 / 已发布改文）与 MCP updateGameMeta
- [x] POST /api/admin/games/[slug]/moderate + admin 列表审查按钮 + scripts/audit-published-games.ts

### 阶段 4：回归与收尾

- [x] vitest：审查逻辑单测 + 封禁 API 测试
- [x] TODO.md 补后续项；DEV_NOTE.md 记 emailOTP 集成要点
- [x] format / typecheck / build / 本地迁移 + 冒烟
- [x] 分阶段提交（封禁 / OTP / 审查）后压平
