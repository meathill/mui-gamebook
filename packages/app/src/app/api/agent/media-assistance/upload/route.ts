import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';
import { resolveMcpAuth } from '@/lib/mcp-auth';
import { requireAssistanceAdmin } from '@/lib/media-assistance/auth';
import { AssistanceError } from '@/lib/media-assistance/types';
import { uploadAssistanceAsset } from '@/lib/media-assistance/upload';

export async function POST(request: Request) {
  try {
    const resolved = await resolveMcpAuth(request);
    if (!resolved.auth)
      return NextResponse.json({ error: 'Unauthorized' }, { status: resolved.error === 'rate-limited' ? 429 : 401 });
    const { env } = getCloudflareContext();
    await requireAssistanceAdmin(
      env.DB,
      resolved.auth.mode,
      resolved.auth.mode === 'session' ? resolved.auth.session.user.id : undefined,
    );
    const url = new URL(request.url);
    const result = await uploadAssistanceAsset(
      env.DB,
      env.ASSETS_BUCKET,
      env.ASSETS_PUBLIC_DOMAIN ?? '',
      request,
      Number(url.searchParams.get('gameId')),
      url.searchParams.get('inputHash') ?? '',
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AssistanceError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(
      '素材协助上传失败',
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      error,
    );
    return NextResponse.json({ error: '上传失败，请保留文件并重试上传，不要重新生成' }, { status: 500 });
  }
}
