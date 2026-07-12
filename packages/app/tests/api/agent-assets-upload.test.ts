import { beforeEach, describe, expect, it, vi } from 'vitest';

const bucket = { put: vi.fn() };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: { ADMIN_PASSWORD: 'test-secret', ASSETS_BUCKET: bucket, ASSETS_PUBLIC_DOMAIN: 'https://cdn.x.com' },
  })),
}));

import { POST } from '@/app/api/agent/assets/upload/route';

function makeReq(body: unknown, authHeader?: string) {
  return new Request('http://localhost/api/agent/assets/upload', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

describe('POST /api/agent/assets/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bucket.put.mockResolvedValue(undefined);
  });

  it('没有 Bearer 密钥返回 401', async () => {
    const res = await POST(makeReq({ gameSlug: 'g', fileName: 'a.png', base64: 'YQ==', contentType: 'image/png' }));

    expect(res.status).toBe(401);
  });

  it('密钥错误返回 401', async () => {
    const res = await POST(
      makeReq({ gameSlug: 'g', fileName: 'a.png', base64: 'YQ==', contentType: 'image/png' }, 'Bearer wrong'),
    );

    expect(res.status).toBe(401);
  });

  it('缺少必填字段返回 400', async () => {
    const res = await POST(makeReq({ gameSlug: 'g' }, 'Bearer test-secret'));

    expect(res.status).toBe(400);
  });

  it('成功路径：解码 base64 并上传到 R2', async () => {
    const res = await POST(
      makeReq(
        { gameSlug: 'my-game', fileName: 'a.png', base64: 'aGVsbG8=', contentType: 'image/png' },
        'Bearer test-secret',
      ),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { url: string };
    expect(data.url).toMatch(/^https:\/\/cdn\.x\.com\/images\/my-game\/\d+-a\.png$/);
    const [[, uploadedBytes]] = bucket.put.mock.calls;
    expect(Buffer.from(uploadedBytes as ArrayBuffer).toString('utf-8')).toBe('hello');
  });
});
