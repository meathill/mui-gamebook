'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CreditCardIcon, SparkleIcon } from '@phosphor-icons/react';

interface SubscriptionSummary {
  planCode: 'free' | 'admin' | 'basic' | 'pro';
  isSubscribed: boolean;
  isUnlimited: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  periodUsage: number;
  periodLimit: number | null;
  cancelAtPeriodEnd: boolean;
  subscriptionStatus: string | null;
}

function formatTokens(value: number): string {
  return value.toLocaleString('en-US');
}

export default function SubscriptionCard() {
  const { data, isLoading } = useQuery<SubscriptionSummary>({
    queryKey: ['user', 'subscription'],
    queryFn: async () => {
      const res = await fetch('/api/user/subscription');
      if (!res.ok) throw new Error('Failed to fetch subscription');
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="bg-white rounded-lg shadow p-6 mb-8 text-sm text-gray-500">加载订阅信息中...</div>;
  }
  if (!data) return null;

  const planName =
    data.planCode === 'pro'
      ? 'Pro+'
      : data.planCode === 'basic'
        ? 'Pro'
        : data.planCode === 'admin'
          ? '管理员'
          : '免费';
  const percent =
    data.periodLimit && data.periodLimit > 0
      ? Math.min(100, Math.round((data.periodUsage / data.periodLimit) * 100))
      : 0;

  return (
    <section className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">当前订阅</p>
          <p className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {data.planCode === 'pro' ? (
              <SparkleIcon
                size={24}
                className="text-orange-500"
              />
            ) : null}
            {planName}
            {data.isUnlimited ? <span className="text-sm font-medium text-emerald-700">不限量</span> : null}
            {data.cancelAtPeriodEnd ? <span className="text-sm font-medium text-amber-700">到期不续</span> : null}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {data.isSubscribed
              ? data.periodEnd
                ? `本周期至 ${new Date(data.periodEnd).toLocaleString('zh-CN')}`
                : '订阅生效中'
              : '免费档 · 按日额度体验 AI'}
          </p>
        </div>
        <Link
          href="/my/billing"
          className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800">
          <CreditCardIcon size={16} />
          订阅账单
        </Link>
      </div>

      {data.isSubscribed && data.periodLimit ? (
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>本周期算力</span>
            <span>
              {formatTokens(data.periodUsage)} / {formatTokens(data.periodLimit)} M Token
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${percent >= 90 ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-600">
          订阅 Pro / Pro+ 可获得每月 1M / 2M M Token。
          <Link
            href="/pricing"
            className="ml-1 text-orange-600 font-medium hover:underline">
            查看套餐 →
          </Link>
        </p>
      )}
    </section>
  );
}
