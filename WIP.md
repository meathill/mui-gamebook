# WIP

## 任务：素材协助 MCP 与普通 MCP 分离（仅管理员）

- [ ] 抽取 `src/lib/mcp-route-core.ts` 共享协议层（dual-era 握手/ping/discover/tools-list/transport 校验），`mcpServerMeta` 支持自定义服务名
- [ ] 新建 `/api/mcp/media-assistance`：仅 6 个素材协助工具，每个方法都鉴权（ADMIN_PASSWORD Bearer 或 is_admin 用户的 API key/session），复用 `requireAssistanceAdmin`
- [ ] 普通 `/api/mcp` 摘除：`MCP_AGENT_TOOLS` 去掉 assistance 工具、`executeMcpAgentTool` 移除 dispatch、`needsGame` 例外清掉
- [ ] 文档：`docs/media-assistance.md` MCP 地址改新端点；api-keys 页说明 key 不含素材协助
- [ ] 测试：mcp.test.ts 断言不含 claimMediaAssistanceWork；新增 mcp-media-assistance.test.ts（401/403/admin happy path）
- [ ] 回归 + commit/push/deploy + 冒烟
