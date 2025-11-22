import Link from 'next/link';
import Image from 'next/image';
import { getPublishedGames } from '@/lib/games';

export default function Home() {
  const games = getPublishedGames();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-10">
          MUI Gamebook Library
        </h1>

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
                      No Cover
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
            No published games found. Check back later!
          </div>
        )}
      </div>
    </div>
  );
}
