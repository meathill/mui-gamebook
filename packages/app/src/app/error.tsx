'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled page error:', error);
  }, [error]);

  // NEXT_REDIRECT / NEXT_NOT_FOUND 是 Next.js 内部用于 redirect()/notFound() 的受控抛错，不应展示为 500
  const isNextInternal = error.message?.includes('NEXT_REDIRECT') || error.message?.includes('NEXT_NOT_FOUND');

  if (isNextInternal) {
    // 让 Next.js 自身处理重定向/404
    throw error;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">出了点问题</h1>
        <p className="text-gray-600 mb-6">页面加载时遇到了意外错误，请稍后重试。</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            重试
          </button>
          <Link
            href="/"
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            回首页
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-6 text-left text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">{error.message}</pre>
        )}
      </div>
    </div>
  );
}
