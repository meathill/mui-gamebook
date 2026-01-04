import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { getMinigameById } from '@/lib/minigames';
import MiniGamePlayer from '@/components/game-player/MiniGamePlayer';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const minigame = await getMinigameById(parseInt(id, 10));
  const t = await getTranslations('minigames');

  if (!minigame) {
    return { title: t('notFound') };
  }

  return {
    title: `${minigame.name} | ${t('pageTitle')}`,
    description: minigame.description || t('defaultDescription'),
  };
}

export default async function MinigameDetailPage({ params }: Props) {
  const { id } = await params;
  const minigame = await getMinigameById(parseInt(id, 10));
  const t = await getTranslations('minigames');

  if (!minigame) {
    notFound();
  }

  // 构建小游戏代码 URL（通过 data URL 传递代码）
  const codeBlob = new Blob([minigame.code], { type: 'application/javascript' });
  const codeDataUrl = `data:application/javascript;base64,${Buffer.from(minigame.code).toString('base64')}`;

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/minigames"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          {t('backToList')}
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{minigame.name}</h1>
            {minigame.description && <p className="text-gray-600">{minigame.description}</p>}
          </div>

          <div className="p-6">
            <MiniGamePlayerWrapper code={minigame.code} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 客户端组件包装器
function MiniGamePlayerWrapper({ code }: { code: string }) {
  'use client';

  // 创建一个简化版的 MiniGamePlayer，用于独立试玩
  return (
    <div className="relative">
      <StandaloneMiniGamePlayer code={code} />
    </div>
  );
}

// 独立小游戏播放器组件
function StandaloneMiniGamePlayer({ code }: { code: string }) {
  return (
    <div className="text-center py-12 text-gray-500">
      {/* 这里需要一个客户端组件来执行小游戏代码 */}
      <p>小游戏体验功能即将上线</p>
    </div>
  );
}
