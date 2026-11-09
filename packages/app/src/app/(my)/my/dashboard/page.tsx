'use client';

import { GameControllerIcon, PlusIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import SubscriptionCard from '@/components/my/SubscriptionCard';

export default function DashboardPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">控制面板</h1>
        <p className="text-gray-500 mt-1">管理订阅与作品</p>
      </header>

      <SubscriptionCard />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/my/games"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <GameControllerIcon
            size={24}
            className="text-blue-600"
          />
          <p className="mt-3 font-semibold text-gray-900">我的游戏</p>
          <p className="mt-1 text-sm text-gray-500">查看和管理已创建的作品</p>
        </Link>
        <Link
          href="/create"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <PlusIcon
            size={24}
            className="text-green-600"
          />
          <p className="mt-3 font-semibold text-gray-900">创建游戏</p>
          <p className="mt-1 text-sm text-gray-500">开始一个新的互动故事</p>
        </Link>
      </div>

      <p className="mt-8 text-sm text-gray-500">阅读与互动统计已迁移到 Google Analytics，请前往 GA4 后台查看。</p>
    </div>
  );
}
