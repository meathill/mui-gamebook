/**
 * Blog data fetching from Payload CMS REST API.
 *
 * The CMS runs as a separate service. Configure NEXT_PUBLIC_CMS_API_URL env var
 * to point to the Payload CMS instance (e.g. https://cms.muistory.com).
 */

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: unknown; // Lexical rich text JSON
  coverUrl?: string;
  category?: 'update' | 'tutorial' | 'story' | 'insight';
  tags?: Array<{ tag: string }>;
  author?: string;
  publishedAt?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

interface PayloadResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function getCmsUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CMS_API_URL?.trim();
  if (url) return url;
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3021';
  }
  return null;
}

import { getStaticBlogPostBySlug, getStaticBlogPosts } from './static-posts';

export async function getPublishedPosts(options?: {
  limit?: number;
  page?: number;
  category?: string;
}): Promise<PayloadResponse<BlogPost>> {
  const { limit = 10, page = 1, category } = options || {};
  const staticData = getStaticBlogPosts({ limit, page, category });

  const cmsUrl = getCmsUrl();
  if (!cmsUrl) {
    return {
      docs: staticData.docs,
      totalDocs: staticData.totalDocs,
      limit,
      totalPages: staticData.totalPages,
      page,
      hasNextPage: page < staticData.totalPages,
      hasPrevPage: page > 1,
    };
  }

  const params = new URLSearchParams({
    'where[status][equals]': 'published',
    sort: '-publishedAt',
    limit: String(limit),
    page: String(page),
  });

  if (category) {
    params.set('where[category][equals]', category);
  }

  try {
    const res = await fetch(`${cmsUrl}/api/blog-posts?${params}`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return {
        docs: staticData.docs,
        totalDocs: staticData.totalDocs,
        limit,
        totalPages: staticData.totalPages,
        page,
        hasNextPage: page < staticData.totalPages,
        hasPrevPage: page > 1,
      };
    }

    const cmsData: PayloadResponse<BlogPost> = await res.json();
    const seenSlugs = new Set(cmsData.docs.map((d) => d.slug));
    const additionalStaticDocs = staticData.docs.filter((d) => !seenSlugs.has(d.slug));
    const mergedDocs = [...cmsData.docs, ...additionalStaticDocs];
    const totalDocs = cmsData.totalDocs + additionalStaticDocs.length;
    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));

    return {
      ...cmsData,
      docs: mergedDocs,
      totalDocs,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  } catch {
    return {
      docs: staticData.docs,
      totalDocs: staticData.totalDocs,
      limit,
      totalPages: staticData.totalPages,
      page,
      hasNextPage: page < staticData.totalPages,
      hasPrevPage: page > 1,
    };
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const staticPost = getStaticBlogPostBySlug(slug);
  if (staticPost) {
    return staticPost;
  }

  const cmsUrl = getCmsUrl();
  if (!cmsUrl) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      'where[slug][equals]': slug,
      'where[status][equals]': 'published',
      limit: '1',
    });

    const res = await fetch(`${cmsUrl}/api/blog-posts?${params}`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;

    const data: PayloadResponse<BlogPost> = await res.json();
    return data.docs[0] || null;
  } catch {
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
