import { beforeEach, describe, expect, it, vi } from 'vitest';

/** requireAssistanceAdmin 走原生 D1 prepare；普通用户 is_admin=0，管理员=1 */
let sqlUser: { email: string; is_admin: number };
let apiKeyUser: { id: string; email: string } | null;

const mockD1 = {
  prepare: vi.fn(() => ({
    bind: () => ({
      first: async () => sqlUser,
    }),
  })),
};

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(async () => [apiKeyUser]),
  get: vi.fn(async () => apiKeyUser),
};

let verifyResult: { valid: boolean; key: { referenceId: string } | null };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: mockD1, ADMIN_PASSWORD: 'test-secret' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(async () => null),
}));

vi.mock('@/lib/auth-config', () => ({
  createAuth: vi.fn(() => ({
    api: {
      verifyApiKey: vi.fn(async () => verifyResult),
    },
  })),
}));

vi.mock('@/lib/public-cache', () => ({
  revalidatePublicCatalog: vi.fn(),
}));

vi.mock('@/lib/media-assistance/execute', () => ({
  executeAssistanceTool: vi.fn(async () => ({ ok: true, message: '素材协助操作完成', data: { gameId: 7 } })),
}));

import { DELETE, GET, POST } from '@/app/api/mcp/media-assistance/route';
import { executeAssistanceTool } from '@/lib/media-assistance/execute';
import { MCP_LEGACY_PROTOCOL_VERSION } from '@/lib/mcp-http';

function makeLegacyRpc(body: Record<string, unknown>) {
  return new Request('http://localhost/api/mcp/media-assistance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...body }),
  });
}

function makeBearerRpc(bearer: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/mcp/media-assistance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...body }),
  });
}

async function readJson(res: Response) {
  return (await res.json()) as {
    result?: {
      protocolVersion?: string;
      tools?: Array<{ name: string }>;
      structuredContent?: Record<string, unknown>;
      _meta?: Record<string, unknown>;
    };
    error?: { code: number; message: string };
  };
}

describe('GET/DELETE /api/mcp/media-assistance', () => {
  it('现代端点只接受 POST', async () => {
    expect((await GET()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
  });
});

describe('素材协助端点仅管理员', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlUser = { email: 'author@example.com', is_admin: 0 };
    apiKeyUser = { id: 'u1', email: 'author@example.com' };
    verifyResult = { valid: false, key: null };
  });

  it('匿名 tools/list 401', async () => {
    const res = await POST(makeLegacyRpc({ method: 'tools/list' }));
    expect(res.status).toBe(401);
  });

  it('普通作者 API Key 403：有效凭据但非管理员', async () => {
    verifyResult = { valid: true, key: { referenceId: 'u1' } };
    const res = await POST(makeBearerRpc('author-key', { method: 'tools/list' }));
    expect(res.status).toBe(403);
    const data = await readJson(res);
    expect(data.error?.message).toContain('仅站方管理员可使用素材协助工具');
  });

  it('管理员 API Key：tools/list 只含 6 个素材协助工具', async () => {
    verifyResult = { valid: true, key: { referenceId: 'u1' } };
    sqlUser = { email: 'admin@example.com', is_admin: 1 };
    const res = await POST(makeBearerRpc('admin-key', { method: 'tools/list' }));
    expect(res.status).toBe(200);
    const data = await readJson(res);
    const names = data.result?.tools?.map((t) => t.name) ?? [];
    expect(names).toContain('claimMediaAssistanceWork');
    expect(names).toContain('applyMediaAssistanceAsset');
    expect(names).toHaveLength(6);
    expect(names).not.toContain('listGames');
  });

  it('ADMIN_PASSWORD Bearer：legacy initialize 返回专用 serverInfo', async () => {
    const res = await POST(makeBearerRpc('test-secret', { method: 'initialize' }));
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(data.result?.protocolVersion).toBe(MCP_LEGACY_PROTOCOL_VERSION);
    expect(data.result?._meta?.['io.modelcontextprotocol/serverInfo']).toMatchObject({
      name: 'mui-gamebook-media-assistance-mcp',
    });
  });

  it('ADMIN_PASSWORD Bearer：tools/call 走 executeAssistanceTool', async () => {
    const res = await POST(
      makeBearerRpc('test-secret', {
        method: 'tools/call',
        params: { name: 'claimMediaAssistanceWork', arguments: {} },
      }),
    );
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(executeAssistanceTool).toHaveBeenCalledWith('claimMediaAssistanceWork', {}, expect.anything());
    expect(data.result?.structuredContent).toMatchObject({ gameId: 7 });
  });

  it('ADMIN_PASSWORD Bearer：未知工具 -32602', async () => {
    const res = await POST(
      makeBearerRpc('test-secret', {
        method: 'tools/call',
        params: { name: 'listGames', arguments: {} },
      }),
    );
    const data = await readJson(res);
    expect(data.error?.code).toBe(-32602);
    expect(data.error?.message).toContain('Unknown tool: listGames');
  });
});
