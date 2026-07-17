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

import { recordAiUsage } from '@/lib/ai-usage';

describe('recordAiUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常路径：写入 D1（这一行本身就是每日用量的权威数据，不再需要单独记账）', async () => {
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
  });

  it('D1 写入失败时静默吞掉', async () => {
    insertValuesMock.mockRejectedValue(new Error('D1 down'));

    await expect(
      recordAiUsage({
        userId: 'u1',
        type: 'chat',
        model: 'gpt-x',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
    ).resolves.toBeUndefined();
  });
});
