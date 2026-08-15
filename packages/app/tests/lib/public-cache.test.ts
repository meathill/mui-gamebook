import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from 'next/cache';
import { revalidatePublicCatalog } from '@/lib/public-cache';

describe('revalidatePublicCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('始终刷新首页、目录和 sitemap', () => {
    revalidatePublicCatalog();

    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    expect(revalidatePath).toHaveBeenCalledWith('/games', 'layout');
    expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml');
  });

  it('带 slug 和 JSON tags 时刷新播放页与标签页', () => {
    revalidatePublicCatalog({ slug: 'demo', tags: '["悬疑","河南"]' });

    expect(revalidatePath).toHaveBeenCalledWith('/play/demo');
    expect(revalidatePath).toHaveBeenCalledWith(`/tags/${encodeURIComponent('悬疑')}`, 'layout');
    expect(revalidatePath).toHaveBeenCalledWith(`/tags/${encodeURIComponent('河南')}`, 'layout');
  });

  it('非法 tags 不会抛错', () => {
    expect(() => revalidatePublicCatalog({ tags: '{not-json' })).not.toThrow();
    expect(revalidatePath).toHaveBeenCalledTimes(5);
  });
});
