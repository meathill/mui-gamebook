import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, gte, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isAdminUserId } from './admin';
import { getConfig } from './config';
import { getPeriodUsage, getUsableSubscription, getUsageWindow, type SubscriptionRecord } from './billing';

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
  /** 订阅用户的账单周期；免费档为 null */
  periodStart?: Date | null;
  periodEnd?: Date | null;
  planCode?: 'free' | 'admin' | 'basic' | 'pro';
}

function buildLimitResult(
  allowed: boolean,
  currentUsage: number,
  limit: number,
  message?: string,
  extra?: Partial<UsageLimitCheckResult>,
): UsageLimitCheckResult {
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - currentUsage);
  return {
    allowed,
    currentUsage,
    limit,
    remaining: allowed ? remaining : 0,
    message,
    ...extra,
  };
}

/**
 * 检查用户是否可以继续使用 AI 服务。
 * 优先级：管理员不限量 → 有效订阅按账单周期月包 → 免费档日额度。
 */
export async function checkUserUsageLimit(userId: string): Promise<UsageLimitCheckResult> {
  try {
    const config = await getConfig();

    if (await isAdminUserId(userId)) {
      return buildLimitResult(true, 0, Infinity, '管理员用户，无限制', {
        planCode: 'admin',
        periodStart: null,
        periodEnd: null,
      });
    }

    const subscription = await getUsableSubscription(userId);
    if (subscription) {
      return checkSubscriptionUsage(userId, subscription);
    }

    const usage = await getUserDailyUsage(userId);
    const limit = config.dailyTokenLimit;
    if (usage.totalTokens >= limit) {
      return buildLimitResult(
        false,
        usage.totalTokens,
        limit,
        `今日 AI 用量已达上限（${limit.toLocaleString()} tokens），请明天再试或订阅套餐`,
        {
          planCode: 'free',
          periodStart: null,
          periodEnd: null,
        },
      );
    }

    return buildLimitResult(true, usage.totalTokens, limit, undefined, {
      planCode: 'free',
      periodStart: null,
      periodEnd: null,
    });
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

async function checkSubscriptionUsage(
  userId: string,
  subscription: SubscriptionRecord,
): Promise<UsageLimitCheckResult> {
  const window = getUsageWindow(subscription);
  const currentUsage = await getPeriodUsage(userId, window.start, window.end);
  const limit = subscription.monthlyTokenLimit;
  const extra: Partial<UsageLimitCheckResult> = {
    planCode: subscription.planCode,
    periodStart: window.start,
    periodEnd: window.end,
  };

  if (currentUsage >= limit) {
    return buildLimitResult(
      false,
      currentUsage,
      limit,
      `本周期 AI 用量已达套餐上限（${limit.toLocaleString()} tokens），请等待下个账单周期或升级套餐`,
      extra,
    );
  }

  return buildLimitResult(true, currentUsage, limit, undefined, extra);
}
