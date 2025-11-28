import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { parse } from '@mui-gamebook/parser';

type Props = {
  params: Promise<{ slug: string }>;
}
export async function GET(
  request: Request,
  { params }: Props
) {
  const { slug } = await params;
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  if (!env.DB) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // 1. Find Game by Slug
  const game = await db.select().from(schema.games)
    .where(eq(schema.games.slug, slug))
    .get();

  if (!game || !game.published) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // 2. Fetch Content
  const contentRecord = await db.select().from(schema.gameContent)
    .where(eq(schema.gameContent.gameId, game.id))
    .get();

  if (!contentRecord) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  const result = parse(contentRecord.content);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Ensure metadata is consistent with DB
  const finalGame = {
    ...result.data,
    title: game.title,
    description: game.description,
    cover_image: game.coverImage,
    tags: game.tags ? JSON.parse(game.tags) : [],
    published: true,
    slug: game.slug // Inject slug for frontend use
  };

  return NextResponse.json(finalGame);
}
