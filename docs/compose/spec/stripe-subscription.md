---
feature: stripe-subscription
status: delivered
updated: 2026-09-22
branch: feat/stripe-subscription
commits: ae998f8930657ba2d562fd78a4d5d36bd01f4c05..5ff9c0bc5579c05a83685b8347b3bbe316b2cfdc
---

# Stripe 订阅付款

## Report

**What was built** — Stripe 订阅：基础 $9.98/月 · $99.98/年 → 每月 1M M Token；专业 $19.98/月 · $199.98/年 → 每月 2M。年付同档月度包、约 17% 折扣，定价页默认推荐年付。额度按月窗扣减：月付对齐 Stripe 账单周期，年付按周期起点对齐自然月滚动（`getUsageWindow`）。免费档保留日额度。Checkout（`mode: subscription`，不传 `payment_method_types`）+ Customer Portal + Webhook 同步 D1。`/pricing` 三列套餐；`/my/billing` 周期用量条 + Portal。文案从「限时免费」改为免费档 + 订阅扩容。

**Verification** — `pnpm run format` PASS；`pnpm run typecheck` PASS；`pnpm test` PASS（1882+）；`pnpm --filter @mui-gamebook/app run build` PASS（`/pricing`、`/my/billing`）。独立 Review + 复审：critical 全清（年付月窗、webhook 空周期、T4 mock Stripe、T5 PricingClient UI 测试、残留文案）。

**Journey log** — 年付曾误用 Stripe 全年 period 对月包计数（偏紧 12×），复审改为自然月窗；Stripe 18 类型里周期在 subscription item；`monthlyTokenLimit` 仅插入时写入以保改价不影响已购；多 CTA 按钮测试用 `getAllByRole`。

## [S1] Problem

平台已有 M Token 成本核算与全局日额度，但没有真实收款能力。首页长期宣传「AI 限时免费」，无法把 AI 创作算力转化为收入，也无法按套餐给付费用户更高、可预期的月度额度。需要接入 Stripe 订阅：两档套餐、月/年付，默认推荐年付，并把订阅状态接到现有用量闸门上。

## [S2] Design

### 产品口径（已拍板）

| 档位 | 对外名 | 月付 | 年付 | 月度 M Token 包 | 重置 |
|------|--------|------|------|-----------------|------|
| Free | 免费 | $0 | — | 维持全局日额度（默认 100,000 / 日，`DAILY_TOKEN_LIMIT`） | 每日 UTC |
| Basic | 基础 | $9.98 | $99.98 | 1,000,000 | 账单周期按月 |
| Pro | 专业 | $19.98 | $199.98 | 2,000,000 | 账单周期按月 |

- **计价单位**：继续使用现有 M Token（`packages/core/lib/pricing.ts`：$1 成本 = 1,000,000 billed tokens）。不改 `calculateBilledTokens` 换算。
- **套餐兑换展示价**：$0.00001 / Token（标价 ÷ 单价 = 面值 Token 数）。Basic 月 $9.98 → 998k≈1M；Pro 月 $19.98 → 2.0M。实现上额度取整为 1M / 2M，与展示一致。
- **年付**：与同档月付 **相同的月度包**，按年扣费（约 17% 折扣）。**不额外加量**。
- **默认推荐年付**：定价页周期切换默认 `annual`，年付卡片标「推荐 / 省 17%」。
- **免费档**：保留日额度，可试用；不强制付费。首页/FAQ「限时免费」文案改为 freemium + 订阅口径。
- **档位差异**：v1 **只差 Token 额度**。`ai_permissions` / `videoWhitelist` / 管理员不限量逻辑不动。
- **管理员**：`config.adminUserIds` 与 `ROOT_USER_EMAIL` 继续不限量。

容量交叉验算（写文案用，证明不是拍脑门；默认文本 DeepSeek flash 综合约 $0.70 / 1M raw，MiMo pro 约 $0.23 / 1M raw）：

- 1M M Token ≈ $1 模型成本 ≈ 1.4M DeepSeek raw tokens ≈ 4.3M MiMo pro raw tokens
- ≈ 33 张图（$0.03/张）或 ≈ 2.8 条短视频（$0.35/条）
- 2M M Token 同理 ×2

### Stripe 集成契约

按 Stripe Billing + Checkout + Customer Portal（API version `2026-04-22.dahlia`，SDK 用最新）：

1. **商品/价格**：Dashboard 建 Product×4 Price（basic-monthly / basic-yearly / pro-monthly / pro-yearly）。**不用废弃的 `plan` 对象**。Price ID 经 Workers vars / KV 配置注入，代码不写死。
2. **Checkout**：`checkout.sessions.create({ mode: 'subscription', line_items: [{ price, quantity: 1 }], ... })`。**禁止传 `payment_method_types`**（动态支付方式）。`client_reference_id` = 本地 `userId`；`metadata.userId` 同步写入。`success_url` → `/my/billing?checkout=success`，`cancel_url` → `/pricing`。
3. **Customer Portal**：自助管理续订/取消/支付方式。`portal.sessions.create`，return_url → `/my/billing`。
4. **Webhook**（`POST /api/stripe/webhook`，校验 `stripe-signature`，用原始 body）：
   - `checkout.session.completed` → upsert customer 映射 + 激活订阅
   - `customer.subscription.created|updated|deleted` → 同步订阅状态/周期/price
   - `invoice.paid` / `invoice.payment_failed` → 记日志；失败依赖 subscription status 落到 `past_due`/`canceled`
5. **密钥**：推荐 Restricted API Key（`rk_`）。Secrets：`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`。Vars：四个 `STRIPE_PRICE_*`。
6. **幂等**：webhook 按 `event.id` 去重（D1 表或至少按 subscription id upsert）。Checkout 成功页不以 redirect 为权威，以 webhook 后的 D1 状态为准；页面可展示「处理中」。

### 数据模型（D1 migration）

```text
stripe_customers
  id, user_id (unique → user.id), stripe_customer_id (unique), created_at

subscriptions
  id, user_id, stripe_subscription_id (unique),
  stripe_customer_id, stripe_price_id,
  plan_code ('basic' | 'pro'), interval ('month' | 'year'),
  status ('trialing'|'active'|'past_due'|'canceled'|'incomplete'|'unpaid'|'paused'),
  monthly_token_limit,          -- 下发时快照，避免改价影响已购用户
  current_period_start, current_period_end,  -- timestamp
  cancel_at_period_end (bool),
  created_at, updated_at
```

索引：`subscriptions(user_id)`、`subscriptions(stripe_subscription_id)`、`subscriptions(status)`。

### 用量闸门改造

`checkUserUsageLimit(userId)` 优先级：

1. `adminUserIds` → 不限量（现状）
2. 存在 `status ∈ {active, trialing}` 的订阅 → 统计 **当前账单周期** `SUM(AiUsage.totalTokens)`，与 `monthly_token_limit` 比较
3. 否则 → 现状免费日额度

`past_due`：宽限至 `current_period_end` 前仍按原额度，过后回落免费档（Spec 明确：不做单独催收 UI，靠 Stripe dunning）。

新增/调整 API：

| 路由 | 作用 |
|------|------|
| `GET /api/user/usage` | 扩展返回 `planCode`、`periodStart/End`、`periodUsage`、`periodLimit`、`isSubscribed` |
| `POST /api/stripe/checkout` | body `{ planCode, interval }` → 创建 Checkout Session，返回 `url` |
| `POST /api/stripe/portal` | 创建 Billing Portal Session，返回 `url` |
| `POST /api/stripe/webhook` | Stripe webhook |
| `GET /api/user/subscription` | 当前订阅摘要（供 `/my/billing`） |

### UI

- **`/pricing`**（公开，进 sitemap）：三列 Free / 基础 / 专业；月付|年付切换默认年付；年付标推荐；未登录点订阅 → 先登录再回 `/pricing`；已登录 → Checkout。文案用上节容量口径，删除「限时免费」表述。
- **`/my/billing`**（登录）：当前套餐、周期用量条（periodUsage/periodLimit）、续费日、`管理订阅`（Portal）、免费档则展示升级 CTA。
- **`MyNav`** 增加「订阅账单」入口。
- 首页/FAQ/`AiCreationInfographic`/`HeroSection` 等「限时免费」改为「免费开始 + 订阅解锁更高额度」。i18n：`zh.json` / `en.json` 同步。

### 错误与边界

- Checkout/Portal 未配 Price ID 或 secret → 500 带可读中文错误（部署检查项）。
- Webhook 验签失败 → 400。
- 重复 webhook → 200 幂等。
- 用户已有 active 订阅再点 Checkout → 先引导 Portal 升级/改期；v1 **不做**站内档位切换，只允许「新购」和 Portal 内由 Stripe 配置允许的更新（若 Dashboard 未开升级，则取消后重订）。
- 同一用户多条订阅行：以 `stripe_subscription_id` 最新且 status 有效的一条为准；历史 `canceled` 保留。

### 测试边界

- `pricing` 换算与套餐面值常量（1M/2M）
- `checkUserUsageLimit`：管理员 / 有效订阅周期用量 / 免费日额度 / past_due 宽限 / 超限拒绝
- webhook 处理：签名校验失败、幂等、subscription upsert 字段映射
- checkout API：参数校验、已订阅拒绝或引导
- UI：定价页默认年付、billing 页展示（RTL，轻量）

## [S3] Out of Scope

- 不改 M Token 定义与 `calculateBilledTokens`
- 年付加量、按量计费 overage、一次性 token 包
- 团队席位 / Connect 分账 / Stripe Tax 复杂税则
- 站内档位升降级 UI（交给 Customer Portal）
- 按功能门禁（视频白名单、生图权限）与订阅绑定
- 免费档额度数值调整（保持 `DAILY_TOKEN_LIMIT` 机制）
- 真实 Stripe 账号开号与产品创建（文档写清步骤，由维护者在 Dashboard 完成）

## Tasks

- [x] T1: D1 schema + migration（`stripe_customers` / `subscriptions`）— acceptance: 本地 `db:migrate:local` 成功，drizzle schema 同步 (covers: S2)
- [x] T2: `lib/billing.ts` 套餐常量、订阅读写、周期用量查询 — acceptance: 单测覆盖套餐额度与 active 订阅解析 (covers: S2; depends: T1)
- [x] T3: 改造 `checkUserUsageLimit` / `GET /api/user/usage` 走订阅月包 — acceptance: 既有 usage 测试更新后通过，订阅用户按周期额度拦截 (covers: S2; depends: T2)
- [x] T4: Stripe client + Checkout/Portal/Subscription/Webhook API — acceptance: 单测（mock Stripe）覆盖创建 session 与 webhook upsert/幂等；不传 `payment_method_types` (covers: S2; depends: T2)
- [x] T5: `/pricing` + `/my/billing` + MyNav + 文案去「限时免费」— acceptance: 页面渲染、默认年付、登录/未登录 CTA 分支正确 (covers: S2; depends: T3, T4)
- [x] T6: 部署配置说明写入 `DEPLOYMENT.md`（Price ID、secrets、webhook URL）+ 回归 format/typecheck/test/build — acceptance: 文档步骤完整；`pnpm run format && pnpm run typecheck && pnpm test` 与 app build 通过 (covers: S2; depends: T5)
