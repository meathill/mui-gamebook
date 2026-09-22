---
feature: mcp-stateless-2026-07-28
status: delivered
updated: 2026-09-21
branch: master
commits: cd8155c..working-tree
---

# MCP 对齐 2026-07-28 无状态规范

## Report

**What was built** — `POST /api/mcp` 从 legacy 握手式 MCP（2025-03-26，cookie session）升级为 **MCP 2026-07-28 无状态 Streamable HTTP**：去掉 `initialize`/`ping`，每请求要求 `MCP-Protocol-Version` + `Mcp-Method`（`tools/call` 另需 `Mcp-Name`）与 body `_meta`；实现 `server/discover` / `tools/list` / `tools/call`；鉴权 per-request（Bearer `ADMIN_PASSWORD` 或 cookie session + `canManageGame`）；`gameId` 作为显式 state handle。协议校验与 Origin/Bearer 抽到 `packages/app/src/lib/mcp-http.ts`。

**Verification** —
- `npx vitest run packages/app/tests/api/mcp.test.ts packages/webmcp` → PASS 27/27
- `pnpm --filter @mui-gamebook/app run typecheck` → PASS
- `pnpm run format` → 已跑
- 完整 `opennextjs-cloudflare build` 未在本回合执行（需部署环境；typecheck + 单测覆盖协议面）

**Journey log** —
1. 内核层 `gameId` 显式句柄与新规范方向一致，真正缺口在 HTTP 传输面与鉴权，不必推倒 `packages/webmcp`。
2. Cookie session 挡外部 MCP client；对齐 agent/admin 的 Bearer `ADMIN_PASSWORD` 是最低成本的 per-request 鉴权。
3. 应用错误码不能写在 `-32000..-32019`（新规范禁用）或 `-32020..-32099`（规范保留），改用 `40101+`。
4. 评审指出 Origin 未传 Workers env、工具失败仍落库；已修：`isOriginAllowed(req, env)` + `hasFailure` 时不写库。
5. in-page WebMCP / chatbot 不走 `/api/mcp`，语义继续以 `WEBMCP_TOOLS` 为唯一源。

## [S1] Problem

`POST /api/mcp` 仍按 legacy MCP（`2025-03-26`）实现握手：`initialize` / `notifications/initialized` / `ping`，鉴权依赖 better-auth cookie session。对照 MCP Spec 2026-07-28（SEP-2575 / SEP-2567）不满足 RESTful 无状态要求。

## [S2] Design

### 协议面（modern-only）

- 端点仍是 `POST /api/mcp`；`GET`/`DELETE` 返回 `405` + `Allow: POST`
- 支持版本：仅 `2026-07-28`
- 每请求：`MCP-Protocol-Version`、`Mcp-Method`；`tools/call` 另需 `Mcp-Name`；body `_meta` 含 `io.modelcontextprotocol/protocolVersion` + `clientCapabilities`
- 失败语义：缺 header/不一致 → 400 `-32020`；版本不支持 → 400 `-32022`；缺 `_meta` → 400 `-32602`；未知 method → 404 `-32601`；notification → 202
- 方法：`server/discover`、`tools/list`（含 `ttlMs`/`cacheScope`）、`tools/call`
- 成功结果：`resultType: "complete"` + `_meta.serverInfo`
- 工具业务失败：`result.isError = true` 且**不写库**

### 鉴权（per-request）

1. `Authorization: Bearer ${ADMIN_PASSWORD}` → admin，可操作任意存在的 `gameId`
2. Cookie session → `canManageGame`（owner 或 root email）
3. 未通过 → HTTP 401

### Origin

`Origin` 缺失放行；存在时白名单：`getPublicSiteUrl()`、请求 Host、`MCP_ALLOWED_ORIGINS`。实现必须把 Cloudflare `env` 传入 `isOriginAllowed`。

## [S3] Out of Scope

- W3C in-page WebMCP 与 chatbot function calling 语义
- 完整 OAuth 2.1 Resource Server、SSE、`subscriptions/listen`、`x-mcp-header`

## Tasks

- [x] T1: 抽取 MCP HTTP 协议校验与鉴权 helper — acceptance: `lib/mcp-http.ts` 可单测 header/_meta/Origin/Bearer 判定 (covers: S2)
- [x] T2: 重写 `POST /api/mcp` 为 modern-only 无状态端点 — acceptance: 见 S2 协议面与鉴权表；GET/DELETE=405 (covers: S2)
- [x] T3: 重写 `packages/app/tests/api/mcp.test.ts` — acceptance: 覆盖 discover/list/call、Bearer、session、401、HeaderMismatch、UnsupportedVersion、Origin 403、dryRun 不落库、写库路径、失败不落库 (covers: S2; depends: T1,T2)
- [x] T4: 回归 format/typecheck/相关测试 — acceptance: format + typecheck + vitest mcp/webmcp 通过 (covers: S2; depends: T3)
