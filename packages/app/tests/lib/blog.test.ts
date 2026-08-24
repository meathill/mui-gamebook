import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategoryLabel, getPostBySlug, getPublishedPosts } from '@/lib/blog';

describe('blog client library', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('开发环境默认使用 http://localhost:3021', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [{ id: '1', title: 'Test Post', slug: 'test' }], totalDocs: 1 }),
    });
    globalThis.fetch = fetchMock;

    const res = await getPublishedPosts();

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('http://localhost:3021/api/blog-posts')).toBe(true);
    expect(res.docs.length).toBeGreaterThanOrEqual(1);
    expect(res.docs.some((d) => d.slug === 'test')).toBe(true);
  });

  it('生产环境未配置 NEXT_PUBLIC_CMS_API_URL 时安全返回内置静态文章，不发起 fetch', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const res = await getPublishedPosts();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.docs.length).toBeGreaterThanOrEqual(1);
    expect(res.docs.some((d) => d.slug === 'how-to-create-interactive-fiction-with-markdown')).toBe(true);

    const post = await getPostBySlug('how-to-create-interactive-fiction-with-markdown');
    expect(post).not.toBeNull();
    expect(post?.title).toContain('Markdown');

    const notFoundPost = await getPostBySlug('not-exist');
    expect(notFoundPost).toBeNull();
  });

  it('优先使用 NEXT_PUBLIC_CMS_API_URL 环境变量并与内置文章合并', async () => {
    vi.stubEnv('NEXT_PUBLIC_CMS_API_URL', 'https://cms.muistory.com');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [{ id: '2', title: 'Live Post', slug: 'live' }], totalDocs: 1 }),
    });
    globalThis.fetch = fetchMock;

    const res = await getPublishedPosts({ category: 'update', page: 2, limit: 5 });

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('https://cms.muistory.com/api/blog-posts')).toBe(true);
    expect(calledUrl).toContain('where%5Bcategory%5D%5Bequals%5D=update');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=5');
    expect(res.docs.length).toBeGreaterThanOrEqual(1);
  });

  it('fetch 异常时安全兜底返回静态文章，不抛错', async () => {
    vi.stubEnv('NEXT_PUBLIC_CMS_API_URL', 'https://cms.muistory.com');
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await getPublishedPosts();
    expect(res.docs.length).toBeGreaterThanOrEqual(1);

    const notExist = await getPostBySlug('not-exist');
    expect(notExist).toBeNull();
  });

  it('getCategoryLabel 翻译映射', () => {
    expect(getCategoryLabel('update', 'zh')).toBe('产品更新');
    expect(getCategoryLabel('update', 'en')).toBe('Updates');
    expect(getCategoryLabel('tutorial')).toBe('教程');
    expect(getCategoryLabel('unknown_category')).toBe('unknown_category');
  });
});
