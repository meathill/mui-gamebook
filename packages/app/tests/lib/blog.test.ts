import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategoryLabel, getPostBySlug, getPublishedPosts } from '@/lib/blog';

describe('blog client library (CMS articles)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('直连 Payload CMS articles 端点拉取文章列表，正确格式化参数', async () => {
    const mockDoc = {
      id: 101,
      site: 'gamebook',
      locale: 'zh-CN',
      title: '测试文章',
      slug: 'test-post',
      summary: '文章摘要内容',
      bodyMarkdown: '正文内容 ![封面图](https://i.muistory.com/cover.jpg)',
      tags: [{ value: 'AI' }, { value: '创作' }],
      author: '姆伊游戏书',
      publishedAt: '2026-10-25T12:00:00.000Z',
      status: 'published',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [mockDoc], totalDocs: 1, totalPages: 1 }),
    });
    globalThis.fetch = fetchMock;

    const res = await getPublishedPosts({ category: 'update', page: 1, limit: 10 });

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/articles');
    expect(calledUrl).toContain('where%5Bsite%5D%5Bequals%5D=gamebook');
    expect(calledUrl).toContain('where%5Bstatus%5D%5Bequals%5D=published');
    expect(calledUrl).toContain('where%5Bcategory%5D%5Bequals%5D=update');

    expect(res.docs.length).toBe(1);
    expect(res.docs[0].id).toBe('101');
    expect(res.docs[0].slug).toBe('test-post');
    expect(res.docs[0].description).toBe('文章摘要内容');
    expect(res.docs[0].coverUrl).toBe('https://i.muistory.com/cover.jpg');
    expect(res.docs[0].tags).toEqual([{ tag: 'AI' }, { tag: '创作' }]);
  });

  it('按 slug 查询单篇文章', async () => {
    const mockDoc = {
      id: 102,
      site: 'gamebook',
      locale: 'zh-CN',
      title: '单篇测试',
      slug: 'single-slug',
      summary: '单篇简介',
      bodyMarkdown: '正文正文',
      author: '姆伊游戏书',
      status: 'published',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [mockDoc] }),
    });
    globalThis.fetch = fetchMock;

    const post = await getPostBySlug('single-slug');
    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('where%5Bslug%5D%5Bequals%5D=single-slug');
    expect(post).not.toBeNull();
    expect(post?.title).toBe('单篇测试');
  });

  it('fetch 异常时安全返回空数组，不抛错也不回退本地死根', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await getPublishedPosts();
    expect(res.docs).toEqual([]);
    expect(res.totalDocs).toBe(0);

    const post = await getPostBySlug('not-exist');
    expect(post).toBeNull();
  });

  it('getCategoryLabel 翻译映射', () => {
    expect(getCategoryLabel('update', 'zh')).toBe('产品更新');
    expect(getCategoryLabel('update', 'en')).toBe('Updates');
    expect(getCategoryLabel('tutorial')).toBe('教程');
    expect(getCategoryLabel('unknown_category')).toBe('unknown_category');
  });
});
