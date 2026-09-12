import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/game-access', () => ({
  getManagedGame: vi.fn(),
}));

vi.mock('@/lib/public-cache', () => ({
  revalidatePublicCatalog: vi.fn(),
}));

import { GET, POST } from '@/app/api/mcp/route';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';

const VALID_CONTENT = `---
title: "新剧本"
description: "desc"
background_story: "bg"
cover_image: "https://x.com/c.png"
tags: ["a", "b"]
published: true
---
# start
hi
`;

function makeRpc(body: unknown) {
  return new Request('http://localhost/api/mcp', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/mcp', () => {
  it('返回服务发现与工具清单', async () => {
    const res = await GET();
    const data = (await res.json()) as { name: string; tools: Array<{ name: string }> };
    expect(data.name).toBe('mui-gamebook-mcp');
    expect(data.tools.some((t) => t.name === 'updateSceneText')).toBe(true);
  });
});

describe('POST /api/mcp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, slug: 'test' });
    mockDb.get.mockResolvedValue({ content: VALID_CONTENT });
  });

  it('initialize 可匿名', async () => {
    const res = await POST(makeRpc({ jsonrpc: '2.0', id: 1, method: 'initialize' }));
    const data = (await res.json()) as { result: { serverInfo: { name: string } } };
    expect(data.result.serverInfo.name).toBe('mui-gamebook-mcp');
  });

  it('tools/list 可匿名', async () => {
    const res = await POST(makeRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    const data = (await res.json()) as { result: { tools: unknown[] } };
    expect(data.result.tools.length).toBeGreaterThan(20);
  });

  it('tools/call 未登录返回 Unauthorized', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(
      makeRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'getDsl', arguments: { gameId: 1 } } }),
    );
    const data = (await res.json()) as { error: { message: string } };
    expect(data.error.message).toBe('Unauthorized');
  });

  it('未知工具返回 -32602', async () => {
    const res = await POST(
      makeRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nope', arguments: { gameId: 1 } } }),
    );
    const data = (await res.json()) as { error: { code: number } };
    expect(data.error.code).toBe(-32602);
  });

  it('只读 getDsl 返回内容且不写库', async () => {
    const res = await POST(
      makeRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'getDsl', arguments: { gameId: 1 } } }),
    );
    const data = (await res.json()) as { result: { content: Array<{ text: string }> } };
    expect(data.result.content[0].text).toContain('# start');
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('写操作 dryRun 不写库', async () => {
    const res = await POST(
      makeRpc({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'updateSceneText', arguments: { gameId: 1, sceneId: 'start', text: '改后', dryRun: true } },
      }),
    );
    const data = (await res.json()) as { result: { content: Array<{ text: string }>; dsl: string } };
    expect(data.result.content[0].text).toContain('✓');
    expect(data.result.dsl).toContain('改后');
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('写操作默认落库', async () => {
    const res = await POST(
      makeRpc({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'addVariable', arguments: { gameId: 1, name: 'gold', value: '10' } },
      }),
    );
    const data = (await res.json()) as { result: { content: Array<{ text: string }> } };
    expect(data.result.content[0].text).toContain('✓');
    expect(mockDb.update).toHaveBeenCalled();
  });
});
