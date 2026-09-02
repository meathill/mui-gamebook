import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// 数据层容错契约：D1/CMS 故障时 lib 返回空值而非 reject，
// 目录页据此渲染空态（可接受的缓存降级），绝不能让路由 500。
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock('@/lib/blog', () => ({
  getPublishedPosts: vi.fn().mockResolvedValue({ docs: [] }),
  getCategoryLabel: vi.fn().mockReturnValue('分类'),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue('zh'),
}));

vi.mock('@mui-gamebook/site-common/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mui-gamebook/site-common/utils')>()),
  getPublicSiteUrl: vi.fn().mockReturnValue('https://muistory.com'),
}));

import { GamesCatalog } from '@/app/games/games-catalog';
import { MinigamesCatalog } from '@/app/minigames/minigames-catalog';
import { BlogCatalog } from '@/app/blog/blog-catalog';

describe('目录页数据层故障降级', () => {
  const mockDB = { prepare: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
      env: { DB: mockDB },
    });
    mockDB.prepare.mockImplementation(() => {
      throw new Error('D1 unavailable');
    });
  });

  it('D1 故障时 /games 渲染空态而非抛错', async () => {
    const ui = await GamesCatalog({ page: 1 });
    render(ui);

    expect(screen.getByText('noGames')).toBeTruthy();
  });

  it('D1 故障时 /minigames 渲染空态而非抛错', async () => {
    const ui = await MinigamesCatalog({ page: 1 });
    render(ui);

    expect(screen.getByText('noMinigames')).toBeTruthy();
  });

  it('CMS 无数据时 /blog 渲染空列表而非抛错', async () => {
    const ui = await BlogCatalog({ page: 1 });
    render(ui);

    expect(screen.getByText('blog.title')).toBeTruthy();
  });
});
