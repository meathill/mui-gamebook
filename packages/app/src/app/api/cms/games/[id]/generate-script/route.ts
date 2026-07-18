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
  buildReviseScriptPrompt,
  stripCodeFence,
  trimDslSpecForFirstPass,
  validateGeneratedScript,
} from '@/lib/editor/generate-script';
import { getManagedGame } from '@/lib/game-access';
import { checkUserUsageLimit } from '@/lib/usage-limit';

type Props = {
  params: Promise<{ id: string }>;
};

// 同一 Worker 实例（warm isolate）内缓存 DSL_SPEC.md，避免每次生成请求都重新拉取一次静态文件
let cachedDslSpecPromise: Promise<string> | null = null;

function fetchDslSpec(): Promise<string> {
  if (!cachedDslSpecPromise) {
    cachedDslSpecPromise = fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/DSL_SPEC.md`)
      .then((res) => res.text())
      .catch((error: unknown) => {
        cachedDslSpecPromise = null; // 失败不缓存，下次请求重试
        throw error;
      });
  }
  return cachedDslSpecPromise;
}

export async function POST(req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 检查用量限制
  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  const { id } = await params;
  const {
    story,
    provider: requestedProvider,
    existingScript,
  } = (await req.json()) as {
    story: string;
    provider?: string;
    existingScript?: string;
  };
  if (!story) return NextResponse.json({ error: 'Story is required' }, { status: 400 });

  // 校验游戏归属（所有者或 root）
  const { env } = getCloudflareContext();
  const game = await getManagedGame(drizzle(env.DB), Number(id), session);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  // 按用户权限解析文本提供者；创建失败（如密钥缺失）在进入 SSE 前返回 JSON 错误
  const permissions = await getUserAiPermissions(session.user);
  const providerType = resolveTextProvider(permissions, requestedProvider);
  let provider: Awaited<ReturnType<typeof createAiProvider>>;
  try {
    provider = await createAiProvider(providerType);
  } catch (error) {
    console.error('Generate script provider init error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  // 用 SSE 流式响应替代一次性 JSON：只要持续有字节输出，Cloudflare 边缘就不会因
  // 空闲判定 524 超时。支持流式的 provider（目前只有 MiMo）逐块转发思考/正文内容；
  // 不支持的 provider 内部照旧阻塞调用，完成后一次性发出，前端始终只对接一种 SSE 契约。
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      async function runGeneration(genPrompt: string): Promise<string> {
        if (provider.generateTextStream) {
          let text = '';
          const gen = provider.generateTextStream(genPrompt, { thinking: true });
          let result = await gen.next();
          while (!result.done) {
            const chunk = result.value;
            emit({ type: chunk.type, delta: chunk.delta });
            if (chunk.type === 'content') text += chunk.delta;
            result = await gen.next();
          }
          totalUsage.promptTokens += result.value.usage.promptTokens;
          totalUsage.completionTokens += result.value.usage.completionTokens;
          totalUsage.totalTokens += result.value.usage.totalTokens;
          return result.value.text || text;
        }

        const result = await provider.generateText(genPrompt, { thinking: true });
        totalUsage.promptTokens += result.usage.promptTokens;
        totalUsage.completionTokens += result.usage.completionTokens;
        totalUsage.totalTokens += result.usage.totalTokens;
        emit({ type: 'content', delta: result.text });
        return result.text;
      }

      try {
        emit({ type: 'phase', phase: 'thinking' });

        const dslSpec = trimDslSpecForFirstPass(await fetchDslSpec());
        const firstPrompt = existingScript
          ? buildReviseScriptPrompt(dslSpec, existingScript, story)
          : buildGenerateScriptPrompt(dslSpec, story);
        let script = stripCodeFence(await runGeneration(firstPrompt));

        // 校验角色/属性是否齐全，缺失则做一次纠错重生成
        const validation = validateGeneratedScript(script);
        if (!validation.ok) {
          console.log(
            `[Generate Script] 首次生成校验未通过（characters 缺失: ${validation.missingCharacters}, state 缺失: ${validation.missingState}），执行纠错重生成`,
          );
          emit({ type: 'phase', phase: 'correcting' });
          const correctedScript = stripCodeFence(await runGeneration(buildCorrectionPrompt(script, validation)));
          // 修正版能解析就采用，否则保留第一版兜底（前端解析报错提示维持现状）
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

        emit({ type: 'done', script });
        controller.close();
      } catch (error) {
        console.error('AI Generation Error:', error);
        emit({ type: 'error', content: (error as Error).message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
