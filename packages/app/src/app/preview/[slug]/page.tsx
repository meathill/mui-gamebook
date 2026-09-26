import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import Link from 'next/link';
import * as schema from '@/db/schema';
import { isAdminUser } from '@/lib/admin';
import { getSession } from '@/lib/auth-server';
import { getGameBySlug } from '@/lib/games';
import { GamePlayerImmersive } from '@/components/game-player';
import GamePlayer from '@/components/GamePlayer';

/**
 * 作者预览路由。
 *
 * 与公开播放页 /play/[slug] 的区别：
 * - 读 session 校验身份（作者本人或管理员），未发布与被 shadowban 的作品都能看
 * - 因此不能走 ISR / 静态缓存，强制动态渲染，且 noindex
 * - 顺带修掉了编辑器预览按钮「未发布作品打开是 404」的老问题
 */
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `预览：${slug}`,
    robots: { index: false, follow: false },
  };
}

export default async function PreviewPage({ params }: Props) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.email) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/preview/${slug}`)}`);
  }

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // 先取归属与封禁状态（这两项不在 getGameBySlug 的返回里），再按权限决定是否渲染
  const gameRow = await db.select().from(schema.games).where(eq(schema.games.slug, slug)).get();
  if (!gameRow) {
    notFound();
  }

  const canPreview = gameRow.ownerId === session.user.id || isAdminUser(session.user);
  if (!canPreview) {
    notFound();
  }

  const game = await getGameBySlug(slug, { includeShadowBanned: true });
  if (!game) {
    notFound();
  }

  const banner = gameRow.shadowBanned
    ? { text: '此作品已被封禁，仅你和管理员可见。', tone: 'bg-red-50 text-red-700 border-red-200' }
    : !gameRow.published
      ? { text: '预览模式：此作品尚未发布，仅你可见。', tone: 'bg-amber-50 text-amber-700 border-amber-200' }
      : null;

  return (
    <>
      {banner && (
        <div className={`border-b px-4 py-2 text-sm text-center ${banner.tone}`}>
          {banner.text}{' '}
          <Link
            href="/my/games"
            className="underline underline-offset-2">
            返回我的作品
          </Link>
        </div>
      )}
      {game.display_mode === 'immersive' ? (
        <GamePlayerImmersive
          game={game}
          slug={slug}
        />
      ) : (
        <main className="min-h-screen bg-neutral-100 sm:py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-0">
            <div className="bg-white sm:shadow-xl sm:rounded-2xl overflow-hidden">
              <GamePlayer
                game={game}
                slug={slug}
              />
            </div>
          </div>
        </main>
      )}
    </>
  );
}
