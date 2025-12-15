import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import type { AiUsageInfo } from '@mui-gamebook/core/lib/ai';
import { incrementUserDailyUsage } from './usage-limit';

export type AiUsageType =
  | 'text_generation'
  | 'image_generation'
  | 'audio_generation'
  | 'video_generation'
  | 'minigame_generation';

interface RecordUsageParams {
  userId: string;
  type: AiUsageType;
  model: string;
  usage: AiUsageInfo;
  gameId?: number;
}

/**
 * 记录 AI 用量到数据库，同时更新每日用量统计（用于限制）
 */
export async function recordAiUsage(params: RecordUsageParams): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    // 记录到数据库
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

    // 同时更新 KV 中的每日用量统计
    await incrementUserDailyUsage(params.userId, params.usage.totalTokens);

    console.log(
      `[AI Usage] 记录用量: 用户=${params.userId}, 类型=${params.type}, 模型=${params.model}, 总token=${params.usage.totalTokens}`,
    );
  } catch (error) {
    // 用量记录失败不应阻止主流程
    console.error('[AI Usage] 记录用量失败:', error);
  }
}
