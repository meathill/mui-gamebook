'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, SparkleIcon, StarIcon } from '@phosphor-icons/react/dist/ssr';

type BillingInterval = 'month' | 'year';
type PlanCode = 'free' | 'basic' | 'pro';

interface PlanCard {
  code: PlanCode;
  name: string;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  monthlyTokenLimit: number;
  features: string[];
  highlight?: boolean;
}

const PLANS: PlanCard[] = [
  {
    code: 'free',
    name: '免费',
    monthlyPriceUsd: 0,
    yearlyPriceUsd: 0,
    monthlyTokenLimit: 0,
    features: ['核心创作与发布永久免费', '每日 AI 体验额度', '社区作品无限畅玩', '未来可接个人 API Key'],
  },
  {
    code: 'basic',
    name: '基础',
    monthlyPriceUsd: 9.98,
    yearlyPriceUsd: 99.98,
    monthlyTokenLimit: 1_000_000,
    features: ['每月 1,000,000 M Token', 'AI 剧情副驾 / 剧本生成', '场景生图、TTS 与配音', '按账单周期自动重置'],
  },
  {
    code: 'pro',
    name: '专业',
    monthlyPriceUsd: 19.98,
    yearlyPriceUsd: 199.98,
    monthlyTokenLimit: 2_000_000,
    highlight: true,
    features: ['每月 2,000,000 M Token', '基础档全部能力', '更充足的批量创作算力', '适合连载 / 工作室高频产出'],
  },
];

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export default function PricingClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>('year');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const priceLabel = useMemo(() => {
    return (plan: PlanCard) => {
      if (plan.code === 'free') return '$0';
      const amount = interval === 'year' ? plan.yearlyPriceUsd : plan.monthlyPriceUsd;
      return `$${amount.toFixed(2)}`;
    };
  }, [interval]);

  async function handleSubscribe(planCode: PlanCode) {
    if (planCode === 'free') {
      router.push(isAuthenticated ? '/my/dashboard' : '/sign-in');
      return;
    }
    if (!isAuthenticated) {
      router.push(`/sign-in?redirect=/pricing`);
      return;
    }

    setLoadingPlan(planCode);
    setError(null);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode, interval }),
      });
      const data = (await response.json()) as { url?: string; error?: string; code?: string };
      if (!response.ok || !data.url) {
        setError(data.error || '创建支付会话失败');
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message || '创建支付会话失败');
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 mb-4">订阅套餐</h1>
        <p className="text-stone-600 max-w-2xl mx-auto">
          用 M Token 计量 AI 创作算力（$1 成本 = 1M Token）。免费档即可开始创作，订阅解锁更高月度额度。
        </p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-full bg-stone-100 p-1">
          {(
            [
              { key: 'month', label: '月付' },
              { key: 'year', label: '年付 · 省 17%' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setInterval(item.key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                interval === item.key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="max-w-xl mx-auto mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isYearDeal = interval === 'year' && plan.code !== 'free';
          return (
            <div
              key={plan.code}
              className={`relative rounded-2xl border p-6 bg-white shadow-sm ${
                plan.highlight ? 'border-orange-500 ring-2 ring-orange-200' : 'border-stone-200'
              }`}>
              {plan.highlight ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                  <StarIcon className="w-3.5 h-3.5" />
                  推荐
                </div>
              ) : null}

              <div className="flex items-center gap-2 mb-2">
                {plan.code === 'pro' ? <SparkleIcon className="w-5 h-5 text-orange-500" /> : null}
                <h2 className="text-xl font-bold text-stone-900">{plan.name}</h2>
              </div>

              <div className="mb-1">
                <span className="text-4xl font-extrabold text-stone-900">{priceLabel(plan)}</span>
                <span className="text-stone-500 text-sm ml-1">
                  {plan.code === 'free' ? '/ 永久' : interval === 'year' ? '/ 年' : '/ 月'}
                </span>
              </div>
              <p className="text-sm text-stone-500 mb-5">
                {plan.code === 'free'
                  ? '每日体验额度，适合试玩与轻量创作'
                  : `每月 ${formatTokens(plan.monthlyTokenLimit)} M Token，按账单周期重置`}
              </p>
              {isYearDeal ? <p className="text-xs text-emerald-700 mb-4">年付约 17% 优惠，额度与月付相同</p> : null}

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-stone-700">
                    <CheckIcon className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={loadingPlan === plan.code}
                onClick={() => handleSubscribe(plan.code)}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  plan.highlight
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}>
                {plan.code === 'free' ? '免费开始' : loadingPlan === plan.code ? '跳转支付中…' : '立即订阅'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-2xl bg-stone-50 border border-stone-200 p-6 text-sm text-stone-600 leading-relaxed">
        <p className="font-medium text-stone-900 mb-2">额度怎么算？</p>
        <p>
          1M M Token 约等于 $1 模型成本：大约可生成 33 张场景图，或约 140 万字级别的 DeepSeek
          文本调用（综合费率估算）。订阅按月重置；年付与月付同档额度相同，只是更便宜。
        </p>
      </div>
    </div>
  );
}
