# MUI Gamebook Cron Worker

独立的 Cloudflare Worker，用于处理定时任务。

## 功能

- **统计数据同步**：每 15 分钟从 KV 同步数据到 D1 数据库

## 部署

```bash
# 安装依赖
pnpm install

# 设置 CRON_SECRET（需要与主应用一致）
wrangler secret put CRON_SECRET

# 部署
pnpm deploy
```

## 开发

```bash
# 本地开发
pnpm dev

# 手动触发同步
curl http://localhost:8787/sync-analytics
```

## 添加新任务

在 `src/index.ts` 的 `scheduled` handler 中添加新的任务调用。
