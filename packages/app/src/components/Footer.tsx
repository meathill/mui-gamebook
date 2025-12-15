import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} 姆伊游戏书. All rights reserved.
          </div>
          <div className="text-xs text-gray-400 mt-2 md:mt-0">v{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</div>
          <div className="flex items-center gap-4 ms-auto">
            <Link
              href="/privacy"
              className="text-gray-500 hover:text-gray-700 text-sm">
              隐私政策
            </Link>
            <Link
              href="/terms"
              className="text-gray-500 hover:text-gray-700 text-sm">
              服务条款
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
