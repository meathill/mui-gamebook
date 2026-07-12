import { beforeEach, describe, expect, it, vi } from 'vitest';

const stmt = { bind: vi.fn().mockReturnThis(), first: vi.fn() };
const DB = { prepare: vi.fn(() => stmt) };

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB } })),
}));

import { GET } from '@/app/api/cms/minigames/[id]/route';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/cms/minigames/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('无效 ID 返回 400', async () => {
    const res = await GET({} as Request, makeParams('not-a-number'));

    expect(res.status).toBe(400);
  });

  it('小游戏不存在返回 404', async () => {
    stmt.first.mockResolvedValue(null);

    const res = await GET({} as Request, makeParams('1'));

    expect(res.status).toBe(404);
  });

  it('成功路径：返回 JS 代码并带长期缓存头，公开只读无需鉴权', async () => {
    stmt.first.mockResolvedValue({ id: 1, code: 'console.log(1)' });

    const res = await GET({} as Request, makeParams('1'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/javascript');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    const text = await res.text();
    expect(text).toBe('console.log(1)');
  });
});
