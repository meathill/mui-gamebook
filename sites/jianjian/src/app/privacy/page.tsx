'use client';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-light via-background to-accent-yellow/20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 title-fun text-center">隐私政策</h1>

        <div className="card p-6 space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">1. 信息收集</h2>
            <p className="text-foreground/80 leading-relaxed">简简故事非常重视您和孩子的隐私。我们可能收集以下信息：</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-1 mt-2">
              <li>账户信息（如邮箱地址）</li>
              <li>阅读进度和偏好</li>
              <li>使用习惯（用于改善服务）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">2. 儿童隐私保护</h2>
            <p className="text-foreground/80 leading-relaxed">
              我们特别关注儿童隐私保护。13岁以下用户需在家长或监护人同意下使用本平台。我们不会故意收集或存储13岁以下儿童的个人身份信息。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">3. 信息使用</h2>
            <p className="text-foreground/80 leading-relaxed">我们收集的信息仅用于：</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-1 mt-2">
              <li>提供和改善服务</li>
              <li>保存阅读进度</li>
              <li>发送重要通知</li>
              <li>保障平台安全</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">4. 信息安全</h2>
            <p className="text-foreground/80 leading-relaxed">
              我们采用行业标准的安全措施保护您的信息，包括加密传输和安全存储。但请注意，互联网传输无法保证100%安全。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">5. Cookie 使用</h2>
            <p className="text-foreground/80 leading-relaxed">
              我们使用 Cookie 来保存登录状态和阅读进度。您可以在浏览器设置中管理 Cookie 偏好。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">6. 第三方服务</h2>
            <p className="text-foreground/80 leading-relaxed">
              我们可能使用第三方服务（如云存储、语音合成）来提供功能。这些服务有自己的隐私政策，我们建议您查阅。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">7. 您的权利</h2>
            <p className="text-foreground/80 leading-relaxed">
              您有权访问、更正或删除您的个人信息。如需行使这些权利，请联系我们。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">8. 联系我们</h2>
            <p className="text-foreground/80 leading-relaxed">
              如有隐私相关问题，请联系：
              <a
                href="mailto:privacy@jianjian.app"
                className="text-primary hover:underline">
                privacy@jianjian.app
              </a>
            </p>
          </section>

          <p className="text-sm text-foreground/50 text-center pt-4">最后更新：2024年12月</p>
        </div>

        <div className="text-center mt-8">
          <a
            href="/"
            className="btn btn-outline">
            <span className="mr-2">🏠</span>
            返回首页
          </a>
        </div>
      </div>
    </main>
  );
}
