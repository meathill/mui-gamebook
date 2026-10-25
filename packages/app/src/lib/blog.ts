/**
 * 博客数据客户端：直连统一 Payload CMS（articles 集合）。
 *
 * 遵循多站点共用 CMS 架构（见 muicv packages/cms/collections/articles.ts）：
 * - 数据源以 CMS 为唯一依据（Single Source of Truth），本地不留静态数据根。
 * - 多站点通过 site=gamebook（兼容 muistory）隔离，绝不与 muicv 简历求职博文混淆。
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

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
  const candidate = process.env.MUICV_CMS_URL?.trim() || process.env.NEXT_PUBLIC_CMS_API_URL?.trim();
  // 必须指向外部 Payload CMS，绝不能误配为 muistory.com 本站或相对路径，否则会陷入自我循环请求不存在的 /api/articles
  if (candidate && !candidate.includes('muistory.com')) {
    return candidate.replace(/\/$/, '');
  }
  return DEFAULT_CMS_URL;
}

/**
 * 请求 CMS 接口：优先走 Cloudflare Service Binding 直连 muicv-cms 进程，
 * 消除公网 DNS 解析与外部网络开销；在非 Worker 运行期安全降级到标准 fetch。
 */
async function fetchCmsEndpoint(pathWithQuery: string): Promise<Response> {
  const cmsUrl = getCmsUrl();
  const targetUrl = `${cmsUrl}${pathWithQuery}`;

  // 1. 优先通过 Cloudflare Service Binding（MUICV_CMS）直通目标 Worker
  try {
    const ctx = (await getCloudflareContext({ async: true })) as {
      env?: { MUICV_CMS?: { fetch: typeof fetch } };
    };
    const cmsFetcher = ctx?.env?.MUICV_CMS;
    if (cmsFetcher && typeof cmsFetcher.fetch === 'function') {
      const res = await cmsFetcher.fetch(targetUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      // 线上环境 Worker 间 Service Binding 正常返回 200
      if (res.ok) {
        return res;
      }
      // 本地构建期 / 缺少本地目标 Worker 时 miniflare 会返回 503，降级走公网 fetch
      console.warn(`[blog] Service Binding 返回 HTTP ${res.status}，降级走公网 fetch`);
    }
  } catch {
    // 本地开发 / Node 测试环境 / 构建静态生成期无 Worker Context，安全降级到标准 fetch
  }

  // 2. 降级走标准 HTTP/HTTPS fetch
  return fetch(targetUrl, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(10000),
  });
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

const categoryLabels: Record<string, { zh: string; en: string }> = {
  update: { zh: '产品更新', en: 'Updates' },
  tutorial: { zh: '教程', en: 'Tutorials' },
  story: { zh: '创作者故事', en: 'Creator Stories' },
  insight: { zh: '行业观察', en: 'Insights' },
};

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
    const label = categoryLabels[category]?.zh || category;
    params.set('where[tags.value][equals]', label);
  }

  try {
    const res = await fetchCmsEndpoint(`/api/articles?${params.toString()}`);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[blog] 拉取文章列表失败 (${cmsUrl})，HTTP ${res.status}: ${errText.slice(0, 300)}`);
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

    const res = await fetchCmsEndpoint(`/api/articles?${params.toString()}`);

    if (!res.ok) {
      console.warn(`[blog] 根据 slug 获取文章失败 (${slug}, ${cmsUrl})，HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as { docs?: RawCmsArticle[] };
    const raw = data.docs?.[0];
    return raw ? normalizeCmsArticle(raw) : null;
  } catch (err) {
    console.warn(`[blog] 根据 slug 获取文章异常 (${slug}): ${err}`);
    return null;
  }
}

export function getCategoryLabel(category: string, locale = 'zh'): string {
  return categoryLabels[category]?.[locale as 'zh' | 'en'] || category;
}
