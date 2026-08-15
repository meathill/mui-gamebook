import { revalidatePath } from 'next/cache';

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

/**
 * 作品发布 / 下架 / 删除后，清掉目录、sitemap 和该作播放页的 ISR 缓存。
 */
export function revalidatePublicCatalog(options?: { slug?: string | null; tags?: string | string[] | null }) {
  revalidatePath('/', 'layout');
  revalidatePath('/games', 'layout');
  revalidatePath('/blog', 'layout');
  revalidatePath('/minigames', 'layout');
  revalidatePath('/sitemap.xml');

  if (options?.slug) {
    revalidatePath(`/play/${options.slug}`);
  }

  for (const tag of parseTagList(options?.tags)) {
    revalidatePath(`/tags/${encodeURIComponent(tag)}`, 'layout');
  }
}
