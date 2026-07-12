import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn(),
};

const signUpEmail = vi.fn();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {}, ADMIN_PASSWORD: 'test-secret' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-config', () => ({
  createAuth: vi.fn(() => ({ api: { signUpEmail } })),
}));

import { POST } from '@/app/api/admin/invite/route';

function makeReq(body: unknown, authHeader?: string) {
  return new Request('http://localhost/api/admin/invite', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

describe('POST /api/admin/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.where.mockResolvedValue(undefined);
  });

  it('没有 Authorization header 返回 401', async () => {
    const res = await POST(makeReq({ email: 'a@b.com', password: 'p', name: 'A' }));

    expect(res.status).toBe(401);
  });

  it('密钥错误返回 401', async () => {
    const res = await POST(makeReq({ email: 'a@b.com', password: 'p', name: 'A' }, 'Bearer wrong'));

    expect(res.status).toBe(401);
  });

  it('缺少字段返回 400', async () => {
    const res = await POST(makeReq({ email: 'a@b.com' }, 'Bearer test-secret'));

    expect(res.status).toBe(400);
  });

  it('成功路径：注册用户并自动标记邮箱已验证', async () => {
    signUpEmail.mockResolvedValue({ user: { id: 'new-user-1', email: 'a@b.com', emailVerified: false } });

    const res = await POST(makeReq({ email: 'a@b.com', password: 'p', name: 'A' }, 'Bearer test-secret'));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { user: { emailVerified: boolean } };
    expect(data.user.emailVerified).toBe(true);
    expect(mockDb.set).toHaveBeenCalledWith({ emailVerified: true });
  });

  it('注册失败时返回 500', async () => {
    signUpEmail.mockRejectedValue(new Error('邮箱已被注册'));

    const res = await POST(makeReq({ email: 'a@b.com', password: 'p', name: 'A' }, 'Bearer test-secret'));

    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('邮箱已被注册');
  });
});
