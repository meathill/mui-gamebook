import { beforeEach, describe, expect, it, vi } from 'vitest';

const bucket = {
  head: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: { DB: {}, ASSETS_BUCKET: bucket, ASSETS_PUBLIC_DOMAIN: 'https://cdn.x.com' },
  })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({})),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/game-access', () => ({
  getManagedGame: vi.fn(),
}));

vi.mock('@/lib/usage-limit', () => ({
  checkUserUsageLimit: vi.fn(),
}));

vi.mock('@/lib/ai-service', () => ({
  generateAndUploadTTS: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

import { POST } from '@/app/api/cms/games/[id]/generate-voice-preview/route';
import { generateAndUploadTTS } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/games/1/generate-voice-preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/cms/games/[id]/generate-voice-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, ownerId: 'u1' });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    bucket.head.mockResolvedValue(null);
  });

  const body = { characterId: 'hero', voiceName: 'Aoede', text: '你好' };

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq(body), makeParams());

    expect(res.status).toBe(401);
  });

  it('游戏不存在或无权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq(body), makeParams());

    expect(res.status).toBe(404);
  });

  it('缺少 characterId/voiceName/text 返回 400', async () => {
    const res = await POST(makeReq({ characterId: 'hero' }), makeParams());

    expect(res.status).toBe(400);
  });

  it('缓存命中：直接返回缓存 URL，不检查用量限制、不生成、不记账', async () => {
    bucket.head.mockResolvedValue({ size: 1234 });

    const res = await POST(makeReq(body), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { url: string; cached: boolean };
    expect(data).toEqual({ url: 'https://cdn.x.com/audio/1/voice-preview/hero-Aoede.wav', cached: true });
    expect(checkUserUsageLimit).not.toHaveBeenCalled();
    expect(generateAndUploadTTS).not.toHaveBeenCalled();
    expect(recordAiUsage).not.toHaveBeenCalled();
  });

  it('缓存未命中且用量超限时返回 429', async () => {
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq(body), makeParams());

    expect(res.status).toBe(429);
    expect(generateAndUploadTTS).not.toHaveBeenCalled();
  });

  it('[修复验证] 缓存未命中时生成新预览并真的记账，此前这里完全不调用 recordAiUsage', async () => {
    (generateAndUploadTTS as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://cdn.x.com/audio/1/voice-preview/hero-Aoede.wav',
      usage: { promptTokens: 2, completionTokens: 0, totalTokens: 2 },
      model: 'google',
    });

    const res = await POST(makeReq(body), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { cached: boolean };
    expect(data.cached).toBe(false);
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'audio_generation',
      model: 'google',
      usage: { promptTokens: 2, completionTokens: 0, totalTokens: 2 },
      gameId: 1,
    });
  });

  it('生成失败时返回 500，不记账', async () => {
    (generateAndUploadTTS as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('TTS 挂了'));

    const res = await POST(makeReq(body), makeParams());

    expect(res.status).toBe(500);
    expect(recordAiUsage).not.toHaveBeenCalled();
  });
});
