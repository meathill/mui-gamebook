import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = { get: vi.fn(), put: vi.fn() };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { KV: kv } })),
}));

import { POST } from '@/app/api/analytics/complete/route';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/analytics/complete', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/analytics/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kv.get.mockResolvedValue(null);
  });

  it('缺少 gameId 返回 400', async () => {
    const res = await POST(makeReq({ duration: 60 }));

    expect(res.status).toBe(400);
  });

  it('duration 为负数返回 400', async () => {
    const res = await POST(makeReq({ gameId: 1, duration: -1 }));

    expect(res.status).toBe(400);
  });

  it('成功路径（无评分）：递增完成数/总时长/会话数，不更新评分', async () => {
    const res = await POST(makeReq({ gameId: 1, duration: 120 }));

    expect(res.status).toBe(200);
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:completions', '1');
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:duration', '120');
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:sessions', '1');
    expect(kv.put).not.toHaveBeenCalledWith('analytics:game:1:ratings', expect.anything());
  });

  it('成功路径（带合法评分 1-5）：更新评分', async () => {
    const res = await POST(makeReq({ gameId: 1, duration: 60, rating: 5 }));

    expect(res.status).toBe(200);
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:ratings', JSON.stringify({ count: 1, sum: 5 }));
  });

  it('评分超出 1-5 范围时不更新评分', async () => {
    const res = await POST(makeReq({ gameId: 1, duration: 60, rating: 9 }));

    expect(res.status).toBe(200);
    expect(kv.put).not.toHaveBeenCalledWith('analytics:game:1:ratings', expect.anything());
  });
});
