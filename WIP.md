# WIP

当前无正在进行的短期任务。

## 已完成（2026-10-26）

- 清理已下线的 55 独立站点全部代码与文档痕迹：彻底移除 `sites/55`，更新 `vitest.config.ts`、`pnpm-lock.yaml`，清理 `site-common` 中的用例与文档（DEPLOYMENT.md, README.md, TESTING.md, TODO.md, docs/DSL_V2_DESIGN.md, DEV_NOTE.md），全量单测（2249 tests）与类型检查均绿。


## 已完成（2026-10-24）

- 管理后台：布局放宽到 100%；全站统计新增按天趋势图（recharts，新增 GameDailyAnalytics 表按 UTC 日记录打开/完成，支持上期对比）；用户管理展示 AI 用量（计费 token、图片/视频/音频次数）；游戏管理展示素材协助开关并支持筛选。
- 弹窗 + 基础组件统一迁移 coss ui，并强化素材协助邀请（4 个 commit，压平后）。
- 素材协助 MCP 拆分为 `/api/mcp/media-assistance` 专用端点，仅接受站方管理员（ADMIN_PASSWORD 或 is_admin 用户）；普通 `/api/mcp` 不再暴露协助工具。协议层抽到 `src/lib/mcp-route-core.ts` 共用。决策与端点说明见 `docs/media-assistance.md`。
