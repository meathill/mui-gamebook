import { describe, expect, it } from 'vitest';
import { getStaticBlogPostBySlug, getStaticBlogPosts } from '@/lib/static-posts';

describe('static-posts library', () => {
  it('正确获取 SEO 教程文章', () => {
    const post = getStaticBlogPostBySlug('how-to-create-interactive-fiction-with-markdown');
    expect(post).not.toBeNull();
    expect(post?.title).toContain('Markdown');
    expect(post?.category).toBe('tutorial');
    expect(post?.status).toBe('published');
    expect(typeof post?.content).toBe('string');
    expect(post?.content).toContain('互动小说');
    expect(post?.tags?.map((t) => t.tag)).toContain('Markdown');
  });

  it('支持按分类筛选与分页', () => {
    const tutorialPosts = getStaticBlogPosts({ category: 'tutorial' });
    expect(tutorialPosts.docs.length).toBeGreaterThanOrEqual(1);

    const updatePosts = getStaticBlogPosts({ category: 'update' });
    expect(updatePosts.docs).toHaveLength(0);
  });
});
