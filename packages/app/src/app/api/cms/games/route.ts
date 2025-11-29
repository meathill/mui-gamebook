import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import slugify from 'slugify';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  const userGames = await db.select()
    .from(schema.games)
    .where(eq(schema.games.ownerId, session.user.id))
    .orderBy(desc(schema.games.updatedAt));

  return NextResponse.json(userGames);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title } = (await req.json()) as {
    title: string;
  };
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString().slice(-4);
  const now = new Date();

  const defaultContent = `---
title: "${title}"
description: "New game description"
published: false
---

# start
Welcome to your new game!
`;

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  try {
    const result = await db.insert(schema.games)
      .values({
        slug,
        title,
        ownerId: session.user.id,
        createdAt: now,
        updatedAt: now,
        published: false,
      })
      .returning();

    const id = result[ 0 ].id;
    await db.insert(schema.gameContent).values({
      gameId: id,
      content: defaultContent,
    });
    return NextResponse.json({ id, slug, title });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
