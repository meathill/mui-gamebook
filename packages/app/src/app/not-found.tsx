import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">页面未找到</h1>
        <p className="text-gray-600 mb-6">你要找的页面不存在或已被移动。</p>
        <Link
          href="/"
          className="inline-flex items-center px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
          回首页
        </Link>
      </div>
    </div>
  );
}
