import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = { get: vi.fn(), put: vi.fn() };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { KV: kv } })),
}));

import { POST } from '@/app/api/analytics/open/route';

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/analytics/open', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

describe('POST /api/analytics/open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kv.get.mockResolvedValue(null);
  });

  it('缺少 gameId 返回 400', async () => {
    const res = await POST(makeReq({}));

    expect(res.status).toBe(400);
  });

  it('成功路径：递增打开数，按来源域名和设备类型分别统计', async () => {
    const res = await POST(
      makeReq(
        { gameId: 1 },
        { referer: 'https://www.google.com/search', 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS)' },
      ),
    );

    expect(res.status).toBe(200);
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:opens', '1');
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:referrers', JSON.stringify({ 'www.google.com': 1 }));
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:devices', JSON.stringify({ mobile: 1 }));
  });

  it('没有 referer/user-agent 时回退为 direct/desktop', async () => {
    const res = await POST(makeReq({ gameId: 1 }));

    expect(res.status).toBe(200);
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:referrers', JSON.stringify({ direct: 1 }));
    expect(kv.put).toHaveBeenCalledWith('analytics:game:1:devices', JSON.stringify({ desktop: 1 }));
  });
});
