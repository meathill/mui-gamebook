import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

const insertValuesMock = vi.fn();

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({
    insert: vi.fn(() => ({ values: insertValuesMock })),
  })),
}));

vi.mock('@/lib/usage-limit', () => ({
  incrementUserDailyUsage: vi.fn(),
}));

import { recordAiUsage } from '@/lib/ai-usage';
import { incrementUserDailyUsage } from '@/lib/usage-limit';

describe('recordAiUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常路径：写入 D1 并同步更新 KV 每日用量', async () => {
    insertValuesMock.mockResolvedValue(undefined);

    await recordAiUsage({
      userId: 'u1',
      type: 'text_generation',
      model: 'claude-sonnet-5',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      gameId: 5,
    });

    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: 'text_generation',
        model: 'claude-sonnet-5',
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        gameId: 5,
      }),
    );
    expect(incrementUserDailyUsage).toHaveBeenCalledWith('u1', 30);
  });

  it('D1 写入失败时静默吞掉，且不会继续更新 KV（两个记账通道一起跳过）', async () => {
    insertValuesMock.mockRejectedValue(new Error('D1 down'));

    await expect(
      recordAiUsage({
        userId: 'u1',
        type: 'chat',
        model: 'gpt-x',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
    ).resolves.toBeUndefined();

    expect(incrementUserDailyUsage).not.toHaveBeenCalled();
  });
});
