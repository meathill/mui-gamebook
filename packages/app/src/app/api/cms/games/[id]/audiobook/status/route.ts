import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * 查询这本书哪些场景已经生成过有声书片段（R2 里存在 scenes/<sceneId>.json），
 * 供编辑器"一键生成"弹窗做增量生成：已生成的场景默认跳过，只处理剩余的。
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: gameIdParam } = await params;
  const gameId = Number(gameIdParam);

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const ownedGame = await getManagedGame(db, gameId, session);
  if (!ownedGame) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const assetsBucket = env.ASSETS_BUCKET;
  if (!assetsBucket) {
    return NextResponse.json({ error: "R2 Bucket 'ASSETS_BUCKET' not found" }, { status: 500 });
  }

  const prefix = `audiobook/${ownedGame.slug}/scenes/`;
  const generatedSceneIds: string[] = [];
  let cursor: string | undefined;
  do {
    const listed = await assetsBucket.list({ prefix, cursor });
    for (const object of listed.objects) {
      generatedSceneIds.push(object.key.slice(prefix.length).replace(/\.json$/, ''));
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return NextResponse.json({ generatedSceneIds });
}
