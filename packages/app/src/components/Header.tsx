'use client';

import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                姆伊游戏书
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              首页
            </Link>

            {session ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/admin"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  管理后台
                </Link>
                <span className="text-sm text-gray-600">
                  {session.user.name}
                </span>
                <button
                  onClick={async () => {
                    await authClient.signOut();
                    router.refresh();
                  }}
                  className="text-gray-500 hover:text-red-600 text-sm font-medium"
                >
                  退出
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
