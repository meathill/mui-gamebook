import Link from 'next/link';
import Image from 'next/image';
import { getPublishedGames } from '@/lib/games';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const games = await getPublishedGames();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 mb-8 p-6 shadow">
          <h2 className="text-2xl font-medium mb-4">关于“姆伊故事书”</h2>
          <p className="mb-2">
            你好，欢迎来到姆伊故事书。有一天我突然想到，利用 AI 可以把互动小说/文字冒险游戏的开发门槛降到最低，让更多人能够创作和分享自己的故事。同时，开发得当的话，让作者控制 AI 而不是受制于 AI，还能保证故事质量和游戏性。于是，我就在 AI 开发工具的帮助下，创造出这个平台。
          </p>
          <p className="mb-2">
            目前这里仍在早创阶段，功能和内容都比较有限，但我会持续改进和完善。如果你有任何建议或想法，欢迎随时联系我！
            <Link
              className="text-sky-600 underline ml-1"
              href="mailto:meathill@gmail.com"
              target="_blank"
            >邮件联系，获得创作资格</Link>
          </p>
          <p className="mb-4 text-end">
            —— Meathill
          </p>
        </div>
        <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-10">
          游戏库
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link href={`/play/${game.slug}`} key={game.slug} className="group">
              <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl h-full flex flex-col">
                <div className="relative h-48 w-full bg-gray-200">
                  {game.cover_image ? (
                    <Image
                      src={game.cover_image}
                      alt={game.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      暂无封面
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                    {game.title}
                  </h2>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
                    {game.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {game.tags?.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {games.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            暂无已发布的游戏，请稍后再来！
          </div>
        )}
      </div>
    </div>
  );
}
