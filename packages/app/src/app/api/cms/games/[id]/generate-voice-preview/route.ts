import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { generateAndUploadTTS, type TTSVoiceName } from '@/lib/ai-service';
import { checkUserUsageLimit } from '@/lib/usage-limit';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: gameId } = await params;

  try {
    const { characterId, voiceName, text } = (await req.json()) satisfies {
      characterId: string;
      voiceName: string;
      text: string;
    };

    if (!characterId || !voiceName || !text) {
      return NextResponse.json(
        { error: 'Missing fields: characterId, voiceName, and text are required' },
        { status: 400 }
      );
    }

    // 构造缓存文件名：使用 gameId + characterId + voiceName 作为 key
    const cacheFileName = `audio/${gameId}/voice-preview/${characterId}-${voiceName}.wav`;

    // 检查缓存是否存在
    const { env } = getCloudflareContext();
    const bucket = env.ASSETS_BUCKET;
    if (!bucket) {
      return NextResponse.json({ error: "R2 Bucket 'ASSETS_BUCKET' not found" }, { status: 500 });
    }

    const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
    const cachedUrl = `${publicDomain}/${cacheFileName}`;

    // 尝试检查文件是否存在（通过 HEAD 请求）
    try {
      const existing = await bucket.head(cacheFileName);
      if (existing) {
        // 文件存在，直接返回缓存的 URL
        console.log(`[Voice Preview] Cache hit: ${cacheFileName}`);
        return NextResponse.json({ url: cachedUrl, cached: true });
      }
    } catch {
      // 文件不存在，继续生成
    }

    // 检查用量限制
    const usageCheck = await checkUserUsageLimit(session.user.id);
    if (!usageCheck.allowed) {
      return NextResponse.json({ error: usageCheck.message }, { status: 429 });
    }

    console.log(`[Voice Preview] Generating new preview: ${cacheFileName}`);

    // 生成 TTS 并上传（带缓存文件名）
    const { url } = await generateAndUploadTTS(text, cacheFileName, voiceName as TTSVoiceName);

    return NextResponse.json({ url, cached: false });
  } catch (e: unknown) {
    console.error('Generate voice preview error:', e);
    return NextResponse.json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
}
