/**
 * Setup Skill 单源内容：MCP 配置。
 * 页面（/skills/setup）与下载 API（/api/skills/setup/skill-md）都从这里取字符串，
 * 不维护两份拷贝。配置里永远是占位符，不出现真实 key。
 */

export const MCP_ENDPOINT = 'https://muistory.com/api/mcp';

export const API_KEY_PREFIX = 'mgb_';

export type McpClient = 'opencode' | 'antigravity';

export function buildOpenCodeConfig(apiKeyPlaceholder = '<YOUR_API_KEY>'): string {
  return JSON.stringify(
    {
      $schema: 'https://opencode.ai/config.json',
      mcp: {
        'mui-gamebook': {
          type: 'remote',
          url: MCP_ENDPOINT,
          enabled: true,
          headers: { Authorization: `Bearer ${apiKeyPlaceholder}` },
          timeout: 120000,
        },
      },
    },
    null,
    2,
  );
}

export function buildAntigravityConfig(apiKeyPlaceholder = '<YOUR_API_KEY>'): string {
  return JSON.stringify(
    {
      mcpServers: {
        'mui-gamebook': {
          serverUrl: MCP_ENDPOINT,
          headers: { Authorization: `Bearer ${apiKeyPlaceholder}` },
        },
      },
    },
    null,
    2,
  );
}

/** Claude Code / Cursor / Windsurf / 通用 MCP 客户端常见的 mcpServers 形态 */
export function buildGenericMcpConfig(apiKeyPlaceholder = '<YOUR_API_KEY>'): string {
  return JSON.stringify(
    {
      mcpServers: {
        'mui-gamebook': {
          url: MCP_ENDPOINT,
          headers: { Authorization: `Bearer ${apiKeyPlaceholder}` },
        },
      },
    },
    null,
    2,
  );
}

export function buildClaudeCodeCommand(apiKeyPlaceholder = '<YOUR_API_KEY>'): string {
  return `claude mcp add --transport http mui-gamebook ${MCP_ENDPOINT} \\\n  --header "Authorization: Bearer ${apiKeyPlaceholder}"`;
}

export const OPENCODE_CONFIG_PATHS = ['项目级：<项目根>/opencode.json', '全局：~/.config/opencode/opencode.json'];
export const ANTIGRAVITY_CONFIG_PATHS = [
  '全局：~/.gemini/config/mcp_config.json',
  '工作区级：<项目根>/.agents/mcp_config.json',
];
export const GENERIC_MCP_CONFIG_PATHS = [
  'Claude Code：~/.claude.json 或项目 .mcp.json（mcpServers）',
  'Cursor：~/.cursor/mcp.json 或项目 .cursor/mcp.json',
  'MiMoCode：.mimocode/mimocode.jsonc 的 mcp 节',
  '通用：任何支持 Streamable HTTP + Header 鉴权的 MCP 客户端',
];

export const SETUP_SKILL_MD = `---
name: mui-gamebook-setup
description: 把 Mui Gamebook（姆伊游戏书）远程 MCP 接入本地 AI Agent（OpenCode / Antigravity）：建 API Key、写客户端配置、验证连接。当用户要求连接 muistory、配置游戏书 MCP、用 Agent 写互动小说前置 setup 时使用。
---

# Mui Gamebook MCP Setup

远程 MCP 端点：${MCP_ENDPOINT}

## 步骤

### 1. 拿 API Key

让用户登录 muistory.com → 工作台 → **API 密钥** → 创建一个 key（名称如 \`mui-gamebook-mcp\`），**立刻复制完整 key**（\`mgb_\` 开头，只显示一次）。
没有 key 就停下来问用户要，不要往下编造配置。

### 2. 写客户端配置（按用户实际用的客户端二选一）

**OpenCode**（\`opencode.json\`，项目级或全局 \`~/.config/opencode/opencode.json\`）：

\`\`\`json
${buildOpenCodeConfig()}
\`\`\`

> OpenCode v2 配置把 server 放在 \`mcp.servers\` 下（\`{"mcp":{"servers":{"mui-gamebook":{...}}}}\`），字段相同；连不上时先确认版本用哪种嵌套。

**Antigravity**（全局 \`~/.gemini/config/mcp_config.json\`，或工作区 \`.agents/mcp_config.json\`；IDE 里也可走 … → MCP Servers → Manage MCP Servers → View raw config）：

\`\`\`json
${buildAntigravityConfig()}
\`\`\`

> Antigravity 远程字段必须是 \`serverUrl\`（\`url\` / \`httpUrl\` 会被忽略）。请求超时建议 120s（生图/剧本生成慢）。

把 \`Bearer\` 后面换成用户刚复制的真实 key。**不要用 ADMIN_PASSWORD**：它是遗留脚本通道，不绑定用户、不可吊销。

### 3. 验证

新开一段对话（让配置热加载），确认 \`mui-gamebook\` 已连接，然后调 \`listGames\`（无参数或 \`limit\`）。
通了再干活；不通看下一步。

### 4. 排错

- \`Unauthorized\` / \`40101\`：key 错了或过期了，让用户去「API 密钥」页吊销重建。
- **连调约 10 次后整把 key 突然全 401**：多半是 better-auth 限流（旧 key 默认 10 次/24h；新版 key 默认 120 次/分钟，超限回 **429 / 40129**）。停一会儿或**新建 key**；老 key 的额度写死在创建当时，要换新 key 才享受新配额。
- 连上但工具为空：超时太短或端点未部署，timeout 拉到 120000 重试。
- 只能管理**自己的**游戏，AI 用量记在 key 主人名下；可在网页随时吊销。

## 写操作约定（配好后长期有效）

- 每次 \`tools/call\` 都要鉴权；写操作（除 \`listGames\` / \`createGame\` 外）要传 \`arguments.gameId\`。
- 改剧本先 \`dryRun: true\` 预览，满意再落库。**\`setGameDsl\` 会按 frontmatter 覆盖 \`published\`**，整篇替换后记得再 \`updateGameMeta(published: true)\`。
- \`createGame\` / \`updateGameMeta\` 可传 \`slug\`（小写字母/数字/连字符）；中文标题自动生成的 slug 常是 \`-1234\` 这种，建议建游时就指定可读 slug。
- DSL 铁律：首场景必须是 \`# start\`；选项 \`-> 场景ID\`；每个场景至少一个无条件选项兜底；对白 speaker 必须是 \`ai.characters\` 里的 **ID**（\`@jinlou:\` 而不是 \`@林锦楼:\`）。
- 细节以 \`tools/list\` 返回的 inputSchema 为准。
`;

/** 复制给 Agent 的一句话 prompt（含两种客户端配置，让 Agent 按自己身份二选一）。 */
export const SETUP_PROMPT = `帮我在本地配好 Mui Gamebook（姆伊游戏书）的远程 MCP，让你能帮我创建和管理互动小说游戏。

端点：${MCP_ENDPOINT}

流程：
1. 先问我要 API Key（muistory.com → 工作台 → API 密钥页创建，mgb_ 开头，我复制给你；你拿到后直接用，不要复述完整 key）。
2. 按你的客户端写配置（只写你认得的那一种）：
   - 你是 OpenCode：写 opencode.json（项目级或 ~/.config/opencode/opencode.json），形态 {"mcp":{"mui-gamebook":{"type":"remote","url":"${MCP_ENDPOINT}","enabled":true,"headers":{"Authorization":"Bearer <我的key>"},"timeout":120000}}}（v2 改为 mcp.servers 嵌套）。
   - 你是 Antigravity：写 mcp_config.json（~/.gemini/config/mcp_config.json 或工作区 .agents/mcp_config.json），形态 {"mcpServers":{"mui-gamebook":{"serverUrl":"${MCP_ENDPOINT}","headers":{"Authorization":"Bearer <我的key>"}}}}（注意是 serverUrl 不是 url）。
3. 新开对话验证：确认 mui-gamebook 已连接，调用 listGames，报结果给我。

注意：只用我的 API Key 鉴权，不用 ADMIN_PASSWORD；写剧本时先 dryRun 预览再落库。`;
