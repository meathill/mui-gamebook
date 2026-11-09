import { beforeEach, describe, expect, it, vi } from 'vitest';

const run = vi.fn();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({ run })),
}));

vi.mock('@/lib/daily-analytics', () => ({
  recordDailyAnalytics: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { POST } from '@/app/api/analytics/open/route';
import { recordDailyAnalytics } from '@/lib/daily-analytics';

const dialect = new SQLiteSyncDialect();

/** 把 db.run 收到的 drizzle SQL 对象编码为 { sql, params } */
function toSqlQuery(query: unknown): { sql: string; params: unknown[] } {
  return dialect.sqlToQuery(query as Parameters<typeof dialect.sqlToQuery>[0]);
}

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/analytics/open', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

describe('POST /api/analytics/open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('缺少 gameId 返回 400', async () => {
    const res = await POST(makeReq({}));

    expect(res.status).toBe(400);
  });

  it('DB 未配置时返回 500', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValueOnce({ env: {} });

    const res = await POST(makeReq({ gameId: 1 }));

    expect(res.status).toBe(500);
  });

  it('成功路径：直接增量写入打开数、来源、设备，并按天落库', async () => {
    const res = await POST(
      makeReq(
        { gameId: 1 },
        { referer: 'https://www.google.com/search', 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS)' },
      ),
    );

    expect(res.status).toBe(200);
    expect(run).toHaveBeenCalledTimes(3);

    const queries = run.mock.calls.map((call) => toSqlQuery(call[0]));
    expect(queries[0].sql).toContain('INSERT INTO GameAnalytics');
    expect(queries[0].sql).toContain('open_count = COALESCE(open_count, 0) + 1');
    expect(queries[0].params).toContain(1);

    expect(queries[1].sql).toContain('INSERT INTO ReferrerAnalytics');
    expect(queries[1].params).toContain('www.google.com');

    expect(queries[2].sql).toContain('INSERT INTO DeviceAnalytics');
    expect(queries[2].params).toContain('mobile');

    expect(recordDailyAnalytics).toHaveBeenCalledWith(1, 'open');
  });

  it('没有 referer/user-agent 时回退为 direct/desktop', async () => {
    const res = await POST(makeReq({ gameId: 2 }));

    expect(res.status).toBe(200);
    const queries = run.mock.calls.map((call) => toSqlQuery(call[0]));
    expect(queries[1].params).toContain('direct');
    expect(queries[2].params).toContain('desktop');
  });
});
