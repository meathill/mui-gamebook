import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('@/lib/ai-permissions', () => ({
  getUserAiPermissions: vi.fn(),
}));

vi.mock('@/lib/user-ai-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/user-ai-settings')>();
  return {
    ...actual,
    getUserAiModelPreference: vi.fn(),
    isPaidAiUser: vi.fn(),
  };
});

import { drizzle } from 'drizzle-orm/d1';
import { GET, PUT } from '@/app/api/user/ai-settings/route';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import { getUserAiModelPreference, isPaidAiUser } from '@/lib/user-ai-settings';

function putReq(body: unknown) {
  return new Request('http://localhost/api/user/ai-settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

describe('GET /api/user/ai-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1', email: 'u1@example.com' } });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      defaultTextProvider: 'opencode',
      opencodeTextModel: 'deepseek-v4.1-flash',
    });
    (getUserAiModelPreference as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['opencode'] });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it('免费用户返回锁定状态与系统默认', async () => {
    const res = await GET();
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.isPaid).toBe(false);
    expect(data.systemDefaultProvider).toBe('opencode');
    expect(data.systemDefaultModel).toBe('deepseek-v4.1-flash');
    expect((data.presets as Record<string, unknown[]>).openai.length).toBeGreaterThan(0);
  });
});

describe('PUT /api/user/ai-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1', email: 'u1@example.com' } });
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({
      providers: ['opencode', 'openai'],
    });
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
    (drizzle as ReturnType<typeof vi.fn>).mockReturnValue({ update: vi.fn().mockReturnValue(updateChain) });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect((await PUT(putReq({ provider: 'openai', model: 'gpt-5-mini' }))).status).toBe(401);
  });

  it('免费用户保存时返回 403', async () => {
    (isPaidAiUser as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await PUT(putReq({ provider: 'openai', model: 'gpt-5-mini' }));
    expect(res.status).toBe(403);
  });

  it('非法供应商返回 400', async () => {
    const res = await PUT(putReq({ provider: 'gpt-x', model: 'gpt-5-mini' }));
    expect(res.status).toBe(400);
  });

  it('非法模型 ID 返回 400', async () => {
    const res = await PUT(putReq({ provider: 'openai', model: 'bad;model' }));
    expect(res.status).toBe(400);
  });

  it('无权使用的供应商返回 403', async () => {
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['opencode'] });
    const res = await PUT(putReq({ provider: 'openai', model: 'gpt-5-mini' }));
    expect(res.status).toBe(403);
  });

  it('合法保存返回偏好', async () => {
    const res = await PUT(putReq({ provider: 'openai', model: 'gpt-5-mini' }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { preference: { provider: string; model: string } };
    expect(data.preference).toEqual({ provider: 'openai', model: 'gpt-5-mini' });
  });

  it('传空 provider 表示恢复默认', async () => {
    const res = await PUT(putReq({ provider: null }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { preference: null };
    expect(data.preference).toBeNull();
  });
});
