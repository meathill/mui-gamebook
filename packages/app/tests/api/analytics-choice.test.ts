import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = { get: vi.fn(), put: vi.fn() };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { KV: kv } })),
}));

import { POST } from '@/app/api/analytics/choice/route';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/analytics/choice', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/analytics/choice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kv.get.mockResolvedValue(null);
  });

  it('缺少 gameId 返回 400', async () => {
    const res = await POST(makeReq({ sceneId: 's1', choiceIndex: 0 }));

    expect(res.status).toBe(400);
  });

  it('缺少 sceneId 返回 400', async () => {
    const res = await POST(makeReq({ gameId: 1, choiceIndex: 0 }));

    expect(res.status).toBe(400);
  });

  it('缺少 choiceIndex 返回 400', async () => {
    const res = await POST(makeReq({ gameId: 1, sceneId: 's1' }));

    expect(res.status).toBe(400);
  });

  it('成功路径：递增对应 key 的计数', async () => {
    const res = await POST(makeReq({ gameId: 1, sceneId: 's1', choiceIndex: 2 }));

    expect(res.status).toBe(200);
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:choice:s1:2', '1');
  });
});
