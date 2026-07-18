import { getCloudflareContext } from '@opennextjs/cloudflare';
import { MIMO_FAST_TEXT_MODEL } from '@mui-gamebook/core/lib/mimo-provider';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import { buildAssessStoryPrompt, parseAssessStoryResult } from '@/lib/editor/clarify-story';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

type Props = {
  params: Promise<{ id: string }>;
};

/** 评估/追问只需要一个简短判断和几个问题，给一个很小的上限，配合关闭思考保证这个调用足够快 */
const CLARIFY_MAX_OUTPUT_TOKENS = 400;

export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  const { id } = await params;
  const { story, provider: requestedProvider } = (await req.json()) as {
    story: string;
    provider?: string;
  };
  if (!story) return NextResponse.json({ error: 'Story is required' }, { status: 400 });

  const { env } = getCloudflareContext();
  const game = await getManagedGame(drizzle(env.DB), Number(id), session);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  // 评估/追问是锦上添花的辅助步骤，不应该阻塞用户生成故事：AI 调用本身失败或返回内容
  // 解析失败，都直接退化为"已就绪"（200），前端据此跳过追问、走正式生成
  try {
    const permissions = await getUserAiPermissions(session.user);
    const providerType = resolveTextProvider(permissions, requestedProvider);
    const provider = await createAiProvider(providerType);

    // 这一步只是快速判断信息是否够用，不需要 DSL、也不需要 pro 级别的深度思考模型，
    // 用更轻量的 mimo-v2.5 即可；仅正式生成（generate-script）才用 mimo-v2.5-pro
    const result = await provider.generateText(buildAssessStoryPrompt(story), {
      thinking: false,
      maxOutputTokens: CLARIFY_MAX_OUTPUT_TOKENS,
      ...(providerType === 'mimo' && { model: MIMO_FAST_TEXT_MODEL }),
    });

    await recordAiUsage({
      userId: session.user.id,
      type: 'clarify_questions',
      model: provider.type,
      usage: result.usage,
      gameId: Number(id),
    });

    return NextResponse.json(parseAssessStoryResult(result.text));
  } catch (e) {
    console.error('Clarify Story Error:', e);
    return NextResponse.json({ ready: true, questions: [] });
  }
}
