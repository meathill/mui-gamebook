import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
};

const verifyApiKey = vi.fn();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {}, ADMIN_PASSWORD: 'admin-secret' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-config', () => ({
  createAuth: vi.fn(() => ({ api: { verifyApiKey } })),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/mcp-agent', () => ({
  getDb: vi.fn(() => mockDb),
}));

import { getSession } from '@/lib/auth-server';
import { resolveMcpAuth } from '@/lib/mcp-auth';

function makeReq(authorization?: string) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: authorization ? { Authorization: authorization } : {},
  });
}

describe('resolveMcpAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyApiKey.mockResolvedValue({ valid: false, key: null });
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockDb.get.mockResolvedValue(null);
  });

  it('有效 API Key 映射到对应用户 session 形态', async () => {
    verifyApiKey.mockResolvedValue({ valid: true, key: { referenceId: 'u-1' } });
    mockDb.get.mockResolvedValue({ id: 'u-1', email: 'me@x.com' });
    const resolved = await resolveMcpAuth(makeReq('Bearer mgb_live_xxx'));
    expect(resolved).toEqual({
      auth: {
        mode: 'session',
        session: { user: { id: 'u-1', email: 'me@x.com' } },
      },
      error: null,
    });
  });

  it('无效 Key 且非 ADMIN_PASSWORD 返回 unauthorized', async () => {
    const resolved = await resolveMcpAuth(makeReq('Bearer not-a-key'));
    expect(resolved).toEqual({ auth: null, error: 'unauthorized' });
  });

  it('遗留 ADMIN_PASSWORD 仍可用，标记 admin', async () => {
    const resolved = await resolveMcpAuth(makeReq('Bearer admin-secret'));
    expect(resolved).toEqual({ auth: { mode: 'admin' }, error: null });
  });

  it('无 Bearer 时回退 cookie session', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u-2', email: 'cookie@x.com' },
    });
    const resolved = await resolveMcpAuth(makeReq());
    expect(resolved).toEqual({
      auth: {
        mode: 'session',
        session: { user: { id: 'u-2', email: 'cookie@x.com' } },
      },
      error: null,
    });
  });

  it('API Key 限流时返回 rate-limited 而非 unauthorized', async () => {
    verifyApiKey.mockRejectedValue(
      Object.assign(new Error('rate limited'), {
        status: 429,
        body: { code: 'RATE_LIMITED' },
      }),
    );
    const resolved = await resolveMcpAuth(makeReq('Bearer mgb_live_xxx'));
    expect(resolved).toEqual({ auth: null, error: 'rate-limited' });
  });
});
