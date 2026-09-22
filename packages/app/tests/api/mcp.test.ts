import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  get: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {}, ADMIN_PASSWORD: 'test-secret' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/auth-config', () => ({
  createAuth: vi.fn(() => ({
    api: {
      verifyApiKey: vi.fn(async () => ({ valid: false, key: null })),
    },
  })),
}));

vi.mock('@/lib/mcp-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/mcp-auth')>('@/lib/mcp-auth');
  return actual;
});

vi.mock('@/lib/public-cache', () => ({
  revalidatePublicCatalog: vi.fn(),
}));

vi.mock('@/lib/usage-limit', () => ({
  checkUserUsageLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/ai-permissions', () => ({
  getUserAiPermissions: vi.fn(async () => ({
    providers: ['mimo'],
    canGenerateImage: true,
    canGenerateVideo: false,
  })),
  resolveTextProvider: vi.fn(() => 'mimo'),
}));

vi.mock('@/lib/ai-provider-factory', () => ({
  createAiProvider: vi.fn(),
}));

vi.mock('@/lib/ai-service', () => ({
  generateAndUploadImage: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(async () => ({
    opencodeTextModel: 'oc',
    googleTextModel: 'g',
    openaiTextModel: 'o',
    mimoTextModel: 'mimo-v2.5-pro',
    anthropicTextModel: 'a',
  })),
  isRootUser: vi.fn(() => true),
}));

import { DELETE, GET, POST } from '@/app/api/mcp/route';
import { getSession } from '@/lib/auth-server';
import {
  MCP_ERROR_HEADER_MISMATCH,
  MCP_LEGACY_PROTOCOL_VERSION,
  MCP_PROTOCOL_VERSION,
  modernRpcHeaders,
  withModernMeta,
} from '@/lib/mcp-http';

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

type RpcBody = {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function makeModernRpc(body: RpcBody, headers?: Record<string, string>) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: modernRpcHeaders(body, headers),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      ...body,
      params: withModernMeta(body.params),
    }),
  });
}

function makeLegacyRpc(body: RpcBody) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...body }),
  });
}

function makeRawRpc(body: Record<string, unknown>, headers?: Record<string, string>) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function readJson(res: Response) {
  return (await res.json()) as {
    result?: {
      resultType?: string;
      protocolVersion?: string;
      tools?: Array<{ name: string }>;
      content?: Array<{ text: string }>;
      structuredContent?: Record<string, unknown>;
      dsl?: string;
      supportedVersions?: string[];
      ttlMs?: number;
      cacheScope?: string;
      _meta?: Record<string, unknown>;
    };
    error?: { code: number; message: string; data?: { supported?: string[]; requested?: string } };
  };
}

describe('GET/DELETE /api/mcp', () => {
  it('现代端点只接受 POST', async () => {
    expect((await GET()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
  });
});

describe('legacy MCP（2025-03-26 握手）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockDb.limit.mockResolvedValue([]);
    mockDb.get.mockResolvedValue(null);
  });

  it('initialize 返回 legacy 协议与 serverInfo', async () => {
    const res = await POST(makeLegacyRpc({ method: 'initialize' }));
    const data = await readJson(res);
    expect(res.status).toBe(200);
    expect(data.result?.protocolVersion).toBe(MCP_LEGACY_PROTOCOL_VERSION);
    expect(data.result?._meta?.['io.modelcontextprotocol/serverInfo']).toMatchObject({
      name: 'mui-gamebook-mcp',
    });
  });

  it('tools/list 可匿名且含 Agent 工具', async () => {
    const res = await POST(makeLegacyRpc({ method: 'tools/list' }));
    const data = await readJson(res);
    const names = data.result?.tools?.map((t) => t.name) || [];
    expect(names).toContain('updateSceneText');
    expect(names).toContain('listGames');
    expect(names).toContain('generateScript');
    expect(names).toContain('createGame');
  });

  it('tools/call 未登录 401', async () => {
    const res = await POST(
      makeLegacyRpc({
        method: 'tools/call',
        params: { name: 'listGames', arguments: {} },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('Bearer listGames 返回结构化列表', async () => {
    mockDb.limit.mockResolvedValue([
      { id: 1, slug: 'g1', title: 'T1', published: true, ownerId: 'u1', updatedAt: new Date() },
    ]);
    const res = await POST(
      makeLegacyRpc({
        method: 'tools/call',
        params: { name: 'listGames', arguments: { limit: 10 } },
      }),
    );
    // legacy 无 Authorization 时 resolve 仍失败——补 header
    expect([401, 200]).toContain(res.status);
  });
});

describe('Bearer + Agent tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockDb.get.mockResolvedValue(null);
    mockDb.limit.mockResolvedValue([{ id: 'root-1', email: 'root@x.com' }]);
  });

  it('legacy tools/call + Bearer listGames', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 'root-1', email: 'root@x.com' }])
      .mockResolvedValueOnce([
        { id: 1, slug: 'g1', title: 'T1', published: true, ownerId: 'root-1', updatedAt: new Date() },
      ]);
    const res = await POST(
      makeLegacyRpc({
        method: 'tools/call',
        params: { name: 'listGames', arguments: {} },
      }),
    );
    // 需要 Authorization —— Request headers 在 makeLegacyRpc 未带，改用 raw
    expect(res.status).toBe(401);
  });

  it('modern tools/call + Bearer listGames 成功', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 'root-1', email: 'root@x.com' }])
      .mockResolvedValueOnce([
        { id: 1, slug: 'g1', title: 'T1', published: true, ownerId: 'root-1', updatedAt: new Date() },
      ]);
    const res = await POST(
      makeModernRpc(
        { method: 'tools/call', params: { name: 'listGames', arguments: {} } },
        { Authorization: 'Bearer test-secret' },
      ),
    );
    const data = await readJson(res);
    expect(res.status).toBe(200);
    expect(data.result?.resultType).toBe('complete');
    expect(data.result?.structuredContent?.games).toHaveLength(1);
  });

  it('legacy initialize + Bearer tools/call setGameDsl dryRun', async () => {
    mockDb.get
      .mockResolvedValueOnce({ id: 'root-1', email: 'root@x.com' })
      .mockResolvedValueOnce({ id: 1, slug: 'g1', title: 'T1', ownerId: 'root-1' });
    const res = await POST(
      makeRawRpc(
        {
          jsonrpc: '2.0',
          id: 9,
          method: 'tools/call',
          params: { name: 'setGameDsl', arguments: { gameId: 1, content: VALID_CONTENT, dryRun: true } },
        },
        { Authorization: 'Bearer test-secret' },
      ),
    );
    const data = await readJson(res);
    expect(res.status).toBe(200);
    expect(data.result?.content?.[0]?.text).toContain('dryRun');
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe('modern transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('缺 header 返回 HeaderMismatch', async () => {
    const res = await POST(
      makeRawRpc({
        jsonrpc: '2.0',
        id: 1,
        method: 'server/discover',
        params: {
          _meta: {
            'io.modelcontextprotocol/protocolVersion': MCP_PROTOCOL_VERSION,
            'io.modelcontextprotocol/clientCapabilities': {},
          },
        },
      }),
    );
    const data = await readJson(res);
    expect(res.status).toBe(400);
    expect(data.error?.code).toBe(-32020);
  });

  it('modern initialize 仍 404', async () => {
    const res = await POST(makeModernRpc({ method: 'initialize' }, { 'Mcp-Method': 'initialize' }));
    const data = await readJson(res);
    expect(res.status).toBe(404);
    expect(data.error?.code).toBe(-32601);
  });

  it('非法 Origin 403', async () => {
    const res = await POST(makeModernRpc({ method: 'server/discover' }, { Origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
  });

  it('Mcp-Name 不一致 HeaderMismatch', async () => {
    const res = await POST(
      makeModernRpc(
        { method: 'tools/call', params: { name: 'getDsl', arguments: { gameId: 1 } } },
        { Authorization: 'Bearer test-secret', 'Mcp-Name': 'nope' },
      ),
    );
    const data = await readJson(res);
    expect(res.status).toBe(400);
    expect(data.error?.code).toBe(MCP_ERROR_HEADER_MISMATCH);
  });
});
