import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSession } from '@/lib/auth-server';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import { getStripeCustomerId, getUsableSubscription } from '@/lib/billing';
import { getStripe } from '@/lib/stripe';

/**
 * 创建 Customer Portal Session，自助管理续订/取消/支付方式
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { env } = getCloudflareContext();
    const stripe = getStripe(env);
    const customerId = await getStripeCustomerId(session.user.id);
    const subscription = await getUsableSubscription(session.user.id);
    if (!customerId && !subscription) {
      return NextResponse.json({ error: '暂无订阅记录' }, { status: 404 });
    }

    const siteUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId || subscription!.stripeCustomerId,
      return_url: `${siteUrl}/my/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('[Stripe] 创建 Portal 失败:', error);
    return NextResponse.json({ error: (error as Error).message || '创建管理会话失败' }, { status: 500 });
  }
}
