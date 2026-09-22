'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CreditCardIcon, SparkleIcon, TicketIcon } from '@phosphor-icons/react';

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

function formatPercent(usage: number, limit: number | null): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((usage / limit) * 100));
}

export default function BillingClient() {
  const searchParams = useSearchParams();
  const checkoutState = searchParams.get('checkout');
  const [data, setData] = useState<SubscriptionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/subscription');
      const payload = (await response.json()) as SubscriptionSummary & { error?: string };
      if (!response.ok) {
        setError(payload.error || '加载失败');
        return;
      }
      setData(payload);
    } catch (e) {
      setError((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openPortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error || '打开管理订阅失败');
        return;
      }
      window.location.href = payload.url;
    } catch (e) {
      setError((e as Error).message || '打开管理订阅失败');
    } finally {
      setPortalLoading(false);
    }
  }

  const planName =
    data?.planCode === 'pro'
      ? '专业'
      : data?.planCode === 'basic'
        ? '基础'
        : data?.planCode === 'admin'
          ? '管理员'
          : '免费';
  const percent = data ? formatPercent(data.periodUsage, data.periodLimit) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-2">
        <TicketIcon className="w-6 h-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-stone-900">订阅与账单</h1>
      </div>
      <p className="text-stone-600 mb-8">查看当前套餐、本周期 AI 算力用量，并管理续订。</p>

      {checkoutState === 'success' ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          支付完成。订阅开通可能需要几秒钟同步，若额度未刷新请稍候或刷新本页。
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? <p className="text-stone-500">加载中…</p> : null}

      {data ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500 mb-1">当前套餐</p>
                <p className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                  {data.planCode === 'pro' ? <SparkleIcon className="w-6 h-6 text-orange-500" /> : null}
                  {planName}
                  {data.isUnlimited ? <span className="text-sm font-medium text-emerald-700">不限量</span> : null}
                </p>
                {data.cancelAtPeriodEnd ? (
                  <p className="text-sm text-amber-700 mt-2">已关闭自动续订，到期后回落免费档。</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                {data.isSubscribed ? (
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60">
                    <CreditCardIcon className="w-4 h-4" />
                    {portalLoading ? '打开中…' : '管理订阅'}
                  </button>
                ) : (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                    升级套餐
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-stone-600 mb-2">
                <span>本周期用量</span>
                <span>
                  {data.isUnlimited
                    ? '无限制'
                    : `${formatTokens(data.periodUsage)} / ${data.periodLimit ? formatTokens(data.periodLimit) : '—'} M Token`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${percent >= 90 ? 'bg-red-500' : 'bg-orange-500'}`}
                  style={{ width: `${data.isUnlimited ? 8 : percent}%` }}
                />
              </div>
              {data.periodEnd ? (
                <p className="text-xs text-stone-500 mt-2">
                  周期结束：{new Date(data.periodEnd).toLocaleString('zh-CN')}
                </p>
              ) : (
                <p className="text-xs text-stone-500 mt-2">免费档按日额度限制，订阅后按账单周期重置。</p>
              )}
            </div>
          </section>

          {!data.isSubscribed ? (
            <section className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
              订阅后可获得每月 1M（基础）或 2M（专业）M Token，年付与月付同额度、更便宜。
              <Link
                href="/pricing"
                className="ml-1 text-orange-600 font-medium hover:underline">
                去看看套餐 →
              </Link>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
