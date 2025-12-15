import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface MiniGameRecord {
  id: number;
  game_id: number;
  code: string;
  prompt: string;
  variables: string;
  created_at: number;
  updated_at: number;
}

/**
 * 获取小游戏代码
 * 返回 JavaScript 代码，设置适当的缓存头
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const minigameId = parseInt(id, 10);

  if (isNaN(minigameId)) {
    return NextResponse.json({ error: '无效的小游戏 ID' }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;
    if (!DB) throw new Error('数据库未配置');

    const minigame = await DB.prepare(`
      SELECT * FROM Minigames WHERE id = ?
    `)
      .bind(minigameId)
      .first<MiniGameRecord>();

    if (!minigame) {
      return NextResponse.json({ error: '小游戏不存在' }, { status: 404 });
    }

    // 返回 JavaScript 代码
    return new NextResponse(minigame.code, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e: unknown) {
    console.error('Get minigame error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
