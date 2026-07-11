import { parse } from '@mui-gamebook/parser';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import slugify from 'slugify';
import * as schema from '@/db/schema';
import { getUserAiPermissions } from '@/lib/ai-permissions';
import { generateAndUploadImage } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 检查用量限制
  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  const id = Number((await params).id);
  const { characterId, prompt } = (await req.json()) as {
    characterId: string;
    prompt: string;
  };

  if (!characterId || !prompt) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }

  // 图片生成默认关闭，管理员按用户开通
  const permissions = await getUserAiPermissions(session.user);
  if (!permissions.canGenerateImage) {
    return NextResponse.json({ error: '您没有权限使用图片生成功能，请联系管理员开通' }, { status: 403 });
  }

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  // 验证游戏管理权限（所有者或 root）
  const game = await getManagedGame(db, id, session);
  if (!game) {
    return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
  }

  try {
    // 获取游戏内容以获取 AI 样式
    const content = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, id)).get();

    let stylePrompt = '';
    if (content?.content) {
      const parseResult = parse(content.content);
      if (parseResult.success && parseResult.data.ai?.style?.image) {
        stylePrompt = parseResult.data.ai.style.image + ', ';
      }
    }

    // 生成角色头像
    const fullPrompt = `${stylePrompt}character portrait, ${prompt}`;
    const gameSlug = slugify(game.slug || game.title, { lower: true });
    const fileName = `images/${gameSlug}/characters/${characterId}-${Date.now()}.png`;
    const { url, usage, model } = await generateAndUploadImage(fullPrompt, fileName);

    // 记录 AI 用量
    await recordAiUsage({
      userId: session.user.id,
      type: 'image_generation',
      model,
      usage,
      gameId: id,
    });

    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('生成角色图片错误:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
