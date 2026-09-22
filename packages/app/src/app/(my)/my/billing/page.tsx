import { Suspense } from 'react';
import BillingClient from './BillingClient';

export const dynamic = 'force-dynamic';

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-10 text-stone-500">加载中…</div>}>
      <BillingClient />
    </Suspense>
  );
}
