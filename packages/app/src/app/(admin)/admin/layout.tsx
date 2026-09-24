'use client';

import { authClient, isAdminSession, isRootUserClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  // root 与内容管理员都能进后台；用户管理/系统配置页由后端继续按 root 收紧
  const canEnterAdmin = isAdminSession(session?.user);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push('/sign-in');
    } else if (!canEnterAdmin) {
      router.push('/my/dashboard');
    }
  }, [isPending, session, canEnterAdmin, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!session || !canEnterAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          <aside className="w-56 flex-shrink-0">
            <div className="sticky top-6">
              <header className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">管理后台</h2>
              </header>

              <AdminNav isRoot={isRootUserClient(session.user.email)} />
            </div>
          </aside>

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
