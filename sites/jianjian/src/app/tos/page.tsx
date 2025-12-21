'use client';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-light via-background to-accent-yellow/20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 title-fun text-center">服务条款</h1>

        <div className="card p-6 space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">1. 服务介绍</h2>
            <p className="text-foreground/80 leading-relaxed">
              简简故事（以下简称"本平台"）是一个面向儿童的互动故事阅读平台。我们致力于为小朋友们提供有趣、安全的故事体验。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">2. 使用规则</h2>
            <ul className="list-disc list-inside text-foreground/80 space-y-2">
              <li>本平台内容适合儿童阅读，请在家长指导下使用</li>
              <li>禁止发布任何不适合儿童的内容</li>
              <li>请尊重他人，友善互动</li>
              <li>不得滥用平台功能或干扰其他用户</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">3. 知识产权</h2>
            <p className="text-foreground/80 leading-relaxed">
              本平台上的故事内容、插图、音频等素材均受著作权保护。未经授权，不得复制、传播或用于商业用途。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">4. 免责声明</h2>
            <p className="text-foreground/80 leading-relaxed">
              我们努力确保内容的准确性和安全性，但不对因使用本平台而产生的任何损失承担责任。本平台可能包含第三方链接，我们不对第三方内容负责。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">5. 条款修改</h2>
            <p className="text-foreground/80 leading-relaxed">
              我们保留随时修改本服务条款的权利。修改后的条款将在平台上公布后立即生效。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-primary">6. 联系我们</h2>
            <p className="text-foreground/80 leading-relaxed">
              如有任何问题或建议，请通过邮件联系我们：
              <a
                href="mailto:support@jianjian.app"
                className="text-primary hover:underline">
                support@jianjian.app
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
