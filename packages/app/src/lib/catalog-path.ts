/** 列表分页 href：第 1 页是基路径，之后走 /p/N，避免 searchParams 把整页钉成动态。 */
export function catalogPageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  return `${basePath}/p/${page}`;
}

export function blogCatalogHref(category: string | undefined, page: number): string {
  const base = category ? `/blog/c/${category}` : '/blog';
  return catalogPageHref(base, page);
}

/**
 * 把历史 ?page= / ?category= 收成路径。返回 null 表示不用跳。
 */
export function legacyCatalogRedirect(
  pathname: string,
  query: { page?: string | null; category?: string | null },
): string | null {
  const pageRaw = query.page ?? undefined;
  const page = pageRaw ? Number(pageRaw) : undefined;
  const hasPage = pageRaw !== undefined && pageRaw !== '';
  const category = query.category || undefined;

  if (pathname === '/blog') {
    if (!hasPage && !category) return null;
    const nextPage = hasPage && page && page > 1 ? page : 1;
    return blogCatalogHref(category, nextPage);
  }

  if (pathname === '/games' || pathname === '/minigames' || pathname.startsWith('/tags/')) {
    if (!hasPage) return null;
    if (!page || page <= 1) return pathname;
    return catalogPageHref(pathname, page);
  }

  return null;
}
