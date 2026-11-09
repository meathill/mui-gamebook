import { beforeEach, describe, expect, it, vi } from 'vitest';

const rowGet = vi.fn();
const onConflictDoUpdate = vi.fn();
const values = vi.fn((_payload: { id: number; data: string; updatedAt: Date }) => ({ onConflictDoUpdate }));
const insert = vi.fn(() => ({ values }));
const select = vi.fn(() => ({
  from: () => ({ where: () => ({ get: rowGet }) }),
}));

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {}, DAILY_TOKEN_LIMIT: '123' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({ select, insert })),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getConfig, updateConfig } from '@/lib/config';

describe('config (D1-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rowGet.mockResolvedValue(null);
  });

  it('没有保存过配置时返回环境变量默认值', async () => {
    const config = await getConfig();

    expect(config.dailyTokenLimit).toBe(123);
  });

  it('保存过配置时在默认值上叠加，并兼容旧字段名', async () => {
    rowGet.mockResolvedValueOnce({
      data: JSON.stringify({
        dailyTokenLimit: 456,
        defaultAiProvider: 'google',
        videoWhitelist: ['legacy'],
      }),
    });

    const config = await getConfig();

    expect(config.dailyTokenLimit).toBe(456);
    expect(config.defaultTextProvider).toBe('google');
    expect(config.defaultAiProvider).toBe('google');
    expect((config as unknown as Record<string, unknown>).videoWhitelist).toBeUndefined();
  });

  it('updateConfig 将合并后的配置写入单行表', async () => {
    await updateConfig({ dailyTokenLimit: 999 });

    expect(insert).toHaveBeenCalledTimes(1);
    const payload = values.mock.calls[0][0];
    expect(payload.id).toBe(1);
    expect(JSON.parse(payload.data).dailyTokenLimit).toBe(999);
    expect(payload.updatedAt).toBeInstanceOf(Date);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it('DB 未配置时 getConfig 返回默认值，updateConfig 抛错', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: {} });

    const config = await getConfig();
    expect(config.dailyTokenLimit).toBe(100000);

    await expect(updateConfig({ dailyTokenLimit: 1 })).rejects.toThrow('Database not configured');
  });
});
