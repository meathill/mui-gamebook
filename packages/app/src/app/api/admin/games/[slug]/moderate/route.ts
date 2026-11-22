import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { isAdminUser } from '@/lib/admin';
import { getSession } from '@/lib/auth-server';
import { moderateGameContent } from '@/lib/content-moderation';

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * 验证管理员访问：ADMIN_PASSWORD Bearer（脚本通道）或 root / 内容管理员 session（后台通道）
 */
async function validateAdminAccess(req: Request, env: { ADMIN_PASSWORD?: string }): Promise<boolean> {
  const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.get('Authorization');
  if (secret && authHeader === `Bearer ${secret}`) {
    return true;
  }
  const session = await getSession();
  return Boolean(session?.user?.email && isAdminUser(session.user));
}

/**
 * POST /api/admin/games/[slug]/moderate
 * 对单个作品跑一遍 NSFW 审查（违禁词 + LLM），返回审查结论。
 * 用于后台人工巡检与存量批量审查脚本；只读，不做任何状态变更。
 */
export async function POST(req: Request, { params }: Props) {
  try {
    const { env } = getCloudflareContext();
    if (!(await validateAdminAccess(req, env))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slug = (await params).slug;
    const db = drizzle(env.DB);
    const game = await db.select().from(schema.games).where(eq(schema.games.slug, slug)).get();
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    const content = await db
      .select({ content: schema.gameContent.content })
      .from(schema.gameContent)
      .where(eq(schema.gameContent.gameId, game.id))
      .get();

    const verdict = await moderateGameContent({
      title: game.title,
      description: game.description,
      backgroundStory: game.backgroundStory,
      content: content?.content ?? '',
    });

    if (!verdict.pass) {
      console.warn(`[Moderation] 存量审查可疑：${slug}（${verdict.source}）${verdict.reason ?? ''}`);
    }
    return NextResponse.json({
      slug,
      pass: verdict.pass,
      source: verdict.source,
      reason: verdict.reason ?? null,
    });
  } catch (error) {
    console.error('Admin moderate game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
