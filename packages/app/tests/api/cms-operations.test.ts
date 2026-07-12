import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/ai-service', () => ({
  checkAndCompleteVideoGeneration: vi.fn(),
}));

vi.mock('@/lib/pending-operations', () => ({
  extractOperationId: vi.fn(),
  getOperationById: vi.fn(),
  isPlaceholderUrl: vi.fn(),
  updateOperationStatus: vi.fn(),
}));

import { GET } from '@/app/api/cms/operations/route';
import { checkAndCompleteVideoGeneration } from '@/lib/ai-service';
import { getSession } from '@/lib/auth-server';
import { getOperationById, isPlaceholderUrl, updateOperationStatus } from '@/lib/pending-operations';

function makeReq(query: string) {
  return new Request(`http://localhost/api/cms/operations${query}`);
}

describe('GET /api/cms/operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeReq('?id=1'));

    expect(res.status).toBe(401);
  });

  it('缺少 id/url 返回 400', async () => {
    const res = await GET(makeReq(''));

    expect(res.status).toBe(400);
  });

  it('操作不存在返回 404', async () => {
    (getOperationById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeReq('?id=1'));

    expect(res.status).toBe(404);
  });

  it('不是操作所有者返回 403', async () => {
    (getOperationById as ReturnType<typeof vi.fn>).mockResolvedValue({ user_id: 'someone-else' });

    const res = await GET(makeReq('?id=1'));

    expect(res.status).toBe(403);
  });

  it('已完成的操作直接返回缓存结果', async () => {
    (getOperationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 'u1',
      status: 'completed',
      output_data: JSON.stringify({ url: 'https://cdn.x.com/v.mp4' }),
    });

    const res = await GET(makeReq('?id=1'));

    const data = (await res.json()) as { status: string; url: string };
    expect(data).toEqual({ status: 'completed', url: 'https://cdn.x.com/v.mp4', operationId: 1 });
    expect(checkAndCompleteVideoGeneration).not.toHaveBeenCalled();
  });

  it('已失败的操作直接返回错误信息', async () => {
    (getOperationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 'u1',
      status: 'failed',
      error_message: '生成超时',
    });

    const res = await GET(makeReq('?id=1'));

    const data = (await res.json()) as { status: string; error: string };
    expect(data).toEqual({ status: 'failed', error: '生成超时', operationId: 1 });
  });

  it('视频生成仍在处理中时返回 pending', async () => {
    (getOperationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 'u1',
      status: 'processing',
      type: 'video_generation',
      operation_name: 'op-1',
      input_data: JSON.stringify({ gameId: '1', provider: 'google' }),
    });
    (checkAndCompleteVideoGeneration as ReturnType<typeof vi.fn>).mockResolvedValue({ done: false });

    const res = await GET(makeReq('?id=1'));

    const data = (await res.json()) as { status: string };
    expect(data.status).toBe('pending');
  });

  it('视频生成完成时更新状态并返回 url', async () => {
    (getOperationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 'u1',
      status: 'processing',
      type: 'video_generation',
      operation_name: 'op-1',
      input_data: JSON.stringify({ gameId: '1', provider: 'google' }),
    });
    (checkAndCompleteVideoGeneration as ReturnType<typeof vi.fn>).mockResolvedValue({
      done: true,
      url: 'https://cdn.x.com/v.mp4',
    });

    const res = await GET(makeReq('?id=1'));

    const data = (await res.json()) as { status: string; url: string };
    expect(data).toEqual({ status: 'completed', url: 'https://cdn.x.com/v.mp4', operationId: 1 });
    expect(updateOperationStatus).toHaveBeenCalledWith(1, 'completed', { url: 'https://cdn.x.com/v.mp4' });
  });

  it('视频生成完成但报错时更新为 failed', async () => {
    (getOperationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 'u1',
      status: 'processing',
      type: 'video_generation',
      operation_name: 'op-1',
      input_data: JSON.stringify({ gameId: '1' }),
    });
    (checkAndCompleteVideoGeneration as ReturnType<typeof vi.fn>).mockResolvedValue({
      done: true,
      error: '生成失败',
    });

    const res = await GET(makeReq('?id=1'));

    const data = (await res.json()) as { status: string; error: string };
    expect(data).toEqual({ status: 'failed', error: '生成失败', operationId: 1 });
    expect(updateOperationStatus).toHaveBeenCalledWith(1, 'failed', undefined, '生成失败');
  });

  it('通过 url 参数查询时用 extractOperationId 解析出 id', async () => {
    (isPlaceholderUrl as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { extractOperationId } = await import('@/lib/pending-operations');
    (extractOperationId as ReturnType<typeof vi.fn>).mockReturnValue(7);
    (getOperationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 'u1',
      status: 'completed',
      output_data: JSON.stringify({ url: 'https://cdn.x.com/v.mp4' }),
    });

    const res = await GET(makeReq('?url=pending://7'));

    expect(res.status).toBe(200);
    expect(getOperationById).toHaveBeenCalledWith(7);
  });
});
