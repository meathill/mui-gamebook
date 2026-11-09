import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbRun = vi.fn();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({ run: dbRun })),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { POST } from '@/app/api/analytics/choice/route';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/analytics/choice', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/analytics/choice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('DB 未配置时返回 500', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValueOnce({ env: {} });

    const res = await POST(makeReq({ gameId: 1, sceneId: 's1', choiceIndex: 2 }));

    expect(res.status).toBe(500);
  });

  it('成功路径：直接增量写入 ChoiceAnalytics', async () => {
    const res = await POST(makeReq({ gameId: 1, sceneId: 's1', choiceIndex: 2 }));

    expect(res.status).toBe(200);
    expect(dbRun).toHaveBeenCalledTimes(1);
  });
});
