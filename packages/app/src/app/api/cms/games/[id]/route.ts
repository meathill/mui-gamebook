import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, ne } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { parse } from '@mui-gamebook/parser';

type Props = {
  params: Promise<{ id: string }>;
};
export async function GET(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // Verify ownership
  const game = await db
    .select()
    .from(schema.games)
    .where(and(eq(schema.games.id, Number(id)), eq(schema.games.ownerId, session.user.id)))
    .get();

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const content = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, id)).get();

  // Parse tags and ensure published is boolean
  const parsedGame = {
    ...game,
    tags: game.tags ? JSON.parse(game.tags) : [],
    published: Boolean(game.published),
  };

  return NextResponse.json({ ...parsedGame, content: content?.content || '' });
}

export async function PUT(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  const { content, slug: newSlug } = (await req.json()) as {
    content: string;
    slug?: string;
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

  // Check ownership first
  const currentGame = await db
    .select()
    .from(schema.games)
    .where(and(eq(schema.games.id, id), eq(schema.games.ownerId, session.user.id)))
    .get();

  if (!currentGame) {
    return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });
  }

  let finalSlug = currentGame.slug;

  // Check for slug collision if changing
  if (newSlug && newSlug !== currentGame.slug) {
    const existing = await db
      .select()
      .from(schema.games)
      .where(and(eq(schema.games.slug, newSlug), ne(schema.games.id, id)))
      .get();
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    finalSlug = newSlug;
  }

  // Update Games table
  await db
    .update(schema.games)
    .set({
      slug: finalSlug,
      title,
      description,
      backgroundStory,
      coverImage: cover_image,
      tags: JSON.stringify(tags),
      published: published,
      updatedAt: now,
    })
    .where(eq(schema.games.id, id));

  // Update GameContent table
  await db.update(schema.gameContent).set({ content }).where(eq(schema.gameContent.gameId, id));

  return NextResponse.json({ success: true, slug: finalSlug });
}

export async function DELETE(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  const result = await db
    .delete(schema.games)
    .where(and(eq(schema.games.id, id), eq(schema.games.ownerId, session.user.id)))
    .returning({ deletedId: schema.games.id })
    .get();

  if (!result) return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });

  return NextResponse.json({ success: true });
}
