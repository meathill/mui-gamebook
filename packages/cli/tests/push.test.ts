import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpClient } from '../src/utils/mcp-client';

describe('McpClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('没有 API Key 时直接返回失败', async () => {
    const client = new McpClient({
      endpoint: 'https://muistory.com/api/mcp',
      apiKey: '',
    });
    const res = await client.listGames();
    expect(res.success).toBe(false);
    expect(res.error).toContain('未提供 API Key');
  });

  it('成功发送 JSON-RPC 请求并解析结果', async () => {
    const mockGames = [{ id: 1, title: '测试游戏', slug: 'test-game' }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{ type: 'text', text: JSON.stringify(mockGames) }],
        },
      }),
    } as any);

    const client = new McpClient({
      endpoint: 'https://muistory.com/api/mcp',
      apiKey: 'mgb_test_secret',
    });

    const res = await client.listGames();
    expect(res.success).toBe(true);
    expect(res.data).toEqual(mockGames);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://muistory.com/api/mcp',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mgb_test_secret',
        }),
      }),
    );
  });

  it('处理 401 鉴权失败情况', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as any);

    const client = new McpClient({
      endpoint: 'https://muistory.com/api/mcp',
      apiKey: 'invalid_key',
    });

    const res = await client.listGames();
    expect(res.success).toBe(false);
    expect(res.error).toContain('鉴权失败 (401 Unauthorized)');
  });
});
