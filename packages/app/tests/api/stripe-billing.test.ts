import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionsCreate = vi.fn();
const portalCreate = vi.fn();
const constructEvent = vi.fn();
const subscriptionsRetrieve = vi.fn();

vi.mock('@/lib/auth-server', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: sessionsCreate } },
    billingPortal: { sessions: { create: portalCreate } },
    subscriptions: { retrieve: subscriptionsRetrieve },
    webhooks: { constructEventAsync: constructEvent },
  })),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test'),
}));
vi.mock('@/lib/billing', () => ({
  ensureStripeCustomer: vi.fn(),
  getActiveSubscription: vi.fn(),
  getUsableSubscription: vi.fn(),
  getStripeCustomerId: vi.fn(),
  getPlanDefinition: vi.fn(() => ({ code: 'basic', name: '基础', monthlyTokenLimit: 1_000_000 })),
  isBillingInterval: (v: string) => v === 'month' || v === 'year',
  isPlanCode: (v: string) => v === 'basic' || v === 'pro',
  resolvePriceId: vi.fn(() => 'price_basic_m'),
  resolvePlanFromPriceId: vi.fn(() => ({ planCode: 'basic', interval: 'month' })),
  upsertSubscription: vi.fn(),
}));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_test' } })),
}));
vi.mock('drizzle-orm/d1', () => ({ drizzle: vi.fn(() => ({})) }));

import { POST as checkoutPost } from '@/app/api/stripe/checkout/route';
import { POST as webhookPost } from '@/app/api/stripe/webhook/route';
import { getSession } from '@/lib/auth-server';
import { getUsableSubscription, getStripeCustomerId, upsertSubscription, ensureStripeCustomer } from '@/lib/billing';

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUsableSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getStripeCustomerId as ReturnType<typeof vi.fn>).mockResolvedValue('cus_1');
  });

  it('未登录 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await checkoutPost(new Request('http://test', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
  });

  it('创建 subscription Checkout，且不传 payment_method_types', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1', email: 'a@b.c', name: 'A' } });
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });

    const res = await checkoutPost(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ planCode: 'basic', interval: 'year' }),
      }),
    );

    expect(res.status).toBe(200);
    const payload = (await res.json()) as { url?: string };
    expect(payload.url).toBe('https://checkout.stripe.com/x');
    const args = sessionsCreate.mock.calls[0][0];
    expect(args.mode).toBe('subscription');
    expect(args.line_items).toEqual([{ price: 'price_basic_m', quantity: 1 }]);
    expect('payment_method_types' in args).toBe(false);
    expect(args.client_reference_id).toBe('u1');
  });

  it('已有订阅返回 409', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getUsableSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    const res = await checkoutPost(
      new Request('http://test', { method: 'POST', body: JSON.stringify({ planCode: 'pro', interval: 'month' }) }),
    );
    expect(res.status).toBe(409);
  });
});

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('验签失败 400', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    const res = await webhookPost(
      new Request('http://test', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=x' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('checkout.session.completed upsert 订阅，重复事件幂等', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'u1' },
          client_reference_id: 'u1',
          customer: 'cus_1',
          subscription: 'sub_1',
        },
      },
    });
    subscriptionsRetrieve.mockResolvedValue({
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      cancel_at_period_end: false,
      metadata: { userId: 'u1' },
      items: {
        data: [
          {
            price: { id: 'price_basic_m' },
            current_period_start: 1_760_000_000,
            current_period_end: 1_762_000_000,
          },
        ],
      },
    });

    const requestInit = {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=x' },
      body: '{}',
    };
    const res1 = await webhookPost(new Request('http://test', requestInit));
    const res2 = await webhookPost(new Request('http://test', requestInit));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(upsertSubscription).toHaveBeenCalledTimes(2);
    expect(ensureStripeCustomer).toHaveBeenCalledWith('u1', 'cus_1');
    const params = (upsertSubscription as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(params.stripeSubscriptionId).toBe('sub_1');
    expect(params.monthlyTokenLimit).toBe(1_000_000);
  });
});
