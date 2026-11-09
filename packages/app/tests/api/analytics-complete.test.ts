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
import { POST } from '@/app/api/analytics/complete/route';
import { recordDailyAnalytics } from '@/lib/daily-analytics';

const dialect = new SQLiteSyncDialect();

/** 把 db.run 收到的 drizzle SQL 对象编码为 { sql, params } */
function toSqlQuery(query: unknown): { sql: string; params: unknown[] } {
  return dialect.sqlToQuery(query as Parameters<typeof dialect.sqlToQuery>[0]);
}

function makeReq(body: unknown) {
  return new Request('http://localhost/api/analytics/complete', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/analytics/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('缺少 gameId 返回 400', async () => {
    const res = await POST(makeReq({ duration: 60 }));

    expect(res.status).toBe(400);
  });

  it('duration 为负数返回 400', async () => {
    const res = await POST(makeReq({ gameId: 1, duration: -1 }));

    expect(res.status).toBe(400);
  });

  it('DB 未配置时返回 500', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValueOnce({ env: {} });

    const res = await POST(makeReq({ gameId: 1, duration: 60 }));

    expect(res.status).toBe(500);
  });

  it('成功路径（无评分）：增量写入完成数/时长/会话数，评分不变', async () => {
    const res = await POST(makeReq({ gameId: 1, duration: 120 }));

    expect(res.status).toBe(200);
    expect(run).toHaveBeenCalledTimes(1);
    const query = toSqlQuery(run.mock.calls[0][0]);
    expect(query.sql).toContain('INSERT INTO GameAnalytics');
    expect(query.sql).toContain('completion_count = COALESCE(completion_count, 0) + 1');
    expect(query.sql).toContain('total_duration = COALESCE(total_duration, 0) +');
    expect(query.params).toContain(120);
    expect(query.params).toContain(1); // session_count 增量
    expect(recordDailyAnalytics).toHaveBeenCalledWith(1, 'complete');
  });

  it('成功路径（带合法评分 1-5）：同时累加评分次数与总分', async () => {
    const res = await POST(makeReq({ gameId: 1, duration: 60, rating: 5 }));

    expect(res.status).toBe(200);
    const query = toSqlQuery(run.mock.calls[0][0]);
    expect(query.sql).toContain('rating_count = COALESCE(rating_count, 0) +');
    expect(query.sql).toContain('rating_sum = COALESCE(rating_sum, 0) +');
    expect(query.params).toContain(5);
  });

  it('评分超出 1-5 范围时不计入评分', async () => {
    const res = await POST(makeReq({ gameId: 1, duration: 60, rating: 9 }));

    expect(res.status).toBe(200);
    const query = toSqlQuery(run.mock.calls[0][0]);
    expect(query.params).not.toContain(9);
  });
});
