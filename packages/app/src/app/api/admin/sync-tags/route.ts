import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';

interface GameRow {
  id: number;
  tags: string | null;
}

/**
 * 同步 Games.tags 到 GameTags 关联表
 * GET /api/admin/sync-tags
 * 需要管理员权限
 */
export async function GET() {
  try {
    // 验证管理员权限
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // 检查 ROOT_USER_EMAIL 权限
    const rootEmail = env.ROOT_USER_EMAIL;
    if (rootEmail && session.user.email !== rootEmail) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 获取所有游戏
    const { results: games } = (await DB.prepare('SELECT id, tags FROM Games').all()) as { results: GameRow[] };

    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const game of games) {
      if (!game.tags) {
        skippedCount++;
        continue;
      }

      try {
        const tags: string[] = JSON.parse(game.tags);

        for (const tag of tags) {
          try {
            await DB.prepare('INSERT OR IGNORE INTO GameTags (game_id, tag) VALUES (?, ?)').bind(game.id, tag).run();
            insertedCount++;
          } catch (e) {
            errors.push(`game_id=${game.id}, tag=${tag}: ${(e as Error).message}`);
          }
        }
      } catch (e) {
        errors.push(`game_id=${game.id}: JSON parse error - ${(e as Error).message}`);
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: '同步完成',
      stats: {
        totalGames: games.length,
        insertedTags: insertedCount,
        skippedGames: skippedCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
    });
  } catch (e) {
    console.error('Sync tags error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
