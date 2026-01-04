'use client';

import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import CreateGameModal from '@/components/admin/CreateGameModal';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/admin"
              className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
              管理后台
            </Link>
            <p className="text-sm text-gray-500">{session.user.email}</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* 左侧导航 */}
          <aside className="w-56 flex-shrink-0">
            <div className="sticky top-6">
              {/* 创建新游戏按钮 */}
              <div className="mb-6">
                <CreateGameModal />
              </div>

              <AdminNav />
            </div>
          </aside>

          {/* 右侧内容区 */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
