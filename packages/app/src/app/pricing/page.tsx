import type { Metadata } from 'next';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import { getSession } from '@/lib/auth-server';
import JsonLd from '@/components/JsonLd';
import PricingClient from '@/components/pricing/PricingClient';
import PricingCompare from '@/components/pricing/PricingCompare';
import PricingFaq from '@/components/pricing/PricingFaq';
import { PRICING_FAQ } from '@/lib/pricing-content';

export const dynamic = 'force-dynamic';

const TITLE = '订阅套餐与定价 — Pro / Pro+ — 姆伊游戏书';
const DESCRIPTION =
  '姆伊游戏书定价：免费开始创作，Pro $9.98/月（1M M Token），Pro+ $19.98/月（2M M Token）；年付约 17% 优惠。支持能力对比与常见问题，按 M Token 计量 AI 创作算力。';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: ['互动小说定价', 'AI 创作订阅', '姆伊游戏书 套餐', 'Pro Pro+', 'M Token', '文字冒险 创作工具 价格'],
    alternates: { canonical: '/pricing' },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: '/pricing',
      type: 'website',
      siteName: '姆伊游戏书',
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
    },
  };
}

export default async function PricingPage() {
  const session = await getSession();
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const pageUrl = `${baseUrl}/pricing`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: '订阅定价', item: pageUrl },
    ],
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PRICING_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const offerCatalogLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: '姆伊游戏书 AI 创作订阅',
    description: DESCRIPTION,
    url: pageUrl,
    brand: { '@type': 'Brand', name: '姆伊游戏书' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '0',
      highPrice: '199.98',
      offerCount: 5,
      offers: [
        {
          '@type': 'Offer',
          name: '免费',
          price: '0',
          priceCurrency: 'USD',
          description: '核心创作永久免费，每日 AI 体验额度',
        },
        {
          '@type': 'Offer',
          name: 'Pro 月付',
          price: '9.98',
          priceCurrency: 'USD',
          description: '每月 1,000,000 M Token',
        },
        {
          '@type': 'Offer',
          name: 'Pro 年付',
          price: '99.98',
          priceCurrency: 'USD',
          description: '每月 1,000,000 M Token，约 17% 优惠',
        },
        {
          '@type': 'Offer',
          name: 'Pro+ 月付',
          price: '19.98',
          priceCurrency: 'USD',
          description: '每月 2,000,000 M Token',
        },
        {
          '@type': 'Offer',
          name: 'Pro+ 年付',
          price: '199.98',
          priceCurrency: 'USD',
          description: '每月 2,000,000 M Token，约 17% 优惠',
        },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />
      <JsonLd data={offerCatalogLd} />
      <PricingClient isAuthenticated={Boolean(session)} />
      <PricingCompare />
      <PricingFaq />
    </div>
  );
}
