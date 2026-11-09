import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbRun = vi.fn();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({ run: dbRun })),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { POST } from '@/app/api/analytics/scene/route';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/analytics/scene', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/analytics/scene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('缺少 gameId 返回 400', async () => {
    const res = await POST(makeReq({ sceneId: 's1' }));

    expect(res.status).toBe(400);
  });

  it('缺少 sceneId 返回 400', async () => {
    const res = await POST(makeReq({ gameId: 1 }));

    expect(res.status).toBe(400);
  });

  it('DB 未配置时返回 500', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValueOnce({ env: {} });

    const res = await POST(makeReq({ gameId: 1, sceneId: 's1' }));

    expect(res.status).toBe(500);
  });

  it('成功路径：直接增量写入 SceneAnalytics', async () => {
    const res = await POST(makeReq({ gameId: 1, sceneId: 'forest' }));

    expect(res.status).toBe(200);
    expect(dbRun).toHaveBeenCalledTimes(1);
  });
});
