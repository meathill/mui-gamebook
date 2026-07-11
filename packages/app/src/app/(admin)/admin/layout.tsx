'use client';

import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminNav from '@/components/admin/AdminNav';

function isRootUserClient(email: string | undefined): boolean {
  if (!email) return false;
  const rootEmails = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL?.split(',').map((e) => e.trim().toLowerCase()) || [];
  return rootEmails.includes(email.toLowerCase());
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push('/sign-in');
    } else if (!isRootUserClient(session.user.email)) {
      router.push('/my/dashboard');
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!session || !isRootUserClient(session.user.email)) {
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

              <AdminNav />
            </div>
          </aside>

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
