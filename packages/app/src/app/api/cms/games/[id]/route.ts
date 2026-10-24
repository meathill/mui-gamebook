import { parse } from '@roudanio/parser';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { and, eq, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { revalidatePublicCatalog } from '@/lib/public-cache';
import { saveEditorContent } from '@/lib/media-assistance/editor-save';
import { AssistanceError } from '@/lib/media-assistance/types';

type Props = {
  params: Promise<{ id: string }>;
};
export async function GET(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // 校验游戏管理权限（所有者或 root）
  const game = await getManagedGame(db, id, session);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const content = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, id)).get();

  // Parse tags and ensure published is boolean
  const parsedGame = {
    ...game,
    tags: game.tags ? JSON.parse(game.tags) : [],
    published: Boolean(game.published),
  };

  return NextResponse.json({
    ...parsedGame,
    content: content?.content || '',
    revision: content?.revision ?? 0,
    canEnableMediaAssistance: game.ownerId === session.user.id,
  });
}

export async function PUT(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  const {
    content,
    slug: newSlug,
    storyPrompt,
    expectedRevision,
    mediaAssistanceEnabled,
    mediaPlanningConfirmed,
  } = (await req.json()) as {
    content: string;
    slug?: string;
    storyPrompt?: string;
    expectedRevision?: number;
    mediaAssistanceEnabled?: boolean;
    mediaPlanningConfirmed?: boolean;
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

  // 校验游戏管理权限（所有者或 root）
  const currentGame = await getManagedGame(db, id, session);
  if (!currentGame) {
    return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });
  }

  let finalSlug = currentGame.slug;

  // CheckIcon for slug collision if changing
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
  if (expectedRevision !== undefined || mediaAssistanceEnabled !== undefined || currentGame.mediaAssistanceEnabled) {
    if (
      (mediaAssistanceEnabled !== undefined && typeof mediaAssistanceEnabled !== 'boolean') ||
      (mediaPlanningConfirmed !== undefined && typeof mediaPlanningConfirmed !== 'boolean')
    ) {
      return NextResponse.json({ error: '素材协助设置必须是布尔值' }, { status: 400 });
    }
    try {
      const revision = await saveEditorContent(env.DB, {
        gameId: id,
        content,
        game: parseResult.data,
        expectedRevision: expectedRevision as number,
        slug: finalSlug,
        actorId: session.user.id,
        storyPrompt,
        mediaAssistanceEnabled,
        mediaPlanningConfirmed,
      });
      revalidatePublicCatalog({ slug: finalSlug, tags });
      if (currentGame.slug !== finalSlug) revalidatePublicCatalog({ slug: currentGame.slug });
      return NextResponse.json({ success: true, slug: finalSlug, revision });
    } catch (error) {
      if (error instanceof AssistanceError)
        return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

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
      ...(storyPrompt !== undefined && { storyPrompt }),
    })
    .where(eq(schema.games.id, id));

  // Update GameContent table
  await db.update(schema.gameContent).set({ content }).where(eq(schema.gameContent.gameId, id));

  revalidatePublicCatalog({ slug: finalSlug, tags });
  if (currentGame.slug !== finalSlug) {
    revalidatePublicCatalog({ slug: currentGame.slug });
  }

  return NextResponse.json({ success: true, slug: finalSlug });
}

export async function DELETE(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // 校验游戏管理权限（所有者或 root）
  const game = await getManagedGame(db, id, session);
  if (!game) return NextResponse.json({ error: 'Game not found or unauthorized' }, { status: 404 });

  await db.delete(schema.games).where(eq(schema.games.id, id));
  revalidatePublicCatalog({ slug: game.slug, tags: game.tags });

  return NextResponse.json({ success: true });
}
