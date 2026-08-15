import Link from 'next/link';
import { getGames } from '@/lib/api';

export const revalidate = 60;

// 可爱的装饰 emoji 组
const decorEmojis = ['🌈', '⭐', '🎨', '🎪', '🎠', '🎡', '🎢', '🦄', '🐰', '🐻'];

export default async function Home() {
  const games = await getGames();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      {/* Hero 区域 */}
      <section className="max-w-4xl mx-auto text-center mb-12">
        {/* 可爱的装饰 */}
        <div className="flex justify-center gap-4 text-4xl mb-6">
          <span className="animate-bounce-in">🌟</span>
          <span
            className="animate-bounce-in"
            style={{ animationDelay: '0.1s' }}>
            📚
          </span>
          <span
            className="animate-bounce-in"
            style={{ animationDelay: '0.2s' }}>
            ✨
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 title-fun">欢迎来到简简！</h1>
        <p className="text-xl sm:text-2xl text-foreground/80 mb-6 leading-relaxed">
          这里有好多好多有趣的故事在等着你 🎉
        </p>
        <p className="text-lg text-foreground/70">每一个选择，都会带你去不同的地方哦～</p>
      </section>

      {/* 游戏列表 */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <span>📖</span>
          <span>故事书架</span>
        </h2>

        {games.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-xl font-semibold mb-2">书架还是空的呢～</p>
            <p className="text-foreground/70">好故事正在赶来的路上，敬请期待！</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {games.map((game, index) => (
              <Link
                href={`/play/${game.slug}`}
                key={game.slug}
                className="group">
                <article className="card transition-all duration-300 h-full flex flex-col">
                  {/* 封面图 */}
                  <div className="relative h-40 sm:h-48 bg-primary-light overflow-hidden">
                    {game.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={game.cover_image}
                        alt={game.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-5xl">
                        {decorEmojis[index % decorEmojis.length]}
                      </div>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-foreground/70 text-base sm:text-lg line-clamp-2 mb-4 flex-1">
                      {game.description || '一个神奇的故事等你来探索～'}
                    </p>

                    {/* 标签 */}
                    {game.tags && game.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {game.tags.slice(0, 3).map((tag: string, i: number) => (
                          <span
                            key={tag}
                            className={`tag ${['tag-pink', 'tag-purple', 'tag-green'][i % 3]}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 开始按钮提示 */}
                    <div className="mt-4 text-center">
                      <span className="inline-flex items-center gap-1 text-primary font-semibold group-hover:gap-2 transition-all">
                        点击开始阅读
                        <span className="text-lg">→</span>
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
