import { describe, expect, it, vi } from 'vitest';
import {
  applyEdgeCachePolicy,
  EDGE_HTML_CACHE_CONTROL,
  EDGE_HTML_CACHE_TAG,
  EDGE_NO_STORE,
  EDGE_POLICY_HEADER,
  isEdgeCacheablePath,
  isEdgeCacheableRequest,
  purgeEdgeHtmlCache,
  scheduleEdgeHtmlPurge,
} from '@/lib/workers-cache';

const ORIGIN = 'https://muistory.com';

function req(path: string, init: RequestInit = {}) {
  return new Request(`${ORIGIN}${path}`, init);
}

function isrHtml(overrides: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response('<html></html>', {
    status: overrides.status ?? 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-nextjs-cache': 'HIT',
      'cache-control': 's-maxage=3600, stale-while-revalidate=2592000',
      vary: 'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch',
      ...overrides.headers,
    },
  });
}

describe('isEdgeCacheablePath', () => {
  it.each([
    '/',
    '/games',
    '/games/p/2',
    '/play/lanxiang-cuique-rebirth',
    '/tags/%E6%82%AC%E7%96%91',
    '/tags/悬疑/p/2',
    '/blog',
    '/blog/how-to-create-interactive-fiction-with-markdown',
    '/how-to-play',
    '/about',
    '/open',
    '/skills',
    '/skills/setup',
    '/interactive-fiction',
  ])('公共页可缓存：%s', (path) => {
    expect(isEdgeCacheablePath(path)).toBe(true);
  });

  it.each([
    '/admin',
    '/my/dashboard',
    '/sign-in',
    '/preview/demo',
    '/pricing',
    '/api/games',
    '/sitemap.xml',
    '/robots.txt',
    '/games/',
    '/_next/static/chunks/a.js',
  ])('其它路径不缓存：%s', (path) => {
    expect(isEdgeCacheablePath(path)).toBe(false);
  });
});

describe('isEdgeCacheableRequest', () => {
  it('普通 GET 可缓存；auth cookie 不可', () => {
    expect(isEdgeCacheableRequest(req('/games'))).toBe(true);
    expect(isEdgeCacheableRequest(req('/games', { headers: { cookie: '_ga=1' } }))).toBe(true);
    expect(isEdgeCacheableRequest(req('/games', { headers: { cookie: 'better-auth.session_token=abc' } }))).toBe(false);
  });

  it('查询串 / RSC 头 / 非 GET 不缓存', () => {
    expect(isEdgeCacheableRequest(req('/games?utm=1'))).toBe(false);
    expect(isEdgeCacheableRequest(req('/games', { headers: { rsc: '1' } }))).toBe(false);
    expect(isEdgeCacheableRequest(req('/games', { method: 'POST' }))).toBe(false);
  });
});

describe('applyEdgeCachePolicy', () => {
  it('ISR HIT HTML 写入边缘缓存策略', () => {
    const res = applyEdgeCachePolicy(req('/'), isrHtml());
    expect(res.headers.get('cloudflare-cdn-cache-control')).toBe(EDGE_HTML_CACHE_CONTROL);
    expect(res.headers.get('cache-tag')).toBe(EDGE_HTML_CACHE_TAG);
    expect(res.headers.get(EDGE_POLICY_HEADER)).toBe('cache');
    expect(res.headers.get('vary')).toContain('x-prerender-revalidate');
  });

  it('private/no-store 或 STALE 或登录路径 bypass', () => {
    const privateRes = applyEdgeCachePolicy(
      req('/'),
      isrHtml({ headers: { 'cache-control': 'private, no-store', 'x-nextjs-cache': 'HIT' } }),
    );
    expect(privateRes.headers.get('cloudflare-cdn-cache-control')).toBe(EDGE_NO_STORE);
    expect(privateRes.headers.get(EDGE_POLICY_HEADER)).toBe('bypass');

    const stale = applyEdgeCachePolicy(req('/games'), isrHtml({ headers: { 'x-nextjs-cache': 'STALE' } }));
    expect(stale.headers.get(EDGE_POLICY_HEADER)).toBe('bypass');

    const admin = applyEdgeCachePolicy(req('/sign-in'), isrHtml());
    expect(admin.headers.get(EDGE_POLICY_HEADER)).toBe('bypass');
  });
});

describe('purgeEdgeHtmlCache / scheduleEdgeHtmlPurge', () => {
  it('purge 调 ctx.cache.purge', async () => {
    const purge = vi.fn().mockResolvedValue({ success: true });
    expect(await purgeEdgeHtmlCache({ cache: { purge } }, 0)).toBe(true);
    expect(purge).toHaveBeenCalledWith({ tags: [EDGE_HTML_CACHE_TAG] });
  });

  it('schedule 走 waitUntil；无 cache 时静默', () => {
    const waitUntil = vi.fn();
    const purge = vi.fn().mockResolvedValue({ success: true });
    scheduleEdgeHtmlPurge({ waitUntil, cache: { purge } }, 0);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    scheduleEdgeHtmlPurge({ waitUntil }, 0);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });
});
