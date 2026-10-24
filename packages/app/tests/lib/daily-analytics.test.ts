import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { getUtcDate, recordDailyAnalytics } from '@/lib/daily-analytics';

const dialect = new SQLiteSyncDialect();

/** 把 db.run 收到的 drizzle SQL 对象编码为 { sql, params } */
function toSqlQuery(query: unknown): { sql: string; params: unknown[] } {
  return dialect.sqlToQuery(query as Parameters<typeof dialect.sqlToQuery>[0]);
}

describe('recordDailyAnalytics', () => {
  const run = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    (drizzle as ReturnType<typeof vi.fn>).mockReturnValue({ run });
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: { DB: {} } });
  });

  it('UPSERT 语句带 ON CONFLICT 与 excluded 累加', async () => {
    await recordDailyAnalytics(1, 'open');

    expect(run).toHaveBeenCalledTimes(1);
    const query = toSqlQuery(run.mock.calls[0][0]);
    expect(query.sql).toContain('INSERT INTO GameDailyAnalytics');
    expect(query.sql).toContain('ON CONFLICT (game_id, date) DO UPDATE SET');
    expect(query.sql).toContain('open_count = open_count + excluded.open_count');
    expect(query.sql).toContain('completion_count = completion_count + excluded.completion_count');
    expect(query.params[0]).toBe(1);
  });

  it('open 与 complete 分别只累计对应列', async () => {
    await recordDailyAnalytics(2, 'open');
    const openQuery = toSqlQuery(run.mock.calls[0][0]);
    expect(openQuery.params).toEqual([2, expect.any(String), 1, 0]);

    await recordDailyAnalytics(2, 'complete');
    const completeQuery = toSqlQuery(run.mock.calls[1][0]);
    expect(completeQuery.params).toEqual([2, expect.any(String), 0, 1]);
  });

  it('getUtcDate 输出 UTC 日期 YYYY-MM-DD', () => {
    expect(getUtcDate(new Date('2026-10-24T08:30:00Z'))).toBe('2026-10-24');
    // UTC 23 点之后的北京时间次日早上，仍应归 UTC 当天
    expect(getUtcDate(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12-31');
  });

  it('写入失败不抛错（不阻断主流程）', async () => {
    run.mockRejectedValueOnce(new Error('db down'));
    await expect(recordDailyAnalytics(3, 'open')).resolves.toBeUndefined();
  });
});
