/**
 * Workers Cache 整页 HTML 边缘缓存（issue #22）。
 *
 * wrangler.jsonc 开 `cache.enabled` 后，Cloudflare 在执行 Worker 之前先查这层分层缓存
 * （先于 smart placement），命中直接从离用户最近的机房返回。
 *
 * 是否缓存由响应头决定；没有 Cache-Control 的 200 默认会被启发式缓存，所以每个响应都显式写
 * `Cloudflare-CDN-Cache-Control`（优先级最高、只作用于 CF、返回客户端前剥离）：
 * - 公共 ISR HTML：EDGE_HTML_CACHE_CONTROL + Cache-Tag；
 * - 其它（admin/api/登录/RSC/查询串/非 200/private|no-store/STALE…）：no-store。
 *
 * 失效：revalidatePublicCatalog 在 waitUntil 里延迟调用 ctx.cache.purge({ tags })。
 */

export const EDGE_HTML_CACHE_TAG = 'html';

/**
 * 边缘 TTL：1 小时新鲜 + 1 天 SWR。
 * 不用 s-maxage：文档明确 s-maxage / must-revalidate 会禁用 stale-while-revalidate。
 */
export const EDGE_HTML_CACHE_CONTROL = 'max-age=3600, stale-while-revalidate=86400';
export const EDGE_NO_STORE = 'no-store';
export const EDGE_POLICY_HEADER = 'x-edge-cache';

/** revalidatePath 落盘与边缘 purge 的竞态窗口；waitUntil 上限 30s。 */
export const EDGE_PURGE_DELAY_MS = 3_000;

// 公共 ISR / 静态页白名单（与 app 下 revalidate / 纯静态路由对齐）。
// 不含：admin、my、sign-in、preview、pricing（force-dynamic）、api、sitemap/robots。
const CACHEABLE_PAGE_RE =
  /^\/(?:(?:games|blog|tags|play|skills)(?:\/[^?#]*)?|how-to-play|interactive-fiction|about|open|create|contact|privacy|terms)?$/;

const BYPASS_REQUEST_HEADERS = [
  'rsc',
  'next-router-prefetch',
  'next-router-state-tree',
  'next-router-segment-prefetch',
  'next-action',
  'x-prerender-revalidate',
  'authorization',
];

const EXTRA_VARY = [
  'rsc',
  'next-router-prefetch',
  'next-router-state-tree',
  'next-router-segment-prefetch',
  'next-action',
  'x-prerender-revalidate',
];

const BYPASS_COOKIE_RE =
  /(?:^|;\s*)(?:__Secure-|__Host-)?(?:better-auth\.[^=]+|__prerender_bypass|__next_preview_data)=/;

const CACHEABLE_NEXT_CACHE_STATES = new Set(['HIT', 'MISS']);

export function hasBypassCookie(request: Request): boolean {
  return BYPASS_COOKIE_RE.test(request.headers.get('cookie') ?? '');
}

export function isEdgeCacheablePath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.endsWith('/')) return false;
  return CACHEABLE_PAGE_RE.test(pathname);
}

export function isEdgeCacheableRequest(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  const url = new URL(request.url);
  if (url.search !== '') return false;
  if (!isEdgeCacheablePath(url.pathname)) return false;
  if (hasBypassCookie(request)) return false;
  return !BYPASS_REQUEST_HEADERS.some((name) => request.headers.has(name));
}

export function isEdgeCacheableResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  if (!(response.headers.get('content-type') ?? '').startsWith('text/html')) return false;
  if (!CACHEABLE_NEXT_CACHE_STATES.has((response.headers.get('x-nextjs-cache') ?? '').toUpperCase())) {
    return false;
  }
  if (response.headers.has('set-cookie')) return false;
  if (/\b(?:private|no-store)\b/i.test(response.headers.get('cache-control') ?? '')) return false;
  return (response.headers.get('vary') ?? '').trim() !== '*';
}

function mergeVary(existing: string | null, dropAcceptEncoding: boolean): string {
  const values = (existing ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => !(dropAcceptEncoding && value.toLowerCase() === 'accept-encoding'));
  const lower = new Set(values.map((value) => value.toLowerCase()));
  for (const name of EXTRA_VARY) {
    if (!lower.has(name)) values.push(name);
  }
  return values.join(', ');
}

/** 给 Worker 最终响应写边缘缓存策略。 */
export function applyEdgeCachePolicy(request: Request, response: Response): Response {
  const cacheable = isEdgeCacheableRequest(request) && isEdgeCacheableResponse(response);
  const headers = new Headers(response.headers);
  headers.delete('cdn-cache-control');
  if (cacheable) {
    headers.set('cloudflare-cdn-cache-control', EDGE_HTML_CACHE_CONTROL);
    headers.set('cache-tag', EDGE_HTML_CACHE_TAG);
    headers.set('vary', mergeVary(headers.get('vary'), !headers.has('content-encoding')));
    headers.set(EDGE_POLICY_HEADER, 'cache');
  } else {
    headers.set('cloudflare-cdn-cache-control', EDGE_NO_STORE);
    headers.delete('cache-tag');
    headers.set(EDGE_POLICY_HEADER, 'bypass');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export type EdgeCacheContext = {
  cache?: {
    purge(options: { tags?: string[] }): Promise<{ success: boolean; errors?: { code: number; message: string }[] }>;
  };
  waitUntil?(promise: Promise<unknown>): void;
};

export async function purgeEdgeHtmlCache(ctx: EdgeCacheContext, delayMs = 0): Promise<boolean> {
  if (!ctx.cache?.purge) {
    console.warn('[workers-cache] ctx.cache 不可用（未开启 Workers Cache？），跳过边缘 purge');
    return false;
  }
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  try {
    const result = await ctx.cache.purge({ tags: [EDGE_HTML_CACHE_TAG] });
    if (!result.success) console.error('[workers-cache] purge 失败', result.errors);
    return result.success;
  } catch (error) {
    console.error('[workers-cache] purge 异常', error);
    return false;
  }
}

/** 在 waitUntil 里延迟 purge；无 ctx 时静默跳过（构建期 / 单测）。 */
export function scheduleEdgeHtmlPurge(ctx: EdgeCacheContext | undefined, delayMs = EDGE_PURGE_DELAY_MS): void {
  if (!ctx?.waitUntil || !ctx.cache?.purge) return;
  ctx.waitUntil(purgeEdgeHtmlCache(ctx, delayMs));
}
