import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('@/lib/ai-permissions', () => ({
  getUserAiPermissions: vi.fn(),
}));

import { GET } from '@/app/api/cms/config/route';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';

describe('GET /api/cms/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('只返回用户需要的字段，不泄漏完整管理配置', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      defaultAiProvider: 'mimo',
      defaultTtsProvider: 'google',
      dailyTokenLimit: 100000,
      adminUserIds: ['secret-admin-id'],
    });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['mimo'] });

    const res = await GET();

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toEqual({
      defaultAiProvider: 'mimo',
      defaultTtsProvider: 'google',
      aiPermissions: { providers: ['mimo'] },
    });
    expect(data.adminUserIds).toBeUndefined();
    expect(data.dailyTokenLimit).toBeUndefined();
  });
});
