import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import type { AiUsageInfo } from '@mui-gamebook/core/lib/ai';

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
 * 记录 AI 用量到数据库。每日用量统计（用于限制）直接从这张表实时聚合，
 * 这次 insert 本身就是"增量"，不需要再单独维护一份用量计数器。
 */
export async function recordAiUsage(params: RecordUsageParams): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    await db.insert(schema.aiUsage).values({
      userId: params.userId,
      type: params.type,
      model: params.model,
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
      totalTokens: params.usage.totalTokens,
      gameId: params.gameId,
      createdAt: new Date(),
    });

    console.log(
      `[AI Usage] 记录用量: 用户=${params.userId}, 类型=${params.type}, 模型=${params.model}, 总token=${params.usage.totalTokens}`,
    );
  } catch (error) {
    // 用量记录失败不应阻止主流程
    console.error('[AI Usage] 记录用量失败:', error);
  }
}
