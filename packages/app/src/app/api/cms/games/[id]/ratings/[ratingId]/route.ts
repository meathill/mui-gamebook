import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';

type Props = {
  params: Promise<{ id: string; ratingId: string }>;
};

/**
 * PATCH /api/cms/games/[id]/ratings/[ratingId]
 * 创作者隐藏 / 取消隐藏 / 置顶 / 取消置顶一条评价
 * Body: { hidden?: boolean; pinned?: boolean }（至少传一个）
 */
export async function PATCH(request: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idRaw, ratingId: ratingIdRaw } = await params;
  const id = Number(idRaw);
  const ratingId = Number(ratingIdRaw);
  if (!Number.isInteger(id) || !Number.isInteger(ratingId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: { hidden?: unknown; pinned?: unknown };
  try {
    body = (await request.json()) as { hidden?: unknown; pinned?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: { hidden?: boolean; pinned?: boolean } = {};
  if (typeof body.hidden === 'boolean') updates.hidden = body.hidden;
  if (typeof body.pinned === 'boolean') updates.pinned = body.pinned;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'hidden 或 pinned 必须为布尔值' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  const game = await getManagedGame(db, id, session);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const existing = await db
    .select({ id: schema.gameRatings.id })
    .from(schema.gameRatings)
    .where(and(eq(schema.gameRatings.id, ratingId), eq(schema.gameRatings.gameId, id)))
    .get();
  if (!existing) {
    return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
  }

  await db
    .update(schema.gameRatings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.gameRatings.id, ratingId));

  return NextResponse.json({ success: true, rating: { id: ratingId, ...updates } });
}
