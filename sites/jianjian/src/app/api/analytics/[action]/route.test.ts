import { beforeEach, describe, expect, it, vi } from 'vitest';

const mainAppFetch = vi.fn<Fetcher['fetch']>();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { MAIN_APP: { fetch: mainAppFetch } } })),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { POST } from './route';

function makeReq(action: string, body: unknown) {
  const req = new Request(`http://localhost/api/analytics/${action}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ action }) });
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response);
}

describe('POST /api/analytics/[action] (jianjian 代理)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('MAIN_APP 服务绑定缺失时返回 503', async () => {
    vi.mocked(getCloudflareContext).mockReturnValueOnce({ env: {} } as ReturnType<typeof getCloudflareContext>);

    const res = await makeReq('open', { gameId: 1 });

    expect(res.status).toBe(503);
  });

  it('action 不在白名单内返回 400', async () => {
    const res = await makeReq('unknown-action', { gameId: 1 });

    expect(res.status).toBe(400);
    expect(mainAppFetch).not.toHaveBeenCalled();
  });

  it('转发成功时返回上游数据', async () => {
    mainAppFetch.mockResolvedValue(await jsonResponse({ ok: true }));

    const res = await makeReq('open', { gameId: 1 });
    const data = (await res.json()) as { ok: boolean };

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(mainAppFetch).toHaveBeenCalledWith(
      'http://internal/api/analytics/open',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ gameId: 1 }) }),
    );
  });

  it('上游返回错误状态码时透传该状态码', async () => {
    mainAppFetch.mockResolvedValue(await jsonResponse({ error: 'bad' }, false, 502));

    const res = await makeReq('scene', { gameId: 1, sceneId: 's1' });

    expect(res.status).toBe(502);
  });

  it('请求体不是合法 JSON 时返回 500', async () => {
    const req = new Request('http://localhost/api/analytics/open', { method: 'POST', body: 'not-json' });

    const res = await POST(req, { params: Promise.resolve({ action: 'open' }) });

    expect(res.status).toBe(500);
    expect(mainAppFetch).not.toHaveBeenCalled();
  });
});
