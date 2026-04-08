import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon, CalendarIcon } from 'lucide-react';
import { getPublishedPosts, getCategoryLabel } from '@/lib/blog';

export default async function BlogPreviewSection() {
  const t = await getTranslations('home');
  const data = await getPublishedPosts({ limit: 3 });

  // Don't render the section if no posts yet
  if (data.docs.length === 0) return null;

  return (
    <section className="py-16 bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('blog.title')}</h2>
            <p className="mt-1 text-gray-600 text-sm">{t('blog.subtitle')}</p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium text-sm">
            {t('blog.viewAll')}
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.docs.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="block p-5 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
              {post.coverUrl && (
                <img
                  src={post.coverUrl}
                  alt={post.title}
                  className="w-full h-36 object-cover rounded-lg mb-4"
                />
              )}
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{post.title}</h3>
              {post.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.description}</p>}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {post.publishedAt && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(post.publishedAt).toLocaleDateString('zh-CN')}
                  </span>
                )}
                {post.category && <span>{getCategoryLabel(post.category)}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
