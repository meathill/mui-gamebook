import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ParsedGameRow } from '@/types';

interface GameCardProps {
  game: ParsedGameRow;
}

export default function GameCard({ game }: GameCardProps) {
  const t = useTranslations('home');

  return (
    <Link
      href={`/play/${game.slug}`}
      className="group">
      <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl h-full flex flex-col border border-gray-100">
        <div className="relative h-40 w-full bg-gradient-to-br from-gray-100 to-gray-200">
          {game.cover_image ? (
            <Image
              src={game.cover_image}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">{t('noCover')}</div>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
            {game.title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2 mb-3 flex-1">{game.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {game.tags?.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium border border-amber-100">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
