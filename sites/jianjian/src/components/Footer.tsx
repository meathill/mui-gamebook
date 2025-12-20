import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-primary-light/50 border-t-[3px] border-card-border py-8 mt-auto safe-area-bottom">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* 可爱的装饰 */}
          <div className="flex gap-2 text-2xl">
            <span className="animate-wiggle inline-block">🌟</span>
            <span
              className="animate-wiggle inline-block"
              style={{ animationDelay: '0.1s' }}>
              📖
            </span>
            <span
              className="animate-wiggle inline-block"
              style={{ animationDelay: '0.2s' }}>
              ✨
            </span>
          </div>

          {/* 品牌 */}
          <p className="text-lg font-semibold text-foreground">简简 - 小朋友的故事乐园 v{process.env.NEXT_PUBLIC_VERSION}</p>

          {/* 版权 */}
          <p className="text-sm text-foreground/70">© {new Date().getFullYear()} 简简. 用心讲好每个故事 💝</p>

          {/* 链接 */}
          <div className="flex gap-4 text-sm">
            <Link
              href="/privacy"
              className="text-foreground/70 hover:text-primary transition-colors underline-offset-4 hover:underline">
              隐私政策
            </Link>
            <Link
              href="/terms"
              className="text-foreground/70 hover:text-primary transition-colors underline-offset-4 hover:underline">
              服务条款
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
