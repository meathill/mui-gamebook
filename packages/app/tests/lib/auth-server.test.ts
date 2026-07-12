import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

const getSessionMock = vi.fn();

vi.mock('@/lib/auth-config', () => ({
  createAuth: vi.fn(() => ({ api: { getSession: getSessionMock } })),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers({ cookie: 'session=abc' }))),
}));

import { getSession } from '@/lib/auth-server';

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('已登录时透传 better-auth 返回的 session', async () => {
    const session = { user: { id: 'u1', email: 'a@b.com' } };
    getSessionMock.mockResolvedValue(session);

    const result = await getSession();

    expect(result).toBe(session);
    expect(getSessionMock).toHaveBeenCalledWith({ headers: expect.any(Headers) });
  });

  it('未登录时返回 null', async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await getSession();

    expect(result).toBeNull();
  });

  it('[契约锁定] better-auth 异常时原样向上抛，不吞异常伪装成未登录', async () => {
    // 这里不能加 try/catch 把异常吞成 null——那会变成比 usage-limit 的
    // fail-open 更严重的鉴权旁路（调用方会把"鉴权服务出错"误判为"未登录"，
    // 从而走公开逻辑分支）。这条测试的作用是防止未来有人"好心"加上 try/catch。
    getSessionMock.mockRejectedValue(new Error('better-auth internal error'));

    await expect(getSession()).rejects.toThrow('better-auth internal error');
  });
});
