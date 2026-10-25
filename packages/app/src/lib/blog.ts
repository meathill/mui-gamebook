/**
 * 博客数据客户端：直连统一 Payload CMS（articles 集合）。
 *
 * 遵循多站点共用 CMS 架构（见 muicv packages/cms/collections/articles.ts）：
 * - 数据源以 CMS 为唯一依据（Single Source of Truth），本地不留静态数据根。
 * - 多站点通过 site=gamebook（兼容 muistory）隔离，绝不与 muicv 简历求职博文混淆。
 */

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string | unknown;
  coverUrl?: string;
  category?: 'update' | 'tutorial' | 'story' | 'insight' | string;
  tags?: Array<{ tag: string }>;
  author?: string;
  publishedAt?: string;
  status: 'draft' | 'published';
  createdAt?: string;
  updatedAt?: string;
}

export interface PayloadResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const DEFAULT_CMS_URL = 'https://cms.muicv.com';
const DEFAULT_SITE = process.env.NEXT_PUBLIC_BLOG_SITE?.trim() || 'gamebook';

export function getCmsUrl(): string {
  const url = process.env.NEXT_PUBLIC_CMS_API_URL?.trim() || process.env.MUICV_CMS_URL?.trim();
  return url || DEFAULT_CMS_URL;
}

type RawCmsArticle = {
  id: number | string;
  site?: string;
  locale?: string;
  title?: string;
  slug?: string;
  status?: string;
  summary?: string;
  bodyMarkdown?: string;
  content?: unknown;
  coverUrl?: string;
  category?: string;
  tags?: Array<{ value?: string; tag?: string } | string>;
  author?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  seoDescription?: string;
};

/** 从 Markdown 正文中提取第一张可用图片的 URL 作为卡片封面 */
function extractFirstImage(markdown?: string): string | undefined {
  if (!markdown) return undefined;
  const match = /!\[.*?\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/.exec(markdown);
  return match?.[1];
}

function normalizeCmsArticle(doc: RawCmsArticle): BlogPost {
  const content = doc.bodyMarkdown || doc.content || '';
  const coverUrl =
    doc.coverUrl || (typeof content === 'string' ? extractFirstImage(content) : undefined) || '/hero-bg.png';
  const tags = Array.isArray(doc.tags)
    ? doc.tags
        .map((t) => {
          if (typeof t === 'string') return { tag: t };
          return { tag: t.value || t.tag || '' };
        })
        .filter((t) => Boolean(t.tag))
    : [];

  return {
    id: String(doc.id),
    title: doc.title || '',
    slug: doc.slug || '',
    description: doc.summary || doc.seoDescription || '',
    content,
    coverUrl,
    category: doc.category || 'update',
    tags,
    author: doc.author || '姆伊游戏书',
    publishedAt: doc.publishedAt || doc.createdAt,
    status: (doc.status as 'draft' | 'published') || 'published',
    createdAt: doc.createdAt || doc.publishedAt,
    updatedAt: doc.updatedAt || doc.publishedAt,
  };
}

export async function getPublishedPosts(options?: {
  limit?: number;
  page?: number;
  category?: string;
  site?: string;
  locale?: string;
}): Promise<PayloadResponse<BlogPost>> {
  const { limit = 10, page = 1, category, site = DEFAULT_SITE, locale = 'zh-CN' } = options || {};
  const emptyResponse: PayloadResponse<BlogPost> = {
    docs: [],
    totalDocs: 0,
    limit,
    totalPages: 0,
    page,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const cmsUrl = getCmsUrl();
  const params = new URLSearchParams({
    depth: '0',
    limit: String(limit),
    page: String(page),
    sort: '-publishedAt',
    'where[status][equals]': 'published',
    'where[site][equals]': site,
    'where[locale][equals]': locale,
  });

  if (category) {
    params.set('where[category][equals]', category);
  }

  try {
    const res = await fetch(`${cmsUrl}/api/articles?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[blog] 拉取文章列表失败，HTTP ${res.status}`);
      return emptyResponse;
    }

    const data = (await res.json()) as {
      docs?: RawCmsArticle[];
      totalDocs?: number;
      totalPages?: number;
      page?: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };

    const rawDocs = Array.isArray(data.docs) ? data.docs : [];
    const docs = rawDocs.map(normalizeCmsArticle);
    const totalDocs = data.totalDocs ?? docs.length;
    const totalPages = data.totalPages ?? Math.max(1, Math.ceil(totalDocs / limit));

    return {
      docs,
      totalDocs,
      limit,
      totalPages,
      page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  } catch (err) {
    console.warn(`[blog] 获取发布文章异常: ${err}`);
    return emptyResponse;
  }
}

export async function getPostBySlug(
  slug: string,
  options?: { site?: string; locale?: string },
): Promise<BlogPost | null> {
  const { site = DEFAULT_SITE, locale = 'zh-CN' } = options || {};
  const cmsUrl = getCmsUrl();

  try {
    const params = new URLSearchParams({
      depth: '0',
      limit: '1',
      'where[status][equals]': 'published',
      'where[site][equals]': site,
      'where[locale][equals]': locale,
      'where[slug][equals]': slug,
    });

    const res = await fetch(`${cmsUrl}/api/articles?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { docs?: RawCmsArticle[] };
    const raw = data.docs?.[0];
    return raw ? normalizeCmsArticle(raw) : null;
  } catch (err) {
    console.warn(`[blog] 根据 slug 获取文章异常 (${slug}): ${err}`);
    return null;
  }
}

const categoryLabels: Record<string, { zh: string; en: string }> = {
  update: { zh: '产品更新', en: 'Updates' },
  tutorial: { zh: '教程', en: 'Tutorials' },
  story: { zh: '创作者故事', en: 'Creator Stories' },
  insight: { zh: '行业观察', en: 'Insights' },
};

export function getCategoryLabel(category: string, locale = 'zh'): string {
  return categoryLabels[category]?.[locale as 'zh' | 'en'] || category;
}
