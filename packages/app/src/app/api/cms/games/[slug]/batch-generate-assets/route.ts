import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { parse, SceneAiImageNode, stringify } from '@mui-gamebook/parser';
import { generateAndUploadImage } from '@/lib/ai-service';

type Props = {
  params: Promise<{ slug: string }>;
};
export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // 1. Fetch Game
  const gameRecord = await db.select().from(schema.games)
    .where(and(eq(schema.games.slug, slug), eq(schema.games.ownerId, session.user.id)))
    .get();

  if (!gameRecord) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const contentRecord = await db.select().from(schema.gameContent)
    .where(eq(schema.gameContent.slug, slug))
    .get();

  if (!contentRecord) return NextResponse.json({ error: 'Content not found' }, { status: 404 });

  // 2. Parse
  const result = parse(contentRecord.content);
  if (!result.success) return NextResponse.json({ error: 'Invalid game content' }, { status: 500 });

  const game = result.data;
  let updatedCount = 0;

  // 3. Process Nodes
  // Note: This can be slow and might timeout on Workers if too many assets.
  // For MVP we process serially. Ideally should be a background job or Queue.

  // Helper to construct prompt
  const getFullPrompt = (node: SceneAiImageNode) => {
    let prompt = `${game.ai.style?.image || ''}`;
    if (node.characters && game.ai.characters) {
        node.characters.forEach((charId: string) => {
            const char = game.ai.characters?.[ charId ];
            if (char?.image_prompt) prompt += `, ${char.image_prompt}`;
        });
    } else if (node.character && game.ai.characters) {
        const char = game.ai.characters[ node.character ];
        if (char?.image_prompt) prompt += `, ${char.image_prompt}`;
    }
    prompt += `, ${node.prompt}`;
    return prompt;
  };

  for (const scene of game.scenes.values()) {
    for (const node of scene.nodes) {
      if (node.type === 'ai_image' && !node.url) {
        try {
          const fullPrompt = getFullPrompt(node as SceneAiImageNode);
          const fileName = `images/${slug}/${Date.now()}.png`;
          node.url = await generateAndUploadImage(fullPrompt, fileName);
          updatedCount++;
        } catch (e) {
          console.error('Asset gen failed:', e);
        }
      }
    }
  }

  // 4. Save back if changed
  if (updatedCount > 0) {
    const newContent = stringify(game);
    await db.update(schema.gameContent)
      .set({ content: newContent })
      .where(eq(schema.gameContent.slug, slug));
  }

  return NextResponse.json({ success: true, updatedCount });
}
