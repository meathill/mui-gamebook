import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/cms/games/[id]/ratings
 * 创作者查看自己游戏的全部评价（含已隐藏），附均分
 */
export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  const game = await getManagedGame(db, id, session);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const agg = await db
    .select({
      avg: sql<number | null>`AVG(${schema.gameRatings.rating})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(schema.gameRatings)
    .where(and(eq(schema.gameRatings.gameId, id), eq(schema.gameRatings.hidden, false)))
    .get();

  const ratings = await db
    .select({
      id: schema.gameRatings.id,
      rating: schema.gameRatings.rating,
      content: schema.gameRatings.content,
      hidden: schema.gameRatings.hidden,
      pinned: schema.gameRatings.pinned,
      createdAt: schema.gameRatings.createdAt,
      userName: schema.user.name,
    })
    .from(schema.gameRatings)
    .leftJoin(schema.user, eq(schema.gameRatings.userId, schema.user.id))
    .where(eq(schema.gameRatings.gameId, id))
    .orderBy(desc(schema.gameRatings.pinned), desc(schema.gameRatings.createdAt))
    .all();

  return NextResponse.json({
    game: { id: game.id, slug: game.slug, title: game.title },
    avg: agg?.avg ?? 0,
    count: agg?.count ?? 0,
    ratings: ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      hidden: Boolean(r.hidden),
      pinned: Boolean(r.pinned),
      userName: r.userName,
      createdAt: r.createdAt,
    })),
  });
}
