import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSession } from '@/lib/auth-server';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import {
  ensureStripeCustomer,
  getActiveSubscription,
  getStripeCustomerId,
  getUsableSubscription,
  getPlanDefinition,
  isBillingInterval,
  isPlanCode,
  resolvePriceId,
} from '@/lib/billing';
import { getStripe } from '@/lib/stripe';

interface CheckoutBody {
  planCode?: string;
  interval?: string;
}

/**
 * 创建订阅 Checkout Session
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CheckoutBody;
    const planCode = body.planCode ?? '';
    const interval = body.interval ?? '';
    if (!isPlanCode(planCode) || !isBillingInterval(interval)) {
      return NextResponse.json({ error: '无效的套餐或周期' }, { status: 400 });
    }

    const existing = await getActiveSubscription(session.user.id);
    if (existing) {
      return NextResponse.json(
        { error: '你已有生效中的订阅，请在账单页管理', code: 'ALREADY_SUBSCRIBED' },
        { status: 409 },
      );
    }

    const { env } = getCloudflareContext();
    const stripe = getStripe(env);
    const priceId = resolvePriceId(env, planCode, interval);
    const plan = getPlanDefinition(planCode);
    const siteUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

    let customerId = await getStripeCustomerId(session.user.id);
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      await ensureStripeCustomer(session.user.id, customerId);
    }

    // 禁止传 payment_method_types，交给 Stripe 动态支付方式
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: session.user.id,
      metadata: { userId: session.user.id, planCode, interval },
      subscription_data: {
        metadata: { userId: session.user.id, planCode, interval },
      },
      success_url: `${siteUrl}/my/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: '创建支付会话失败' }, { status: 500 });
    }

    return NextResponse.json({
      url: checkoutSession.url,
      plan: { code: plan.code, name: plan.name, interval },
    });
  } catch (error) {
    console.error('[Stripe] 创建 Checkout 失败:', error);
    return NextResponse.json({ error: (error as Error).message || '创建支付会话失败' }, { status: 500 });
  }
}
