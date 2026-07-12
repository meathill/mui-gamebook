# DEPLOYMENT

所有可独立部署的单元都基于 [OpenNext](https://opennext.js.org/cloudflare)（Next.js 应用）或原生 Wrangler（Worker），部署到 Cloudflare Workers。每个单元都有自己的 `wrangler.jsonc`，账号 ID 相同（同一个 Cloudflare 账号下的不同 Worker）。

## 可部署单元一览

| 单元 | 目录 | Worker 名称 | 说明 |
|---|---|---|---|
| 主站（创作平台/CMS） | `packages/app` | `mui-gamebook` | MuiStory 品牌，创作者写作、AI 生成、管理后台，也是游戏播放的默认站点 |
| 主站（Headless 模式） | `packages/app`（`wrangler-jianjian.jsonc`） | `xiaoniaoshuo-admin` | 同一套代码，以 headless 模式部署为"小鸟说"品牌的管理后台，独立的 D1/KV/R2 |
| 小鸟说读者站 | `sites/jianjian` | `xiaoniaoshuo` | 面向读者的独立站点，KV 与 `xiaoniaoshuo-admin` 共享同一个 namespace |
| 55 站点 | `sites/55` | `muistory-55` | 视觉小说风格的独立站点 |
| 定时任务 | `packages/cronjob` | `mui-gamebook-cronjob` | 每 15 分钟触发一次，通过 Service Binding 调用主站 |

## 部署命令

在对应目录下执行：

```bash
pnpm run deploy    # 构建并直接发布为线上版本
pnpm run upload     # 构建并上传为一个新版本，不自动切流量（Cloudflare 的 gradual/版本化部署）
```

`packages/app` 的 `deploy` 脚本会先把 `docs/DSL_SPEC.md` 复制到 `public/`（供站内文档页面引用，发布后仍固定在 `/DSL_SPEC.md` 这个 URL），再走 OpenNext 构建 + 发布：

```json
"deploy": "cp ../../docs/DSL_SPEC.md ./public && opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

`packages/cronjob` 是纯 Worker（没有 Next.js/OpenNext），直接 `wrangler deploy`。

**Headless 模式（`xiaoniaoshuo-admin`）的部署命令未在本次维护中验证**——`wrangler-jianjian.jsonc` 确认存在且配置完整，但 `package.json` 里没有对应的脚本，大概率是手动传 `--config wrangler-jianjian.jsonc` 触发，具体命令请找了解这部分历史的人确认后再补充到这里。

## 环境变量与 Secrets

- `wrangler.jsonc` 里的 `vars` 字段是**非敏感**配置（模型名称、公开域名等），直接明文提交
- 敏感值（API Key、数据库密码等）通过 `wrangler secret put <NAME>` 单独设置，不出现在任何提交的文件里
- `wrangler.jsonc` 的 `secrets.required` 字段只声明 secret 的**名单**（不含真实值），这样 `wrangler types` 才能在没有本机 `.dev.vars` 的情况下也生成正确的类型；新增一个 secret 时记得同步更新这个列表
- `NEXT_PUBLIC_*` 变量比较特殊：它们在构建期被 Next.js 静态替换进产物，Workers 运行时的 env 绑定对它们不起作用；部署前要确保构建环境（本地 `.env` 或 CI 变量）里已经填好，参考 `.env.example`

## 数据库迁移

```bash
cd packages/app
pnpm run db:migrate:local    # 本地 D1
pnpm run db:migrate:remote   # 远程 D1，谨慎执行
```

## Cloudflare 绑定类型

部署前如果改过 `wrangler.jsonc` 的绑定（新增 D1/KV/R2 等），记得重新生成类型声明：

```bash
pnpm run cf-typegen
```

详见 [TESTING.md](TESTING.md) 里关于 `cloudflare-env.d.ts` 的说明。
