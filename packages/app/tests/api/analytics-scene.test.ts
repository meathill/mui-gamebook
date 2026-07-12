import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = { get: vi.fn(), put: vi.fn() };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { KV: kv } })),
}));

import { POST } from '@/app/api/analytics/scene/route';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/analytics/scene', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/analytics/scene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kv.get.mockResolvedValue(null);
  });

  it('缺少 gameId 返回 400', async () => {
    const res = await POST(makeReq({ sceneId: 's1' }));

    expect(res.status).toBe(400);
  });

  it('缺少 sceneId 返回 400', async () => {
    const res = await POST(makeReq({ gameId: 1 }));

    expect(res.status).toBe(400);
  });

  it('成功路径：递增场景访问计数', async () => {
    const res = await POST(makeReq({ gameId: 1, sceneId: 'forest' }));

    expect(res.status).toBe(200);
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:scene:forest', '1');
  });
});
