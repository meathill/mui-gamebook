/**
 * 订阅套餐与计费读写。
 * Token 仍用 M Token（$1 成本 = 1M billed tokens）；套餐面值按 $0.00001/Token 展示。
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isAdminUserId } from './admin';

export type PlanCode = 'basic' | 'pro';
export type BillingInterval = 'month' | 'year';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  /** 月付标价 USD */
  monthlyPriceUsd: number;
  /** 年付标价 USD */
  yearlyPriceUsd: number;
  /** 每账单周期 M Token 额度（年付按月周期重置，额度与月付相同） */
  monthlyTokenLimit: number;
}

export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  basic: {
    code: 'basic',
    name: 'Pro',
    monthlyPriceUsd: 9.98,
    yearlyPriceUsd: 99.98,
    monthlyTokenLimit: 1_000_000,
  },
  pro: {
    code: 'pro',
    name: 'Pro+',
    monthlyPriceUsd: 19.98,
    yearlyPriceUsd: 199.98,
    monthlyTokenLimit: 2_000_000,
  },
};

/** 套餐兑换展示价：标价 ÷ 单价 ≈ 面值 Token */
export const PLAN_TOKEN_UNIT_PRICE_USD = 0.00001;

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

/** past_due 在账单周期结束前仍宽限原额度 */
export const GRACE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['past_due'];

export function isPlanCode(value: string): value is PlanCode {
  return value === 'basic' || value === 'pro';
}

export function isBillingInterval(value: string): value is BillingInterval {
  return value === 'month' || value === 'year';
}

export function getPlanDefinition(planCode: PlanCode): PlanDefinition {
  return PLAN_DEFINITIONS[planCode];
}

export function resolvePriceId(env: CloudflareEnv, planCode: PlanCode, interval: BillingInterval): string {
  const map: Record<string, string | undefined> = {
    'basic:month': env.STRIPE_PRICE_BASIC_MONTHLY,
    'basic:year': env.STRIPE_PRICE_BASIC_YEARLY,
    'pro:month': env.STRIPE_PRICE_PRO_MONTHLY,
    'pro:year': env.STRIPE_PRICE_PRO_YEARLY,
  };
  const priceId = map[`${planCode}:${interval}`];
  if (!priceId) {
    throw new Error(`未配置 Stripe Price ID：${planCode}/${interval}`);
  }
  return priceId;
}

export function resolvePlanFromPriceId(
  env: CloudflareEnv,
  priceId: string,
): { planCode: PlanCode; interval: BillingInterval } | null {
  const entries: Array<{ planCode: PlanCode; interval: BillingInterval; priceId: string | undefined }> = [
    { planCode: 'basic', interval: 'month', priceId: env.STRIPE_PRICE_BASIC_MONTHLY },
    { planCode: 'basic', interval: 'year', priceId: env.STRIPE_PRICE_BASIC_YEARLY },
    { planCode: 'pro', interval: 'month', priceId: env.STRIPE_PRICE_PRO_MONTHLY },
    { planCode: 'pro', interval: 'year', priceId: env.STRIPE_PRICE_PRO_YEARLY },
  ];
  const hit = entries.find((item) => item.priceId && item.priceId === priceId);
  return hit ? { planCode: hit.planCode, interval: hit.interval } : null;
}

export interface SubscriptionRecord {
  id: number;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  planCode: PlanCode;
  interval: BillingInterval;
  status: SubscriptionStatus;
  monthlyTokenLimit: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

function toSubscriptionRecord(row: typeof schema.subscriptions.$inferSelect): SubscriptionRecord {
  return {
    id: row.id,
    userId: row.userId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripeCustomerId: row.stripeCustomerId,
    stripePriceId: row.stripePriceId,
    planCode: row.planCode as PlanCode,
    interval: row.interval as BillingInterval,
    status: row.status as SubscriptionStatus,
    monthlyTokenLimit: row.monthlyTokenLimit,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const [row] = await db
    .select({ stripeCustomerId: schema.stripeCustomers.stripeCustomerId })
    .from(schema.stripeCustomers)
    .where(eq(schema.stripeCustomers.userId, userId))
    .limit(1);
  return row?.stripeCustomerId ?? null;
}

export async function ensureStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const now = new Date();
  await db
    .insert(schema.stripeCustomers)
    .values({ userId, stripeCustomerId, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.stripeCustomers.userId,
      set: { stripeCustomerId, updatedAt: now },
    });
}

export async function getActiveSubscription(userId: string): Promise<SubscriptionRecord | null> {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const [row] = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(eq(schema.subscriptions.userId, userId), inArray(schema.subscriptions.status, ACTIVE_SUBSCRIPTION_STATUSES)),
    )
    .orderBy(desc(schema.subscriptions.currentPeriodEnd))
    .limit(1);
  return row ? toSubscriptionRecord(row) : null;
}

/** 有效订阅 + past_due 宽限（周期未结束） */
export async function getUsableSubscription(userId: string, now = new Date()): Promise<SubscriptionRecord | null> {
  const active = await getActiveSubscription(userId);
  if (active) return active;

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const [row] = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        inArray(schema.subscriptions.status, GRACE_SUBSCRIPTION_STATUSES),
        gte(schema.subscriptions.currentPeriodEnd, now),
      ),
    )
    .orderBy(desc(schema.subscriptions.currentPeriodEnd))
    .limit(1);
  return row ? toSubscriptionRecord(row) : null;
}

export async function listSubscriptionsByUser(userId: string): Promise<SubscriptionRecord[]> {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId))
    .orderBy(schema.subscriptions.createdAt);
  return rows.map(toSubscriptionRecord);
}

export interface UpsertSubscriptionParams {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  planCode: PlanCode;
  interval: BillingInterval;
  status: SubscriptionStatus;
  monthlyTokenLimit: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export async function upsertSubscription(params: UpsertSubscriptionParams): Promise<void> {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const now = new Date();
  await db
    .insert(schema.subscriptions)
    .values({
      userId: params.userId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripeCustomerId: params.stripeCustomerId,
      stripePriceId: params.stripePriceId,
      planCode: params.planCode,
      interval: params.interval,
      status: params.status,
      monthlyTokenLimit: params.monthlyTokenLimit,
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.stripeSubscriptionId,
      set: {
        stripeCustomerId: params.stripeCustomerId,
        stripePriceId: params.stripePriceId,
        planCode: params.planCode,
        interval: params.interval,
        status: params.status,
        // monthlyTokenLimit 保持首次下发快照，改价不影响已购用户
        currentPeriodStart: params.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd,
        updatedAt: now,
      },
    });
}

/** 账单周期内已用 M Token */
export async function getPeriodUsage(userId: string, periodStart: Date, periodEnd: Date): Promise<number> {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.aiUsage.totalTokens}), 0)` })
    .from(schema.aiUsage)
    .where(
      and(
        eq(schema.aiUsage.userId, userId),
        gte(schema.aiUsage.createdAt, periodStart),
        lt(schema.aiUsage.createdAt, periodEnd),
      ),
    );
  return row?.total ?? 0;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months);
  // 处理 1/31 → 2/31 溢出回退到当月最后一天
  if (next.getUTCDate() !== day) {
    next.setUTCDate(0);
  }
  return next;
}

/**
 * 用量统计窗口：月付用 Stripe 账单周期；年付等长周期按「周期起点对齐的自然月」滚动重置，
 * 保证年付用户每月拿到与月付相同的 1M/2M 包，而不是全年共用一个月包。
 */
export function getUsageWindow(subscription: SubscriptionRecord, now = new Date()): { start: Date; end: Date } {
  const { currentPeriodStart, currentPeriodEnd, interval } = subscription;
  if (interval === 'month') {
    return { start: currentPeriodStart, end: currentPeriodEnd };
  }

  let windowStart = currentPeriodStart;
  for (;;) {
    const nextStart = addMonths(windowStart, 1);
    const windowEnd = nextStart > currentPeriodEnd ? currentPeriodEnd : nextStart;
    if (now < windowEnd || windowStart >= currentPeriodEnd) {
      return { start: windowStart, end: windowEnd };
    }
    windowStart = nextStart;
    if (windowStart >= currentPeriodEnd) {
      return { start: currentPeriodStart, end: currentPeriodEnd };
    }
  }
}

export interface UserQuotaSnapshot {
  planCode: PlanCode | 'free' | 'admin';
  isSubscribed: boolean;
  isUnlimited: boolean;
  periodStart: Date | null;
  periodEnd: Date | null;
  periodUsage: number;
  periodLimit: number | null;
  cancelAtPeriodEnd: boolean;
  subscriptionStatus: SubscriptionStatus | null;
}

export async function getUserQuotaSnapshot(userId: string): Promise<UserQuotaSnapshot> {
  if (await isAdminUserId(userId)) {
    return {
      planCode: 'admin',
      isSubscribed: false,
      isUnlimited: true,
      periodStart: null,
      periodEnd: null,
      periodUsage: 0,
      periodLimit: null,
      cancelAtPeriodEnd: false,
      subscriptionStatus: null,
    };
  }

  const sub = await getUsableSubscription(userId);
  if (sub) {
    const window = getUsageWindow(sub);
    const periodUsage = await getPeriodUsage(userId, window.start, window.end);
    return {
      planCode: sub.planCode,
      isSubscribed: true,
      isUnlimited: false,
      periodStart: window.start,
      periodEnd: window.end,
      periodUsage,
      periodLimit: sub.monthlyTokenLimit,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      subscriptionStatus: sub.status,
    };
  }

  return {
    planCode: 'free',
    isSubscribed: false,
    isUnlimited: false,
    periodStart: null,
    periodEnd: null,
    periodUsage: 0,
    periodLimit: null,
    cancelAtPeriodEnd: false,
    subscriptionStatus: null,
  };
}
