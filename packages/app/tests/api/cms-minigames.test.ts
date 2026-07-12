import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/usage-limit', () => ({
  checkUserUsageLimit: vi.fn(),
}));

vi.mock('@/lib/ai-permissions', () => ({
  getUserAiPermissions: vi.fn(),
  resolveTextProvider: vi.fn(),
}));

vi.mock('@/lib/ai-service', () => ({
  generateAndStoreMiniGame: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

import { POST } from '@/app/api/cms/minigames/route';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { generateAndStoreMiniGame } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/minigames', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/cms/minigames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ prompt: 'p' }));

    expect(res.status).toBe(401);
  });

  it('用量超限返回 429', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq({ prompt: 'p' }));

    expect(res.status).toBe(429);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('超限了');
  });

  it('缺少 prompt 返回 400', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });

    const res = await POST(makeReq({}));

    expect(res.status).toBe(400);
  });

  it('成功路径：生成并记录用量', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['mimo'] });
    (resolveTextProvider as ReturnType<typeof vi.fn>).mockReturnValue('mimo');
    (generateAndStoreMiniGame as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      url: 'https://x.com/api/cms/minigames/42',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      model: 'mimo',
    });

    const res = await POST(makeReq({ prompt: '点击金色飞贼', name: '魁地奇' }));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: number; url: string; name: string };
    expect(data).toEqual({ id: 42, url: 'https://x.com/api/cms/minigames/42', name: '魁地奇' });
    expect(generateAndStoreMiniGame).toHaveBeenCalledWith('点击金色飞贼', 'u1', '魁地奇', undefined, 'mimo');
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'minigame_generation',
      model: 'mimo',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    });
  });

  it('生成失败时返回 500', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ providers: ['mimo'] });
    (resolveTextProvider as ReturnType<typeof vi.fn>).mockReturnValue('mimo');
    (generateAndStoreMiniGame as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('AI 挂了'));

    const res = await POST(makeReq({ prompt: 'p' }));

    expect(res.status).toBe(500);
    expect(recordAiUsage).not.toHaveBeenCalled();
  });
});
