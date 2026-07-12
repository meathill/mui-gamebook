import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
  isRootUser: vi.fn(),
}));

import { GET, PUT } from '@/app/api/admin/config/route';
import { getConfig, isRootUser, updateConfig } from '@/lib/config';
import { getSession } from '@/lib/auth-server';

describe('GET /api/admin/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 403', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(403);
  });

  it('非 root 用户返回 403', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'user@x.com' } });
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const res = await GET();

    expect(res.status).toBe(403);
  });

  it('root 用户返回完整配置', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'root@x.com' } });
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ dailyTokenLimit: 100000 });

    const res = await GET();

    expect(res.status).toBe(200);
    const data = (await res.json()) as { dailyTokenLimit: number };
    expect(data.dailyTokenLimit).toBe(100000);
  });
});

describe('PUT /api/admin/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'root@x.com' } });
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it('非 root 用户返回 403，不调用 updateConfig', async () => {
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const res = await PUT(new Request('http://localhost/api/admin/config', { method: 'PUT', body: '{}' }));

    expect(res.status).toBe(403);
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it('成功路径：更新配置并返回最新配置', async () => {
    (updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ dailyTokenLimit: 200000 });

    const res = await PUT(
      new Request('http://localhost/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ dailyTokenLimit: 200000 }),
      }),
    );

    expect(res.status).toBe(200);
    expect(updateConfig).toHaveBeenCalledWith({ dailyTokenLimit: 200000 });
    const data = (await res.json()) as { config: { dailyTokenLimit: number } };
    expect(data.config.dailyTokenLimit).toBe(200000);
  });
});
