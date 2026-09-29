import { revalidatePath } from 'next/cache';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { EDGE_PURGE_DELAY_MS, scheduleEdgeHtmlPurge, type EdgeCacheContext } from '@/lib/workers-cache';

export const PUBLISHED_GAME_CACHE_CONTROL = 'public, s-maxage=60';
export const PRIVATE_GAME_CACHE_CONTROL = 'private, no-store';

function parseTagList(tags: string | string[] | null | undefined): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((tag) => typeof tag === 'string' && tag.length > 0);
  }
  if (!tags) return [];
  try {
    const parsed: unknown = JSON.parse(tags);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
  } catch {
    return [];
  }
}

function scheduleEdgePurgeAfterRevalidate() {
  try {
    const { ctx } = getCloudflareContext() as { ctx: EdgeCacheContext };
    scheduleEdgeHtmlPurge(ctx, EDGE_PURGE_DELAY_MS);
  } catch {
    // 构建期 / 单测无 CF 上下文，跳过边缘 purge
  }
}

/**
 * 作品发布 / 下架 / 删除后，清掉目录、sitemap 和该作播放页的 ISR 缓存，
 * 并延迟 purge Workers Cache 边缘 HTML（issue #22）。
 */
export function revalidatePublicCatalog(options?: { slug?: string | null; tags?: string | string[] | null }) {
  // 用 page 级失效首页，避免 `layout` 把整站 `_N_T_/layout` 打成失效（#22）
  revalidatePath('/');
  revalidatePath('/games', 'layout');
  revalidatePath('/blog', 'layout');
  revalidatePath('/sitemap.xml');

  if (options?.slug) {
    revalidatePath(`/play/${options.slug}`);
  }

  for (const tag of parseTagList(options?.tags)) {
    revalidatePath(`/tags/${encodeURIComponent(tag)}`, 'layout');
  }

  scheduleEdgePurgeAfterRevalidate();
}
