import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/usage-limit', () => ({
  checkUserUsageLimit: vi.fn(),
}));

vi.mock('@/lib/ai-permissions', () => ({
  getUserAiPermissions: vi.fn(),
}));

vi.mock('@/lib/ai-service', () => ({
  generateAndUploadImage: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

import { POST } from '@/app/api/cms/assets/generate/route';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { generateAndUploadImage } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/assets/generate', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/cms/assets/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ canGenerateImage: true });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_image' }));

    expect(res.status).toBe(401);
  });

  it('用量超限返回 429', async () => {
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_image' }));

    expect(res.status).toBe(429);
  });

  it('没有生图权限返回 403', async () => {
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ canGenerateImage: false });

    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_image' }));

    expect(res.status).toBe(403);
  });

  it('缺少 prompt/gameId 返回 400', async () => {
    const res = await POST(makeReq({ type: 'ai_image' }));

    expect(res.status).toBe(400);
  });

  it('type 不是 ai_image 时返回 400', async () => {
    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_video' }));

    expect(res.status).toBe(400);
  });

  it('成功路径：生成并记录用量', async () => {
    (generateAndUploadImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://cdn.x.com/images/1/123.png',
      usage: { promptTokens: 5, completionTokens: 0, totalTokens: 5 },
      model: 'google',
    });

    const res = await POST(makeReq({ prompt: '小红帽', gameId: '1', type: 'ai_image', aspectRatio: '1:1' }));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { url: string };
    expect(data.url).toBe('https://cdn.x.com/images/1/123.png');
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'image_generation',
      model: 'google',
      usage: { promptTokens: 5, completionTokens: 0, totalTokens: 5 },
    });
  });

  it('生成失败时返回 500', async () => {
    (generateAndUploadImage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('生成失败'));

    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_image' }));

    expect(res.status).toBe(500);
    expect(recordAiUsage).not.toHaveBeenCalled();
  });
});
