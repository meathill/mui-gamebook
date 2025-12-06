import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getConfig } from './config';

/**
 * 获取今日的 KV key
 */
function getTodayKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `usage:daily:${userId}:${today}`;
}

/**
 * 用户每日用量信息
 */
export interface DailyUsage {
  totalTokens: number;
  lastUpdated: string;
}

/**
 * 获取用户今日的 AI 用量
 */
export async function getUserDailyUsage(userId: string): Promise<DailyUsage> {
  try {
    const { env } = getCloudflareContext();
    const kv = env.KV;
    
    const key = getTodayKey(userId);
    const usage = await kv.get<DailyUsage>(key, 'json');
    
    return usage || { totalTokens: 0, lastUpdated: new Date().toISOString() };
  } catch (error) {
    console.error('[Usage Limit] 获取用户每日用量失败:', error);
    return { totalTokens: 0, lastUpdated: new Date().toISOString() };
  }
}

/**
 * 增加用户今日的 AI 用量
 */
export async function incrementUserDailyUsage(userId: string, tokens: number): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const kv = env.KV;
    
    const key = getTodayKey(userId);
    const current = await getUserDailyUsage(userId);
    
    const newUsage: DailyUsage = {
      totalTokens: current.totalTokens + tokens,
      lastUpdated: new Date().toISOString(),
    };
    
    // 设置 TTL 为 2 天，确保过期数据自动清理
    await kv.put(key, JSON.stringify(newUsage), { expirationTtl: 2 * 24 * 60 * 60 });
    
    console.log(`[Usage Limit] 用户 ${userId} 今日用量: ${newUsage.totalTokens} tokens`);
  } catch (error) {
    console.error('[Usage Limit] 更新用户每日用量失败:', error);
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
