import { beforeEach, describe, expect, it, vi } from 'vitest';

const bucket = { put: vi.fn() };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { ASSETS_BUCKET: bucket, ASSETS_PUBLIC_DOMAIN: 'https://cdn.x.com' } })),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

import { POST } from '@/app/api/cms/assets/upload/route';
import { getSession } from '@/lib/auth-server';

// 真实的 multipart FormData/File 在这个测试环境里没法可靠地跨 jsdom/undici/Next 边缘运行时
// polyfill 往返（不同实现互相不认对方的内部品牌），改用满足 route 实际用到的最小接口
// （formData().get()，file 的 arrayBuffer/type/name）的 duck-typed mock，绕开这个环境限制。
function makeFakeFile(content: string, name: string, type: string) {
  return {
    name,
    type,
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(content).buffer),
  };
}

function makeReq(fields: Record<string, unknown>) {
  return {
    formData: () => Promise.resolve({ get: (key: string) => fields[key] ?? null }),
  } as unknown as Request;
}

describe('POST /api/cms/assets/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    bucket.put.mockResolvedValue(undefined);
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({}));

    expect(res.status).toBe(401);
  });

  it('缺少 file/id 返回 400', async () => {
    const res = await POST(makeReq({ type: 'cover' }));

    expect(res.status).toBe(400);
  });

  it('成功路径：上传到 R2 并返回公开 URL', async () => {
    const res = await POST(makeReq({ file: makeFakeFile('abc', 'cover.png', 'image/png'), id: '1', type: 'cover' }));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { url: string };
    expect(data.url).toMatch(/^https:\/\/cdn\.x\.com\/images\/1\/cover-\d+-cover\.png$/);
    expect(bucket.put).toHaveBeenCalledTimes(1);
  });
});
