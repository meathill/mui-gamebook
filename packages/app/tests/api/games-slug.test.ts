import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

import { GET } from '@/app/api/games/[slug]/route';
import { getSession } from '@/lib/auth-server';

const VALID_CONTENT = `---
title: "小红帽"
---
# start
hi
`;

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe('GET /api/games/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('游戏不存在（按 slug 和数字 id 都查不到）返回 404', async () => {
    mockDb.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const res = await GET({} as Request, makeParams('123'));

    expect(res.status).toBe(404);
    expect(mockDb.get).toHaveBeenCalledTimes(2); // 先按 slug 查，slug 是纯数字所以又按 id 查一次
  });

  it('slug 非纯数字时查不到就不会再按 id 回退查询', async () => {
    mockDb.get.mockResolvedValueOnce(null);

    const res = await GET({} as Request, makeParams('not-a-number'));

    expect(res.status).toBe(404);
    expect(mockDb.get).toHaveBeenCalledTimes(1);
  });

  it('游戏内容不存在返回 404', async () => {
    mockDb.get.mockResolvedValueOnce({ id: 1, slug: 'g', published: true }).mockResolvedValueOnce(null);

    const res = await GET({} as Request, makeParams('g'));

    expect(res.status).toBe(404);
  });

  it('DSL 解析失败返回 500', async () => {
    mockDb.get
      .mockResolvedValueOnce({ id: 1, slug: 'g', published: true })
      .mockResolvedValueOnce({ content: '不合法内容' });

    const res = await GET({} as Request, makeParams('g'));

    expect(res.status).toBe(500);
  });

  it('未发布且不是所有者时返回 404，即使内容合法', async () => {
    mockDb.get
      .mockResolvedValueOnce({ id: 1, slug: 'g', published: false, ownerId: 'owner-1' })
      .mockResolvedValueOnce({ content: VALID_CONTENT });

    const res = await GET({} as Request, makeParams('g'));

    expect(res.status).toBe(404);
  });

  it('未发布但当前用户是所有者时可以访问', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'owner-1' } });
    mockDb.get
      .mockResolvedValueOnce({ id: 1, slug: 'g', published: false, ownerId: 'owner-1', title: '小红帽' })
      .mockResolvedValueOnce({ content: VALID_CONTENT });

    const res = await GET({} as Request, makeParams('g'));

    expect(res.status).toBe(200);
  });

  it('已发布时公开访问，返回以数据库字段为准的元数据', async () => {
    mockDb.get
      .mockResolvedValueOnce({
        id: 1,
        slug: 'g',
        published: true,
        title: '数据库标题',
        description: 'db desc',
        tags: '["x"]',
      })
      .mockResolvedValueOnce({ content: VALID_CONTENT });

    const res = await GET({} as Request, makeParams('g'));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { title: string; tags: string[]; slug: string };
    expect(data.title).toBe('数据库标题');
    expect(data.tags).toEqual(['x']);
    expect(data.slug).toBe('g');
  });

  it('数据库 published=false 但 DSL frontmatter 里 published=true 时仍视为已发布', async () => {
    const content = `---\ntitle: "小红帽"\npublished: true\n---\n# start\nhi\n`;
    mockDb.get
      .mockResolvedValueOnce({ id: 1, slug: 'g', published: false, title: '小红帽' })
      .mockResolvedValueOnce({ content });

    const res = await GET({} as Request, makeParams('g'));

    expect(res.status).toBe(200);
  });
});
