'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Admin 首页 - 重定向到 Dashboard
 */
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">正在跳转到数据统计...</div>
    </div>
  );
}
