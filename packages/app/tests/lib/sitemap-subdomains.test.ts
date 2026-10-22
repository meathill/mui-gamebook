import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import sitemap from '@/app/sitemap';

vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: vi.fn() }));
vi.mock('@/lib/blog', () => ({ getPublishedPosts: vi.fn().mockResolvedValue({ docs: [] }) }));

function createScript(metadata = '') {
  return `---\ntitle: 测试作品\n${metadata}\n---\n\n# start\n\n故事开始。\n`;
}

describe('sitemap 统一使用主站作品链接（issue #25）', () => {
  let database: DatabaseSync;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://muistory.com');
    vi.stubGlobal('fetch', fetchMock);
    database = new DatabaseSync(':memory:');
    database.exec(`
      CREATE TABLE Games (
        id INTEGER PRIMARY KEY, slug TEXT, title TEXT, description TEXT, cover_image TEXT,
        tags TEXT, created_at INTEGER, updated_at INTEGER, published INTEGER, shadow_banned INTEGER
      );
      CREATE TABLE GameContent (game_id INTEGER PRIMARY KEY, content TEXT);
      CREATE TABLE GameRatings (game_id INTEGER, rating INTEGER, hidden INTEGER);
    `);
    vi.mocked(getCloudflareContext).mockReturnValue({
      env: {
        DB: {
          prepare(query: string) {
            return { all: async () => ({ results: database.prepare(query).all() }) };
          },
        },
      },
    } as unknown as ReturnType<typeof getCloudflareContext>);
  });

  afterEach(() => {
    database.close();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function insertGame(slug: string, content: string | null, published = 1, shadowBanned = 0) {
    const { lastInsertRowid } = database
      .prepare(
        "INSERT INTO Games (slug, title, tags, updated_at, published, shadow_banned) VALUES (?, ?, '[]', 1700000000, ?, ?)",
      )
      .run(slug, slug, published, shadowBanned);
    database.prepare('INSERT INTO GameContent (game_id, content) VALUES (?, ?)').run(lastInsertRowid, content);
  }

  it('历史绑定子站的已发布作品仍以主站 URL 进入 sitemap', async () => {
    insertGame('1-0771', createScript('subdomain: "11"'));
    insertGame('another-site', createScript('subdomain: another'));
    insertGame('main-site', createScript());
    insertGame('empty-subdomain', createScript('subdomain: ""'));
    insertGame('body-mention', `${createScript()}\nsubdomain: 仅为正文示例\n`);

    const entries = await sitemap();

    expect(entries.filter((entry) => entry.url.includes('/play/')).map((entry) => entry.url)).toEqual([
      'https://muistory.com/play/1-0771',
      'https://muistory.com/play/another-site',
      'https://muistory.com/play/main-site',
      'https://muistory.com/play/empty-subdomain',
      'https://muistory.com/play/body-mention',
    ]);
    expect(entries.every((entry) => new URL(entry.url).hostname === 'muistory.com')).toBe(true);
    expect(entries.find((entry) => entry.url.endsWith('/play/main-site'))?.lastModified).toEqual(
      new Date(1_700_000_000_000),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('继续排除未发布、被封禁和正文缺失的作品', async () => {
    insertGame('draft', createScript('subdomain: "11"'), 0);
    insertGame('banned', createScript(), 1, 1);
    insertGame('missing', null);
    insertGame('empty', '   ');
    insertGame('valid', createScript());

    const entries = await sitemap();

    expect(entries.filter((entry) => entry.url.includes('/play/')).map((entry) => entry.url)).toEqual([
      'https://muistory.com/play/valid',
    ]);
  });

  it.each(['无请求上下文', 'D1 查询失败'])('构建期%s时，历史子站作品仍从公开目录生成主站 URL', async (failure) => {
    if (failure === '无请求上下文') {
      vi.mocked(getCloudflareContext).mockImplementation(() => {
        throw new Error(failure);
      });
    } else {
      database.exec('DROP TABLE Games');
    }
    const rows = ['1-0771', 'main-site'].map((slug) => ({
      slug,
      title: slug,
      tags: [],
      subdomain: slug === '1-0771' ? '11' : undefined,
      updated_at: 1_700_000_000,
    }));
    fetchMock.mockResolvedValue({ ok: true, json: async () => rows });

    const entries = await sitemap();

    expect(entries.filter((entry) => entry.url.includes('/play/')).map((entry) => entry.url)).toEqual([
      'https://muistory.com/play/1-0771',
      'https://muistory.com/play/main-site',
    ]);
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes('/api/games?'))).toBe(true);
  });
});
