import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import { getUserAiPermissions, resolveTextProvider } from '@/lib/ai-permissions';
import { createAiProvider } from '@/lib/ai-provider-factory';
import { recordAiUsage } from '@/lib/ai-usage';
import { getSession } from '@/lib/auth-server';
import {
  buildCorrectionPrompt,
  buildGenerateScriptPrompt,
  stripCodeFence,
  validateGeneratedScript,
} from '@/lib/editor/generate-script';
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

  const { id } = await params;
  const { story, provider: requestedProvider } = (await req.json()) as {
    story: string;
    provider?: string;
  };
  if (!story) return NextResponse.json({ error: 'Story is required' }, { status: 400 });

  // 校验游戏归属（所有者或 root）
  const { env } = getCloudflareContext();
  const game = await getManagedGame(drizzle(env.DB), Number(id), session);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  // fetch DSL
  const f = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/DSL_SPEC.md`);
  const dslSpec = await f.text();

  try {
    // 按用户权限解析文本提供者
    const permissions = await getUserAiPermissions(session.user);
    const provider = await createAiProvider(resolveTextProvider(permissions, requestedProvider));

    // 第一次生成
    const first = await provider.generateText(buildGenerateScriptPrompt(dslSpec, story), { thinking: true });
    let script = stripCodeFence(first.text);
    const totalUsage = { ...first.usage };

    // 校验角色/属性是否齐全，缺失则做一次纠错重生成
    const validation = validateGeneratedScript(script);
    if (!validation.ok) {
      console.log(
        `[Generate Script] 首次生成校验未通过（characters 缺失: ${validation.missingCharacters}, state 缺失: ${validation.missingState}），执行纠错重生成`,
      );
      const correction = await provider.generateText(buildCorrectionPrompt(script, validation), { thinking: true });
      totalUsage.promptTokens += correction.usage.promptTokens;
      totalUsage.completionTokens += correction.usage.completionTokens;
      totalUsage.totalTokens += correction.usage.totalTokens;

      // 修正版能解析就采用，否则保留第一版兜底（前端解析报错提示维持现状）
      const correctedScript = stripCodeFence(correction.text);
      const revalidation = validateGeneratedScript(correctedScript);
      if (!revalidation.parseError) {
        script = correctedScript;
      }
    }

    // 记录 AI 用量（两次调用合计）
    await recordAiUsage({
      userId: session.user.id,
      type: 'text_generation',
      model: provider.type,
      usage: totalUsage,
      gameId: Number(id),
    });

    return NextResponse.json({ script });
  } catch (e) {
    console.error('AI Generation Error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
