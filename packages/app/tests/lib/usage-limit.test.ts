import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const kv = {
  get: vi.fn(),
  put: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { KV: kv } })),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

import { checkUserUsageLimit, getUserDailyUsage, incrementUserDailyUsage } from '@/lib/usage-limit';
import { getConfig } from '@/lib/config';

describe('getUserDailyUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('KV 有记录时返回解析后的值', async () => {
    kv.get.mockResolvedValue({ totalTokens: 500, lastUpdated: '2026-07-01T00:00:00.000Z' });

    const usage = await getUserDailyUsage('u1');

    expect(usage).toEqual({ totalTokens: 500, lastUpdated: '2026-07-01T00:00:00.000Z' });
  });

  it('KV 无记录时返回默认值', async () => {
    kv.get.mockResolvedValue(null);

    const usage = await getUserDailyUsage('u1');

    expect(usage.totalTokens).toBe(0);
  });

  it('KV 读取异常时 fail-open 返回默认值', async () => {
    kv.get.mockRejectedValue(new Error('KV down'));

    const usage = await getUserDailyUsage('u1');

    expect(usage.totalTokens).toBe(0);
  });
});

describe('incrementUserDailyUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('正常路径：key 按日期格式化、值累加、TTL 为两天', async () => {
    kv.get.mockResolvedValue({ totalTokens: 100, lastUpdated: '2026-07-12T00:00:00.000Z' });
    kv.put.mockResolvedValue(undefined);

    await incrementUserDailyUsage('u1', 50);

    expect(kv.put).toHaveBeenCalledTimes(1);
    const [key, body, options] = kv.put.mock.calls[0];
    expect(key).toBe('usage:daily:u1:2026-07-12');
    expect(JSON.parse(body).totalTokens).toBe(150);
    expect(options).toEqual({ expirationTtl: 172800 });
  });

  it('KV 写入异常时静默吞掉，不 reject', async () => {
    kv.get.mockResolvedValue({ totalTokens: 0, lastUpdated: '' });
    kv.put.mockRejectedValue(new Error('KV down'));

    await expect(incrementUserDailyUsage('u1', 10)).resolves.toBeUndefined();
  });

  it('[已知问题，见 TODO.md] 并发调用下计数会丢失，因为读改写不是原子操作', async () => {
    // 两次并发调用都读到同一个旧快照（100），不是互相累加的关系。
    // 正确的原子行为应该是 110 后再 130（或反过来），但读改写非原子导致两次都只基于
    // 同一个旧值各自计算。这条测试记录的是当前行为，不是期望行为——真正修复需要改成
    // D1 原子 UPDATE 或 Durable Object 计数器，属于架构改动，不在补测试范畴内顺带做。
    kv.get.mockResolvedValue({ totalTokens: 100, lastUpdated: '2026-07-12T00:00:00.000Z' });
    kv.put.mockResolvedValue(undefined);

    await Promise.all([incrementUserDailyUsage('u1', 10), incrementUserDailyUsage('u1', 20)]);

    const writtenTotals = kv.put.mock.calls
      .map(([, body]) => JSON.parse(body as string).totalTokens as number)
      .sort((a, b) => a - b);
    expect(writtenTotals).toEqual([110, 120]);
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
    kv.get.mockResolvedValue({ totalTokens: 400, lastUpdated: '' });

    const result = await checkUserUsageLimit('u1');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(600);
  });

  it('用量恰好等于上限时判定为超限', async () => {
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ adminUserIds: [], dailyTokenLimit: 1000 });
    kv.get.mockResolvedValue({ totalTokens: 1000, lastUpdated: '' });

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
