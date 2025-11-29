import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import slugify from 'slugify';

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'cover', 'character', 'scene'
    const characterId = formData.get('characterId') as string | null;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    // 验证游戏所有权
    const game = await db
      .select()
      .from(schema.games)
      .where(and(eq(schema.games.id, id), eq(schema.games.ownerId, session.user.id)))
      .get();

    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }

    const bucket = env.ASSETS_BUCKET;
    if (!bucket) throw new Error('R2 Bucket not found');

    const buffer = await file.arrayBuffer();
    const gameSlug = slugify(game.slug || game.title, { lower: true });
    const ext = file.name.split('.').pop() || 'png';
    
    let fileName: string;
    switch (type) {
      case 'character':
        fileName = `images/${gameSlug}/characters/${characterId || 'unknown'}-${Date.now()}.${ext}`;
        break;
      case 'scene':
        fileName = `images/${gameSlug}/scenes/${Date.now()}.${ext}`;
        break;
      case 'audio':
        fileName = `audio/${gameSlug}/${Date.now()}.${ext}`;
        break;
      case 'video':
        fileName = `video/${gameSlug}/${Date.now()}.${ext}`;
        break;
      default:
        fileName = `images/${gameSlug}/${Date.now()}.${ext}`;
    }

    await bucket.put(fileName, buffer, {
      httpMetadata: { contentType: file.type },
    });

    const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
    const url = publicDomain ? `${publicDomain}/${fileName}` : `R2://${fileName}`;

    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('上传错误:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
