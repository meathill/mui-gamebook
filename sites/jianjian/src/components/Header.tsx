import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-card-bg/95 backdrop-blur-sm border-b-[3px] border-card-border sticky top-0 z-50 safe-area-top">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2">
            <span className="text-3xl">📚</span>
            <span className="text-2xl font-extrabold title-fun">简简</span>
          </Link>

          {/* 导航 */}
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 px-4 py-2 text-lg font-semibold text-foreground hover:text-primary transition-colors rounded-full hover:bg-primary-light">
              <span>🏠</span>
              <span className="hidden sm:inline">首页</span>
            </Link>
            <Link
              href="/sign-in"
              className="btn btn-primary text-base py-2 px-5 min-h-0">
              <span className="mr-1">👋</span>
              登录
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
