import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectChain = {
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
};
const insertChain = {
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
};
const updateChain = {
  set: vi.fn(),
  where: vi.fn(),
};
const dbMock = {
  select: vi.fn(() => selectChain),
  insert: vi.fn(() => insertChain),
  update: vi.fn(() => updateChain),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: {
      DB: {},
      STRIPE_PRICE_BASIC_MONTHLY: 'price_basic_m',
      STRIPE_PRICE_BASIC_YEARLY: 'price_basic_y',
      STRIPE_PRICE_PRO_MONTHLY: 'price_pro_m',
      STRIPE_PRICE_PRO_YEARLY: 'price_pro_y',
    },
  })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => dbMock),
}));

const { isAdminUserIdMock } = vi.hoisted(() => ({ isAdminUserIdMock: vi.fn() }));
vi.mock('@/lib/admin', () => ({
  isAdminUserId: isAdminUserIdMock,
  isRootUser: vi.fn(),
  isAdminUser: vi.fn(),
}));

import {
  PLAN_DEFINITIONS,
  ensureStripeCustomer,
  getActiveSubscription,
  getPeriodUsage,
  getUsageWindow,
  getUsableSubscription,
  getUserQuotaSnapshot,
  isBillingInterval,
  isPlanCode,
  resolvePlanFromPriceId,
  resolvePriceId,
  upsertSubscription,
  type SubscriptionRecord,
} from '@/lib/billing';

function makeSub(overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
  return {
    id: 1,
    userId: 'u1',
    stripeSubscriptionId: 'sub_1',
    stripeCustomerId: 'cus_1',
    stripePriceId: 'price_basic_y',
    planCode: 'basic',
    interval: 'year',
    status: 'active',
    monthlyTokenLimit: 1_000_000,
    currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe('getUsageWindow', () => {
  it('月付窗口 = Stripe 账单周期', () => {
    const sub = makeSub({
      interval: 'month',
      currentPeriodStart: new Date('2026-09-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
    });
    const win = getUsageWindow(sub, new Date('2026-09-15T00:00:00.000Z'));
    expect(win.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(win.end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('年付按月重置：9 月中使用落在 9/1–10/1 窗口', () => {
    const sub = makeSub({
      interval: 'year',
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z'),
    });
    const win = getUsageWindow(sub, new Date('2026-09-15T00:00:00.000Z'));
    expect(win.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(win.end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('年付最后一个窗口不越过 currentPeriodEnd', () => {
    const sub = makeSub({
      interval: 'year',
      currentPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
      currentPeriodEnd: new Date('2027-01-15T00:00:00.000Z'),
    });
    const win = getUsageWindow(sub, new Date('2027-01-10T00:00:00.000Z'));
    expect(win.start.toISOString()).toBe('2026-12-15T00:00:00.000Z');
    expect(win.end.toISOString()).toBe('2027-01-15T00:00:00.000Z');
  });
});

const env = {
  STRIPE_PRICE_BASIC_MONTHLY: 'price_basic_m',
  STRIPE_PRICE_BASIC_YEARLY: 'price_basic_y',
  STRIPE_PRICE_PRO_MONTHLY: 'price_pro_m',
  STRIPE_PRICE_PRO_YEARLY: 'price_pro_y',
} as unknown as CloudflareEnv;

describe('套餐常量', () => {
  it('基础 1M / 专业 2M 月度 M Token，年付不加量', () => {
    expect(PLAN_DEFINITIONS.basic.monthlyTokenLimit).toBe(1_000_000);
    expect(PLAN_DEFINITIONS.pro.monthlyTokenLimit).toBe(2_000_000);
    expect(PLAN_DEFINITIONS.basic.monthlyPriceUsd).toBe(9.98);
    expect(PLAN_DEFINITIONS.basic.yearlyPriceUsd).toBe(99.98);
    expect(PLAN_DEFINITIONS.pro.monthlyPriceUsd).toBe(19.98);
    expect(PLAN_DEFINITIONS.pro.yearlyPriceUsd).toBe(199.98);
  });

  it('校验 planCode / interval', () => {
    expect(isPlanCode('basic')).toBe(true);
    expect(isPlanCode('vip')).toBe(false);
    expect(isBillingInterval('year')).toBe(true);
    expect(isBillingInterval('week')).toBe(false);
  });

  it('Price ID 双向映射', () => {
    expect(resolvePriceId(env, 'basic', 'month')).toBe('price_basic_m');
    expect(resolvePlanFromPriceId(env, 'price_pro_y')).toEqual({ planCode: 'pro', interval: 'year' });
    expect(resolvePlanFromPriceId(env, 'price_unknown')).toBeNull();
  });

  it('缺少 Price ID 时抛错', () => {
    const emptyEnv = {
      STRIPE_PRICE_BASIC_MONTHLY: '',
      STRIPE_PRICE_BASIC_YEARLY: '',
      STRIPE_PRICE_PRO_MONTHLY: '',
      STRIPE_PRICE_PRO_YEARLY: '',
    } as unknown as CloudflareEnv;
    expect(() => resolvePriceId(emptyEnv, 'basic', 'month')).toThrow(/未配置 Stripe Price ID/);
  });
});

describe('订阅读写', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminUserIdMock.mockResolvedValue(false);
  });

  it('getActiveSubscription 只取 active/trialing', async () => {
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.orderBy.mockReturnValue(selectChain);
    selectChain.limit.mockResolvedValue([
      {
        id: 1,
        userId: 'u1',
        stripeSubscriptionId: 'sub_1',
        stripeCustomerId: 'cus_1',
        stripePriceId: 'price_basic_m',
        planCode: 'basic',
        interval: 'month',
        status: 'active',
        monthlyTokenLimit: 1_000_000,
        currentPeriodStart: new Date('2026-09-01'),
        currentPeriodEnd: new Date('2026-10-01'),
        cancelAtPeriodEnd: false,
      },
    ]);

    const sub = await getActiveSubscription('u1');
    expect(sub?.planCode).toBe('basic');
    expect(sub?.monthlyTokenLimit).toBe(1_000_000);
  });

  it('getUsableSubscription 无 active 时考虑 past_due 宽限', async () => {
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.orderBy.mockReturnValue(selectChain);
    selectChain.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 2,
        userId: 'u1',
        stripeSubscriptionId: 'sub_2',
        stripeCustomerId: 'cus_1',
        stripePriceId: 'price_pro_m',
        planCode: 'pro',
        interval: 'month',
        status: 'past_due',
        monthlyTokenLimit: 2_000_000,
        currentPeriodStart: new Date('2026-09-01'),
        currentPeriodEnd: new Date('2099-01-01'),
        cancelAtPeriodEnd: false,
      },
    ]);

    const sub = await getUsableSubscription('u1', new Date('2026-09-15'));
    expect(sub?.status).toBe('past_due');
    expect(sub?.planCode).toBe('pro');
  });

  it('upsertSubscription 冲突时更新', async () => {
    insertChain.values.mockReturnValue(insertChain);
    insertChain.onConflictDoUpdate.mockResolvedValue(undefined);

    await upsertSubscription({
      userId: 'u1',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      stripePriceId: 'price_basic_y',
      planCode: 'basic',
      interval: 'year',
      status: 'active',
      monthlyTokenLimit: 1_000_000,
      currentPeriodStart: new Date('2026-09-01'),
      currentPeriodEnd: new Date('2026-10-01'),
      cancelAtPeriodEnd: false,
    });

    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('ensureStripeCustomer 按 userId upsert', async () => {
    insertChain.values.mockReturnValue(insertChain);
    insertChain.onConflictDoUpdate.mockResolvedValue(undefined);

    await ensureStripeCustomer('u1', 'cus_1');
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('getPeriodUsage 聚合周期用量', async () => {
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockResolvedValue([{ total: 123 }]);

    const total = await getPeriodUsage('u1', new Date('2026-09-01'), new Date('2026-10-01'));
    expect(total).toBe(123);
  });

  it('管理员快照直接不限量', async () => {
    isAdminUserIdMock.mockResolvedValue(true);
    const snapshot = await getUserQuotaSnapshot('admin1');
    expect(snapshot.isUnlimited).toBe(true);
    expect(snapshot.planCode).toBe('admin');
    expect(dbMock.select).not.toHaveBeenCalled();
  });
});
