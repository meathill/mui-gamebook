/**
 * Blog data fetching from Payload CMS REST API.
 *
 * The CMS runs as a separate service. Configure CMS_API_URL env var
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

function getCmsUrl(): string {
  return process.env.CMS_API_URL || 'http://localhost:3021';
}

export async function getPublishedPosts(options?: {
  limit?: number;
  page?: number;
  category?: string;
}): Promise<PayloadResponse<BlogPost>> {
  const { limit = 10, page = 1, category } = options || {};

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
    const res = await fetch(`${getCmsUrl()}/api/blog-posts?${params}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return { docs: [], totalDocs: 0, limit, totalPages: 0, page, hasNextPage: false, hasPrevPage: false };
    }

    return res.json();
  } catch {
    return { docs: [], totalDocs: 0, limit, totalPages: 0, page, hasNextPage: false, hasPrevPage: false };
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const params = new URLSearchParams({
      'where[slug][equals]': slug,
      'where[status][equals]': 'published',
      limit: '1',
    });

    const res = await fetch(`${getCmsUrl()}/api/blog-posts?${params}`, {
      next: { revalidate: 60 },
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
