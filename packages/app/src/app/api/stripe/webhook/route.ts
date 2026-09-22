import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import {
  ensureStripeCustomer,
  getPlanDefinition,
  resolvePlanFromPriceId,
  upsertSubscription,
  type PlanCode,
  type BillingInterval,
  type SubscriptionStatus,
} from '@/lib/billing';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe';

function toDateFromUnix(value: number | null | undefined): Date | null {
  if (typeof value !== 'number') return null;
  return new Date(value * 1000);
}

async function resolveUserIdFromCustomer(stripeCustomerId: string): Promise<string | null> {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const [row] = await db
    .select({ userId: schema.stripeCustomers.userId })
    .from(schema.stripeCustomers)
    .where(eq(schema.stripeCustomers.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return row?.userId ?? null;
}

async function syncSubscriptionFromStripe(subscription: Stripe.Subscription, userIdHint?: string | null) {
  const { env } = getCloudflareContext();
  const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const userId = userIdHint || subscription.metadata?.userId || (await resolveUserIdFromCustomer(stripeCustomerId));
  if (!userId) {
    console.warn('[Stripe Webhook] 无法解析 userId，跳过', subscription.id);
    return;
  }

  await ensureStripeCustomer(userId, stripeCustomerId);

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    console.warn('[Stripe Webhook] 订阅缺少 price，跳过', subscription.id);
    return;
  }

  const plan = resolvePlanFromPriceId(env, priceId);
  const planCode: PlanCode = plan?.planCode ?? 'basic';
  const interval: BillingInterval = plan?.interval ?? 'month';
  const planDef = getPlanDefinition(planCode);
  // Stripe 2025+ 周期字段在 subscription item 上
  const firstItem = subscription.items.data[0];
  const periodStart = toDateFromUnix(firstItem?.current_period_start) ?? new Date();
  const periodEnd = toDateFromUnix(firstItem?.current_period_end) ?? new Date();

  await upsertSubscription({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    planCode,
    interval,
    status: subscription.status as SubscriptionStatus,
    monthlyTokenLimit: planDef.monthlyTokenLimit,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
  });
}

async function markSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const now = new Date();
  await db
    .update(schema.subscriptions)
    .set({
      status: subscription.status === 'canceled' ? 'canceled' : (subscription.status as string),
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      updatedAt: now,
    })
    .where(eq(schema.subscriptions.stripeSubscriptionId, subscription.id));
}

/**
 * Stripe Webhook：订阅生命周期同步到 D1
 */
export async function POST(request: Request) {
  const { env } = getCloudflareContext();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: '缺少 stripe-signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripe(env);
    event = stripe.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret(env));
  } catch (error) {
    console.error('[Stripe Webhook] 验签失败:', error);
    return NextResponse.json({ error: 'Webhook 验签失败' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (userId && customerId) {
          await ensureStripeCustomer(userId, customerId);
        }
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (subscriptionId && userId) {
          const stripe = getStripe(env);
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionFromStripe(subscription, userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(subscription);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        // 依赖 subscription status 落地；这里只留日志便于排障
        console.log(`[Stripe Webhook] ${event.type}`, event.id);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] 处理失败:', error);
    return NextResponse.json({ error: 'Webhook 处理失败' }, { status: 500 });
  }
}
