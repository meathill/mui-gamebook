'use client';

import Link from 'next/link';
import ImageIcon from 'next/image';
import { useState } from 'react';
import type { ParsedGameRow } from '@/types';
import { PLACEHOLDER_COVER, resolveCoverSrc } from '../../../image-loader';

interface GameCardProps {
  game: ParsedGameRow;
}

export default function GameCard({ game }: GameCardProps) {
  const [imgError, setImgError] = useState(false);
  const coverSrc = imgError ? PLACEHOLDER_COVER : resolveCoverSrc(game.cover_image);

  return (
    <div className="group">
      <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl h-full flex flex-col border border-gray-100">
        <Link
          href={`/play/${game.slug}`}
          className="block">
          <div className="relative h-40 w-full bg-gradient-to-br from-gray-100 to-gray-200">
            <ImageIcon
              src={coverSrc}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          </div>
        </Link>
        <div className="p-4 flex-1 flex flex-col">
          <Link href={`/play/${game.slug}`}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
              {game.title}
            </h3>
          </Link>
          <p className="text-gray-600 text-sm line-clamp-2 mb-3 flex-1">{game.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {game.tags?.map((tag: string) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                prefetch={false}
                className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium border border-amber-100 hover:bg-amber-100 hover:text-amber-800 transition-colors">
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
