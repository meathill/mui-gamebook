import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { MinigameRow } from '@/lib/minigames';
import { Gamepad2Icon } from 'lucide-react';

interface MiniGameCardProps {
  minigame: MinigameRow;
}

export default function MiniGameCard({ minigame }: MiniGameCardProps) {
  const t = useTranslations('minigames');

  return (
    <Link
      href={`/minigames/${minigame.id}`}
      className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg h-full flex flex-col border border-gray-100">
        <div className="relative h-24 w-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
          <Gamepad2Icon
            className="text-white/90 group-hover:scale-110 transition-transform"
            size={32}
          />
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">
            {minigame.name}
          </h3>
          <p className="text-gray-500 text-xs line-clamp-2 flex-1">{minigame.description || t('noDescription')}</p>
        </div>
      </div>
    </Link>
  );
}
