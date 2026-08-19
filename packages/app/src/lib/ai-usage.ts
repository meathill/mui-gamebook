import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import type { AiUsageInfo } from '@mui-gamebook/core/lib/ai';
import { calculateBilledTokens } from '@mui-gamebook/core/lib/pricing';

export type AiUsageType =
  | 'text_generation'
  | 'image_generation'
  | 'audio_generation'
  | 'video_generation'
  | 'minigame_generation'
  | 'chat'
  | 'clarify_questions';

interface RecordUsageParams {
  userId: string;
  type: AiUsageType;
  model: string;
  usage: AiUsageInfo;
  gameId?: number;
}

/**
 * 记录 AI 用量到数据库。
 * 根据模型与模态的真实每 1M Token（或次/字符）定价核算标准计费 Token（totalTokens），
 * 每日用量统计与限额直接从 AiUsage 表 SUM(totalTokens) 聚合。
 */
export async function recordAiUsage(params: RecordUsageParams): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    const billedTokens = calculateBilledTokens({
      type: params.type,
      model: params.model,
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
      totalTokens: params.usage.totalTokens,
    });

    await db.insert(schema.aiUsage).values({
      userId: params.userId,
      type: params.type,
      model: params.model,
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
      totalTokens: billedTokens,
      gameId: params.gameId,
      createdAt: new Date(),
    });

    console.log(
      `[AI Usage] 记录用量: 用户=${params.userId}, 类型=${params.type}, 模型=${params.model}, 原始token=${params.usage.totalTokens}, 核算计费token=${billedTokens}`,
    );
  } catch (error) {
    // 用量记录失败不应阻止主流程
    console.error('[AI Usage] 记录用量失败:', error);
  }
}
