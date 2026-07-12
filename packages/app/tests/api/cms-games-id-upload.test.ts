import { beforeEach, describe, expect, it, vi } from 'vitest';

const bucket = { put: vi.fn() };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: { DB: {}, ASSETS_BUCKET: bucket, ASSETS_PUBLIC_DOMAIN: 'https://cdn.x.com' },
  })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({})),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/game-access', () => ({
  getManagedGame: vi.fn(),
}));

import { POST } from '@/app/api/cms/games/[id]/upload/route';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';

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

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/cms/games/[id]/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, slug: 'my-game', title: '我的游戏' });
    bucket.put.mockResolvedValue(undefined);
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({}), makeParams());

    expect(res.status).toBe(401);
  });

  it('缺少文件返回 400', async () => {
    const res = await POST(makeReq({ type: 'cover' }), makeParams());

    expect(res.status).toBe(400);
  });

  it('游戏不存在返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ file: makeFakeFile('x', 'a.png', 'image/png') }), makeParams());

    expect(res.status).toBe(404);
  });

  it.each([
    ['character', /^images\/my-game\/characters\/hero-\d+\.png$/],
    ['scene', /^images\/my-game\/scenes\/\d+\.png$/],
    ['audio', /^audio\/my-game\/\d+\.png$/],
    ['video', /^video\/my-game\/\d+\.png$/],
    ['unknown-type', /^images\/my-game\/\d+\.png$/],
  ])('type=%s 时生成对应的文件路径', async (type, pattern) => {
    const fields: Record<string, unknown> = { file: makeFakeFile('x', 'a.png', 'image/png'), type };
    if (type === 'character') fields.characterId = 'hero';

    const res = await POST(makeReq(fields), makeParams());

    expect(res.status).toBe(200);
    const [[fileName]] = bucket.put.mock.calls;
    expect(fileName).toMatch(pattern);
  });
});
