import { describe, expect, it } from 'vitest';
import { blogCatalogHref, catalogPageHref, legacyCatalogRedirect } from '@/lib/catalog-path';

describe('catalogPageHref', () => {
  it('第 1 页回到基路径', () => {
    expect(catalogPageHref('/games', 1)).toBe('/games');
    expect(catalogPageHref('/games', 0)).toBe('/games');
  });

  it('第 2 页走 /p/N', () => {
    expect(catalogPageHref('/games', 2)).toBe('/games/p/2');
    expect(catalogPageHref('/tags/悬疑', 3)).toBe('/tags/悬疑/p/3');
  });
});

describe('blogCatalogHref', () => {
  it('分类与分页组合成路径', () => {
    expect(blogCatalogHref(undefined, 1)).toBe('/blog');
    expect(blogCatalogHref(undefined, 2)).toBe('/blog/p/2');
    expect(blogCatalogHref('update', 1)).toBe('/blog/c/update');
    expect(blogCatalogHref('update', 2)).toBe('/blog/c/update/p/2');
  });
});

describe('legacyCatalogRedirect', () => {
  it('无旧 query 时不跳', () => {
    expect(legacyCatalogRedirect('/games', {})).toBeNull();
    expect(legacyCatalogRedirect('/blog', {})).toBeNull();
  });

  it('games/minigames/tags 的 ?page= 收到路径', () => {
    expect(legacyCatalogRedirect('/games', { page: '1' })).toBe('/games');
    expect(legacyCatalogRedirect('/games', { page: '3' })).toBe('/games/p/3');
    expect(legacyCatalogRedirect('/minigames', { page: '2' })).toBe('/minigames/p/2');
    expect(legacyCatalogRedirect('/tags/悬疑', { page: '2' })).toBe('/tags/悬疑/p/2');
  });

  it('blog 的 category/page 收到路径', () => {
    expect(legacyCatalogRedirect('/blog', { page: '1' })).toBe('/blog');
    expect(legacyCatalogRedirect('/blog', { page: '2' })).toBe('/blog/p/2');
    expect(legacyCatalogRedirect('/blog', { category: 'update' })).toBe('/blog/c/update');
    expect(legacyCatalogRedirect('/blog', { category: 'update', page: '2' })).toBe('/blog/c/update/p/2');
  });
});
