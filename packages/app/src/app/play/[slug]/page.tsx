import fs from 'fs';
import path from 'path';
import { parse } from '@mui-gamebook/parser';
import GamePlayer from '@/components/GamePlayer';

export default async function PlayPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  
  // Path to the demo folder in the monorepo root
  const filePath = path.join(process.cwd(), '../../demo', `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Game Not Found</h1>
          <p className="mt-2 text-gray-600">Could not find story: {slug}</p>
        </div>
      </div>
    );
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parseResult = parse(fileContent);

  if (!parseResult.success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-lg">
          <h1 className="text-2xl font-bold text-red-600">Parsing Error</h1>
          <pre className="mt-4 p-4 bg-gray-100 rounded text-left overflow-auto text-sm">
            {parseResult.error}
          </pre>
        </div>
      </div>
    );
  }

  const game = parseResult.data;

  return (
    <main className="min-h-screen bg-neutral-100 py-12">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        {/* We will pass the game data to the client-side player */}
        <GamePlayer game={game} />
      </div>
    </main>
  );
}
