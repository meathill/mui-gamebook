import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
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

import { POST } from '@/app/api/cms/assets/generate-tts/route';
import { generateAndUploadTTS } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/assets/generate-tts', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/cms/assets/generate-tts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ text: 't', gameId: '1' }));

    expect(res.status).toBe(401);
  });

  it('用量超限返回 429', async () => {
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq({ text: 't', gameId: '1' }));

    expect(res.status).toBe(429);
  });

  it('缺少 text/gameId 返回 400', async () => {
    const res = await POST(makeReq({ text: 't' }));

    expect(res.status).toBe(400);
  });

  it('[修复验证] 成功路径：生成 TTS 后真的记账，此前这里完全不调用 recordAiUsage', async () => {
    (generateAndUploadTTS as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://cdn.x.com/audio/1/123.wav',
      usage: { promptTokens: 42, completionTokens: 0, totalTokens: 42 },
      model: 'mimo',
    });

    const res = await POST(makeReq({ text: '从前有座山', gameId: '1', voiceName: 'Aoede' }));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { url: string };
    expect(data.url).toBe('https://cdn.x.com/audio/1/123.wav');
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'audio_generation',
      model: 'mimo',
      usage: { promptTokens: 42, completionTokens: 0, totalTokens: 42 },
      gameId: 1,
    });
  });

  it('生成失败时返回 500，不记账', async () => {
    (generateAndUploadTTS as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('TTS 挂了'));

    const res = await POST(makeReq({ text: 't', gameId: '1' }));

    expect(res.status).toBe(500);
    expect(recordAiUsage).not.toHaveBeenCalled();
  });
});
