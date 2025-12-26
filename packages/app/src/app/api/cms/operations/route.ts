import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { checkAndCompleteVideoGeneration } from '@/lib/ai-service';
import {
  getOperationById,
  updateOperationStatus,
  isPlaceholderUrl,
  extractOperationId,
} from '@/lib/pending-operations';

/**
 * 检查操作状态
 * GET /api/cms/operations?id=123 或 ?url=pending://123
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let operationId: number | null = null;

  // 支持通过 id 或 url 查询
  const idParam = searchParams.get('id');
  const urlParam = searchParams.get('url');

  if (idParam) {
    operationId = parseInt(idParam, 10);
  } else if (urlParam && isPlaceholderUrl(urlParam)) {
    operationId = extractOperationId(urlParam);
  }

  if (!operationId) {
    return NextResponse.json({ error: '缺少操作 ID' }, { status: 400 });
  }

  try {
    const operation = await getOperationById(operationId);
    if (!operation) {
      return NextResponse.json({ error: '操作不存在' }, { status: 404 });
    }

    // 检查权限
    if (operation.user_id !== session.user.id) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 如果已经完成，直接返回结果
    if (operation.status === 'completed') {
      const outputData = operation.output_data ? JSON.parse(operation.output_data) : null;
      return NextResponse.json({
        status: 'completed',
        url: outputData?.url,
        operationId,
      });
    }

    if (operation.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: operation.error_message,
        operationId,
      });
    }

    // 检查视频生成状态
    if (operation.type === 'video_generation' && operation.operation_name) {
      const inputData = operation.input_data ? JSON.parse(operation.input_data) as {
        gameId?: string;
        provider?: 'google' | 'openai';
      } : {};
      const fileName = `video/${inputData.gameId}/${Date.now()}.mp4`;

      // 从 inputData 中获取 provider 类型
      const result = await checkAndCompleteVideoGeneration(
        operation.operation_name,
        fileName,
        inputData.provider,
      );

      if (result.done) {
        if (result.error) {
          await updateOperationStatus(operationId, 'failed', undefined, result.error);
          return NextResponse.json({
            status: 'failed',
            error: result.error,
            operationId,
          });
        }

        if (result.url) {
          await updateOperationStatus(operationId, 'completed', { url: result.url });
          return NextResponse.json({
            status: 'completed',
            url: result.url,
            operationId,
          });
        }
      }
    }

    // 仍在处理中
    return NextResponse.json({
      status: 'pending',
      operationId,
    });
  } catch (e: unknown) {
    console.error('Check operation status error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
