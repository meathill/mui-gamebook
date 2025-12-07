import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { startAsyncVideoGeneration } from '@/lib/ai-service';
import { recordAiUsage } from '@/lib/ai-usage';
import { checkUserUsageLimit } from '@/lib/usage-limit';
import { checkVideoGenerationPermission } from '@/lib/config';
import {
  createPendingOperation,
  generatePlaceholderUrl,
} from '@/lib/pending-operations';

/**
 * 启动异步素材生成
 * 目前仅支持视频，因为视频生成时间较长
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 检查用量限制
  const usageCheck = await checkUserUsageLimit(session.user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: usageCheck.message }, { status: 429 });
  }

  // 检查视频生成权限（白名单）
  const videoPermission = await checkVideoGenerationPermission(session.user.email);
  if (!videoPermission.allowed) {
    return NextResponse.json({ error: videoPermission.message }, { status: 403 });
  }

  try {
    const { prompt, gameId, type, config } = (await req.json()) satisfies {
      prompt: string;
      gameId: string;
      type: string;
      config?: { durationSeconds?: number; aspectRatio?: string };
    };
    if (!prompt || !gameId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    if (type === 'ai_video') {
      // 启动异步视频生成
      const { operationName, usage, model } = await startAsyncVideoGeneration(prompt, config);

      // 记录 AI 用量
      await recordAiUsage({
        userId: session.user.id,
        type: 'video_generation',
        model,
        usage,
      });

      // 创建待处理操作记录
      const operationId = await createPendingOperation({
        userId: session.user.id,
        gameId: parseInt(gameId, 10),
        type: 'video_generation',
        operationName,
        inputData: { prompt, config, gameId },
      });

      // 返回占位符 URL
      const placeholderUrl = generatePlaceholderUrl(operationId);

      return NextResponse.json({
        url: placeholderUrl,
        operationId,
        status: 'pending',
      });
    }

    return NextResponse.json({ error: '不支持的素材类型，请使用 /api/cms/assets/generate' }, { status: 400 });
  } catch (e: unknown) {
    console.error('Start async generate error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
