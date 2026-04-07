'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/my/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">正在跳转到数据统计...</div>
    </div>
  );
}
