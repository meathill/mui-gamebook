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

  it('正常路径：写入 D1 并将实际成本换算为标准计费 Token (totalTokens)', async () => {
    insertValuesMock.mockResolvedValue(undefined);

    // Claude Sonnet 5: 10 prompt tokens ($3/1M) + 20 completion tokens ($15/1M) = $0.00033 USD = 330 billed tokens
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
        totalTokens: 330,
        gameId: 5,
      }),
    );
  });

  it('文本路径：DeepSeek V4 Flash 换算计费 Token (1000 in, 2000 out -> 2100 billed tokens)', async () => {
    insertValuesMock.mockResolvedValue(undefined);

    await recordAiUsage({
      userId: 'u1',
      type: 'text_generation',
      model: 'deepseek-v4-flash',
      usage: { promptTokens: 1000, completionTokens: 2000, totalTokens: 3000 },
      gameId: 1,
    });

    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: 'text_generation',
        model: 'deepseek-v4-flash',
        totalTokens: 2100,
      }),
    );
  });

  it('文本路径：GPT-5.6 Luna 5折特惠期换算计费 Token (1000 in, 2000 out -> 1800 billed tokens)', async () => {
    insertValuesMock.mockResolvedValue(undefined);

    await recordAiUsage({
      userId: 'u1',
      type: 'text_generation',
      model: 'gpt-5.6-luna',
      usage: { promptTokens: 1000, completionTokens: 2000, totalTokens: 3000 },
      gameId: 2,
    });

    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: 'text_generation',
        model: 'gpt-5.6-luna',
        totalTokens: 1800,
      }),
    );
  });

  it('生图路径：按单次生图定价核算计费 Token (0.03 USD -> 30,000 tokens)', async () => {
    insertValuesMock.mockResolvedValue(undefined);

    await recordAiUsage({
      userId: 'u1',
      type: 'image_generation',
      model: 'gemini-3.1-flash-lite-image',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: 'image_generation',
        model: 'gemini-3.1-flash-lite-image',
        totalTokens: 30000,
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
