import { getGameBySlug } from '@/lib/games';
import GamePlayer from '@/components/GamePlayer';

export default async function PlayPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Game Not Found</h1>
          <p className="mt-2 text-gray-600">Could not find story: {slug}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 py-12">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        <GamePlayer game={game} slug={slug} />
      </div>
    </main>
  );
}
