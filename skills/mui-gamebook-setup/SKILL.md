---
name: mui-gamebook-setup
description: 把 Mui Gamebook（姆伊游戏书）远程 MCP 接入本地 AI Agent（OpenCode / Antigravity / Claude Code / Cursor / Windsurf）：建 API Key、写客户端配置、验证连接。当用户要求连接 muistory、配置游戏书 MCP、用 Agent 写互动小说前置 setup 时使用。
---

# Mui Gamebook MCP Setup 指南

远程 MCP 端点：`https://muistory.com/api/mcp`

## 步骤

### 1. 申请 API Key

登录 [muistory.com](https://muistory.com) → 工作台 → **API 密钥** → 创建一个 key（名称如 `mui-gamebook-mcp`），**立刻复制完整 key**（`mgb_` 开头，只显示一次）。

---

### 2. 编写客户端配置（按使用的客户端匹配）

#### OpenCode
编辑 `opencode.json`（项目根目录或全局 `~/.config/opencode/opencode.json`）：
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mui-gamebook": {
      "type": "remote",
      "url": "https://muistory.com/api/mcp",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>"
      },
      "timeout": 120000
    }
  }
}
```

#### Antigravity
编辑 `mcp_config.json`（全局 `~/.gemini/config/mcp_config.json` 或项目工作区 `.agents/mcp_config.json`）：
```json
{
  "mcpServers": {
    "mui-gamebook": {
      "serverUrl": "https://muistory.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>"
      }
    }
  }
}
```
*(注意：Antigravity 必须使用 `serverUrl` 字段)*

#### Claude Code
直接在终端执行：
```bash
claude mcp add --transport http mui-gamebook https://muistory.com/api/mcp \
  --header "Authorization: Bearer <YOUR_API_KEY>"
```

#### Cursor / Windsurf
在 MCP 配置文件（如 `~/.cursor/mcp.json`）中添加：
```json
{
  "mcpServers": {
    "mui-gamebook": {
      "url": "https://muistory.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>"
      }
    }
  }
}
```

---

### 3. 连接验证

重启 Agent 或开新会话，调用 `listGames`，确认返回名下的游戏列表即代表连接成功！

---

### 4. 配合本地 CLI 工具链

推荐搭配已发布的官方 CLI 工具：
```bash
npm install -g @roudanio/cli
# 终端直接登录
mgb login
# 查看状态
mgb whoami
```
