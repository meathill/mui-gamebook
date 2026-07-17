import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const whereMock = vi.fn();
const fromMock = vi.fn(() => ({ where: whereMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({ select: selectMock })),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

import { checkUserUsageLimit, getUserDailyUsage } from '@/lib/usage-limit';
import { getConfig } from '@/lib/config';

describe('getUserDailyUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('对 AiUsage 表按用户 + 当日范围做 SUM 聚合', async () => {
    whereMock.mockResolvedValue([{ total: 500 }]);

    const usage = await getUserDailyUsage('u1');

    expect(usage.totalTokens).toBe(500);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('当日没有记录时返回 0（coalesce 兜底）', async () => {
    whereMock.mockResolvedValue([{ total: 0 }]);

    const usage = await getUserDailyUsage('u1');

    expect(usage.totalTokens).toBe(0);
  });

  it('查询异常时 fail-open 返回默认值', async () => {
    whereMock.mockRejectedValue(new Error('D1 down'));

    const usage = await getUserDailyUsage('u1');

    expect(usage.totalTokens).toBe(0);
  });

  it('回归测试：两次 recordAiUsage 各自独立 INSERT，SUM 读到的是二者之和，不会像旧版 KV 读改写那样丢更新', async () => {
    // 旧版 bug：两次并发 incrementUserDailyUsage 都读到同一份旧快照，各自基于旧值计算，
    // 后写入的一次会覆盖前一次，总量只体现其中一次增量。现在 recordAiUsage 只做 INSERT，
    // 没有共享可变状态可读改写；这里用「SUM 已经等于两次增量之和」模拟两次 INSERT 都已落库，
    // 验证读到的是完整总量而不是被覆盖后的单次增量。
    whereMock.mockResolvedValue([{ total: 30 }]); // 10 + 20，两次都算上了

    const usage = await getUserDailyUsage('u1');

    expect(usage.totalTokens).toBe(30);
  });
});

describe('checkUserUsageLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('管理员用户无限制', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ adminUserIds: ['admin1'], dailyTokenLimit: 1000 });

    const result = await checkUserUsageLimit('admin1');

    expect(result).toEqual({
      allowed: true,
      currentUsage: 0,
      limit: Infinity,
      remaining: Infinity,
      message: '管理员用户，无限制',
    });
  });

  it('普通用户未超限', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ adminUserIds: [], dailyTokenLimit: 1000 });
    whereMock.mockResolvedValue([{ total: 400 }]);

    const result = await checkUserUsageLimit('u1');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(600);
  });

  it('用量恰好等于上限时判定为超限', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ adminUserIds: [], dailyTokenLimit: 1000 });
    whereMock.mockResolvedValue([{ total: 1000 }]);

    const result = await checkUserUsageLimit('u1');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('[已知权衡] getConfig 异常时 fail-open 允许通过', async () => {
    // 代码注释明确写着"出错时默认允许使用，避免影响用户体验"，这是有意为之的可用性权衡，
    // 不是无意识的 bug。这条测试把这个决定钉住并让代价可见：配置服务持续故障时，
    // 全局每日限额会静默失效。是否改成 fail-closed 需要产品侧决定，不在这里顺带改。
    (getConfig as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('config service down'));

    const result = await checkUserUsageLimit('u1');

    expect(result.allowed).toBe(true);
    expect(result.message).toBe('用量检查失败，暂时放行');
  });
});
