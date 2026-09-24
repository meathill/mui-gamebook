import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getPublishedGames, getPublishedGamesCount, getRelatedGames } from '@/lib/games';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

/**
 * 公开入口的 shadowban 过滤。
 * 这些 SQL 是字符串拼装的，漏改一处就会让被封禁的作品重新出现在目录/首页/标签页里，
 * 因此这里统一断言「每一条公开查询都带 shadow_banned = 0」。
 */
describe('公开查询排除 shadowban 作品', () => {
  const mockDB = { prepare: vi.fn() };

  /** 记录执行过的 SQL 语句 */
  function captureQuery(rows: unknown[] = []) {
    const queries: string[] = [];
    mockDB.prepare.mockImplementation((query: string) => {
      queries.push(query);
      return {
        all: vi.fn().mockResolvedValue({ results: rows }),
        first: vi.fn().mockResolvedValue({ count: rows.length }),
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: rows }),
          first: vi.fn().mockResolvedValue({ count: rows.length }),
        }),
      };
    });
    return queries;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: { DB: mockDB } });
  });

  it('getPublishedGames 过滤被封禁作品', async () => {
    const queries = captureQuery([]);

    await getPublishedGames({ limit: 10 });

    expect(queries[0]).toContain('shadow_banned = 0');
  });

  it('getPublishedGamesCount 过滤被封禁作品', async () => {
    const queries = captureQuery([]);

    await getPublishedGamesCount();

    expect(queries[0]).toContain('shadow_banned = 0');
  });

  it('getRelatedGames 过滤被封禁作品', async () => {
    const queries = captureQuery([]);

    await getRelatedGames('current', ['标签'], 4);

    expect(queries[0]).toContain('shadow_banned = 0');
  });
});
