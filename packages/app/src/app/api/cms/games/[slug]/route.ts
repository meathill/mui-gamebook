import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { parse } from '@mui-gamebook/parser';

type Props = {
  params: Promise<{ slug: string }>;
}
export async function GET(
  req: Request,
  { params }: Props
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // Verify ownership
  const game = await db.select().from(schema.games)
    .where(and(eq(schema.games.slug, slug), eq(schema.games.ownerId, session.user.id)))
    .get();

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const parsedGame = {
    ...game,
    tags: game.tags ? JSON.parse(game.tags) : [],
    published: Boolean(game.published)
  };

  const content = await db.select().from(schema.gameContent)
    .where(eq(schema.gameContent.slug, slug))
    .get();

  return NextResponse.json({ ...parsedGame, content: content?.content || '' });
}

export async function PUT(
  req: Request,
  { params }: Props
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const { content } = (await req.json()) as {
    content: string;
  };

  // Validate content with parser
  const parseResult = parse(content);
  if (!parseResult.success) {
    return NextResponse.json({ error: `Invalid Markdown: ${parseResult.error}` }, { status: 400 });
  }

  const { title, description, backgroundStory, cover_image, tags, published } = parseResult.data;
  const now = new Date();

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // Update both tables, ensuring user owns the game
  const result = await db.update(schema.games)
    .set({
      title,
      description,
      backgroundStory,
      coverImage: cover_image,
      tags: JSON.stringify(tags),
      published: published,
      updatedAt: now
    })
    .where(and(eq(schema.games.slug, slug), eq(schema.games.ownerId, session.user.id)))
    .returning({ updatedSlug: schema.games.slug })
    .get();

  if (!result) return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });

  await db.update(schema.gameContent)
    .set({ content })
    .where(eq(schema.gameContent.slug, slug));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: Props
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // Cascading delete should handle GameContent, but we verify ownership first
  const result = await db.delete(schema.games)
    .where(and(eq(schema.games.slug, slug), eq(schema.games.ownerId, session.user.id)))
    .returning({ deletedSlug: schema.games.slug })
    .get();

  if (!result) return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });

  return NextResponse.json({ success: true });
}
