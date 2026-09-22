import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-server';
import PricingClient from '@/components/pricing/PricingClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '订阅套餐与定价 — 姆伊游戏书',
    description:
      '姆伊游戏书订阅套餐：免费开始创作，基础 $9.98/月、专业 $19.98/月；年付更优惠。按 M Token 计量 AI 创作算力，月度自动重置。',
    alternates: { canonical: '/pricing' },
  };
}

export default async function PricingPage() {
  const session = await getSession();
  return <PricingClient isAuthenticated={Boolean(session)} />;
}
