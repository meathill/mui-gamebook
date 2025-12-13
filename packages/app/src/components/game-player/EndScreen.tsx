'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ShareButton from '@/components/ShareButton';

interface EndScreenProps {
  title: string;
  shareUrl: string;
  onRestart: (noConfirm?: boolean) => void;
}

export default function EndScreen({ title, shareUrl, onRestart }: EndScreenProps) {
  const t = useTranslations('game');
  
  return (
    <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-200 text-center animate-fade-in">
      <h3 className="text-2xl font-bold text-gray-800 mb-2">{t('theEnd')}</h3>
      <p className="text-gray-500 mb-6">{t('thanksForPlaying')}</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={() => onRestart(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow transition-transform hover:-translate-y-0.5 font-medium"
        >
          {t('playAgain')}
        </button>
        <Link
          href="/"
          className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 shadow-sm transition-transform hover:-translate-y-0.5 font-medium"
        >
          {t('backToLibrary')}
        </Link>
      </div>
      {/* 分享提示 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-3">{t('sharePrompt')}</p>
        <div className="flex justify-center">
          <ShareButton title={title} url={shareUrl} />
        </div>
      </div>
    </div>
  );
}
