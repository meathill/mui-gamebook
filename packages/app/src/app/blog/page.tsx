import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarIcon, TagIcon } from 'lucide-react';
import { getPublishedPosts, getCategoryLabel } from '@/lib/blog';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '博客 - 姆伊游戏书',
    description: '产品更新、创作教程、创作者故事和行业观察',
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const category = params.category;
  const page = Number(params.page) || 1;
  const [t, locale] = await Promise.all([getTranslations('home'), getLocale()]);

  const data = await getPublishedPosts({ limit: 10, page, category });
  const categories = ['update', 'tutorial', 'story', 'insight'];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('blog.title')}</h1>
          <p className="mt-2 text-gray-600">{t('blog.subtitle')}</p>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <Link
            href="/blog"
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              !category
                ? 'bg-gray-900 text-white border-gray-900'
                : 'text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {t('blog.all')}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/blog?category=${cat}`}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                category === cat
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {getCategoryLabel(cat, locale)}
            </Link>
          ))}
        </div>

        {/* Posts list */}
        {data.docs.length > 0 ? (
          <div className="space-y-6">
            {data.docs.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="block p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  {post.coverUrl && (
                    <img
                      src={post.coverUrl}
                      alt={post.title}
                      className="w-32 h-20 object-cover rounded-lg shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h2>
                    {post.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(post.publishedAt).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                      {post.category && (
                        <span className="flex items-center gap-1">
                          <TagIcon className="w-3 h-3" />
                          {getCategoryLabel(post.category)}
                        </span>
                      )}
                      {post.author && <span>{post.author}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p>暂无文章，敬请期待。</p>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {data.hasPrevPage && (
              <Link
                href={`/blog?page=${page - 1}${category ? `&category=${category}` : ''}`}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                上一页
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-gray-500">
              {page} / {data.totalPages}
            </span>
            {data.hasNextPage && (
              <Link
                href={`/blog?page=${page + 1}${category ? `&category=${category}` : ''}`}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                下一页
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
