import { beforeEach, describe, expect, it, vi } from 'vitest';

const handler = vi.fn();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('@/lib/auth-config', () => ({
  createAuth: vi.fn(() => ({ handler })),
}));

import { GET, POST } from '@/app/api/auth/[...all]/route';
import { createAuth } from '@/lib/auth-config';

describe('/api/auth/[...all]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET 委托给 better-auth 的 handler，用当前 env 创建 auth 实例', async () => {
    const expected = new Response('better-auth response');
    handler.mockResolvedValue(expected);

    const req = new Request('http://localhost/api/auth/session');
    const res = await GET(req);

    expect(createAuth).toHaveBeenCalledWith({ DB: {} });
    expect(handler).toHaveBeenCalledWith(req);
    expect(res).toBe(expected);
  });

  it('POST 同样委托给 better-auth 的 handler', async () => {
    const expected = new Response('signed in');
    handler.mockResolvedValue(expected);

    const req = new Request('http://localhost/api/auth/sign-in/email', { method: 'POST' });
    const res = await POST(req);

    expect(handler).toHaveBeenCalledWith(req);
    expect(res).toBe(expected);
  });
});
