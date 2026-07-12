import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/usage-limit', () => ({
  checkUserUsageLimit: vi.fn(),
}));

vi.mock('@/lib/ai-permissions', () => ({
  getUserAiPermissions: vi.fn(),
  checkVideoPermission: vi.fn(),
}));

vi.mock('@/lib/ai-service', () => ({
  startAsyncVideoGeneration: vi.fn(),
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: vi.fn(),
}));

vi.mock('@/lib/pending-operations', () => ({
  createPendingOperation: vi.fn(),
  generatePlaceholderUrl: vi.fn(),
}));

import { POST } from '@/app/api/cms/assets/generate-async/route';
import { checkVideoPermission, getUserAiPermissions } from '@/lib/ai-permissions';
import { startAsyncVideoGeneration } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { createPendingOperation, generatePlaceholderUrl } from '@/lib/pending-operations';
import { checkUserUsageLimit } from '@/lib/usage-limit';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/cms/assets/generate-async', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/cms/assets/generate-async', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (getUserAiPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ canGenerateVideo: true });
    (checkVideoPermission as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_video' }));

    expect(res.status).toBe(401);
  });

  it('用量超限返回 429', async () => {
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '超限了' });

    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_video' }));

    expect(res.status).toBe(429);
  });

  it('没有视频生成权限返回 403', async () => {
    (checkVideoPermission as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, message: '没有权限' });

    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_video' }));

    expect(res.status).toBe(403);
  });

  it('缺少 prompt/gameId 返回 400', async () => {
    const res = await POST(makeReq({ type: 'ai_video' }));

    expect(res.status).toBe(400);
  });

  it('type 不是 ai_video 时返回 400，提示改用同步接口', async () => {
    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_image' }));

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('/api/cms/assets/generate');
  });

  it('成功路径：启动异步生成、记录用量、创建待处理操作', async () => {
    (startAsyncVideoGeneration as ReturnType<typeof vi.fn>).mockResolvedValue({
      operationName: 'op-123',
      usage: { promptTokens: 8, completionTokens: 0, totalTokens: 8 },
      model: 'google',
    });
    (createPendingOperation as ReturnType<typeof vi.fn>).mockResolvedValue(99);
    (generatePlaceholderUrl as ReturnType<typeof vi.fn>).mockReturnValue('/api/placeholder/99');

    const res = await POST(makeReq({ prompt: '飞船起飞', gameId: '1', type: 'ai_video' }));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { url: string; operationId: number; status: string };
    expect(data).toEqual({ url: '/api/placeholder/99', operationId: 99, status: 'pending' });
    expect(recordAiUsage).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'video_generation',
      model: 'google',
      usage: { promptTokens: 8, completionTokens: 0, totalTokens: 8 },
    });
    expect(createPendingOperation).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', gameId: 1, type: 'video_generation', operationName: 'op-123' }),
    );
  });

  it('生成失败时返回 500，不创建待处理操作', async () => {
    (startAsyncVideoGeneration as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('挂了'));

    const res = await POST(makeReq({ prompt: 'p', gameId: '1', type: 'ai_video' }));

    expect(res.status).toBe(500);
    expect(createPendingOperation).not.toHaveBeenCalled();
  });
});
