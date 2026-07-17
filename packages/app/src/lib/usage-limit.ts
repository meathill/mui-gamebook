import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, gte, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getConfig } from './config';

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * 用户每日用量信息
 */
export interface DailyUsage {
  totalTokens: number;
  lastUpdated: string;
}

/**
 * 获取用户今日的 AI 用量：对 AiUsage 表做实时 SUM 聚合。
 * recordAiUsage 写入的每一行本身就是权威数据，这里不再单独维护一份 KV 计数器——
 * 旧版 KV 读-改-写不是原子操作，并发请求下会丢计数（见 usage-limit.test.ts 历史）。
 * 只有 INSERT、没有共享可变状态可读改写，天然不会有这个问题。
 */
export async function getUserDailyUsage(userId: string): Promise<DailyUsage> {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.aiUsage.totalTokens}), 0)` })
      .from(schema.aiUsage)
      .where(and(eq(schema.aiUsage.userId, userId), gte(schema.aiUsage.createdAt, startOfTodayUtc())));

    return { totalTokens: row?.total ?? 0, lastUpdated: new Date().toISOString() };
  } catch (error) {
    console.error('[Usage Limit] 获取用户每日用量失败:', error);
    return { totalTokens: 0, lastUpdated: new Date().toISOString() };
  }
}

/**
 * 用量检查结果
 */
export interface UsageLimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  message?: string;
}

/**
 * 检查用户是否可以继续使用 AI 服务
 * @returns 检查结果，包含是否允许继续使用的信息
 */
export async function checkUserUsageLimit(userId: string): Promise<UsageLimitCheckResult> {
  try {
    const config = await getConfig();

    // 检查是否是管理员用户
    if (config.adminUserIds.includes(userId)) {
      return {
        allowed: true,
        currentUsage: 0,
        limit: Infinity,
        remaining: Infinity,
        message: '管理员用户，无限制',
      };
    }

    const usage = await getUserDailyUsage(userId);
    const limit = config.dailyTokenLimit;
    const remaining = Math.max(0, limit - usage.totalTokens);

    if (usage.totalTokens >= limit) {
      return {
        allowed: false,
        currentUsage: usage.totalTokens,
        limit,
        remaining: 0,
        message: `今日 AI 用量已达上限（${limit.toLocaleString()} tokens），请明天再试`,
      };
    }

    return {
      allowed: true,
      currentUsage: usage.totalTokens,
      limit,
      remaining,
    };
  } catch (error) {
    console.error('[Usage Limit] 检查用量限制失败:', error);
    // 出错时默认允许使用，避免影响用户体验
    return {
      allowed: true,
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      message: '用量检查失败，暂时放行',
    };
  }
}
