/**
 * 轻量远程 MCP JSON-RPC 客户端：直接与 https://muistory.com/api/mcp 通讯。
 */

export interface McpClientOptions {
  endpoint: string;
  apiKey: string;
}

export interface McpToolCallResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class McpClient {
  private endpoint: string;
  private apiKey: string;
  private reqId = 1;

  constructor(options: McpClientOptions) {
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
  }

  async callTool<T = any>(name: string, args: Record<string, any> = {}): Promise<McpToolCallResponse<T>> {
    if (!this.apiKey) {
      return { success: false, error: '未提供 API Key，请设置 MGB_API_KEY 或通过 --key 参数传入。' };
    }

    const payload = {
      jsonrpc: '2.0',
      id: this.reqId++,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          return { success: false, error: '鉴权失败 (401 Unauthorized)：API Key 无效或已过期。' };
        }
        return { success: false, error: `请求失败 HTTP ${res.status}: ${res.statusText}` };
      }

      const json: any = await res.json();
      if (json.error) {
        return { success: false, error: json.error.message || JSON.stringify(json.error) };
      }

      const result = json.result;
      if (!result) {
        return { success: false, error: '服务端未返回有效 result' };
      }

      // MCP 规范 content: [{ type: 'text', text: '...' }]
      if (result.isError) {
        const text = result.content?.[0]?.text || '调用工具返回失败';
        return { success: false, error: text };
      }

      const text = result.content?.[0]?.text;
      let parsedData: any = text;
      try {
        parsedData = JSON.parse(text);
      } catch {}

      return { success: true, data: parsedData };
    } catch (e) {
      return { success: false, error: `网络连接失败: ${(e as Error).message}` };
    }
  }

  async listGames(): Promise<McpToolCallResponse<any[]>> {
    return this.callTool('listGames');
  }

  async setGameDsl(gameId: number | string, content: string, dryRun = false): Promise<McpToolCallResponse> {
    return this.callTool('setGameDsl', { gameId, content, dryRun });
  }

  async updateGameMeta(gameId: number | string, meta: Record<string, any>): Promise<McpToolCallResponse> {
    return this.callTool('updateGameMeta', { gameId, ...meta });
  }
}
